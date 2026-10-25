import fs from "node:fs/promises";
import path from "node:path";
import { buildIdentity } from "../../algebra-identity.mjs";
import { directDependencies } from "../direct-dependencies.mjs";
import { canonical, hashValue } from "../public-math/identity.mjs";
import { sha256, validateTex } from "../math-presentation.mjs";
import { validateRegistrationSource } from "./fixtures.mjs";
import { captureSource } from "./source.mjs";
import { binary64Values, validateBinary64 } from "./numeric.mjs";
import { sourceAcceptanceSchema } from "./schema.mjs";
import { readSelectedRecording } from "./execution-state.mjs";
import {
  buildSchema,
  executionIndexSchema,
  checksSchema,
  runSchema,
} from "./execution-schema.mjs";

export const buildEvidenceFile = "dist/public-math-build.json";
const same = (actual, expected, label) => {
  if (canonical(actual) !== canonical(expected)) throw new Error(label);
};

export async function executionSnapshot(root, capture) {
  capture ??= await captureSource(root);
  const dependencies = directDependencies(root);
  return {
    sourceSetDigest: capture.plan.sourceSetDigest,
    contractDigest: capture.plan.contractDigest,
    graphDigest: capture.plan.graphDigest,
    identity: buildIdentity(root),
    dependencies: dependencies.digest,
  };
}

export async function outputManifest(root, observed) {
  root = await fs.realpath(root);
  const rows = [];
  const visit = async (file) => {
    const absolute = path.join(root, "dist", file);
    const info = await fs.lstat(absolute);
    if (info.isSymbolicLink())
      throw new Error("Build output symlinks are unsupported");
    if ((await fs.realpath(absolute)) !== absolute)
      throw new Error("Build output boundary violation");
    if (info.isDirectory()) {
      const children = (await fs.readdir(absolute)).sort();
      observed?.set(absolute, { kind: "directory", children });
      for (const child of children)
        await visit(file ? `${file}/${child}` : child);
    } else if (info.isFile()) {
      const bytes = await fs.readFile(absolute);
      observed?.set(absolute, { kind: "file", sha256: sha256(bytes) });
      if (file === "public-math-build.json") return;
      rows.push({ file, sha256: sha256(bytes), bytes: bytes.length });
    } else throw new Error("Unsupported build output entry");
  };
  await visit("");
  return rows.sort((a, b) => a.file.localeCompare(b.file));
}

async function readEvidence(root, reference, observed) {
  if (
    !/^outputs\/public-math-runs\/[0-9a-f-]{36}\//.test(reference.file) &&
    reference.file !== buildEvidenceFile
  )
    throw new Error("Execution evidence lies outside canonical run directory");
  const absolute = path.resolve(root, reference.file);
  if (
    !absolute.startsWith(root + path.sep) ||
    (await fs.realpath(absolute)) !== absolute ||
    !(await fs.lstat(absolute)).isFile()
  )
    throw new Error("Execution evidence boundary violation");
  const bytes = await fs.readFile(absolute);
  if (reference.sha256 && sha256(bytes) !== reference.sha256)
    throw new Error("Execution evidence bytes changed");
  observed?.set(path.join(root, reference.file), {
    kind: "file",
    sha256: sha256(bytes),
  });
  return JSON.parse(bytes);
}

export async function validateBuild(capture, acceptanceDigest, raw, observed) {
  const build = buildSchema.parse(raw);
  if (
    build.command.length !== 3 ||
    build.command[2] !== "build" ||
    !build.command[1].endsWith("/node_modules/vinext/dist/cli.js") ||
    !/(?:^|[\\/])node(?:\.exe)?$/.test(build.command[0])
  )
    throw new Error(
      "Build evidence does not bind the actual complete outer Vinext command",
    );
  if (build.sourceAcceptanceDigest !== acceptanceDigest)
    throw new Error("Build belongs to another source acceptance");
  same(
    build.before,
    build.after,
    "Build source/configuration/direct dependencies drifted",
  );
  same(
    build.after,
    await executionSnapshot(capture.root, capture),
    "Build inputs differ from current source/configuration/direct dependencies",
  );
  same(
    build.identity,
    build.after.identity,
    "Compiled build identity differs from accepted build inputs",
  );
  const manifest = await outputManifest(capture.root, observed);
  const compiled = JSON.parse(
    await fs.readFile(
      path.join(capture.root, "dist/build-identity.json"),
      "utf8",
    ),
  );
  same(compiled, build.identity, "Stale compiled identity");
  const compilerManifest = JSON.parse(
    await fs.readFile(
      path.join(capture.root, "dist/client/.vite/manifest.json"),
      "utf8",
    ),
  );
  same(
    compilerManifest,
    build.clientManifest,
    "Actual client compiler manifest changed",
  );
  for (const chunk of Object.values(build.clientManifest)) {
    for (const file of [
      chunk.file,
      ...(chunk.css ?? []),
      ...(chunk.assets ?? []),
    ])
      if (!build.manifest.some((asset) => asset.file === `client/${file}`))
        throw new Error("Compiler manifest refers to absent output bytes");
    for (const key of [
      ...(chunk.imports ?? []),
      ...(chunk.dynamicImports ?? []),
    ])
      if (!Object.hasOwn(build.clientManifest, key))
        throw new Error("Compiler manifest has an unresolved chunk reference");
  }
  if (hashValue(build.manifest) !== build.manifestDigest)
    throw new Error("Build manifest digest differs");
  same(
    manifest,
    build.manifest,
    "Incomplete or changed output manifest, including lazy chunks, CSS and fonts",
  );
  return build;
}

function checkTarget(run, identity) {
  if (run.runner !== "playwright") return;
  if (!run.targetBefore || !run.targetAfter)
    throw new Error("Missing acknowledged exclusive owned target");
  same(
    run.targetBefore,
    run.targetAfter,
    "Owned target changed before/after run",
  );
  const target = run.targetBefore;
  if (
    target.acknowledgedRunId !== target.runId ||
    !/^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):[0-9]+$/.test(target.origin)
  )
    throw new Error("Unowned or mismatched actual target acknowledgement");
  same(
    target.identity,
    identity,
    "Actual target differs from built source/dependency identity",
  );
}

function registrationMatches(registration, fixture, position) {
  return (
    registration.file === fixture.source.file &&
    registration.sourceSha256 === fixture.source.sha256 &&
    registration.line === position.line &&
    registration.column === position.column &&
    canonical(registration.titlePath) === canonical(fixture.titlePath) &&
    registration.project === fixture.project &&
    registration.repeat === fixture.repeat
  );
}
export function canonicalRegistrationIdentity(runner, registration) {
  return canonical([
    runner,
    registration.file,
    registration.sourceSha256,
    registration.line,
    registration.column,
    registration.titlePath,
    registration.project,
    registration.repeat,
  ]);
}

function checkSegments(segments) {
  for (const segment of segments)
    if (segment.kind === "math") validateTex(segment.tex);
}
function observedInputs(requirement, observation) {
  same(
    observation.inputs,
    requirement.inputs,
    "Wrong actual producer or native input state",
  );
  if (requirement.presentation) {
    if (
      !observation.region ||
      observation.region.selector !== requirement.presentation.region ||
      observation.region.mode !== "rendered"
    )
      throw new Error("Missing exact owned rendered region");
    same(
      observation.controls.map(({ path, selector, read }) => ({
        path,
        selector,
        read,
      })),
      requirement.presentation.inputs,
      "Native input reads differ from declared control bindings",
    );
    for (const control of observation.controls) {
      const wanted = requirement.inputs[control.path];
      if (!Object.hasOwn(requirement.inputs, control.path))
        throw new Error("Unknown observed native input");
      const value =
        typeof wanted === "number" ? Number(control.value) : control.value;
      if (!Object.is(value, wanted))
        throw new Error(
          "Actual native control value differs from declared input",
        );
    }
    if (
      Object.keys(requirement.inputs).some(
        (key) => !observation.controls.some(({ path }) => path === key),
      )
    )
      throw new Error("Missing actual native input read");
  }
  same(
    observation.producer,
    requirement.producer,
    "Wrong actual producer/formatter identity",
  );
}
function close(actual, expected, tolerance) {
  if (typeof expected === "number") {
    if (
      typeof actual !== "number" ||
      !Number.isFinite(actual) ||
      Math.abs(actual - expected) > tolerance
    )
      throw new Error(
        "SVG coordinate differs from independent ordered expectation",
      );
    return;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length)
      throw new Error("SVG ordered pair membership differs");
    expected.forEach((value, i) => close(actual[i], value, tolerance));
    return;
  }
  if (!actual || typeof actual !== "object")
    throw new Error("SVG coordinate record missing");
  same(
    Object.keys(actual).sort(),
    Object.keys(expected).sort(),
    "SVG coordinate keys differ",
  );
  for (const key of Object.keys(expected))
    close(actual[key], expected[key], tolerance);
}

export async function validateExecution(
  capture,
  sourceAcceptance,
  acceptanceDigest,
  index,
  runs,
  build,
  { participant = null } = {},
) {
  sourceAcceptance = sourceAcceptanceSchema.parse(sourceAcceptance);
  if (hashValue(sourceAcceptance) !== acceptanceDigest)
    throw new Error("Source acceptance bytes differ from digest");
  index = executionIndexSchema.parse(index);
  if (index.sourceAcceptanceDigest !== acceptanceDigest)
    throw new Error("Execution belongs to another source acceptance");
  const current = await executionSnapshot(capture.root, capture);
  const registrations = [],
    observations = [],
    usedInvocations = new Set(),
    logicalRegistrations = new Map(),
    shardSets = new Map();
  if (participant) {
    same(
      runs.map(({ runner, selection }) => ({ runner, selection })),
      participant.members,
      "Participant actual invocations differ from plan",
    );
  }
  for (const raw of runs) {
    const run = runSchema.parse(raw);
    if (usedInvocations.has(run.invocation))
      throw new Error("Duplicate runner invocation");
    usedInvocations.add(run.invocation);
    if (
      run.sourceAcceptanceDigest !== acceptanceDigest ||
      run.buildEvidenceDigest !== index.build.sha256 ||
      run.exitCode !== 0 ||
      run.interrupted ||
      run.recorderErrors.length ||
      (!participant && run.selection.filtered)
    )
      throw new Error(
        "Partial, failed, interrupted or stale actual runner evidence",
      );
    if (run.runtime !== (run.runner === "node:test" ? "v24.19.0" : "1.63.0"))
      throw new Error("Unsupported actual runner version");
    same(
      run.snapshot,
      run.snapshotAfter,
      "Runner source/configuration/dependencies drifted during execution",
    );
    same(
      run.snapshotAfter,
      current,
      "Runner source/configuration/dependency snapshot changed",
    );
    checkTarget(run, build.identity);
    if (run.runner === "playwright") {
      if (
        !(
          participant?.scope === "partial" &&
          participant.target?.kind === "borrowed"
        ) &&
        !index.cleanup.some(({ runId }) => runId === run.targetBefore.runId)
      )
        throw new Error("Missing owned run cleanup and closed port");
      const shard = run.selection.shard ?? { index: 1, total: 1 };
      if (shard.index > shard.total) throw new Error("Invalid shard selection");
      const key = `${run.runner}:${shard.total}`;
      const selected = shardSets.get(key) ?? new Set();
      if (selected.has(shard.index)) throw new Error("Duplicate browser shard");
      selected.add(shard.index);
      shardSets.set(key, selected);
    }
    const ids = new Set(run.registrations.map(({ id }) => id));
    for (const registration of run.registrations) {
      const key = canonicalRegistrationIdentity(run.runner, registration);
      if (logicalRegistrations.has(key))
        throw new Error(
          `Duplicate logical registration: ${logicalRegistrations.get(key)} and ${run.invocation}/${registration.id}`,
        );
      logicalRegistrations.set(key, `${run.invocation}/${registration.id}`);
      const attempts = run.attempts.filter(({ id }) => id === registration.id);
      if (
        attempts.length !== 1 ||
        attempts[0].retry !== 0 ||
        attempts[0].status !== "passed" ||
        attempts[0].expectedStatus !== "passed" ||
        attempts[0].skip ||
        attempts[0].todo ||
        attempts[0].errors.length
      )
        throw new Error(
          "Missing, skipped, todo, expected-fail, flaky or interrupted real case attempt",
        );
      registrations.push({ run, registration });
    }
    if (run.attempts.some(({ id }) => !ids.has(id)))
      throw new Error("Attempt has no actual registration");
    for (const observation of run.observations) {
      if (!ids.has(observation.caseId))
        throw new Error("Observation has no actual registered case");
      observations.push({ run, observation });
    }
    for (const resource of run.resources) {
      if (!ids.has(resource.caseId))
        throw new Error("Resource has no actual case");
      const asset = build.manifest.find(({ file }) => file === resource.file);
      const target = run.targetBefore;
      const url = target && new URL(resource.url);
      if (
        !asset ||
        !url ||
        url.origin !== target.origin ||
        url.search ||
        url.hash ||
        url.pathname !== `/${resource.file.replace(/^client\//, "")}` ||
        resource.sha256 !== asset.sha256 ||
        resource.bytes !== asset.bytes
      )
        throw new Error(
          "Actual public resource body differs from complete manifest",
        );
    }
  }
  if (shardSets.size > 1)
    throw new Error("Incompatible browser shard universes");
  for (const [key, selected] of participant ? [] : shardSets)
    if (selected.size !== Number(key.split(":").at(-1)))
      throw new Error("Missing browser shard");
  if (!participant && sourceAcceptance.requiredCases.length === 0)
    throw new Error(
      "Executed presentation requires nonzero actual required cases",
    );
  const matched = new Map();
  for (const { id, declaration: fixture } of sourceAcceptance.requiredCases) {
    const text = await fs.readFile(
      path.join(capture.root, fixture.source.file),
      "utf8",
    );
    const position = validateRegistrationSource(fixture, text);
    const matches = registrations.filter(
      ({ run, registration }) =>
        run.runner === fixture.runner &&
        registrationMatches(registration, fixture, position),
    );
    if (participant && matches.length === 0) continue;
    if (matches.length !== 1)
      throw new Error(
        "Required fixture has zero or ambiguous actual registrations",
      );
    matched.set(id, matches[0]);
  }
  const seen = new Set();
  for (const requirement of sourceAcceptance.observations) {
    const registration = matched.get(requirement.fixture);
    if (participant && !registration) continue;
    const matches = observations.filter(
      ({ observation }) => observation.id === requirement.id,
    );
    if (matches.length !== 1)
      throw new Error("Missing or duplicate input-state observation");
    const { run, observation } = matches[0];
    if (
      !registration ||
      run.invocation !== registration.run.invocation ||
      observation.caseId !== registration.registration.id
    )
      throw new Error("Observation belongs to wrong actual case");
    observedInputs(requirement, observation);
    if (requirement.kind === "content") {
      if (observation.kind !== "content")
        throw new Error("Missing rendered content observation");
      checkSegments(observation.segments);
      same(
        observation.segments,
        requirement.expected.segments,
        "Observed ordered whole prose/math differs from independent expected output",
      );
    } else if (requirement.kind === "svg-geometry") {
      if (
        observation.kind !== "svg-geometry" ||
        observation.viewBox !== requirement.viewBox
      )
        throw new Error("Wrong SVG figure/viewBox");
      same(
        observation.writers.map(({ id, tag, selector }) => ({
          id,
          tag,
          selector,
        })),
        requirement.writers,
        "Wrong SVG writer membership or order",
      );
      close(
        Object.fromEntries(
          observation.writers.map(({ id, value }) => [id, value]),
        ),
        requirement.expected,
        requirement.tolerance,
      );
    } else {
      if (
        (requirement.kind === "producer" && observation.kind !== "producer") ||
        (requirement.kind !== "producer" &&
          (observation.kind !== "effect" ||
            observation.effectKind !== requirement.kind))
      )
        throw new Error("Missing actual producer/effect output");
      same(
        observation.value,
        requirement.expected,
        "Actual producer/formatter/effect return differs from expected sample",
      );
      if (observation.kind === "effect") {
        validateBinary64(observation.value, observation.binary64);
        if (requirement.kind === "numeric-computation")
          same(
            observation.binary64,
            requirement.expectedBinary64,
            "Actual numeric binary64 bytes differ from independent expectation",
          );
        else
          same(
            observation.binary64,
            binary64Values(observation.value),
            "Actual effect numeric bytes differ",
          );
      }
    }
    for (const source of requirement.presentation?.resources ?? []) {
      const files = source.startsWith("public/")
        ? [`client/${source.slice(7)}`]
        : Object.entries(build.clientManifest)
            .filter(([key, chunk]) => key === source || chunk.src === source)
            .map(([, chunk]) => `client/${chunk.file}`);
      if (
        files.length !== 1 ||
        !run.resources.some(
          (resource) =>
            resource.caseId === observation.caseId &&
            resource.file === files[0],
        )
      )
        throw new Error(
          "Missing required logical source resource or actual public body",
        );
    }
    seen.add(requirement.id);
  }
  if (observations.some(({ observation }) => !seen.has(observation.id)))
    throw new Error("Unknown observation identity");
  return {
    ok: true,
    requiredCases: matched.size,
    observations: seen.size,
    claim: "required-cases-and-declared-model-boundaries-only",
    nativeSignIn: "unverified",
  };
}

export async function validateParticipant(
  capture,
  sourceAcceptance,
  acceptanceDigest,
  index,
  runs,
  build,
  request,
) {
  return validateExecution(
    capture,
    sourceAcceptance,
    acceptanceDigest,
    index,
    runs,
    build,
    { participant: request },
  );
}

function validateNamedChecks(checks, expected) {
  checks = checksSchema.parse(checks);
  if (
    checks.some(
      (check) =>
        check.status !== "passed" ||
        (Object.hasOwn(check, "exitCode") && check.exitCode !== 0) ||
        check.signal ||
        check.error ||
        (Array.isArray(check.errors) && check.errors.length),
    )
  )
    throw new Error("A durable named verification check failed");
  same(
    checks.map(({ name }) => name).sort(),
    [...expected].sort(),
    "Durable named verification checks differ from participant plan",
  );
}

async function checkBorrowedOwner({ admission, root }, index, runs, observed) {
  if (admission.request.target?.kind === "borrowed") {
    const reference = admission.request.target.owner;
    if (!index.targetOwner || index.targetOwner.sha256 !== reference.sha256)
      throw new Error("Missing exact admitted borrowed owner bytes");
    const marker = await readEvidence(root, index.targetOwner, observed);
    for (const raw of runs.filter(({ runner }) => runner === "playwright")) {
      const run = runSchema.parse(raw),
        target = run.targetBefore,
        absolute = path.resolve(root, reference.file);
      if (
        !target ||
        !absolute.startsWith(path.join(root, "outputs") + path.sep) ||
        marker.version !== 1 ||
        marker.status !== "running" ||
        marker.kind !== "built" ||
        marker.root !== root ||
        marker.ownerFile !== absolute ||
        marker.runDir !== path.dirname(absolute) ||
        marker.runId !== target.runId ||
        marker.origin !== target.origin ||
        admission.request.target.origin !== target.origin ||
        marker.pid < 2 ||
        marker.pid !== target.pid ||
        marker.processIdentity !== target.processIdentity ||
        target.ownerFile !== reference.file ||
        target.ownerSha256 !== reference.sha256
      )
        throw new Error(
          "Borrowed exclusive target differs from admitted owner",
        );
      if (!index.cleanup.some(({ runId }) => runId === target.runId)) {
        if (
          (await fs.realpath(absolute)) !== absolute ||
          !(await fs.lstat(absolute)).isFile()
        )
          throw new Error("Borrowed owner boundary violation");
        const bytes = await fs.readFile(absolute);
        if (sha256(bytes) !== reference.sha256)
          throw new Error("Borrowed running owner changed before closure");
        observed.set(absolute, { kind: "file", sha256: reference.sha256 });
      }
    }
  } else if (index.targetOwner)
    throw new Error("Unexpected borrowed owner for created target");
}

export async function readParticipantEvidence(
  capture,
  sourceAcceptance,
  acceptanceDigest,
  participant,
  observed = new Map(),
) {
  const { admission, root } = participant;
  const index = executionIndexSchema.parse(
    await readEvidence(root, participant.index, observed),
  );
  if (
    index.version !== "public-math-execution-v3" ||
    index.runId !== admission.runId ||
    !index.binding ||
    !index.checks ||
    !index.descriptors ||
    !index.invocationChecks
  )
    throw new Error(
      "Current participant lacks immutable v3 binding/checks/descriptors",
    );
  const binding = await readEvidence(root, index.binding, observed);
  same(
    binding,
    {
      ownership: {
        version: "public-math-binding-v3",
        admission: participant.admissionReference,
        runId: admission.runId,
        cohort: admission.cohort,
        slot: admission.slot,
      },
      sourceAcceptanceDigest: acceptanceDigest,
      build: index.build,
    },
    "Participant admission/source/build binding differs",
  );
  const retained = await readEvidence(root, index.checks, observed);
  validateNamedChecks(retained.checks, admission.request.checks);
  if (!Array.isArray(retained.envelopes))
    throw new Error("Missing retained check envelope references");
  const previousChecks = [];
  for (const reference of retained.envelopes) {
    const envelope = await readEvidence(root, reference, observed);
    if (envelope.ok !== true || envelope.command !== "verify")
      throw new Error("Retained actual check command did not pass");
    previousChecks.push(...checksSchema.parse(envelope.checks));
  }
  same(
    retained.checks.slice(0, previousChecks.length),
    previousChecks,
    "Retained actual check envelope results differ",
  );
  const build = await validateBuild(
    capture,
    acceptanceDigest,
    await readEvidence(capture.root, index.build, observed),
    observed,
  );
  const runs = [];
  for (const reference of index.runs)
    runs.push(await readEvidence(root, reference, observed));
  if (index.invocationChecks.length !== runs.length)
    throw new Error("Missing durable actual named runner result");
  if (index.descriptors.length !== runs.length)
    throw new Error("Missing actual invocation descriptor");
  for (let i = 0; i < runs.length; i++) {
    const descriptor = await readEvidence(root, index.descriptors[i], observed);
    const run = runs[i];
    const actualCheck = await readEvidence(
      root,
      index.invocationChecks[i],
      observed,
    );
    const name =
      run.runner === "node:test"
        ? "mathematical-and-content-suites"
        : "browser-interactions";
    if (actualCheck.name !== name)
      throw new Error("Actual named runner result differs");
    same(
      retained.checks.find((check) => check.name === name),
      actualCheck,
      "Durable callback checks differ from actual runner result",
    );
    same(run.binding, binding.ownership, "Runner admission binding differs");
    if (
      run.runId !== admission.runId ||
      descriptor.invocation !== run.invocation ||
      descriptor.record.invocation !== run.invocation
    )
      throw new Error("Actual runner invocation differs from descriptor");
    for (const key of [
      "binding",
      "runId",
      "sourceAcceptanceDigest",
      "buildEvidenceDigest",
      "snapshot",
      "selection",
    ])
      same(
        descriptor.record[key],
        run[key],
        `Runner descriptor ${key} differs`,
      );
    if (
      descriptor.root !== run.targetBefore?.root &&
      run.runner === "playwright"
    )
      throw new Error("Runner descriptor target root differs");
    if (
      descriptor.retainedOutput !== index.runs[i].file ||
      path.dirname(descriptor.output) !==
        path.join(
          descriptor.root,
          `outputs/public-math-runs/${admission.runId}`,
        )
    )
      throw new Error("Runner output differs from descriptor");
  }
  for (const cleanup of index.cleanup) {
    const marker = await readEvidence(root, cleanup.owner, observed);
    const run = runs.find((run) => run.targetBefore?.runId === cleanup.runId);
    if (
      !run ||
      marker.runId !== cleanup.runId ||
      marker.status !== "stopped" ||
      marker.root !== run.targetBefore.root ||
      marker.pid !== run.targetBefore.pid ||
      marker.processIdentity !== run.targetBefore.processIdentity ||
      marker.origin !== run.targetBefore.origin
    )
      throw new Error("Stale or mismatched cleanup marker");
  }
  await checkBorrowedOwner(participant, index, runs, observed);
  await validateParticipant(
    capture,
    sourceAcceptance,
    acceptanceDigest,
    index,
    runs,
    build,
    admission.request,
  );
  return { index, runs, build };
}

export async function checkExecution(
  capture,
  sourceAcceptance,
  acceptanceDigest,
) {
  const observed = new Map();
  try {
    const selected = await readSelectedRecording(capture.root);
    const parts = [];
    for (const participant of selected.participants)
      parts.push(
        await readParticipantEvidence(
          capture,
          sourceAcceptance,
          acceptanceDigest,
          participant,
          observed,
        ),
      );
    const first = parts[0];
    for (const part of parts)
      same(
        part.index.build,
        first.index.build,
        "Selected participant build references differ",
      );
    const union = {
      ...first.index,
      runs: parts.flatMap((part) => part.index.runs),
      cleanup: parts.flatMap((part) => part.index.cleanup),
    };
    const result = await validateExecution(
      capture,
      sourceAcceptance,
      acceptanceDigest,
      union,
      parts.flatMap((part) => part.runs),
      first.build,
    );
    await validateBuild(
      await captureSource(capture.root),
      acceptanceDigest,
      first.build,
    );
    for (const [file, entry] of observed) {
      const info = await fs.lstat(file);
      if ((await fs.realpath(file)) !== file || info.isSymbolicLink())
        throw new Error("Execution evidence changed during read");
      if (entry.kind === "directory") {
        if (!info.isDirectory())
          throw new Error("Build output directory changed during read");
        same(
          (await fs.readdir(file)).sort(),
          entry.children,
          "Build output membership changed during read",
        );
      } else if (
        !info.isFile() ||
        sha256(await fs.readFile(file)) !== entry.sha256
      )
        throw new Error("Execution evidence changed during read");
    }
    await selected.guard();
    return result;
  } catch (error) {
    return {
      ok: false,
      pending: [{ kind: "execution-unverified", reason: error.message }],
    };
  }
}
