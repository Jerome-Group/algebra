import test, { after } from "node:test";
import assert from "node:assert/strict";
import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rm,
  readdir,
  symlink,
  link,
  stat,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import ts from "typescript";
import {
  publicFiles,
  readCatalogue,
  enumerateCatalogue,
  compileManifest,
  catalogueQueue,
  presentSpans,
  validateTex,
  generateModule,
  sha256,
} from "../scripts/lib/math-presentation.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalogue = await readCatalogue(root);
const expectedSources = {
  "lib/algebra/lessons.json":
    "5f12e02001cdb65591ef5437ed0279cf2f750b4490a930e4af2ad01cc1274d74",
  "lib/algebra/guided-lessons.json":
    "6d727041580ad0be7891013926222ff8607e07e291ac6845ac1e82a6932911db",
  "lib/algebra/units.json":
    "622452df05bafd77af27ab9ad3f5ae4427d88bf1d391b88dc547a3981ee90bf4",
  "lib/algebra/capstone-assessments.json":
    "f9c562ddd4c9f6b22ac7ab2ed83b86e9980ca8f12cc73736581e0ab5135dbc84",
};
const source = {
  file: "lib/algebra/guided-lessons.json",
  pointer: "/foundations-functions/objects",
};
const text = catalogue.entries.find((entry) =>
  entry.occurrences.some(
    (occurrence) =>
      occurrence.file === source.file && occurrence.pointer === source.pointer,
  ),
).text;
const raw = "f:X→Y";
const span = {
  start: text.indexOf(raw),
  end: text.indexOf(raw) + raw.length,
  raw,
  tex: "f\\colon X\\to Y",
};
const manifest = {
  version: 1,
  sources: expectedSources,
  annotations: [{ source, spans: [span] }],
};
const compiled = compileManifest(catalogue, manifest);
const moduleCode = ts
  .transpileModule(generateModule(compiled), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  })
  .outputText.replaceAll(/"\.\/(.*?\.json)"/g, '"/lib/algebra/$1"');
const vite = await createServer({
  configFile: false,
  resolve: { alias: { "@": root } },
  plugins: [
    {
      name: "presentation-fixture",
      enforce: "pre",
      resolveId(id) {
        if (/\/lib\/algebra\/math-presentation\.generated(?:\.ts)?$/.test(id))
          return "\0presentation-fixture.ts";
      },
      load(id) {
        if (id === "\0presentation-fixture.ts")
          return { code: moduleCode, map: null };
      },
    },
  ],
  optimizeDeps: { noDiscovery: true },
  appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());
const math = await vite.ssrLoadModule("/components/algebra/Math.tsx");
const records = await vite.ssrLoadModule("/lib/algebra/argument-records.ts");
const progress = await vite.ssrLoadModule("/lib/algebra/progress.ts");
const render = (component, children, props = {}) =>
  renderToStaticMarkup(createElement(component, props, children));
const run = promisify(execFile);

test("canonical source bytes stay fixed and the queue classifies every public string", () => {
  assert.deepEqual(
    Object.fromEntries(
      publicFiles.map((file) => [file, catalogue.sources[file].hash]),
    ),
    expectedSources,
  );
  const queue = catalogueQueue(catalogue, compiled);
  assert.equal(
    queue.entries.length,
    new Set(queue.entries.map(({ text }) => text)).size,
  );
  assert.ok(
    queue.entries.some(({ occurrences }) =>
      occurrences.some(({ role }) => role === "assessment-choice"),
    ),
  );
  assert.ok(
    queue.entries.some(({ occurrences }) =>
      occurrences.some(({ role }) => role === "entryCompetencies/*"),
    ),
  );
  assert.ok(queue.excluded.some(({ reason }) => reason === "direct-tex"));
  assert.ok(
    queue.excluded.some(({ reason }) => reason === "laboratory-configuration"),
  );
  const values = Object.fromEntries(
    publicFiles.map((file) => [file, catalogue.sources[file].value]),
  );
  const changed = structuredClone(values);
  changed[publicFiles[0]][0].unclassifiedVisibleField = "New field";
  assert.throws(() => enumerateCatalogue(changed), /Unclassified/);
});

test("compiler preserves exact untouched slices and refuses whole-source drift", () => {
  const record = compiled.records[0];
  assert.equal(
    record.presented,
    text.slice(0, span.start) + "$" + span.tex + "$" + text.slice(span.end),
  );
  for (const slice of record.untouched)
    assert.equal(slice.text, text.slice(slice.start, slice.end));
  assert.deepEqual(
    catalogueQueue(catalogue, compiled),
    catalogueQueue(
      catalogue,
      compileManifest(catalogue, structuredClone(manifest)),
    ),
  );
  assert.equal(
    generateModule(compiled),
    generateModule(compileManifest(catalogue, manifest)),
  );
  const drift = structuredClone(manifest);
  drift.sources[publicFiles[0]] = "0".repeat(64);
  assert.throws(() => compileManifest(catalogue, drift), /source hash changed/);
});

test("compiler refuses private paths, identity fields, stale pointers and unknown schema keys", () => {
  for (const patch of [
    { file: "lib/algebra/private-arguments.json", pointer: "/text" },
    { file: "lib/algebra/lessons.json", pointer: "/0/id" },
    { ...source, pointer: "/foundations-functions/not-present" },
  ])
    assert.throws(() =>
      compileManifest(catalogue, {
        ...manifest,
        annotations: [{ source: patch, spans: [span] }],
      }),
    );
  assert.throws(() =>
    compileManifest(catalogue, { ...manifest, reviewed: true }),
  );
  assert.throws(() =>
    compileManifest(catalogue, {
      ...manifest,
      sources: {
        ...expectedSources,
        "lib/algebra/learning-metadata.json": "0".repeat(64),
      },
    }),
  );
});

test("spans refuse raw mismatches, overlap, reversed ranges and surrogate splitting", () => {
  assert.throws(
    () => presentSpans(text, [{ ...span, raw: "different" }]),
    /exact source slice/,
  );
  assert.throws(
    () => presentSpans(text, [span, span]),
    /sorted, nonoverlapping/,
  );
  assert.throws(
    () => presentSpans(text, [{ ...span, start: span.end, end: span.start }]),
    /within source/,
  );
  assert.throws(
    () => presentSpans("A😀B", [{ start: 1, end: 2, raw: "\ud83d", tex: "x" }]),
    /surrogate pair/,
  );
  assert.equal(
    presentSpans("A😀B", [{ start: 1, end: 3, raw: "😀", tex: "x" }]).presented,
    "A$x$B",
  );
});

test("existing delimiter expressions remain byte identical and collisions refuse", () => {
  const original = "Keep $x$ then G and \\[y+1\\].";
  const at = original.indexOf("G");
  const output = presentSpans(original, [
    { start: at, end: at + 1, raw: "G", tex: "G_1" },
  ]);
  assert.equal(output.presented, "Keep $x$ then $G_1$ and \\[y+1\\].");
  assert.throws(
    () => presentSpans(original, [{ start: 6, end: 7, raw: "x", tex: "z" }]),
    /existing delimiter/,
  );
  assert.throws(
    () => presentSpans("$xA", [{ start: 2, end: 3, raw: "A", tex: "A" }]),
    /delimiter collision/,
  );
});

test("strict untrusted KaTeX rejects malformed, delimiter-bearing and stateful TeX", () => {
  for (const tex of [
    "\\frac{",
    "\\unknowncommand",
    "$x$",
    "\\(x\\)",
    "\\href{https://example.com}{x}",
    "\\gdef\\x{y}",
  ])
    assert.throws(() => validateTex(tex), undefined, tex);
  assert.match(
    validateTex(catalogue.sources[publicFiles[0]].value[42].theorem),
    /<math/,
  );
});

test("set notation renders visible MathML braces, with unescaped grouping as a negative control", () => {
  const explicitSet = validateTex("f^{-1}(\\{1\\})=\\{1,4\\}");
  const hiddenBraces = validateTex("f^{-1}({1})={1,4}");
  const mathml = (html) => html.match(/<math[\s\S]*?<annotation/)[0];
  assert.match(mathml(explicitSet), /<mo[^>]*>\{<\/mo>/);
  assert.match(mathml(explicitSet), /<mo[^>]*>\}<\/mo>/);
  assert.doesNotMatch(mathml(hiddenBraces), /<mo[^>]*>\{<\/mo>/);
});

test("identical public strings must have one presentation across all occurrences", () => {
  const values = {
    [publicFiles[0]]: [
      { id: "a", title: "G1" },
      { id: "b", title: "G1" },
    ],
    [publicFiles[1]]: {},
    [publicFiles[2]]: [],
    [publicFiles[3]]: {},
  };
  const fixture = {
    ...enumerateCatalogue(values),
    sources: Object.fromEntries(
      publicFiles.map((file) => [
        file,
        { hash: expectedSources[file], value: values[file] },
      ]),
    ),
  };
  const annotations = [0, 1].map((index) => ({
    source: { file: publicFiles[0], pointer: `/${index}/title` },
    spans: [{ start: 0, end: 2, raw: "G1", tex: "G_1" }],
  }));
  assert.equal(
    compileManifest(fixture, { ...manifest, annotations }).mappings.length,
    1,
  );
  annotations[1].spans[0].tex = "G^1";
  assert.throws(
    () => compileManifest(fixture, { ...manifest, annotations }),
    /Conflicting/,
  );
});

test("actual public renderer adapts exact strings and private renderer never looks up matching text", () => {
  assert.match(render(math.Prose, text), /class="katex"/);
  assert.doesNotMatch(render(math.WrittenProse, text), /class="katex"/);
  assert.doesNotMatch(render(math.Prose, text + " "), /class="katex"/);
  const english = "The domain and codomain are part of a function.";
  assert.equal(render(math.Prose, english), render(math.WrittenProse, english));
  assert.equal(
    render(math.Prose, "Read $x$ then \\(y\\) then $$z$$ and \\[w\\].").match(
      /<math/g,
    ).length,
    4,
  );
  assert.equal(
    render(math.WrittenProse, "Private $x$.").match(/<math/g).length,
    1,
  );
});

test("Math focusability survives both prose paths and nested-control opt out", () => {
  assert.match(render(math.Prose, text), /tabindex="0"/);
  assert.doesNotMatch(
    render(math.Prose, text, { focusable: false }),
    /tabindex/,
  );
  assert.match(render(math.WrittenProse, "$x$"), /tabindex="0"/);
  assert.doesNotMatch(
    render(math.WrittenProse, "$x$", { focusable: false }),
    /tabindex/,
  );
});

test("prose formulas inside native controls inherit a single control focus target", async () => {
  const directory = path.join(root, "components/algebra");
  const controls = new Set([
    "button",
    "a",
    "summary",
    "label",
    "ConceptLink",
    "WorkLink",
  ]);
  for (const name of await readdir(directory)) {
    if (!name.endsWith(".tsx")) continue;
    const file = path.join(directory, name);
    const source = await readFile(file, "utf8");
    const tree = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node, parents = []) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const opening = ts.isJsxElement(node) ? node.openingElement : node;
        const tag = opening.tagName.getText(tree);
        if (
          ["Prose", "WrittenProse"].includes(tag) &&
          parents.some((parent) => controls.has(parent))
        ) {
          const focus = opening.attributes.properties.find(
            (attribute) =>
              ts.isJsxAttribute(attribute) &&
              attribute.name.getText(tree) === "focusable",
          );
          assert.equal(
            focus?.initializer?.getText(tree),
            "{false}",
            `${name} contains focusable prose inside ${parents.join("/")}`,
          );
        }
        parents = [...parents, tag];
      }
      ts.forEachChild(node, (child) => visit(child, parents));
    };
    visit(tree);
  }
});

test("actual assessment revisions and teaching editions match the pre-integration baseline", async () => {
  const lessons = catalogue.sources[publicFiles[0]].value;
  const assessments = Object.fromEntries(
    Object.entries(progress.assessmentRegistry(lessons)).map(
      ([id, assessment]) => [id, progress.assessmentRevision(assessment)],
    ),
  );
  const editions = Object.fromEntries(
    await Promise.all(
      lessons.map(async ({ id }) => [id, await records.teachingEdition(id)]),
    ),
  );
  assert.equal(Object.keys(assessments).length, 716);
  assert.equal(Object.keys(editions).length, 227);
  assert.equal(
    sha256(JSON.stringify(assessments)),
    "720d1635bf4faa35a77a885c691332031f8eab616cee0277e8fa6ccd306abd45",
  );
  assert.equal(
    sha256(JSON.stringify(editions)),
    "727611104132739675b43ad47ad05aad73c37eac1e2df5f374384b554b3c93c2",
  );
});

test("retained proof matching public teaching stays delimiter-only and private import bytes survive", async () => {
  const edition = await records.teachingEdition("foundations-functions");
  const sheet = {
    version: 1,
    id: "presentation-private-control",
    lessonId: edition.lessonId,
    unitId: "functions",
    edition: { ...edition, proof: [text] },
    blocks: [
      {
        id: "block-1",
        text,
        question: "Why $x$?",
        review: "unreviewed",
        reference: 0,
      },
    ],
    activeBlockId: "block-1",
  };
  sheet.edition.digest = await records.argumentDigest(
    records.teachingFields(sheet.edition),
  );
  const { ArgumentComparison } = await vite.ssrLoadModule(
    "/components/algebra/ArgumentWriting.tsx",
  );
  const retained = renderToStaticMarkup(
    createElement(ArgumentComparison, { sheet, commit() {}, historical: true }),
  );
  assert.doesNotMatch(retained, /class="katex"/);
  const current = renderToStaticMarkup(
    createElement(ArgumentComparison, {
      sheet,
      commit() {},
      historical: false,
    }),
  );
  assert.match(current, /class="katex"/);
  const backup = {
    format: "algebra-arguments-export-v1",
    saved: [{ sheet, revision: 1 }],
    active: null,
    unsupported: [],
    pending: null,
  };
  const bytes = JSON.stringify(backup);
  const imported = records.previewArgumentImport(bytes).sheets[0];
  assert.equal(JSON.stringify(imported), JSON.stringify(sheet));
  assert.equal(JSON.stringify(backup), bytes);
  for (const file of [
    "components/algebra/ArgumentWriting.tsx",
    "components/algebra/ArgumentDesk.tsx",
  ]) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.doesNotMatch(
      source,
      /<Prose[^>]*>\s*\{(?:active\.text|block\.text|sheet\.edition\.)/,
    );
  }
});

test("identity and persistence imports cannot reach the presentation layer", async () => {
  const visited = new Set();
  const visit = async (file) => {
    if (visited.has(file)) return;
    visited.add(file);
    assert.doesNotMatch(file, /math-presentation|components\/algebra\/Math/);
    const source = await readFile(file, "utf8");
    for (const { fileName } of ts.preProcessFile(source).importedFiles) {
      if (!fileName.startsWith(".") && !fileName.startsWith("@/")) continue;
      const target = fileName.startsWith("@/")
        ? path.join(root, fileName.slice(2))
        : path.resolve(path.dirname(file), fileName);
      if (target.endsWith(".json")) continue;
      await visit(`${target}.ts`);
    }
  };
  for (const name of [
    "progress",
    "account-progress",
    "argument-records",
    "argument-store",
    "account-store",
  ])
    await visit(path.join(root, "lib/algebra", `${name}.ts`));
});

test("CLI output is deterministic and refuses stale, aliased and colliding destinations without source writes", async () => {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "algebra-presentation-"),
  );
  const cli = path.join(root, "scripts/math-presentation.mjs");
  const command = (action, ...args) =>
    run(process.execPath, [
      cli,
      action,
      "--root",
      temporary,
      "--manifest",
      "manifest.json",
      ...args,
    ]);
  try {
    await mkdir(path.join(temporary, "lib/algebra"), { recursive: true });
    for (const file of publicFiles)
      await writeFile(
        path.join(temporary, file),
        catalogue.sources[file].bytes,
      );
    await writeFile(
      path.join(temporary, "manifest.json"),
      JSON.stringify(manifest),
    );
    await command("build");
    const generated = path.join(
      temporary,
      "lib/algebra/math-presentation.generated.ts",
    );
    const first = await readFile(generated, "utf8");
    await command("build");
    assert.equal(await readFile(generated, "utf8"), first);
    await command("check");
    const canonical = path.join(temporary, publicFiles[0]);
    await symlink(canonical, path.join(temporary, "source-symlink.ts"));
    await symlink(
      path.dirname(canonical),
      path.join(temporary, "source-directory"),
    );
    await link(canonical, path.join(temporary, "source-hardlink.ts"));
    for (const alias of [
      "source-symlink.ts",
      "source-directory/lessons.json",
      "source-hardlink.ts",
    ]) {
      await assert.rejects(
        command("build", "--output", alias),
        /Refusing to overwrite/,
      );
      await assert.rejects(
        command("check", "--report", alias),
        /Refusing to overwrite/,
      );
    }
    const generatedRelative = "lib/algebra/math-presentation.generated.ts";
    await assert.rejects(
      command("check", "--report", generatedRelative),
      /Refusing to overwrite/,
    );
    await link(generated, path.join(temporary, "generated-hardlink.ts"));
    await assert.rejects(
      command("check", "--report", "generated-hardlink.ts"),
      /Refusing to overwrite/,
    );
    await assert.rejects(
      command("queue", "--output", generatedRelative),
      /Refusing to overwrite/,
    );
    await assert.rejects(
      command("build", "--output", "shared.ts", "--report", "shared.ts"),
      /must be distinct/,
    );
    const caseAlias = path.join(temporary, "lib/algebra/LESSONS.JSON");
    if (await stat(caseAlias).catch(() => null))
      await assert.rejects(
        command("build", "--output", caseAlias),
        /Refusing to overwrite/,
      );
    assert.equal(await readFile(generated, "utf8"), first);
    for (const file of publicFiles)
      assert.equal(
        sha256(await readFile(path.join(temporary, file))),
        expectedSources[file],
      );
    await writeFile(generated, first + " ");
    await assert.rejects(command("check"), /stale/);
    await assert.rejects(
      command("build", "--output", publicFiles[0]),
      /Refusing to overwrite/,
    );
    const invalid = structuredClone(manifest);
    invalid.annotations[0].spans[0].tex = "\\unknowncommand";
    await writeFile(
      path.join(temporary, "manifest.json"),
      JSON.stringify(invalid),
    );
    await assert.rejects(command("build"));
    assert.equal(await readFile(generated, "utf8"), first + " ");
    for (const file of publicFiles)
      assert.equal(
        sha256(await readFile(path.join(temporary, file))),
        expectedSources[file],
      );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
