import test from "node:test";
import { binary64Values } from "../scripts/lib/public-math-v2/numeric.mjs";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  access,
  symlink,
  link,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  planPublicMath,
  checkPublicMath,
} from "../scripts/lib/public-math-v2.mjs";
import {
  captureSource,
  savedEvidenceFile,
} from "../scripts/lib/public-math-v2/source.mjs";
import {
  validateLocalReceipt,
  validateLocalEvidence,
} from "../scripts/lib/public-math-v2/reviews.mjs";
import {
  effectSchema,
  outputSchema,
  savedEvidenceSchema,
} from "../scripts/lib/public-math-v2/schema.mjs";
import {
  observationRequirements,
  requiredFixtures,
} from "../scripts/lib/public-math-v2/requirements.mjs";

const sha = (text) => createHash("sha256").update(text).digest("hex");
const stable = (value) =>
  Array.isArray(value)
    ? value.map(stable)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => [key, stable(value)]),
        )
      : value;
const canonical = (value) => JSON.stringify(stable(value));
const hash = (value) => sha(canonical(value));
const copy = (value) => structuredClone(value);
async function put(root, file, text) {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), text);
}
async function fixture(
  t,
  page = "export default function Page(){return <p>Ordinary prose.</p>}",
) {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "public-math-v2-synthetic-"),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  await put(
    root,
    "tsconfig.json",
    JSON.stringify({
      compilerOptions: {
        jsx: "react-jsx",
        module: "ESNext",
        moduleResolution: "Bundler",
        allowJs: true,
      },
      include: ["app/**/*", "lib/**/*", "hooks/**/*"],
    }),
  );
  if (/<(?:Math|Prose)\b/.test(page)) {
    page = 'import {Math,Prose} from "../components/algebra/Math";\n' + page;
    await put(
      root,
      "components/algebra/Math.tsx",
      "export function Math({children}){return children}export function Prose({children}){return children}",
    );
  }
  await put(root, "app/page.tsx", page);
  await put(root, "hooks/empty.ts", "");
  await put(
    root,
    "tests/cases.mjs",
    'import test from "node:test";\ntest("default",()=>{});\ntest("zero",()=>{});\ntest("negative",()=>{});\n',
  );
  return root;
}
async function node(root, file, select) {
  const text = await readFile(path.join(root, file), "utf8");
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  let selected;
  const visit = (item) => {
    if (!selected && select(item, source)) selected = item;
    ts.forEachChild(item, visit);
  };
  visit(source);
  assert(selected, `Synthetic fixture node exists in ${file}`);
  const start = selected.getStart(source),
    end = selected.end;
  return {
    file,
    sha256: sha(text),
    start,
    end,
    nodeSha256: sha(text.slice(start, end)),
  };
}
const caseRef = async (root, name = "default") => ({
  runner: "node:test",
  titlePath: [name],
  parameters: {},
  project: null,
  repeat: 0,
  closure: [],
  case: name,
  source: await node(
    root,
    "tests/cases.mjs",
    (item) => ts.isCallExpression(item) && item.arguments[0]?.text === name,
  ),
});
function bindSyntheticContracts(intent) {
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (typeof value.case === "string" && value.source) {
      value.runner ??= "node:test";
      value.titlePath ??= [value.case];
      value.parameters ??= {};
      value.project ??= null;
      value.repeat ??= 0;
      value.closure ??= [];
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(intent);
  for (const port of intent.ports)
    if (port.output) {
      port.presentation ??= {
        region: "[data-synthetic-region]",
        inputs: [],
        resources: [],
      };
      if (port.output.kind === "dynamic")
        for (const sample of port.output.samples)
          if (!Object.hasOwn(sample, "producerFixture"))
            sample.producerFixture = structuredClone(sample.fixture);
    }
  for (const effect of intent.effects)
    if (effect.domain) {
      const states =
        effect.domain.kind === "finite"
          ? effect.domain.states
          : effect.domain.boundaryStates;
      effect.samples ??= states.map((state) => ({
        state: state.name,
        inputs: state.inputs,
        expected: { synthetic: true },
        fixture:
          effect.fixtures.find((fixture) => fixture.case === state.name) ??
          effect.fixtures[0],
        presentation: null,
      }));
      if (effect.kind === "numeric-computation")
        for (const sample of effect.samples)
          sample.expectedBinary64 ??= binary64Values(sample.expected);
    }
}
async function receipt(root, capture, file, changes = {}) {
  const unit = capture.plan.units.find(({ id }) => id === file);
  const intent = {
    version: "public-math-local-v2",
    file: unit.file,
    reachable: unit.reachable,
    contractDigest: capture.plan.contractDigest,
    navigationDigest: unit.navigationDigest,
    graphProjectionDigest: unit.graphProjectionDigest,
    dependencies: copy(unit.dependencyFloor),
    coverage:
      "complete-file-all-public-branches-producers-consumers-and-implicit-effects",
    ordinaryProse: "independently-reviewed",
    authority: "independent-semantic-attestation",
    ports: [],
    effects: [],
    ...changes,
  };
  bindSyntheticContracts(intent);
  const intentDigest = hash(intent);
  const reportFile = `docs/research/public-math-v2/${file.replaceAll("/", "-")}.md`;
  const reviewer = "Synthetic independent reader";
  const header = {
    intentDigest,
    reviewer,
    coverage: intent.coverage,
    ownedFile: intent.file,
    dependencyDigest: hash(intent.dependencies),
    authority: intent.authority,
  };
  const text = `public-math-report-v2\n${canonical(header)}\n\nSYNTHETIC NON-CURRENT-APPROVAL. This invented test attestation exercises local evidence consistency only. It grants no source acceptance, execution or application approval.\n`;
  await put(root, reportFile, text);
  return {
    intent,
    intentDigest,
    report: { file: reportFile, sha256: sha(text), reviewer },
  };
}
async function evidence(root, capture) {
  const receipts = [];
  for (const { file } of capture.plan.files)
    receipts.push(await receipt(root, capture, file));
  return { version: "public-math-local-evidence-v2", receipts };
}
async function content(
  root,
  raw = "f:X\\to Y",
  renderer = "tex",
  role = "mathematics",
) {
  return {
    id: "visible-formula",
    kind: "visible-content",
    producer: await node(
      root,
      "app/page.tsx",
      (item) => ts.isStringLiteral(item) && item.text === raw,
    ),
    consumer: await node(root, "app/page.tsx", (item) => ts.isJsxElement(item)),
    transforms: [],
    renderer,
    role,
    output: {
      kind: "static",
      expected: { raw, segments: [{ kind: "math", tex: raw, display: false }] },
      fixture: await caseRef(root),
    },
  };
}

test("facade exports only planner/checker and never manufactures saved reviews", async (t) => {
  assert.deepEqual(
    Object.keys(await import("../scripts/lib/public-math-v2.mjs")).sort(),
    ["checkPublicMath", "planPublicMath"],
  );
  const root = await fixture(t);
  const plan = await planPublicMath({
    root,
    previous: { units: [], inventedApproval: true },
  });
  assert.equal(plan.semanticApproval, false);
  assert.equal(plan.status, "unreviewed");
  assert.deepEqual(
    plan.files.map(({ file }) => file),
    ["app/page.tsx", "hooks/empty.ts"],
  );
  assert.equal(
    plan.units.find(({ id }) => id === "hooks/empty.ts").index.length,
    0,
  );
  assert.equal(plan.pending.length, 2);
  await assert.rejects(access(path.join(root, savedEvidenceFile)), {
    code: "ENOENT",
  });
  for (const require of ["source-attestation", "executed-presentation"]) {
    const result = await checkPublicMath({ root, require });
    assert.equal(result.kind, "blocked");
    assert.equal(result.semanticApproval, false);
    assert.equal(result.renderedProof, "unverified");
  }
  await assert.rejects(
    checkPublicMath({ root, require: "source-attestation", receipts: [] }),
  );
});

test("consistent local evidence cannot bypass the always-required independent strict core", async (t) => {
  const root = await fixture(t);
  const capture = await captureSource(root);
  const saved = await evidence(root, capture);
  assert.equal(
    (await validateLocalEvidence(capture, saved)).status,
    "local-evidence-consistent",
  );
  await put(root, savedEvidenceFile, JSON.stringify(saved));
  const result = await checkPublicMath({ root, require: "source-attestation" });
  assert.equal(result.kind, "blocked");
  assert.equal(result.satisfiesRequirement, false);
  assert.equal(result.pending[0].kind, "invalid-source-or-evidence");
});

for (const [name, change] of [
  ["missing ownership", (saved) => saved.receipts.pop()],
  [
    "duplicate ownership",
    (saved) => saved.receipts.push(copy(saved.receipts[0])),
  ],
  [
    "unknown keys",
    (saved) => {
      saved.receipts[0].intent.waiver = "safe";
    },
  ],
  [
    "wildcard ownership",
    (saved) => {
      saved.receipts[0].intent.file.file = "app/*";
    },
  ],
  [
    "legacy v1",
    (saved) => {
      saved.version = 1;
    },
  ],
  [
    "missing derived dependencies",
    (saved) => {
      saved.receipts[0].intent.dependencies = [];
    },
  ],
])
  test(`strict evidence rejects ${name}`, async (t) => {
    const root = await fixture(t);
    const capture = await captureSource(root);
    const saved = await evidence(root, capture);
    change(saved);
    await assert.rejects(validateLocalEvidence(capture, saved));
  });

test("unreachable zero-candidate files require their own current owner", async (t) => {
  const root = await fixture(t);
  const capture = await captureSource(root);
  const saved = await evidence(root, capture);
  assert.equal(
    capture.plan.units.find(({ id }) => id === "hooks/empty.ts").reachable,
    false,
  );
  saved.receipts = saved.receipts.filter(
    ({ intent }) => intent.file.file !== "hooks/empty.ts",
  );
  await assert.rejects(validateLocalEvidence(capture, saved), /ownership/);
});

for (const [name, mutate] of [
  [
    "new inbound caller",
    async (root) =>
      put(
        root,
        "lib/new-caller.ts",
        'import {model} from "./model"; export const other=model(12);',
      ),
  ],
  [
    "changed formatter",
    async (root) =>
      put(
        root,
        "lib/formatter.ts",
        "export const format=(x:number)=>`value ${x}`;",
      ),
  ],
  [
    "changed consumer",
    async (root) =>
      put(
        root,
        "app/page.tsx",
        'import {model} from "../lib/model"; export default function Page(){return <output>{model(0)}</output>}',
      ),
  ],
  [
    "new import and resource",
    async (root) => {
      await put(
        root,
        "public/diagram.svg",
        '<svg xmlns="http://www.w3.org/2000/svg"/>',
      );
      await put(root, "lib/extra.ts", "export const extra=1;");
      await put(
        root,
        "app/page.tsx",
        'import {model} from "../lib/model";import {extra} from "../lib/extra"; export default function Page(){return <><img src="/diagram.svg"/>{model(extra)}</>}',
      );
    },
  ],
  [
    "shared stylesheet",
    async (root) => put(root, "app/global.css", ".page{color:#123}"),
  ],
  [
    "configuration drift",
    async (root) =>
      put(
        root,
        "tsconfig.json",
        JSON.stringify({
          compilerOptions: {
            jsx: "preserve",
            module: "ESNext",
            moduleResolution: "Bundler",
            allowJs: true,
          },
          include: ["app/**/*", "lib/**/*"],
        }),
      ),
  ],
])
  test(`actual source graph invalidates ${name}`, async (t) => {
    const root = await fixture(
      t,
      'import {model} from "../lib/model"; export default function Page(){return <p>{model(0)}</p>}',
    );
    await put(
      root,
      "lib/model.ts",
      'import {format} from "./formatter";export const model=(x:number)=>format(x);',
    );
    await put(
      root,
      "lib/formatter.ts",
      "export const format=(x:number)=>String(x);",
    );
    await put(root, "app/global.css", ".page{color:#fff}");
    const before = await captureSource(root);
    const saved = await receipt(root, before, "lib/model.ts");
    const reportBytes = await readFile(path.join(root, saved.report.file));
    await mutate(root);
    const after = await captureSource(root);
    assert.notEqual(
      before.plan.units.find(({ id }) => id === "lib/model.ts").fingerprint,
      after.plan.units.find(({ id }) => id === "lib/model.ts").fingerprint,
    );
    await assert.rejects(
      validateLocalReceipt(after, saved),
      /Stale|changed|dependency/,
    );
    assert.deepEqual(
      await readFile(path.join(root, saved.report.file)),
      reportBytes,
    );
  });

test("truly unrelated actual source edit preserves exact existing local report bytes", async (t) => {
  const root = await fixture(t);
  const before = await captureSource(root);
  const saved = await receipt(root, before, "app/page.tsx");
  const reportBytes = await readFile(path.join(root, saved.report.file));
  await put(
    root,
    "hooks/empty.ts",
    'export const unrelated="Dormant isolated prose.";',
  );
  const after = await captureSource(root);
  assert.notEqual(before.plan.sourceSetDigest, after.plan.sourceSetDigest);
  assert.equal(
    (await validateLocalReceipt(after, saved)).claim,
    "local-evidence-consistent-not-source-acceptance",
  );
  assert.deepEqual(
    await readFile(path.join(root, saved.report.file)),
    reportBytes,
  );
  const plan = await planPublicMath({ root, previous: before.plan });
  assert.deepEqual(plan.invalidated, ["hooks/empty.ts"]);
});

test("changed actual checker source invalidates earlier local evidence", async (t) => {
  const root = await fixture(t);
  const origin = fileURLToPath(new URL("../", import.meta.url));
  const original = await captureSource(root);
  for (const { file } of [
    ...original.checkerInputs,
    ...original.legacyCheckerInputs,
  ])
    await put(root, file, await readFile(path.join(origin, file)));
  await symlink(
    path.join(origin, "node_modules"),
    path.join(root, "node_modules"),
    "dir",
  );
  const { captureSource: copiedCapture } = await import(
    pathToFileURL(path.join(root, "scripts/lib/public-math-v2/source.mjs"))
  );
  const before = await copiedCapture(root);
  const saved = await receipt(root, before, "app/page.tsx");
  const changed = "scripts/lib/public-math-v2/schema.mjs";
  await put(
    root,
    changed,
    (await readFile(path.join(root, changed), "utf8")) + "\n",
  );
  const after = await copiedCapture(root);
  assert.notEqual(before.plan.contractDigest, after.plan.contractDigest);
  await assert.rejects(validateLocalReceipt(after, saved), /contract changed/);
});

test("ambient member effects conservatively enter the reachable dependency floor", async (t) => {
  const root = await fixture(
    t,
    'import "../lib/effect"; export default function Page(){return <p>Prose.</p>}',
  );
  await put(root, "lib/effect.ts", "const local={value:0};local.value=1;");
  const capture = await captureSource(root);
  const page = capture.plan.units.find(({ id }) => id === "app/page.tsx");
  assert(
    page.dependencyFloor
      .find(({ file }) => file === "lib/effect.ts")
      .decision.reasons.includes("ambient-effect-floor"),
  );
});

test("bounded paint gaps need precise contracts rather than permanent structural waivers", async (t) => {
  const root = await fixture(
    t,
    'const palette=["#fff"];export default()=> <svg><circle fill={palette[0]}/></svg>;',
  );
  const capture = await captureSource(root);
  assert.equal(capture.plan.structuralRefusals.length, 0);
  assert.equal(capture.plan.reviewObligations.length, 1);
  await assert.rejects(
    validateLocalReceipt(capture, await receipt(root, capture, "app/page.tsx")),
    /bounded paint/,
  );
  const obligation = capture.plan.reviewObligations[0].node;
  const privateWaiver = {
    id: "not-a-paint-contract",
    kind: "private-writing",
    producer: obligation,
    consumer: obligation,
    transforms: [],
    storageField: "private.notes",
    ownerBoundary: obligation,
  };
  await assert.rejects(
    validateLocalReceipt(
      capture,
      await receipt(root, capture, "app/page.tsx", { ports: [privateWaiver] }),
    ),
    /bounded paint/,
  );
  const effect = {
    id: "finite-paint",
    kind: "paint",
    operation: obligation,
    fixtures: [await caseRef(root)],
    declarations: [obligation],
    palette: ["#fff"],
    domain: {
      kind: "finite",
      states: [{ name: "default", inputs: { index: 0 } }],
      claim: "all-declared-states",
    },
    writers: [obligation],
    consumers: [obligation],
    resources: [],
    closedResourceBytes: true,
  };
  assert.equal(
    (
      await validateLocalReceipt(
        capture,
        await receipt(root, capture, "app/page.tsx", { effects: [effect] }),
      )
    ).claim,
    "local-evidence-consistent-not-source-acceptance",
  );
});

test("whole static TeX binds actual producer, exact ordered segments and source nodes", async (t) => {
  const root = await fixture(
    t,
    'const value="f:X\\\\to Y";export default function Page(){return <Math>{value}</Math>}',
  );
  const capture = await captureSource(root);
  const port = await content(root);
  const saved = await receipt(root, capture, "app/page.tsx", { ports: [port] });
  assert.equal(
    (await validateLocalReceipt(capture, saved)).requiredCases[0].case,
    "default",
  );
  for (const [name, mutate] of [
    [
      "wrong whole expression",
      (port) => {
        port.output.expected.raw = "g:X\\to Y";
        port.output.expected.segments[0].tex = "g:X\\to Y";
      },
    ],
    [
      "split map",
      (port) => {
        port.output.expected.segments = [
          { kind: "math", tex: "f", display: false },
          { kind: "prose", text: " : " },
          { kind: "math", tex: "X\\to Y", display: false },
        ];
      },
    ],
    [
      "wrong role",
      (port) => {
        port.role = "english-article";
      },
    ],
    [
      "raw computed",
      (port) => {
        port.renderer = "raw";
      },
    ],
    [
      "raw SVG",
      (port) => {
        port.renderer = "svg-text";
      },
    ],
    [
      "native option",
      (port) => {
        port.renderer = "native-option";
      },
    ],
    [
      "stale span",
      (port) => {
        port.consumer.start++;
      },
    ],
    [
      "untrusted TeX",
      (port) => {
        port.output.expected.raw = "\\href{x}{x}";
        port.output.expected.segments[0].tex = "\\href{x}{x}";
      },
    ],
    [
      "strict TeX",
      (port) => {
        port.output.expected.raw = "\\unknowncommand{x}";
        port.output.expected.segments[0].tex = "\\unknowncommand{x}";
      },
    ],
    [
      "invented case",
      (port) => {
        port.output.fixture.case = "invented";
      },
    ],
  ]) {
    const changed = copy(port);
    mutate(changed);
    const bad = await receipt(root, capture, "app/page.tsx", {
      ports: [changed],
    });
    await assert.rejects(validateLocalReceipt(capture, bad), undefined, name);
  }
});

test("raw SVG/native/DOM nodes cannot claim a nearby or ancestor TeX adapter", async (t) => {
  for (const tag of ["text", "option", "span"]) {
    const root = await fixture(
      t,
      `const value="f:X\\\\to Y";export default()=> <div><Math>Y</Math><${tag}>{value}</${tag}></div>;`,
    );
    const capture = await captureSource(root);
    const port = await content(root);
    port.consumer = await node(
      root,
      "app/page.tsx",
      (item, source) =>
        ts.isJsxElement(item) &&
        item.openingElement.tagName.getText(source) === tag,
    );
    await assert.rejects(
      validateLocalReceipt(
        capture,
        await receipt(root, capture, "app/page.tsx", { ports: [port] }),
      ),
      /raw\/native/,
    );
  }
  const root = await fixture(
    t,
    'const value="f:X\\\\to Y";export default()=> <Unknown>{value}</Unknown>;',
  );
  const capture = await captureSource(root);
  await assert.rejects(
    validateLocalReceipt(
      capture,
      await receipt(root, capture, "app/page.tsx", {
        ports: [await content(root)],
      }),
    ),
    /renderer adapter/,
  );
});

test("ordered mixed output keeps English articles and bibliographic prose distinct", async (t) => {
  const raw = "A group uses $H\\leq G$.";
  const root = await fixture(
    t,
    `const value=${JSON.stringify(raw)};export default function Page(){return <Prose>{value}</Prose>}`,
  );
  const capture = await captureSource(root);
  const port = await content(root, raw, "delimited", "mixed");
  port.output.expected.segments = [
    { kind: "prose", text: "A group uses " },
    { kind: "math", tex: "H\\leq G", display: false },
    { kind: "prose", text: "." },
  ];
  await validateLocalReceipt(
    capture,
    await receipt(root, capture, "app/page.tsx", { ports: [port] }),
  );
  port.output.expected.segments.reverse();
  await assert.rejects(
    validateLocalReceipt(
      capture,
      await receipt(root, capture, "app/page.tsx", { ports: [port] }),
    ),
    /ordered/,
  );
  for (const role of [
    "english-article",
    "bibliographic-coordinate",
    "administrative-quantity",
  ]) {
    const value = copy(port);
    value.role = role;
    assert(
      savedEvidenceSchema.safeParse({
        version: "public-math-local-evidence-v2",
        receipts: [
          await receipt(root, capture, "app/page.tsx", { ports: [value] }),
        ],
      }).success,
    );
    await assert.rejects(
      validateLocalReceipt(
        capture,
        await receipt(root, capture, "app/page.tsx", { ports: [value] }),
      ),
      /role/,
    );
  }
});

test("dynamic finite and model outputs bind exact named states, formatter and fixtures", async (t) => {
  const root = await fixture(
    t,
    "const format=(x:number)=>String(x);export default function Page(){return <Math>{format(0)}</Math>}",
  );
  const capture = await captureSource(root);
  const producer = await node(
    root,
    "app/page.tsx",
    (item) =>
      ts.isCallExpression(item) && item.expression.getText() === "format",
  );
  const formatter = await node(root, "app/page.tsx", ts.isArrowFunction);
  const samples = [];
  for (const [name, x] of [
    ["default", 1],
    ["zero", 0],
    ["negative", -1],
  ])
    samples.push({
      state: name,
      inputs: { x },
      expected: {
        raw: String(x),
        segments: [{ kind: "math", tex: String(x), display: false }],
      },
      fixture: await caseRef(root, name),
    });
  const states = samples.map(({ state: name, inputs }) => ({
    name,
    inputs: copy(inputs),
  }));
  const port = {
    id: "numeric",
    kind: "visible-content",
    producer,
    consumer: await node(root, "app/page.tsx", ts.isJsxElement),
    transforms: [],
    renderer: "tex",
    role: "mathematics",
    output: {
      kind: "dynamic",
      formatter,
      domain: { kind: "finite", states, claim: "all-declared-states" },
      samples,
    },
  };
  await validateLocalReceipt(
    capture,
    await receipt(root, capture, "app/page.tsx", { ports: [port] }),
  );
  const composite = copy(port);
  for (const sample of composite.output.samples) {
    sample.fixture = await caseRef(root, "default");
    sample.producerFixture = copy(sample.fixture);
  }
  const compositeReceipt = await validateLocalReceipt(
    capture,
    await receipt(root, capture, "app/page.tsx", { ports: [composite] }),
  );
  assert.equal(compositeReceipt.requiredCases.length, 1);
  for (const mutate of [
    (output) => output.samples.pop(),
    (output) => {
      output.samples[0].inputs.x = 12;
    },
    (output) => {
      output.samples[1].state = "default";
    },
    (output) => {
      output.formatter.nodeSha256 = "0".repeat(64);
    },
  ]) {
    const changed = copy(port);
    mutate(changed.output);
    await assert.rejects(
      validateLocalReceipt(
        capture,
        await receipt(root, capture, "app/page.tsx", { ports: [changed] }),
      ),
    );
  }
  port.output.domain = {
    kind: "model",
    inputContract: producer,
    invariants: ["The named input remains numeric."],
    boundaryStates: states,
    unexecutedDomain: "Other numeric states remain unexecuted.",
    claim: "reviewed-model-with-boundary-obligations",
  };
  await validateLocalReceipt(
    capture,
    await receipt(root, capture, "app/page.tsx", { ports: [port] }),
  );
  port.output.domain.boundaryStates[2].inputs = { x: 0 };
  assert.equal(outputSchema.safeParse(port.output).success, false);
});

test("precise effect variants reject generic waivers and missing actual lifecycle fields", async (t) => {
  const root = await fixture(t);
  const ref = await node(root, "app/page.tsx", ts.isJsxElement);
  const fixtures = [await caseRef(root)];
  const base = { id: "effect", operation: ref, fixtures };
  const domain = {
    kind: "finite",
    states: [{ name: "default", inputs: { x: 0 } }],
    claim: "all-declared-states",
  };
  const shapes = [
    {
      ...base,
      kind: "numeric-computation",
      inputs: [{ path: "vector", source: ref }],
      domain,
      outputs: [
        { path: "result", source: ref, consumers: [ref], contentPorts: [] },
      ],
      identities: ["Preserves the declared numeric vector."],
      errorBranches: [ref],
    },
    {
      ...base,
      kind: "geometry",
      numericSource: ref,
      domain,
      property: "--header-height",
      unit: "px",
      writer: ref,
      cssConsumers: [ref],
      numericOnly: true,
    },
    {
      ...base,
      kind: "file-reset",
      inputElement: ref,
      attributeOrder: [ref],
      finalEffectiveType: "file",
      result: "",
      readerBranches: [ref],
      errorBranches: [ref],
    },
    {
      ...base,
      kind: "private-download",
      fields: [{ path: "private.record", source: ref }],
      ownerBoundary: ref,
      serializer: ref,
      blob: ref,
      mime: "application/json",
      anchor: ref,
      urlCreation: ref,
      activation: ref,
      revocation: ref,
      removal: ref,
      privateOnly: true,
    },
    {
      ...base,
      kind: "paint",
      declarations: [ref],
      palette: ["#fff"],
      domain,
      writers: [ref],
      consumers: [ref],
      resources: [],
      closedResourceBytes: true,
    },
    {
      ...base,
      kind: "resource",
      resources: [
        {
          kind: "pinned-bytes",
          source: { file: ref.file, sha256: ref.sha256 },
        },
      ],
      consumers: [ref],
      purpose: "decoration",
      contentPorts: [],
      closedResourceBytes: true,
    },
  ];
  for (const shape of shapes) {
    bindSyntheticContracts({ ports: [], effects: [shape] });
    assert(effectSchema.safeParse(shape).success);
    const missing = copy(shape);
    delete missing.operation;
    assert.equal(effectSchema.safeParse(missing).success, false);
  }
  for (const shape of [
    { ...base, kind: "bounded-effect", effect: "paint", meaning: "safe" },
    { ...shapes[2], finalEffectiveType: "text" },
    { ...shapes[3], revocation: undefined },
    { ...shapes[4], closedResourceBytes: false },
    { ...shapes[1], property: "background-image" },
  ])
    assert.equal(effectSchema.safeParse(shape).success, false);
  const capture = await captureSource(root);
  await assert.rejects(
    validateLocalReceipt(
      capture,
      await receipt(root, capture, "app/page.tsx", {
        effects: [
          {
            ...shapes[0],
            outputs: [
              {
                path: "text",
                source: ref,
                consumers: [ref],
                contentPorts: ["missing-visible-math"],
              },
            ],
          },
        ],
      }),
    ),
    /content port/,
  );
});

test("geometry, file reset and private download receipts require actual source operations", async (t) => {
  const page =
    'const records={private:[]};const input=<input type="file" accept=".json"/>;function reset(event){event.target.value="";}function download(){const json=JSON.stringify(records);const blob=new Blob([json],{type:"application/json"});const anchor=document.createElement("a");const url=URL.createObjectURL(blob);anchor.href=url;anchor.click();URL.revokeObjectURL(url);anchor.remove();}function layout(){document.documentElement.style.setProperty("--header-height","12px");}export default()=>input;';
  const root = await fixture(t, page);
  await put(root, "app/style.css", ".page{padding-top:var(--header-height)}");
  const capture = await captureSource(root);
  const find = async (predicate) => node(root, "app/page.tsx", predicate);
  const call = async (name) =>
    find(
      (item) =>
        ts.isCallExpression(item) && item.expression.getText().endsWith(name),
    );
  const input = await find(ts.isJsxSelfClosingElement);
  const inputType = await find(
    (item) => ts.isJsxAttribute(item) && item.name.getText() === "type",
  );
  const inputAccept = await find(
    (item) => ts.isJsxAttribute(item) && item.name.getText() === "accept",
  );
  const reset = await find(
    (item) =>
      ts.isBinaryExpression(item) &&
      item.left.getText() === "event.target.value",
  );
  const fixtures = [await caseRef(root)];
  const resetEffect = {
    id: "reset",
    kind: "file-reset",
    operation: reset,
    fixtures,
    inputElement: input,
    attributeOrder: [inputType, inputAccept],
    finalEffectiveType: "file",
    result: "",
    readerBranches: [reset],
    errorBranches: [reset],
  };
  const writer = await call(".setProperty");
  const cssText = await readFile(path.join(root, "app/style.css"), "utf8");
  const css = {
    file: "app/style.css",
    sha256: sha(cssText),
    start: 0,
    end: cssText.length,
    nodeSha256: sha(cssText),
  };
  const geometry = {
    id: "geometry",
    kind: "geometry",
    operation: writer,
    fixtures,
    numericSource: writer,
    domain: {
      kind: "finite",
      states: [{ name: "default", inputs: { height: 12 } }],
      claim: "all-declared-states",
    },
    property: "--header-height",
    unit: "px",
    writer,
    cssConsumers: [css],
    numericOnly: true,
  };
  const serializer = await call("JSON.stringify");
  const download = {
    id: "download",
    kind: "private-download",
    operation: serializer,
    fixtures,
    fields: [
      {
        path: "records.private",
        source: await find(
          (item) =>
            ts.isVariableDeclaration(item) && item.name.getText() === "records",
        ),
      },
    ],
    ownerBoundary: serializer,
    serializer,
    blob: await find(ts.isNewExpression),
    mime: "application/json",
    anchor: await call("document.createElement"),
    urlCreation: await call("URL.createObjectURL"),
    activation: await call(".click"),
    revocation: await call("URL.revokeObjectURL"),
    removal: await call(".remove"),
    privateOnly: true,
  };
  await validateLocalReceipt(
    capture,
    await receipt(root, capture, "app/page.tsx", {
      effects: [resetEffect, geometry, download],
    }),
  );
  for (const changed of [
    { ...resetEffect, attributeOrder: [inputType] },
    { ...geometry, property: "--other-height" },
    { ...download, revocation: download.activation },
    { ...download, serializer: download.activation },
  ])
    await assert.rejects(
      validateLocalReceipt(
        capture,
        await receipt(root, capture, "app/page.tsx", { effects: [changed] }),
      ),
    );
});

test("report bytes, intent ordering and evidence aliases are independently checked", async (t) => {
  const root = await fixture(t);
  const capture = await captureSource(root);
  const saved = await receipt(root, capture, "app/page.tsx");
  const original = await readFile(path.join(root, saved.report.file), "utf8");
  await put(root, saved.report.file, original + "Changed report rationale.\n");
  await assert.rejects(validateLocalReceipt(capture, saved), /evidence bytes/);
  saved.report.sha256 = sha(original + "Changed report rationale.\n");
  saved.intentDigest = "0".repeat(64);
  await assert.rejects(validateLocalReceipt(capture, saved), /intent digest/);
  const fresh = await receipt(root, capture, "app/page.tsx");
  await rm(path.join(root, fresh.report.file));
  await symlink(
    path.join(root, "app/page.tsx"),
    path.join(root, fresh.report.file),
  );
  await assert.rejects(validateLocalReceipt(capture, fresh), /boundary/);
  await rm(path.join(root, fresh.report.file));
  await link(
    path.join(root, "app/page.tsx"),
    path.join(root, fresh.report.file),
  );
  await assert.rejects(validateLocalReceipt(capture, fresh), /aliases/);
});

const retainedDefects = [
  [
    "S1",
    'let make=()=>({});make=()=>target;const record=make();record["textContent"]="12";',
  ],
  [
    "S2",
    'function swap(x){const row=x.row;row.current=target}const record={row:{current:{}}};swap(record);record.row.current.textContent="12";',
  ],
  [
    "S3",
    'const external={row:target};const record={row:{},...external};record.row.textContent="12";',
  ],
  ["S4", 'const matrix=[[[0]],[target]];matrix[1][0].textContent="12";'],
  ["S5", 'let emit=value=>value;emit=ctx[key];emit("12");'],
  [
    "S6",
    'import "./style.css";const sheet=new CSSStyleSheet();sheet.replace(external);document.adoptedStyleSheets=[sheet];export const Page=()=> <p className="page"/>;',
  ],
];
for (const [id, source] of retainedDefects)
  test(`frozen ${id} remains visible to complete-file review and cannot acquire approval from planning`, async (t) => {
    const root = await fixture(t, source);
    await put(
      root,
      "app/style.css",
      ":root{--paper:#fff}.page{background:var(--paper,#123)}",
    );
    const plan = await planPublicMath({ root });
    const page = plan.units.find(({ id }) => id === "app/page.tsx");
    assert(page.index.some(({ kind }) => kind === "call" || kind === "write"));
    assert(plan.pending.some(({ file }) => file === "app/page.tsx"));
    if (id === "S6")
      assert(
        plan.structuralRefusals.some(
          ({ kind }) => kind === "unsupported-code-or-stylesheet-loader",
        ),
      );
    else {
      const target = {};
      let emitted;
      vm.runInNewContext(source, {
        target,
        ctx: {
          fillText: (value) => {
            emitted = value;
          },
        },
        key: "fillText",
      });
      assert.equal(target.textContent ?? emitted, "12");
    }
    assert.equal(
      (await checkPublicMath({ root, require: "source-attestation" })).kind,
      "blocked",
    );
  });

test("navigation retains member access, writes, delete, calls and spreads without ownership suppression", async (t) => {
  const root = await fixture(
    t,
    "const data={x:0};data.x=1;delete data.x;const copy={...data};Object.values(copy);export default()=> <p>{copy.x}</p>;",
  );
  const plan = await planPublicMath({ root });
  const kinds = new Set(
    plan.units
      .find(({ id }) => id === "app/page.tsx")
      .index.map(({ kind }) => kind),
  );
  for (const kind of [
    "member-access",
    "write",
    "delete",
    "spread",
    "call",
    "jsx-expression",
  ])
    assert(kinds.has(kind));
});

for (const [name, source] of [
  ["computed module", "export const x=import(target);"],
  ["generated code", "export const x=new Function(source);"],
  [
    "unclosed stylesheet",
    "const sheet=new CSSStyleSheet();sheet.replace(external);",
  ],
  [
    "external resource",
    'export default()=> <img src="https://example.invalid/math.svg"/>;',
  ],
  [
    "saved evidence import",
    'import evidence from "../docs/research/public-math-v2/receipts.json";export default()=> <p>{evidence}</p>;',
  ],
])
  test(`structural refusal is unwaivable for ${name}`, async (t) => {
    const root = await fixture(t, source);
    const capture = await captureSource(root);
    assert(capture.plan.structuralRefusals.length > 0);
    await assert.rejects(
      validateLocalEvidence(capture, await evidence(root, capture)),
      /Structural/,
    );
  });

const inlineProseCases = [
  ["Prose assembly", "<P>{String.raw`The result is $${x}$.`}</P>", "tag", true],
  [
    "WrittenProse assembly",
    "<W>{`The result is $${x}$.`}</W>",
    "template",
    true,
  ],
  [
    "conditional assembly",
    '<P>{x ? `The result is $${x}$.` : "None."}</P>',
    "conditional",
    true,
  ],
  [
    "string addition assembly",
    '<P>{"The result is $" + x + "$."}</P>',
    "binary",
    true,
  ],
  ["numeric addition", "<P>{x + 1}</P>", "binary", false],
  ["separate variable", "<P>{assembled}</P>", "variable", false],
  ["exported callable", "<P>{assemble(x)}</P>", "call", false],
  ["imported callable", "<P>{imported(x)}</P>", "imported", false],
  ["direct Math", "<M>{String.raw`The result is $${x}$.`}</M>", "tag", false],
  ["native output", "<p>{String.raw`The result is $${x}$.`}</p>", "tag", false],
  [
    "SVG output",
    "<text>{String.raw`The result is $${x}$.`}</text>",
    "tag",
    false,
  ],
  [
    "unknown adapter",
    "<Unknown>{String.raw`The result is $${x}$.`}</Unknown>",
    "tag",
    false,
  ],
  [
    "multiple children",
    "<P>{String.raw`The result is $${x}$.`}more</P>",
    "tag",
    false,
  ],
  [
    "unknown spread",
    "<P {...props}>{String.raw`The result is $${x}$.`}</P>",
    "tag",
    false,
  ],
  [
    "children property",
    '<P children="other">{String.raw`The result is $${x}$.`}</P>',
    "tag",
    false,
  ],
  [
    "shadowed String raw",
    "<P>{String.raw`The result is $${x}$.`}</P>",
    "shadow",
    false,
  ],
  [
    "speech output",
    "<P>{String.raw`The result is $${x}$.`}</P>",
    "speech",
    false,
  ],
];
for (const [name, jsx, kind, eligible] of inlineProseCases)
  test(`SYNTHETIC explicit null producer eligibility: ${name}`, async (t) => {
    const prefix =
      'import {Prose as P,WrittenProse as W,Math as M} from "../components/algebra/Math";import {imported} from "../lib/imported";';
    const root = await fixture(
      t,
      prefix +
        (kind === "shadow" ? 'const String={raw:()=>"other"};' : "") +
        "export function assemble(x){return `The result is $${x}$.`};export default function Page({x,props}){const assembled=`The result is $${x}$.`;return " +
        jsx +
        "}",
    );
    await put(
      root,
      "components/algebra/Math.tsx",
      "export function Prose({children}){return children}export function WrittenProse({children}){return children}export function Math({children}){return children}",
    );
    await put(
      root,
      "lib/imported.ts",
      "export function imported(x){return String(x)}",
    );
    const capture = await captureSource(root);
    const consumer = await node(root, "app/page.tsx", ts.isJsxElement);
    const producer = await node(root, "app/page.tsx", (item) => {
      if (
        ![
          "variable",
          "call",
          "imported",
          "conditional",
          "template",
          "binary",
        ].includes(kind)
      )
        return ts.isTaggedTemplateExpression(item);
      if (kind === "conditional") return ts.isConditionalExpression(item);
      if (kind === "binary")
        return ts.isBinaryExpression(item) && ts.isJsxExpression(item.parent);
      if (kind === "template")
        return ts.isTemplateExpression(item) && ts.isJsxExpression(item.parent);
      if (kind === "variable")
        return (
          ts.isIdentifier(item) &&
          item.text === "assembled" &&
          ts.isJsxExpression(item.parent)
        );
      return (
        ts.isCallExpression(item) &&
        item.expression.getText() ===
          (kind === "call" ? "assemble" : "imported")
      );
    });
    const output = {
      kind: "dynamic",
      formatter: producer,
      domain: {
        kind: "finite",
        states: [{ name: "one", inputs: { x: 1 } }],
        claim: "all-declared-states",
      },
      samples: [
        {
          state: "one",
          inputs: { x: 1 },
          expected: {
            raw: "The result is $1$.",
            segments: [
              { kind: "prose", text: "The result is " },
              { kind: "math", tex: "1", display: false },
              { kind: "prose", text: "." },
            ],
          },
          fixture: await caseRef(root),
          producerFixture: null,
        },
      ],
    };
    const port =
      kind === "speech"
        ? {
            id: "inline",
            kind: "accessible-speech",
            producer,
            consumer,
            transforms: [],
            visibleCounterpart: "visible",
            output,
          }
        : {
            id: "inline",
            kind: "visible-content",
            producer,
            consumer,
            transforms: [],
            renderer:
              name === "direct Math"
                ? "tex"
                : name === "native output"
                  ? "raw"
                  : name === "SVG output"
                    ? "svg-text"
                    : "delimited",
            role: "mixed",
            output,
          };
    const saved = await receipt(root, capture, "app/page.tsx", {
      ports: [port],
    });
    if (eligible) {
      await validateLocalReceipt(capture, saved);
      assert.equal(requiredFixtures({ receipts: [saved] }).length, 1);
      const obligations = observationRequirements({ receipts: [saved] });
      assert.equal(obligations.length, 1);
      assert.equal(obligations[0].kind, "content");
      assert.equal(obligations[0].expected.raw, "The result is $1$.");
      const missing = copy(output);
      delete missing.samples[0].producerFixture;
      assert.equal(outputSchema.safeParse(missing).success, false);
      const wrong = copy(saved);
      wrong.intent.ports[0].output.samples[0].expected.segments[1].tex = "-1";
      await assert.rejects(
        validateLocalReceipt(
          capture,
          await receipt(root, capture, "app/page.tsx", {
            ports: wrong.intent.ports,
          }),
        ),
        /segments disagree/,
      );
    } else await assert.rejects(validateLocalReceipt(capture, saved));
  });
