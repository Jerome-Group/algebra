import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup, renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "node:stream";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false, ws: false },
});

after(async () => {
  await vite.close();
});

function renderLoadedMarkup(element) {
  return new Promise((resolve, reject) => {
    let html = "";
    const output = new PassThrough();
    output.on("data", (chunk) => {
      html += chunk.toString();
    });
    output.on("end", () => resolve(html));
    output.on("error", reject);
    const stream = renderToPipeableStream(element, {
      onAllReady() {
        stream.pipe(output);
      },
      onError(error) {
        reject(error);
      },
    });
  });
}

test("all laboratory entry points render their declared content and valid mathematics inside their provider", async () => {
  const [{ default: Laboratory }, { LaboratoryProvider }] = await Promise.all([
    vite.ssrLoadModule("/components/algebra/Laboratory.tsx"),
    vite.ssrLoadModule("/components/algebra/LaboratoryControls.tsx"),
  ]);
  const lessons = JSON.parse(
    await readFile(path.join(root, "lib/algebra/lessons.json"), "utf8"),
  );
  for (const lesson of lessons) {
    const html = await renderLoadedMarkup(
      React.createElement(
        LaboratoryProvider,
        null,
        React.createElement(Laboratory, { l: lesson }),
      ),
    );
    assert.doesNotMatch(html, /class="katex-error"/, lesson.id);
    if (
      lesson.machine === "diagram" &&
      html.includes('class="structure-node"')
    ) {
      if (lesson.parameters?.mode === "euclidean") {
        assert.equal(
          (html.match(/class="structure-node"/g) || []).length,
          4,
          `${lesson.id}: the initial division chain has four actual ideals`,
        );
        assert.match(html, /\\langle 84,30\\rangle_\{\\mathbb Z\}/);
        assert.match(html, /\\langle 6\\rangle_\{\\mathbb Z\}/);
      } else if (lesson.parameters?.nodes?.length)
        assert.equal(
          (html.match(/class="structure-node"/g) || []).length,
          lesson.parameters.nodes.length,
          `${lesson.id}: every declared object is rendered`,
        );
    } else assert.match(html, /class="katex"/, lesson.id);
  }
});

test("every guided reader renders all checkpoints and retains accessible mathematics", async () => {
  const { LessonReader } = await vite.ssrLoadModule(
    "/components/algebra/LessonReader.tsx",
  );
  const lessons = JSON.parse(
    await readFile(path.join(root, "lib/algebra/lessons.json"), "utf8"),
  );
  const metadata = JSON.parse(
    await readFile(
      path.join(root, "lib/algebra/learning-metadata.json"),
      "utf8",
    ),
  );
  for (const lesson of lessons.filter(
    (item) => metadata[item.id].teachingStatus === "guided",
  )) {
    const html = renderToStaticMarkup(
      React.createElement(LessonReader, {
        lesson,
        lessons,
        tab: "guided",
        setTab() {},
        open() {},
      }),
    );
    assert.equal(
      (html.match(/class="learning-checkpoint"/g) || []).length,
      4,
      lesson.id,
    );
    assert.match(html, /<math/, lesson.id);
    assert.doesNotMatch(html, /class="katex-error"/, lesson.id);
    assert.match(html, /Rigour and sources/, lesson.id);
  }
});

test("production manifest keeps laboratory implementations out of eager shell imports", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(root, "dist/client/.vite/manifest.json"), "utf8"),
  );
  const shell = manifest["components/algebra/Algebra.tsx"];
  const eager = new Set();
  const visit = (key) => {
    if (eager.has(key)) return;
    eager.add(key);
    for (const dependency of manifest[key]?.imports ?? []) visit(dependency);
  };
  visit("components/algebra/Algebra.tsx");
  for (const component of [
    "Groups",
    "Rings",
    "Cube",
    "FunctionFibers",
    "TensorBalancingLab",
  ]) {
    const key = `components/algebra/${component}.tsx`;
    assert.ok(shell.dynamicImports.includes(key), key);
    assert.equal(eager.has(key), false, key);
    assert.ok(manifest[key].isDynamicEntry, key);
  }
});
