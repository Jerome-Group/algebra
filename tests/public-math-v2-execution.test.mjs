import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { checkPublicMath } from "../scripts/lib/public-math-v2.mjs";
import {
  captureSource,
  savedEvidenceFile,
} from "../scripts/lib/public-math-v2/source.mjs";
import { validateLocalReceipt } from "../scripts/lib/public-math-v2/reviews.mjs";
import { validateRegistrationSource } from "../scripts/lib/public-math-v2/fixtures.mjs";
import {
  executionSnapshot,
  validateBuild,
  checkExecution,
} from "../scripts/lib/public-math-v2/execution.mjs";
import { buildIdentity } from "../scripts/algebra-identity.mjs";
import { directDependencies } from "../scripts/lib/direct-dependencies.mjs";
import { sha256 } from "../scripts/lib/math-presentation.mjs";
import { hashValue } from "../scripts/lib/public-math/identity.mjs";
import { effectSchema } from "../scripts/lib/public-math-v2/schema.mjs";
import { validateEffect } from "../scripts/lib/public-math-v2/effects.mjs";
import { runSchema } from "../scripts/lib/public-math-v2/execution-schema.mjs";
import { recordVerification } from "../scripts/lib/public-math-v2/session.mjs";
import { buildPublicMath } from "../scripts/public-math-build.mjs";

import {
  put,
  sourceRef,
  syntheticSource,
  syntheticExecution,
  validate,
} from "./helpers/public-math-execution.mjs";

test("SYNTHETIC complete source acceptance is acyclic and always verifies strict core", async (t) => {
  const data = await syntheticSource(t);
  assert.equal(data.accepted.satisfiesRequirement, true);
  assert.equal(data.accepted.nativeSignIn, "unverified");
  assert.equal(data.accepted.releaseApproval, false);
  await assert.rejects(fs.access(path.join(data.root, "dist")));
  const executed = await checkPublicMath({
    root: data.root,
    require: "executed-presentation",
  });
  assert.equal(executed.kind, "source-reviewed");
  assert.equal(executed.satisfiesRequirement, false);
  await put(
    data.root,
    "docs/research/synthetic-core.md",
    "Changed independent strict core report",
  );
  const stale = await checkPublicMath({
    root: data.root,
    require: "source-attestation",
  });
  assert.equal(stale.kind, "blocked");
  assert.match(stale.pending[0].reason, /report bytes/);
});
test("SYNTHETIC generated strict-core source cannot drift without a core port", async (t) => {
  const data = await syntheticSource(t);
  await put(data.root, "lib/algebra/math-presentation.generated.ts", "stale");
  const stale = await checkPublicMath({
    root: data.root,
    require: "source-attestation",
  });
  assert.equal(stale.satisfiesRequirement, false);
  assert.match(stale.pending[0].reason, /generated presentation/);
});
test("SYNTHETIC real catalogue occurrence/value delegation rejects a different pointer or producer", async (t) => {
  const data = await syntheticSource(t),
    receipt = data.receipts.find(
      ({ intent }) => intent.file.file === "app/page.tsx",
    );
  const catalogueFile = "lib/algebra/lessons.json",
    catalogue = await sourceRef(data.root, catalogueFile),
    consumer = receipt.intent.ports[0].consumer;
  const port = {
    id: "core",
    kind: "core-occurrence",
    producer: catalogue,
    consumer,
    transforms: [],
    catalogue: { file: catalogueFile, sha256: catalogue.sha256 },
    pointer: "/0/title",
    valueSha256: sha256("A group"),
    authority: "existing-strict-core-verifier",
  };
  for (const change of [
    { pointer: "/0/missing" },
    { valueSha256: sha256("Wrong value") },
    { producer: consumer },
  ]) {
    const altered = structuredClone(receipt);
    altered.intent.ports.push({ ...port, ...change });
    altered.intentDigest = hashValue(altered.intent);
    await assert.rejects(
      validateLocalReceipt(data.capture, altered),
      /Core occurrence/,
    );
  }
});
test("SYNTHETIC exact runner, whole region, public body and current build satisfy the bounded validator", async (t) => {
  const data = await syntheticExecution(t);
  await validateBuild(data.capture, data.accepted.acceptanceDigest, data.build);
  assert.equal((await validate(data)).ok, true);
});

test("SYNTHETIC distinct state observations share one genuinely declared composite case", async (t) => {
  const data = await syntheticExecution(t);
  const original = data.accepted.sourceAcceptance.observations[0];
  data.accepted.sourceAcceptance.observations = [-1, 0, 1].map((x) => ({
    ...structuredClone(original),
    id: hashValue({ syntheticCompositeState: x }),
    state: `x=${x}`,
    inputs: { x },
    expected: {
      raw: String(x),
      segments: [{ kind: "prose", text: String(x) }],
    },
    presentation: {
      ...original.presentation,
      inputs: [
        { path: "x", selector: "[data-synthetic-input]", read: "number" },
      ],
    },
  }));
  const observed = data.run.observations[0];
  data.run.observations = data.accepted.sourceAcceptance.observations.map(
    (requirement) => ({
      ...structuredClone(observed),
      id: requirement.id,
      inputs: requirement.inputs,
      controls: [
        { ...requirement.presentation.inputs[0], value: requirement.inputs.x },
      ],
      segments: requirement.expected.segments,
    }),
  );
  const digest = hashValue(data.accepted.sourceAcceptance);
  data.accepted.acceptanceDigest = digest;
  data.index.sourceAcceptanceDigest = digest;
  data.run.sourceAcceptanceDigest = digest;
  data.build.sourceAcceptanceDigest = digest;
  const result = await validate(data);
  assert.equal(result.requiredCases, 1);
  assert.equal(result.observations, 3);
  const missing = structuredClone(data.run);
  missing.observations.pop();
  await assert.rejects(validate(data, missing), /Missing or duplicate/);
  const wrong = structuredClone(data.run);
  wrong.observations[0].controls[0].value = 99;
  await assert.rejects(validate(data, wrong), /native control value/);
});
for (const [name, change] of [
  [
    "zero registrations",
    (run) => {
      run.registrations = [];
      run.attempts = [];
    },
  ],
  [
    "two matching registrations",
    (run) => {
      const row = {
        ...run.registrations[0],
        id: run.registrations[0].id + "-duplicate",
      };
      run.registrations.push(row);
      run.attempts.push({ ...run.attempts[0], id: row.id });
    },
  ],
  [
    "duplicate observation",
    (run) => run.observations.push(structuredClone(run.observations[0])),
  ],
  [
    "missing observation",
    (run) => {
      run.observations = [];
    },
  ],
  [
    "wrong case input state",
    (run) => {
      run.observations[0].inputs = { x: 999 };
    },
  ],
  [
    "wrong actual producer",
    (run) => {
      run.observations[0].producer.source.nodeSha256 = "0".repeat(64);
    },
  ],
  [
    "wrong whole output",
    (run) => {
      run.observations[0].segments = [
        { kind: "prose", text: "Wrong coherent output" },
      ];
    },
  ],
  [
    "nearby region",
    (run) => {
      run.observations[0].region.selector = "body";
    },
  ],
  [
    "hidden region",
    (run) => {
      run.observations[0].region.visible = false;
    },
  ],
  [
    "visibility all",
    (run) => {
      run.observations[0].region.mode = "all";
    },
  ],
  [
    "skip",
    (run) => {
      run.attempts[0].skip = true;
    },
  ],
  [
    "todo",
    (run) => {
      run.attempts[0].todo = true;
    },
  ],
  [
    "expected failure",
    (run) => {
      run.attempts[0].expectedStatus = "failed";
    },
  ],
  [
    "flaky retry",
    (run) => {
      run.attempts.push({ ...run.attempts[0], retry: 1 });
    },
  ],
  [
    "interrupted",
    (run) => {
      run.interrupted = true;
    },
  ],
  [
    "wrong acknowledged owner",
    (run) => {
      run.targetBefore.acknowledgedRunId = randomUUID();
      run.targetAfter = structuredClone(run.targetBefore);
    },
  ],
  [
    "source-only identity",
    (run) => {
      delete run.targetBefore.identity.directDependencyDigest;
    },
  ],
  [
    "wrong actual target despite descriptive argv",
    (run) => {
      run.targetBefore.identity.sourceDigest = "0".repeat(64);
      run.targetAfter = structuredClone(run.targetBefore);
    },
  ],
  [
    "changed post-run target",
    (run) => {
      run.targetAfter.runId = randomUUID();
    },
  ],
  [
    "missing public body",
    (run) => {
      run.resources = [];
    },
  ],
  [
    "wrong public body bytes",
    (run) => {
      run.resources[0].sha256 = "0".repeat(64);
    },
  ],
  [
    "private API body",
    (run) => {
      run.resources[0].url = "http://127.0.0.1:5888/api/account";
    },
  ],
  [
    "missing shard",
    (run) => {
      run.selection.shard = { index: 1, total: 2 };
    },
  ],
  [
    "filtered suite",
    (run) => {
      run.selection.filtered = true;
    },
  ],
  [
    "metadata approval unknown key",
    (run) => {
      run.metadata = { sourceMatch: "matched" };
    },
  ],
])
  test(`SYNTHETIC execution refuses ${name}`, async (t) => {
    const data = await syntheticExecution(t);
    change(data.run);
    await assert.rejects(validate(data));
  });
for (const [name, change] of [
  [
    "before source drift",
    (data) => {
      data.build.before.sourceSetDigest = "0".repeat(64);
    },
  ],
  [
    "after dependency drift",
    (data) => {
      data.build.after.identity.directDependencyDigest = "0".repeat(64);
    },
  ],
  [
    "missing lazy chunk",
    async (data) => {
      await fs.rm(path.join(data.root, "dist/client/assets/synthetic.js"));
    },
  ],
  [
    "changed font",
    async (data) => {
      await put(data.root, "dist/client/assets/synthetic.woff2", "changed");
    },
  ],
  [
    "missing CSS",
    async (data) => {
      await fs.rm(path.join(data.root, "dist/client/assets/synthetic.css"));
    },
  ],
  [
    "stale compiled identity",
    async (data) => {
      await put(data.root, "dist/build-identity.json", {
        ...data.build.identity,
        sourceDigest: "0".repeat(64),
      });
    },
  ],
])
  test(`SYNTHETIC full outer-build evidence refuses ${name}`, async (t) => {
    const data = await syntheticExecution(t);
    await change(data);
    await assert.rejects(
      validateBuild(data.capture, data.accepted.acceptanceDigest, data.build),
    );
  });
test("SYNTHETIC failed latest binding cannot reuse an earlier execution", async (t) => {
  const data = await syntheticExecution(t);
  await put(data.root, "outputs/public-math-runs/latest.json", {
    version: "public-math-latest-v2",
    runId: data.index.runId,
    status: "failed",
    index: null,
  });
  const result = await checkExecution(
    data.capture,
    data.accepted.sourceAcceptance,
    data.accepted.acceptanceDigest,
  );
  assert.equal(result.ok, false);
  assert.match(result.pending[0].reason, /Current execution admission/);
});

test("SYNTHETIC a fresh attempt and refused build retire prior successful evidence before execution", async (t) => {
  const data = await syntheticExecution(t);
  await fs.rm(path.join(data.root, savedEvidenceFile));
  await assert.rejects(
    recordVerification(data.root, { layer: "math" }, (recording) =>
      recording.run("node:test", async () => ({
        name: "mathematical-and-content-suites",
        status: "passed",
      })),
    ),
    /Source acceptance missing/,
  );
  const journal = path.join(
    data.root,
    "outputs/public-math-runs/state-v3/local",
  );
  const entries = await fs.readdir(journal);
  assert.deepEqual(entries, ["1"]);
  assert.equal((await fs.readdir(path.join(journal, "1/failures"))).length, 1);
  const current = await checkExecution(
    data.capture,
    data.accepted.sourceAcceptance,
    data.accepted.acceptanceDigest,
  );
  assert.equal(current.ok, false);
  assert.match(current.pending[0].reason, /admitted failure/);
  await assert.rejects(
    buildPublicMath(data.root),
    /Public source attestation refused/,
  );
  await assert.rejects(
    fs.stat(path.join(data.root, "dist/public-math-build.json")),
    { code: "ENOENT" },
  );
});

test("SYNTHETIC direct coherence detects installed Next drift while source membership remains byte-identical", async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "math-direct-SYNTHETIC-"),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await put(root, "package.json", {
    dependencies: { next: "16.4.2" },
    devDependencies: {},
  });
  await put(root, "package-lock.json", {
    lockfileVersion: 3,
    packages: {
      "": { dependencies: { next: "16.4.2" }, devDependencies: {} },
      "node_modules/next": { version: "16.4.2", integrity: "synthetic" },
    },
  });
  await put(root, "node_modules/next/package.json", {
    name: "next",
    version: "16.4.2",
  });
  const before = buildIdentity(root);
  assert.equal(before.directDependencyCount, 1);
  await put(root, "node_modules/next/package.json", {
    name: "next",
    version: "16.3.8",
  });
  assert.throws(() => directDependencies(root), /mismatch/);
  assert.throws(() => buildIdentity(root), /mismatch/);
  await put(root, "node_modules/next/package.json", {
    name: "next",
    version: "16.4.2",
    description: "Different exact installed metadata",
  });
  const after = buildIdentity(root);
  assert.equal(after.sourceDigest, before.sourceDigest);
  assert.notEqual(after.directDependencyDigest, before.directDependencyDigest);
  await put(root, "package-lock.json", {
    lockfileVersion: 3,
    packages: { "": { dependencies: { next: "16.3.8" } } },
  });
  assert.throws(() => directDependencies(root), /declarations/);
});

test("SYNTHETIC Node24 recorder binds real nested events, IDs and every actual attempt", async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "math-runner-SYNTHETIC-"),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const reporter = path.resolve("scripts/public-math-node-reporter.mjs"),
    invocation = randomUUID(),
    output = path.join(root, "record.json"),
    descriptor = path.join(root, "descriptor.json");
  await put(root, "package.json", {
    type: "module",
    dependencies: {},
    devDependencies: {},
  });
  await put(root, "package-lock.json", {
    lockfileVersion: 3,
    packages: { "": { dependencies: {}, devDependencies: {} } },
  });
  await put(root, "tsconfig.json", {
    compilerOptions: { module: "esnext", moduleResolution: "bundler" },
  });
  await put(root, "app/page.tsx", "export default()=>null;");
  await put(
    root,
    "synthetic.mjs",
    `import test from 'node:test';import assert from 'node:assert/strict';test('outer',async(t)=>{await t.test('inner',()=>assert.equal(3*4,12));});`,
  );
  const snapshot = await executionSnapshot(root);
  const binding = {
    version: "public-math-binding-v3",
    runId: randomUUID(),
    admission: {
      file: "outputs/public-math-runs/state-v3/local/1/admission.json",
      sha256: "0".repeat(64),
    },
    cohort: null,
    slot: null,
  };
  await put(root, "descriptor.json", {
    root,
    invocation,
    output,
    record: {
      runId: binding.runId,
      binding,
      invocation,
      argv: [],
      sourceAcceptanceDigest: "0".repeat(64),
      buildEvidenceDigest: "0".repeat(64),
      snapshot,
      selection: { shard: null, filtered: false },
    },
  });
  const env = { ...process.env, ALGEBRA_PUBLIC_MATH_DESCRIPTOR: descriptor };
  delete env.NODE_TEST_CONTEXT;
  const run = spawnSync(
    process.execPath,
    [
      "--test",
      `--test-reporter=${pathToFileURL(reporter).href}`,
      path.join(root, "synthetic.mjs"),
    ],
    { env, encoding: "utf8" },
  );
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const record = runSchema.parse(JSON.parse(await fs.readFile(output, "utf8")));
  assert.deepEqual(record.binding, binding);
  assert.equal(record.registrations.length, 2);
  assert.equal(record.attempts.length, 2);
  assert.deepEqual(
    record.registrations.map(({ titlePath }) => titlePath),
    [["outer"], ["outer", "inner"]],
  );
  assert.equal(record.registrations[1].parentId, record.registrations[0].id);
  assert.deepEqual(record.recorderErrors, []);
});

test("SYNTHETIC grouped parameter declarations bind exact title path, scalar members and helper source", async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "math-fixtures-SYNTHETIC-"),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = "tests/parameterized.spec.mjs",
    text =
      'import {test} from "@playwright/test";test.describe("axes",()=>{for(const axis of [{name:"huge"}]){test(`state ${axis.name}`,async()=>{});}});';
  await put(root, file, text);
  const source = await sourceRef(
    root,
    file,
    (node) =>
      ts.isCallExpression(node) && ts.isTemplateExpression(node.arguments[0]),
  );
  const declaration = {
    runner: "playwright",
    case: "state huge",
    titlePath: ["axes", "state huge"],
    source,
    parameters: { "axis.name": "huge" },
    project: "synthetic",
    repeat: 0,
    closure: [],
  };
  assert.deepEqual(validateRegistrationSource(declaration, text), {
    line: 1,
    column: source.start + 1,
  });
  for (const change of [
    { parameters: {} },
    { parameters: { "axis.name": "wrong" } },
    { titlePath: ["state huge"] },
    { parameters: { "axis.name": "huge", unused: 1 } },
  ])
    assert.throws(() =>
      validateRegistrationSource({ ...declaration, ...change }, text),
    );
  const shadow = 'function test(){};test("observes",()=>{});';
  await put(root, file, shadow);
  const fake = {
    ...declaration,
    case: "observes",
    titlePath: ["observes"],
    parameters: {},
    source: await sourceRef(root, file, ts.isCallExpression),
  };
  assert.throws(() => validateRegistrationSource(fake, shadow), /unshadowed/);
});

async function syntheticSvg(t, spread = "") {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "math-svg-SYNTHETIC-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = "app/page.tsx";
  await put(root, "tsconfig.json", {
    compilerOptions: {
      jsx: "react-jsx",
      module: "esnext",
      moduleResolution: "bundler",
    },
  });
  await put(
    root,
    file,
    `export function Scene(){const rotate=(x)=>x;const project=(x)=>rotate(x);const p=project([0,1]),q=project([2,3]);return <svg viewBox="0 0 560 400"><line ${spread} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]}/><polygon points={"0,0 1,0 0,1"}/></svg>}`,
  );
  const capture = await captureSource(root),
    ref = (predicate) => sourceRef(root, file, predicate);
  const fixture = {
    runner: "node:test",
    case: "synthetic",
    titlePath: ["synthetic"],
    source: await ref(ts.isFunctionDeclaration),
    parameters: {},
    project: null,
    repeat: 0,
    closure: [],
  };
  const whole = await ref(ts.isFunctionDeclaration),
    figure = await ref(ts.isJsxElement),
    viewBox = await ref(
      (node) => ts.isJsxAttribute(node) && node.name.getText() === "viewBox",
    );
  const writer = async (tag, id, selector) => {
    const element = await ref(
      (node) =>
        ts.isJsxSelfClosingElement(node) && node.tagName.getText() === tag,
    );
    const source = capture.parsed.get(file),
      node = (() => {
        let found;
        const visit = (item) => {
          if (
            item.getStart(source) === element.start &&
            item.end === element.end
          )
            found = item;
          ts.forEachChild(item, visit);
        };
        visit(source);
        return found;
      })();
    const attributes = node.attributes.properties.map((attribute) => ({
      file,
      sha256: element.sha256,
      start: attribute.getStart(source),
      end: attribute.end,
      nodeSha256: sha256(attribute.getText(source)),
    }));
    const values = node.attributes.properties
      .filter(ts.isJsxAttribute)
      .map((attribute) => {
        const expression = attribute.initializer.expression;
        return {
          attribute: attribute.name.getText(),
          source: {
            file,
            sha256: element.sha256,
            start: expression.getStart(source),
            end: expression.end,
            nodeSha256: sha256(expression.getText(source)),
          },
        };
      });
    return { id, selector, tag, element, attributes, values };
  };
  const effect = {
    id: "drawing",
    kind: "svg-geometry",
    operation: whole,
    fixtures: [fixture],
    domain: {
      kind: "finite",
      states: [{ name: "zero", inputs: { x: 0 } }],
      claim: "all-declared-states",
    },
    inputs: [{ path: "x", source: whole }],
    numericSource: whole,
    rotate: await ref(
      (node) =>
        ts.isArrowFunction(node) && node.parent.name.getText() === "rotate",
    ),
    project: await ref(
      (node) =>
        ts.isArrowFunction(node) && node.parent.name.getText() === "project",
    ),
    component: whole,
    figure,
    nativeFigure: figure,
    viewBox,
    expectedViewBox: "0 0 560 400",
    writers: [
      await writer("line", "axis", "line"),
      await writer("polygon", "face", "polygon"),
    ],
    samples: [
      {
        state: "zero",
        inputs: { x: 0 },
        fixture,
        presentation: { region: "svg", inputs: [], resources: [] },
        expected: {
          axis: { x1: 0, y1: 1, x2: 2, y2: 3 },
          face: [
            [0, 0],
            [1, 0],
            [0, 1],
          ],
        },
      },
    ],
    tolerance: 1e-9,
  };
  return { root, capture, effect };
}
test("SYNTHETIC native SVG contract binds ordered writers and finite source samples", async (t) => {
  const { capture, effect } = await syntheticSvg(t);
  effectSchema.parse(effect);
  validateEffect(effect, capture);
});
for (const [name, change] of [
  [
    "endpoint source substitution",
    (effect) => {
      effect.writers[0].values[0].source = effect.writers[0].values[2].source;
    },
  ],
  [
    "wrong native tag",
    (effect) => {
      effect.writers[0].tag = "polygon";
    },
  ],
  [
    "wrong effective viewBox",
    (effect) => {
      effect.expectedViewBox = "0 0 400 560";
    },
  ],
  [
    "unknown attribute",
    (effect) => {
      effect.writers[0].values[0].attribute = "cx";
    },
  ],
  [
    "missing ordered pair",
    (effect) => {
      effect.samples[0].expected.face = [
        [0, 0],
        [1, 0],
      ];
    },
  ],
  [
    "nonfinite numeric sample",
    (effect) => {
      effect.samples[0].expected.axis.x1 = Infinity;
    },
  ],
])
  test(`SYNTHETIC SVG refuses ${name}`, async (t) => {
    const { capture, effect } = await syntheticSvg(t);
    change(effect);
    assert.throws(() => {
      effectSchema.parse(effect);
      validateEffect(effect, capture);
    });
  });
test("SYNTHETIC unknown effective native SVG spread refuses", async (t) => {
  const { capture, effect } = await syntheticSvg(t, "{...unknown}");
  assert.throws(() => validateEffect(effect, capture), /spread/);
});

test("SYNTHETIC SVG execution rejects reordered polygon pairs and wrong figure identity", async (t) => {
  const data = await syntheticExecution(t),
    requirement = data.accepted.sourceAcceptance.observations[0];
  const expected = {
    axis: { x1: 0, y1: 1, x2: 2, y2: 3 },
    face: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
  };
  data.accepted.sourceAcceptance.observations = [
    {
      ...requirement,
      kind: "svg-geometry",
      expected,
      presentation: { ...requirement.presentation, resources: [] },
      viewBox: "0 0 560 400",
      writers: [
        { id: "axis", tag: "line", selector: "line" },
        { id: "face", tag: "polygon", selector: "polygon" },
      ],
      tolerance: 1e-9,
    },
  ];
  data.accepted.acceptanceDigest = hashValue(data.accepted.sourceAcceptance);
  data.index.sourceAcceptanceDigest = data.accepted.acceptanceDigest;
  data.run.sourceAcceptanceDigest = data.accepted.acceptanceDigest;
  const original = data.run.observations[0];
  data.run.observations = [
    {
      id: original.id,
      caseId: original.caseId,
      kind: "svg-geometry",
      inputs: original.inputs,
      producer: original.producer,
      region: original.region,
      controls: [],
      namespace: "http://www.w3.org/2000/svg",
      tag: "svg",
      viewBox: "0 0 560 400",
      writers: [
        {
          id: "axis",
          selector: "line",
          tag: "line",
          count: 1,
          namespace: "http://www.w3.org/2000/svg",
          value: expected.axis,
        },
        {
          id: "face",
          selector: "polygon",
          tag: "polygon",
          count: 1,
          namespace: "http://www.w3.org/2000/svg",
          value: expected.face,
        },
      ],
    },
  ];
  assert.equal((await validate(data)).ok, true);
  for (const change of [
    (run) => run.observations[0].writers[1].value.reverse(),
    (run) => {
      run.observations[0].viewBox = "0 0 400 560";
    },
    (run) => {
      run.observations[0].writers[0].namespace = "html";
    },
    (run) => {
      run.observations[0].writers[0].value.x1 = "0";
    },
  ]) {
    const run = structuredClone(data.run);
    change(run);
    await assert.rejects(validate(data, run));
  }
});

test("SYNTHETIC package boundary erases only actual Metadata types and pins selected Drizzle exports", async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "math-packages-SYNTHETIC-"),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await put(root, "tsconfig.json", {
    compilerOptions: {
      module: "esnext",
      moduleResolution: "bundler",
      verbatimModuleSyntax: true,
    },
  });
  await put(root, "package.json", {
    type: "module",
    dependencies: { next: "16.4.2", "drizzle-orm": "0.45.2" },
  });
  await put(root, "package-lock.json", {
    lockfileVersion: 3,
    packages: {
      "": { dependencies: { next: "16.4.2", "drizzle-orm": "0.45.2" } },
      "node_modules/next": { version: "16.4.2" },
      "node_modules/drizzle-orm": { version: "0.45.2" },
    },
  });
  await put(root, "node_modules/next/package.json", {
    name: "next",
    version: "16.4.2",
    types: "index.d.ts",
  });
  await put(root, "node_modules/next/index.d.ts", "export * from './types';");
  await put(
    root,
    "node_modules/next/types.d.ts",
    "export * from './dist/types';",
  );
  await put(
    root,
    "node_modules/next/dist/types.d.ts",
    "export type {Metadata} from './lib/metadata/types/metadata-interface';",
  );
  await put(
    root,
    "node_modules/next/dist/lib/metadata/types/metadata-interface.d.ts",
    "interface Metadata {title:string};export type {Metadata};",
  );
  for (const [source, accepted] of [
    [
      'import type {Metadata} from "next";export const metadata:Metadata={title:"Synthetic"};',
      true,
    ],
    [
      'import {type Metadata} from "next";export const metadata:Metadata={title:"Synthetic"};',
      "runtime-import",
    ],
    ['import {Metadata} from "next";export const value=Metadata;', false],
    [
      'import {type Metadata, runtime} from "next";export const value=runtime;',
      false,
    ],
    ['import "next";', false],
    ['import type * as Types from "next";', false],
  ]) {
    await put(root, "app/page.ts", source);
    if (accepted === "runtime-import") {
      await assert.rejects(
        captureSource(root),
        /remains in actual compiler emit/,
      );
      continue;
    }
    const capture = await captureSource(root);
    assert.equal(
      capture.plan.structuralRefusals.length === 0,
      accepted,
      source,
    );
    if (accepted === true)
      assert(
        capture.plan.packageCapabilities[0].rows.some(({ file }) =>
          file.endsWith("metadata-interface.d.ts"),
        ),
      );
  }
  await put(
    root,
    "app/page.ts",
    'import type {Metadata} from "next";export const metadata:Metadata={title:"Synthetic"};',
  );
  await put(
    root,
    "node_modules/next/dist/lib/metadata/types/metadata-interface.d.ts",
    "interface Wrong {title:string};export type {Wrong};",
  );
  await assert.rejects(
    captureSource(root),
    /Metadata interface\/export is absent/,
  );
  await put(root, "node_modules/drizzle-orm/package.json", {
    name: "drizzle-orm",
    version: "0.45.2",
    type: "module",
    exports: {
      "./d1": {
        import: { types: "./d1/index.d.ts", default: "./d1/index.js" },
      },
    },
  });
  await put(
    root,
    "node_modules/drizzle-orm/d1/index.d.ts",
    "export declare function drizzle(value:unknown):unknown;",
  );
  await put(
    root,
    "node_modules/drizzle-orm/d1/index.js",
    'export {drizzle} from "./driver.js";',
  );
  await put(
    root,
    "node_modules/drizzle-orm/d1/driver.js",
    "function drizzle(value){return value}export {drizzle};",
  );
  await put(
    root,
    "app/page.ts",
    'import {drizzle as database} from "drizzle-orm/d1";export const value=database;',
  );
  const good = await captureSource(root);
  assert.equal(good.plan.structuralRefusals.length, 0);
  assert(
    good.plan.packageCapabilities[0].rows.some(({ file }) =>
      file.endsWith("driver.js"),
    ),
  );
  await put(
    root,
    "node_modules/drizzle-orm/d1/driver.js",
    "export const wrong=1;",
  );
  await assert.rejects(captureSource(root), /actual imported export/);
  await put(
    root,
    "node_modules/drizzle-orm/d1/index.js",
    "export const wrong=1;",
  );
  await assert.rejects(captureSource(root), /actual imported export/);
});

test("SYNTHETIC numeric observations preserve signed-zero and exact binary64 leaves", async () => {
  const { binary64Values, validateBinary64 } =
    await import("../scripts/lib/public-math-v2/numeric.mjs");
  const actual = binary64Values({ values: [-0, Number.MIN_VALUE, 1.7e308] });
  assert.equal(actual["/values/0"], "8000000000000000");
  assert.equal(actual["/values/1"], "0000000000000001");
  validateBinary64({ values: [0, Number.MIN_VALUE, 1.7e308] }, actual);
  assert.throws(
    () =>
      validateBinary64(
        { values: [0, Number.MIN_VALUE, 1.7e308] },
        { ...actual, "/values/1": "0000000000000000" },
      ),
    /disagree/,
  );
  assert.throws(() => binary64Values(Infinity), /nonfinite/);
});
