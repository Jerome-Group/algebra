import test from "node:test";
import { binary64Values } from "../scripts/lib/public-math-v2/numeric.mjs";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { captureSource } from "../scripts/lib/public-math-v2/source.mjs";
import { validateLocalReceipt } from "../scripts/lib/public-math-v2/reviews.mjs";
import { effectSchema } from "../scripts/lib/public-math-v2/schema.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (value) =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );
const hash = (value) => sha(canonical(value));
const mathImport = 'import {Math} from "../components/algebra/Math";';
const importedCases =
  'import test from "node:test";import assert from "node:assert/strict";test("default",()=>assert.equal(6+6,12));';
const require = createRequire(import.meta.url);
function runtimeModule(text, imports = {}) {
  const loaded = { exports: {} };
  const javascript = ts.transpileModule(text, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(javascript, {
    module: loaded,
    exports: loaded.exports,
    require: (name) => imports[name] ?? require(name),
  });
  return loaded.exports;
}
function runtimeMarkup(page, imports, parent) {
  const element = React.createElement(runtimeModule(page, imports).default);
  return renderToStaticMarkup(
    parent ? React.createElement(parent, null, element) : element,
  );
}
async function put(root, file, text) {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), text);
}
async function setup(t, page, extra = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "math-v2-correction-"));
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
      include: ["app/**/*", "components/**/*", "lib/**/*"],
    }),
  );
  await put(root, "app/page.tsx", page);
  await put(
    root,
    "components/algebra/Math.tsx",
    "export function Math({children,block=false}){return children}export function Prose({children}){return children}",
  );
  await put(root, "tests/cases.mjs", importedCases);
  for (const [file, text] of Object.entries(extra)) await put(root, file, text);
  return root;
}
async function ref(root, file, predicate) {
  const text = await readFile(path.join(root, file), "utf8");
  let start = 0,
    end = text.length;
  if (predicate) {
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    let found;
    const visit = (node) => {
      if (!found && predicate(node, source)) found = node;
      ts.forEachChild(node, visit);
    };
    visit(source);
    assert(found);
    start = found.getStart(source);
    end = found.end;
  }
  return {
    file,
    sha256: sha(text),
    start,
    end,
    nodeSha256: sha(text.slice(start, end)),
  };
}
async function fixture(root) {
  return {
    runner: "node:test",
    titlePath: ["default"],
    parameters: {},
    project: null,
    repeat: 0,
    closure: [],
    case: "default",
    source: await ref(
      root,
      "tests/cases.mjs",
      (node) =>
        ts.isCallExpression(node) && node.arguments[0]?.text === "default",
    ),
  };
}
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
async function receipt(root, capture, changes = {}) {
  const unit = capture.plan.units.find(({ id }) => id === "app/page.tsx");
  const intent = {
    version: "public-math-local-v2",
    file: unit.file,
    reachable: unit.reachable,
    contractDigest: capture.plan.contractDigest,
    navigationDigest: unit.navigationDigest,
    graphProjectionDigest: unit.graphProjectionDigest,
    dependencies: unit.dependencyFloor,
    coverage:
      "complete-file-all-public-branches-producers-consumers-and-implicit-effects",
    ordinaryProse: "independently-reviewed",
    authority: "independent-semantic-attestation",
    ports: [],
    effects: [],
    ...changes,
  };
  bindSyntheticContracts(intent);
  const intentDigest = hash(intent),
    reviewer = "Synthetic correction control";
  const file = "docs/research/public-math-v2/control.md";
  const body = `public-math-report-v2\n${canonical({ intentDigest, reviewer, coverage: intent.coverage, ownedFile: intent.file, dependencyDigest: hash(intent.dependencies), authority: intent.authority })}\n\nSYNTHETIC NON-APPROVAL. This local consistency control grants no real application review, source acceptance, execution or release approval.\n`;
  await put(root, file, body);
  return {
    intent,
    intentDigest,
    report: { file, sha256: sha(body), reviewer },
  };
}
async function port(root, producer, raw = "12", tag = "Math", display = false) {
  return {
    id: "content",
    kind: "visible-content",
    producer,
    consumer: await ref(
      root,
      "app/page.tsx",
      (node, source) =>
        ts.isJsxElement(node) &&
        node.openingElement.tagName.getText(source) === tag,
    ),
    transforms: [],
    renderer: "tex",
    role: "mathematics",
    output: {
      kind: "static",
      expected: { raw, segments: [{ kind: "math", tex: raw, display }] },
      fixture: await fixture(root),
    },
  };
}
async function validatePage(
  t,
  page,
  {
    predicate = (node) => ts.isStringLiteral(node) && node.text === "12",
    raw = "12",
    tag = "Math",
    display = false,
    extra = {},
  } = {},
) {
  const root = await setup(t, page, extra),
    capture = await captureSource(root);
  const content = await port(
    root,
    await ref(root, "app/page.tsx", predicate),
    raw,
    tag,
    display,
  );
  return validateLocalReceipt(
    capture,
    await receipt(root, capture, { ports: [content] }),
  );
}

test("correction rejects bounded known global loader spellings and unresolved global access", async (t) => {
  for (const page of [
    'export const x=globalThis["Function"]("return 12")();',
    'export const x=globalThis["eval"]("12");',
    'const s=new window["CSSStyleSheet"]();s.replace(external);document["adoptedStyleSheets"]=[s];',
    'export const x=globalThis[key]("12");',
    'export const x=window["Fun"+"ction"]("12");',
    'export const x=globalThis.window["eval"]("12");',
    'export const x=globalThis["window"][key];',
    'export const x=globalThis.Function("return 12")();',
  ]) {
    const root = await setup(t, page);
    assert(
      (await captureSource(root)).plan.structuralRefusals.length > 0,
      page,
    );
  }
});

test("correction establishes a static primitive or refuses the static claim", async (t) => {
  await assert.rejects(
    validatePage(t, `${mathImport}export default()=> <Math>{12}</Math>;`, {
      predicate: ts.isNumericLiteral,
      raw: "999",
    }),
  );
  await validatePage(t, `${mathImport}export default()=> <Math>{12}</Math>;`, {
    predicate: ts.isNumericLiteral,
  });
  await validatePage(t, `${mathImport}export default()=> <Math>{0xC}</Math>;`, {
    predicate: ts.isNumericLiteral,
  });
  await assert.rejects(
    validatePage(
      t,
      `${mathImport}export default()=> <Math>{String(12)}</Math>;`,
      {
        predicate: (node) =>
          ts.isCallExpression(node) && node.expression.getText() === "String",
        raw: "999",
      },
    ),
  );
  const root = await setup(
      t,
      `${mathImport}import data from "../lib/value.json";export default()=> <Math>{data.value}</Math>;`,
      { "lib/value.json": '{"value":"12"}' },
    ),
    capture = await captureSource(root);
  await assert.rejects(
    validateLocalReceipt(
      capture,
      await receipt(root, capture, {
        ports: [await port(root, await ref(root, "lib/value.json"), "999")],
      }),
    ),
  );
});

test("correction binds effective adapter props and actual display mode", async (t) => {
  const svg = await readFile(
    new URL("../components/algebra/SvgMath.tsx", import.meta.url),
    "utf8",
  );
  const options = {
    tag: "SvgMath",
    extra: { "components/algebra/SvgMath.tsx": svg },
  };
  for (const props of [
    'className={"svg-caption"}',
    '{...{className:"svg-caption"}}',
    'className="other" {...{className:"svg-caption"}}',
    "{...unknown}",
    "block={unknown}",
  ]) {
    const isMath = props.startsWith("block");
    await assert.rejects(
      validatePage(
        t,
        isMath
          ? `${mathImport}export default()=> <Math ${props}>{"12"}</Math>;`
          : `import {SvgMath} from "../components/algebra/SvgMath";export default()=> <SvgMath ${props}>{"12"}</SvgMath>;`,
        isMath ? {} : options,
      ),
    );
  }
  await validatePage(
    t,
    'import {SvgMath} from "../components/algebra/SvgMath";export default()=> <SvgMath {...{className:"svg-caption"}} className="diagram">{"12"}</SvgMath>;',
    options,
  );
  await validatePage(
    t,
    `${mathImport}export default()=> <Math block>{"12"}</Math>;`,
    { display: true },
  );
  await assert.rejects(
    validatePage(
      t,
      `${mathImport}export default()=> <Math block>{"12"}</Math>;`,
    ),
  );
  await assert.rejects(
    validatePage(
      t,
      `${mathImport}export default()=> <Math {...{block:true}}>{"12"}</Math>;`,
    ),
  );
  await assert.rejects(
    validatePage(
      t,
      `${mathImport}export default()=> <Math block="false">{"12"}</Math>;`,
    ),
  );
  await validatePage(
    t,
    `${mathImport}export default()=> <Math {...{block:true}} block={false}>{"12"}</Math>;`,
  );
});

test("correction resolves imported adapter bindings through local shadows", async (t) => {
  await assert.rejects(
    validatePage(
      t,
      `${mathImport}export default function Page({Math}){return <Math>{"12"}</Math>}`,
    ),
  );
  await assert.rejects(
    validatePage(
      t,
      `${mathImport}export default function Page(){const Math=({children})=>children;return <Math>{"12"}</Math>}`,
    ),
  );
  await assert.rejects(
    validatePage(
      t,
      'import * as Labels from "../components/algebra/Math";export default function Page({Labels}){return <Labels.Math>{"12"}</Labels.Math>}',
      { tag: "Labels.Math" },
    ),
  );
  await assert.rejects(
    validatePage(
      t,
      'import type * as Labels from "../components/algebra/Math";export default()=> <Labels.Math>{"12"}</Labels.Math>;',
      { tag: "Labels.Math" },
    ),
  );
  await validatePage(
    t,
    'import {Math as M} from "../components/algebra/Math";export default()=> <M>{"12"}</M>;',
    { tag: "M" },
  );
});

test("terminal adapter authority refuses a member of a named import", async (t) => {
  const math = await readFile(
    new URL("../components/algebra/Math.tsx", import.meta.url),
    "utf8",
  );
  const page =
    'import {Math as M} from "../components/algebra/Math";M.Raw=({children})=>children;export default()=> <M.Raw>{"12"}</M.Raw>;';
  assert.equal(
    runtimeMarkup(page, {
      "../components/algebra/Math": runtimeModule(math, {
        "@/lib/algebra/math-presentation.generated": {
          presentCatalogueText: (value) => value,
        },
      }),
    }),
    "12",
  );
  await assert.rejects(
    validatePage(t, page, { tag: "M.Raw" }),
    /renderer adapter/,
  );
  for (const [binding, tag, accepted] of [
    ['import {Math as M} from "../components/algebra/Math";', "M", true],
    [
      'import * as Labels from "../components/algebra/Math";',
      "Labels.Math",
      true,
    ],
    [
      'import * as Labels from "../components/algebra/Math";',
      "Labels.Math.Raw",
      false,
    ],
    ['import {Prose as M} from "../components/algebra/Math";', "M", false],
  ]) {
    const claim = validatePage(
      t,
      `${binding}export default()=> <${tag}>{"12"}</${tag}>;`,
      { tag },
    );
    if (accepted) await claim;
    else await assert.rejects(claim, /renderer adapter/);
  }
});

test("terminal adapter authority uses the captured compiler module target", async (t) => {
  const page =
    'import {Math} from "@/components/algebra/Math";export default()=> <Math>{"12"}</Math>;';
  const fake = "export function Math({children}){return children}";
  const config = (paths) =>
    JSON.stringify({
      compilerOptions: {
        jsx: "react-jsx",
        module: "ESNext",
        moduleResolution: "Bundler",
        allowJs: true,
        baseUrl: ".",
        paths,
      },
      include: ["app/**/*", "components/**/*", "lib/**/*"],
    });
  const extra = {
    "tsconfig.json": config({
      "@/*": ["./*"],
      "@/components/algebra/Math": ["lib/FakeMath.tsx"],
    }),
    "lib/FakeMath.tsx": fake,
  };
  const root = await setup(t, page, extra),
    capture = await captureSource(root);
  assert.deepEqual(capture.plan.structuralRefusals, []);
  const target = ts.resolveModuleName(
    "@/components/algebra/Math",
    path.join(capture.root, "app/page.tsx"),
    capture.options,
    ts.sys,
  ).resolvedModule;
  assert.equal(
    path.relative(capture.root, target.resolvedFileName),
    "lib/FakeMath.tsx",
  );
  assert.equal(
    runtimeMarkup(page, {
      "@/components/algebra/Math": runtimeModule(fake),
    }),
    "12",
  );
  await assert.rejects(validatePage(t, page, { extra }), /renderer adapter/);
  for (const [name, binding, tag, paths, accepted] of [
    ["@/components/algebra/Math", "{Math}", "Math", { "@/*": ["./*"] }, true],
    [
      "@labels",
      "{Math as M}",
      "M",
      { "@labels": ["./components/algebra/Math.tsx"] },
      true,
    ],
    [
      "@labels",
      "* as Labels",
      "Labels.Math",
      { "@labels": ["./components/algebra/Math.tsx"] },
      true,
    ],
    [
      "@/components/algebra/Math",
      "* as Labels",
      "Labels.Math",
      { "@/components/algebra/Math": ["lib/FakeMath.tsx"] },
      false,
    ],
    ["@/components/algebra/Math", "{Math}", "Math", {}, false],
  ]) {
    const claim = validatePage(
      t,
      `import ${binding} from "${name}";export default()=> <${tag}>{"12"}</${tag}>;`,
      {
        tag,
        extra: { "tsconfig.json": config(paths), "lib/FakeMath.tsx": fake },
      },
    );
    if (accepted) await claim;
    else
      await assert.rejects(
        claim,
        Object.keys(paths).length
          ? /renderer adapter/
          : /Structural source refusals/,
      );
  }
});

test("terminal adapter props refuse unsupported quoted JSX normalization", async (t) => {
  const svg = await readFile(
    new URL("../components/algebra/SvgMath.tsx", import.meta.url),
    "utf8",
  );
  const page =
    'import {SvgMath} from "../components/algebra/SvgMath";export default()=> <SvgMath className="svg&#45;caption">{"12"}</SvgMath>;';
  const adapter = runtimeModule(svg, {
    "./Math": {
      Math: ({ children }) =>
        React.createElement("b", { "data-math-control": "yes" }, children),
    },
  });
  const markup = runtimeMarkup(
    page,
    { "../components/algebra/SvgMath": adapter },
    "svg",
  );
  assert.match(markup, /class="svg-caption"/);
  assert.doesNotMatch(markup, /data-math-control/);
  const options = {
    tag: "SvgMath",
    extra: { "components/algebra/SvgMath.tsx": svg },
  };
  await assert.rejects(
    validatePage(t, page, options),
    /effective JSX property/,
  );
  for (const [props, accepted, mathBranch] of [
    ['className="diagram"', true, true],
    ['className="svg-caption "', true, true],
    ['className={"svg&#45;caption"}', true, true],
    ['className="svg&#45;caption" className="diagram"', true, true],
    ['className="svg&#45;caption" {...{className:"diagram"}}', true, true],
    ['className="svg-caption"', false, false],
    ["className='svg&#45;caption'", false, false],
    ['className="svg&#x2D;caption"', false, false],
    ['className="diagram" className="svg&#45;caption"', false, false],
    ['className="diagram\ncaption"', false, true],
    ['className={"svg\\u002dcaption"}', false, false],
  ]) {
    const sample = `import {SvgMath} from "../components/algebra/SvgMath";export default()=> <SvgMath ${props}>{"12"}</SvgMath>;`;
    assert.equal(
      runtimeMarkup(
        sample,
        { "../components/algebra/SvgMath": adapter },
        "svg",
      ).includes('data-math-control="yes"'),
      mathBranch,
      props,
    );
    const claim = validatePage(t, sample, options);
    if (accepted) await claim;
    else await assert.rejects(claim, /effective JSX property|raw SVG caption/);
  }
});

test("correction geometry requires an actual bounded CSS var consumer", async (t) => {
  const page =
    'function layout(){document.documentElement.style.setProperty("--header-height","12px")}export default()=> <p>Prose.</p>;';
  for (const [css, accepted] of [
    ["/* --header-height */ .page{color:#fff}", false],
    ['.page{content:"var(--header-height)"}', false],
    [".page{--header-height:12px}", false],
    [".page{padding-top:var(--header-height)}", true],
  ]) {
    const root = await setup(t, page, { "app/style.css": css }),
      capture = await captureSource(root),
      writer = await ref(root, "app/page.tsx", ts.isCallExpression);
    const effect = {
      id: "geometry",
      kind: "geometry",
      operation: writer,
      fixtures: [await fixture(root)],
      numericSource: writer,
      domain: {
        kind: "finite",
        states: [{ name: "default", inputs: { height: 12 } }],
        claim: "all-declared-states",
      },
      property: "--header-height",
      unit: "px",
      writer,
      cssConsumers: [await ref(root, "app/style.css")],
      numericOnly: true,
    };
    const run = () => validateLocalReceipt(capture, receiptValue);
    const receiptValue = await receipt(root, capture, { effects: [effect] });
    if (accepted) await run();
    else await assert.rejects(run);
  }
});

test("correction Blob MIME follows effective options instead of payload markers", async (t) => {
  for (const [options, accepted] of [
    ['{type:"text/plain"}', false],
    ['{type:"application/json"}', true],
    ['{type:"application/json",...{type:"text/plain"}}', false],
    ['{type:"text/plain",...{type:"application/json"}}', true],
    ["unknown", false],
  ]) {
    const page = `const privateRecord={notes:[]};function download(){const json=JSON.stringify(privateRecord);const blob=new Blob(["application/json"],${options});const a=document.createElement("a");const u=URL.createObjectURL(blob);a.click();URL.revokeObjectURL(u);a.remove()}export default()=> <p>Prose.</p>;`;
    const root = await setup(t, page),
      capture = await captureSource(root),
      call = async (name) =>
        ref(
          root,
          "app/page.tsx",
          (node) =>
            ts.isCallExpression(node) && node.expression.getText() === name,
        ),
      serializer = await call("JSON.stringify");
    const effect = {
      id: "download",
      kind: "private-download",
      operation: serializer,
      fixtures: [await fixture(root)],
      fields: [
        {
          path: "privateRecord.notes",
          source: await ref(root, "app/page.tsx", ts.isVariableDeclaration),
        },
      ],
      ownerBoundary: serializer,
      serializer,
      blob: await ref(root, "app/page.tsx", ts.isNewExpression),
      mime: "application/json",
      anchor: await call("document.createElement"),
      urlCreation: await call("URL.createObjectURL"),
      activation: await call("a.click"),
      revocation: await call("URL.revokeObjectURL"),
      removal: await call("a.remove"),
      privateOnly: true,
    };
    const saved = await receipt(root, capture, { effects: [effect] });
    if (accepted) await validateLocalReceipt(capture, saved);
    else await assert.rejects(validateLocalReceipt(capture, saved));
  }
});

test("correction fixture identity requires real unique unshadowed top-level registration", async (t) => {
  for (const [text, registrations] of [
    ['function test(){};test("default",()=>{});', 0],
    [
      'import test from "node:test";for(const i of [0,1]){test("default",()=>{});}',
      2,
    ],
    [
      'import test from "node:test";test("default",()=>{});test("default",()=>{});',
      2,
    ],
    [
      'import test from "node:test";function nested(test){test("default",()=>{})}',
      0,
    ],
  ]) {
    const root = await setup(
        t,
        `${mathImport}export default()=> <Math>{"12"}</Math>;`,
        { "tests/cases.mjs": text },
      ),
      capture = await captureSource(root),
      content = await port(
        root,
        await ref(
          root,
          "app/page.tsx",
          (node) => ts.isStringLiteral(node) && node.text === "12",
        ),
      );
    await assert.rejects(
      validateLocalReceipt(
        capture,
        await receipt(root, capture, { ports: [content] }),
      ),
    );
    const registrationEnvironment = { ...process.env };
    delete registrationEnvironment.NODE_TEST_CONTEXT;
    const run = spawnSync(
      process.execPath,
      ["--test", "--test-reporter=tap", path.join(root, "tests/cases.mjs")],
      { encoding: "utf8", env: registrationEnvironment },
    );
    assert.equal(run.status, 0, run.stderr);
    assert.equal(
      [...run.stdout.matchAll(/^# Subtest: default$/gm)].length,
      registrations,
      run.stdout,
    );
  }
});

test("correction total numeric models can explicitly declare no error branches", async (t) => {
  const root = await setup(
      t,
      "const square=(x:number)=>x*x;export default()=> <p>Prose.</p>;",
      {
        "tests/cases.mjs":
          'import test from "node:test";import assert from "node:assert/strict";function square(x){return x*x}test("default",()=>assert.equal(square(0),0));',
      },
    ),
    capture = await captureSource(root),
    source = await ref(root, "app/page.tsx", ts.isArrowFunction);
  const effect = {
    id: "square",
    kind: "numeric-computation",
    operation: source,
    fixtures: [await fixture(root)],
    inputs: [{ path: "x", source }],
    domain: {
      kind: "finite",
      states: [{ name: "default", inputs: { x: 0 } }],
      claim: "all-declared-states",
    },
    outputs: [
      { path: "result", source, consumers: [source], contentPorts: [] },
    ],
    identities: ["The square of zero equals zero."],
    errorBranches: [],
  };
  bindSyntheticContracts({ ports: [], effects: [effect] });
  assert.equal(effectSchema.safeParse(effect).success, true);
  await validateLocalReceipt(
    capture,
    await receipt(root, capture, { effects: [effect] }),
  );
});

test("correction fixtures bind actual imported production source and its closure", async (t) => {
  const productionFile = "lib/algebra/tetrahedral-displacements.ts",
    testFile = "tests/tetrahedral-displacements.test.mjs";
  const production = await readFile(
      new URL("../" + productionFile, import.meta.url),
      "utf8",
    ),
    realFixture = await readFile(
      new URL("../" + testFile, import.meta.url),
      "utf8",
    );
  const name = "the source tetrahedron has six equal edges and centroid zero";
  for (const bound of [false, true]) {
    const page =
      (bound
        ? 'import {tetrahedralVertices} from "../lib/algebra/tetrahedral-displacements.ts";'
        : "") + `${mathImport}export default()=> <Math>{"12"}</Math>;`;
    const root = await setup(t, page, {
        [productionFile]: production,
        [testFile]: realFixture,
      }),
      capture = await captureSource(root),
      content = await port(
        root,
        await ref(
          root,
          "app/page.tsx",
          (node) => ts.isStringLiteral(node) && node.text === "12",
        ),
      );
    content.output.fixture = {
      case: name,
      source: await ref(
        root,
        testFile,
        (node) => ts.isCallExpression(node) && node.arguments[0]?.text === name,
      ),
    };
    const saved = await receipt(root, capture, { ports: [content] });
    if (bound) {
      await validateLocalReceipt(capture, saved);
      const registrationEnvironment = { ...process.env };
      delete registrationEnvironment.NODE_TEST_CONTEXT;
      const run = spawnSync(
        process.execPath,
        ["--test", "--test-reporter=tap", path.join(root, testFile)],
        { encoding: "utf8", env: registrationEnvironment },
      );
      assert.equal(run.status, 0, run.stdout + run.stderr);
      assert.equal(
        [...run.stdout.matchAll(/^# Subtest:/gm)].length,
        4,
        run.stdout,
      );
    } else
      await assert.rejects(
        validateLocalReceipt(capture, saved),
        /bound production source/,
      );
  }
});

test("correction report paths remain inside the canonical research directory", async (t) => {
  const root = await setup(t, "export default()=> <p>Prose.</p>;"),
    capture = await captureSource(root),
    saved = await receipt(root, capture),
    body = await readFile(path.join(root, saved.report.file));
  for (const file of [
    "docs/research/public-math-v2/../../../outputs/outside.md",
    "docs/research/public-math-v2/./control.md",
    "docs/research/public-math-v2/nested/../control.md",
  ]) {
    await put(root, file, body);
    await assert.rejects(
      validateLocalReceipt(capture, {
        ...saved,
        report: { ...saved.report, file },
      }),
    );
  }
});
