import { readFile, lstat, realpath } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { z } from "zod";
import { validateBinary64 } from "./numeric.mjs";
import { canonical, hashValue } from "../public-math/identity.mjs";
import { sha256, readCatalogue } from "../math-presentation.mjs";
import { validateOutput } from "./outputs.mjs";
import { validateEffect } from "./effects.mjs";
import { coreEvidence } from "../public-math/evidence.mjs";
import { parseCode } from "../public-math/syntax.mjs";
import {
  savedEvidenceSchema,
  receiptSchema,
  referenceSchema,
  digestSchema,
} from "./schema.mjs";
import { savedEvidenceFile, assertSourceCurrent } from "./source.mjs";
import {
  fixtureIdentity,
  fixtureKey,
  fixtureClosure,
  validateRegistrationSource,
} from "./fixtures.mjs";

const reportHeaderSchema = z
  .object({
    intentDigest: digestSchema,
    reviewer: z.string(),
    coverage: z.literal(
      "complete-file-all-public-branches-producers-consumers-and-implicit-effects",
    ),
    ownedFile: referenceSchema,
    dependencyDigest: digestSchema,
    authority: z.literal("independent-semantic-attestation"),
  })
  .strict();
const same = (actual, expected, label) => {
  if (canonical(actual) !== canonical(expected)) throw new Error(label);
};

async function checkedFile(capture, reference, observed) {
  const absolute = path.resolve(capture.root, reference.file);
  if (
    !absolute.startsWith(capture.root + path.sep) ||
    (await realpath(absolute)) !== absolute ||
    !(await lstat(absolute)).isFile()
  )
    throw new Error(`Evidence boundary violation: ${reference.file}`);
  const info = await lstat(absolute);
  for (const absoluteSource of [
    ...[...capture.sources, ...capture.contractInputs].map(({ file }) =>
      path.join(capture.root, file),
    ),
    ...[...capture.checkerInputs, ...capture.legacyCheckerInputs].map(
      ({ file }) => path.join(capture.checkerRoot, file),
    ),
  ]) {
    const other = await lstat(absoluteSource);
    if (info.dev === other.dev && info.ino === other.ino)
      throw new Error(
        `Evidence aliases source or configuration: ${reference.file}`,
      );
  }
  const bytes = await readFile(absolute);
  if (sha256(bytes) !== reference.sha256)
    throw new Error(`Stale evidence bytes: ${reference.file}`);
  if (
    observed.has(reference.file) &&
    observed.get(reference.file) !== reference.sha256
  )
    throw new Error(`Conflicting evidence identity: ${reference.file}`);
  observed.set(reference.file, reference.sha256);
  return bytes.toString("utf8");
}

async function validateNode(
  capture,
  reference,
  dependencies,
  observed,
  fixture = false,
) {
  const runtime = capture.sourceMap.get(reference.file);
  if (runtime && !dependencies.has(reference.file))
    throw new Error(`Node omits source dependency: ${reference.file}`);
  if (!fixture && !runtime)
    throw new Error(
      `Producer/consumer is not a runtime source: ${reference.file}`,
    );
  const text = runtime
    ? runtime.bytes.toString("utf8")
    : await checkedFile(capture, reference, observed);
  if (
    (runtime?.sha256 ?? sha256(text)) !== reference.sha256 ||
    reference.end > text.length ||
    reference.end <= reference.start ||
    sha256(text.slice(reference.start, reference.end)) !== reference.nodeSha256
  )
    throw new Error(`Stale source node or span: ${reference.file}`);
  if (
    runtime &&
    !capture.navigationByFile
      .get(reference.file)
      .spans.has(`${reference.start}:${reference.end}`)
  )
    throw new Error(`Reference is not an exact source node: ${reference.file}`);
  if (!runtime && /\.[cm]?[jt]sx?$/.test(reference.file)) {
    const source = parseCode(reference.file, Buffer.from(text));
    let found = false;
    const visit = (node) => {
      if (
        node.getStart(source) === reference.start &&
        node.end === reference.end
      )
        found = true;
      ts.forEachChild(node, visit);
    };
    visit(source);
    if (!found)
      throw new Error(`Fixture is not an exact source node: ${reference.file}`);
  }
  return text.slice(reference.start, reference.end);
}

async function validateReferences(value, capture, dependencies, observed) {
  if (!value || typeof value !== "object") return;
  if (typeof value.file === "string" && typeof value.sha256 === "string") {
    if (typeof value.start === "number")
      await validateNode(capture, value, dependencies, observed);
    else {
      const source = capture.sourceMap.get(value.file);
      if (
        !source ||
        !dependencies.has(value.file) ||
        source.sha256 !== value.sha256
      )
        throw new Error(`Unbound source reference: ${value.file}`);
    }
    return;
  }
  for (const [childKey, child] of Object.entries(value)) {
    if (childKey === "fixture" || childKey === "producerFixture") {
      if (child !== null)
        await validateFixture(capture, child, dependencies, observed);
    } else if (childKey === "fixtures") {
      for (const fixture of child)
        await validateFixture(capture, fixture, dependencies, observed);
    } else await validateReferences(child, capture, dependencies, observed);
  }
}

async function validateFixture(capture, fixture, dependencies, observed) {
  if (!/^tests\/.*\.[cm]?[jt]sx?$/.test(fixture.source.file))
    throw new Error("Fixture must name a saved test source");
  await validateNode(capture, fixture.source, dependencies, observed, true);
  const text = await checkedFile(capture, fixture.source, observed);
  validateRegistrationSource(fixture, text);
  await fixtureClosure(capture, fixture, dependencies, (row) =>
    checkedFile(capture, row, observed),
  );
}

function collectCases(intent) {
  const cases = [];
  for (const port of intent.ports)
    if (port.output) {
      if (port.output.kind === "static") cases.push(port.output.fixture);
      else
        cases.push(
          ...port.output.samples.flatMap(({ fixture, producerFixture }) =>
            [fixture, producerFixture].filter(Boolean),
          ),
        );
    }
  for (const effect of intent.effects)
    cases.push(
      ...effect.fixtures,
      ...(effect.samples ?? []).map(({ fixture }) => fixture),
    );
  const known = new Map();
  for (const fixture of cases) {
    if (known.has(fixtureKey(fixture)))
      same(
        known.get(fixtureKey(fixture)),
        fixtureIdentity(fixture),
        "Conflicting fixture case identity",
      );
    known.set(fixtureKey(fixture), fixtureIdentity(fixture));
  }
  return [...known.values()];
}

export async function validateLocalReceipt(capture, raw, observed = new Map()) {
  const receipt = receiptSchema.parse(raw);
  const { intent } = receipt;
  const unit = capture.plan.units.find(({ id }) => id === intent.file.file);
  if (!unit) throw new Error("Receipt owns no current source file");
  if (
    capture.plan.structuralRefusals.some(
      ({ file }) => file === intent.file.file,
    )
  )
    throw new Error(
      "Structural source refusals cannot be waived by local review",
    );
  for (const key of [
    "file",
    "reachable",
    "navigationDigest",
    "graphProjectionDigest",
  ])
    same(intent[key], unit[key], `Stale local ${key}`);
  same(
    intent.contractDigest,
    capture.plan.contractDigest,
    "Checker/configuration contract changed",
  );
  same(
    receipt.intentDigest,
    hashValue(intent),
    "Local report intent digest changed",
  );
  const dependencies = new Map(
    intent.dependencies.map((row) => [row.file, row]),
  );
  for (const required of unit.dependencyFloor)
    same(
      dependencies.get(required.file),
      required,
      `Missing or changed derived dependency floor: ${required.file}`,
    );
  for (const dependency of intent.dependencies) {
    if (capture.sourceMap.get(dependency.file)?.sha256 !== dependency.sha256)
      throw new Error(`Stale dependency source: ${dependency.file}`);
    if (
      !unit.dependencyFloor.some(({ file }) => file === dependency.file) &&
      dependency.decision.kind !== "semantic"
    )
      throw new Error(
        "Additional dependency needs an actual semantic relationship",
      );
    if (dependency.decision.kind === "semantic") {
      for (const required of capture.plan.units.find(
        ({ id }) => id === dependency.file,
      ).dependencyFloor)
        if (!dependencies.has(required.file))
          throw new Error(
            `Semantic dependency omits its caller/resource floor: ${required.file}`,
          );
      await validateNode(
        capture,
        dependency.decision.witness,
        dependencies,
        observed,
      );
    }
  }
  await validateReferences(intent.ports, capture, dependencies, observed);
  await validateReferences(intent.effects, capture, dependencies, observed);
  const referencedNodes = new Set();
  const collectNodes = (value) => {
    if (!value || typeof value !== "object") return;
    if (value.nodeSha256) referencedNodes.add(canonical(value));
    else for (const child of Object.values(value)) collectNodes(child);
  };
  collectNodes(
    intent.ports.filter(({ kind }) =>
      ["visible-content", "accessible-speech", "core-occurrence"].includes(
        kind,
      ),
    ),
  );
  collectNodes(
    intent.effects.filter(({ kind }) => ["paint", "resource"].includes(kind)),
  );
  for (const obligation of capture.plan.reviewObligations.filter(
    ({ file }) => file === intent.file.file,
  ))
    if (!referencedNodes.has(canonical(obligation.node)))
      throw new Error("Missing exact bounded paint/content contract");
  const ports = new Map(intent.ports.map((port) => [port.id, port]));
  for (const port of intent.ports) {
    if (port.output) validateOutput(port, capture);
    if (
      port.kind === "accessible-speech" &&
      ports.get(port.visibleCounterpart)?.kind !== "visible-content"
    )
      throw new Error("Speech lacks its exact visible content counterpart");
  }
  for (const effect of intent.effects) {
    if (effect.domain && !effect.samples)
      throw new Error("Missing exact effect state observations");
    if (effect.samples) {
      const states =
        effect.domain.kind === "finite"
          ? effect.domain.states
          : effect.domain.boundaryStates;
      for (const sample of effect.samples) {
        if (effect.kind === "numeric-computation")
          validateBinary64(sample.expected, sample.expectedBinary64);
        same(
          sample.inputs,
          states.find(({ name }) => name === sample.state)?.inputs,
          "Effect sample inputs differ from declared state",
        );
        if (
          !effect.fixtures.some(
            (fixture) => fixtureKey(fixture) === fixtureKey(sample.fixture),
          )
        )
          throw new Error("Effect sample fixture is unbound");
      }
    }
    validateEffect(effect, capture);
    const contentIds =
      effect.kind === "numeric-computation"
        ? effect.outputs.flatMap(({ contentPorts }) => contentPorts)
        : (effect.contentPorts ?? []);
    for (const id of contentIds)
      if (ports.get(id)?.kind !== "visible-content")
        throw new Error("Visible mathematical effect lacks a content port");
    if (effect.domain) {
      const states =
        effect.domain.kind === "finite"
          ? effect.domain.states
          : effect.domain.boundaryStates;
      same(
        effect.samples
          ? effect.samples.map(({ state }) => state).sort()
          : effect.fixtures.map(({ case: name }) => name).sort(),
        states.map(({ name }) => name).sort(),
        "Effect fixtures must cover its exact named domain states",
      );
    }
  }
  if (
    unit.delegatedAuthority ||
    intent.ports.some(({ kind }) => kind === "core-occurrence")
  ) {
    const core = await coreEvidence(capture.root);
    if (!core.digest) throw new Error("Strict core authority missing");
    const catalogue = await readCatalogue(capture.root);
    for (const port of intent.ports.filter(
      ({ kind }) => kind === "core-occurrence",
    )) {
      const entry = catalogue.entries.find(({ occurrences }) =>
        occurrences.some(
          (row) =>
            row.file === port.catalogue.file && row.pointer === port.pointer,
        ),
      );
      if (
        !entry ||
        port.producer.file !== port.catalogue.file ||
        capture.sourceMap.get(port.catalogue.file)?.sha256 !==
          port.catalogue.sha256 ||
        sha256(entry.text) !== port.valueSha256
      )
        throw new Error("Core occurrence/value path changed");
    }
  }
  if (
    !path
      .resolve(capture.root, receipt.report.file)
      .startsWith(
        path.join(capture.root, "docs/research/public-math-v2") + path.sep,
      )
  )
    throw new Error("Report escapes its canonical evidence directory");
  const report = await checkedFile(capture, receipt.report, observed);
  const lines = report.split("\n");
  const bodyStart = report.indexOf("\n\n");
  if (
    lines[0] !== "public-math-report-v2" ||
    bodyStart < 0 ||
    report.slice(bodyStart + 2).trim().length < 30
  )
    throw new Error("Missing actual complete-file report");
  const header = reportHeaderSchema.parse(JSON.parse(lines[1]));
  same(
    header,
    {
      intentDigest: receipt.intentDigest,
      reviewer: receipt.report.reviewer,
      coverage: intent.coverage,
      ownedFile: intent.file,
      dependencyDigest: hashValue(intent.dependencies),
      authority: intent.authority,
    },
    "Independent report does not bind the exact local intent",
  );
  if (report.includes(receipt.report.sha256))
    throw new Error("Report contains its own byte hash");
  return {
    file: intent.file.file,
    intentDigest: receipt.intentDigest,
    report: receipt.report,
    requiredCases: collectCases(intent),
    claim: "local-evidence-consistent-not-source-acceptance",
  };
}

export async function validateLocalEvidence(capture, raw) {
  const evidence = savedEvidenceSchema.parse(raw);
  same(
    evidence.receipts.map(({ intent }) => intent.file.file).sort(),
    capture.plan.files.map(({ file }) => file).sort(),
    "Missing or stale complete-file ownership",
  );
  if (capture.plan.structuralRefusals.length)
    throw new Error("Structural source refusals cannot be waived by review");
  const observed = new Map();
  const receipts = [];
  for (const receipt of evidence.receipts)
    receipts.push(await validateLocalReceipt(capture, receipt, observed));
  await assertSourceCurrent(capture);
  for (const [file, sha256] of observed)
    await checkedFile(capture, { file, sha256 }, new Map());
  return {
    status: "local-evidence-consistent",
    semanticApproval: false,
    receipts,
  };
}

export async function readSavedEvidence(capture) {
  const absolute = path.join(capture.root, savedEvidenceFile);
  try {
    if (
      (await realpath(absolute)) !== absolute ||
      !(await lstat(absolute)).isFile()
    )
      throw new Error("Saved evidence boundary violation");
    const bytes = await readFile(absolute);
    const observed = new Map();
    await checkedFile(
      capture,
      { file: savedEvidenceFile, sha256: sha256(bytes) },
      observed,
    );
    const evidence = savedEvidenceSchema.parse(JSON.parse(bytes));
    return { evidence, sha256: sha256(bytes) };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
