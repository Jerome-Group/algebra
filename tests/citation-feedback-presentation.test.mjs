import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { sourceSegments } from "./browser/public-math-segments.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());

const rawSection =
  "Sections 1.3.1-1.3.2, printed pages 5-6. The source uses right permutations composed left to right. The independently checked teaching uses left function composition and conjugation gxg^{-1}.";
const presentedSection =
  "Sections 1.3.1-1.3.2, printed pages 5-6. The source uses right permutations composed left to right. The independently checked teaching uses left function composition and conjugation $gxg^{-1}$.";
const sourceTitle = "Robert A. Wilson, The alternating groups";
const sourceUrl = "https://webspace.maths.qmul.ac.uk/r.a.wilson/FSG/notes1.pdf";

test("both alternating-class source citations render the complete conjugation expression and original bibliography", async () => {
  const ledger = JSON.parse(
    await readFile(
      new URL("../lib/algebra/ureca-topics.json", import.meta.url),
    ),
  );
  const { publicMathText } = await vite.ssrLoadModule(
    "/components/algebra/PublicMathText.ts",
  );
  const { Prose } = await vite.ssrLoadModule("/components/algebra/Math.tsx");
  const { UrecaCoverage } = await vite.ssrLoadModule(
    "/components/algebra/UrecaCoverage.tsx",
  );
  assert.deepEqual(sourceSegments(presentedSection), [
    {
      kind: "prose",
      text: "Sections 1.3.1-1.3.2, printed pages 5-6. The source uses right permutations composed left to right. The independently checked teaching uses left function composition and conjugation ",
    },
    { kind: "math", tex: "gxg^{-1}", display: false },
    { kind: "prose", text: "." },
  ]);
  const renderProse = (text, props = {}) =>
    React.createElement(Prose, props, text);
  const expected = renderToStaticMarkup(
    React.createElement(
      "li",
      null,
      React.createElement(
        "a",
        { href: sourceUrl },
        renderProse(sourceTitle, { focusable: false }),
      ),
      " ",
      "·",
      " ",
      renderProse(presentedSection),
    ),
  );
  const html = renderToStaticMarkup(
    React.createElement(UrecaCoverage, { lessons: [], open() {} }),
  );
  assert.ok(
    expected.includes(
      '<annotation encoding="application/x-tex">gxg^{-1}</annotation>',
    ),
    "the complete expression needs a real TeX annotation",
  );
  assert.ok(
    expected.includes('<math xmlns="http://www.w3.org/1998/Math/MathML">'),
  );
  assert.ok(!expected.includes("katex-error"));
  for (const index of [71, 72]) {
    const topic = ledger.topics[index];
    assert.equal(topic.id, `T${index + 1}`);
    assert.deepEqual(topic.sources[0], {
      title: sourceTitle,
      url: sourceUrl,
      section: rawSection,
    });
    assert.equal(
      renderToStaticMarkup(
        renderProse(publicMathText.get(topic.sources[0].section) ?? rawSection),
      ),
      renderToStaticMarkup(renderProse(presentedSection)),
      `${topic.id} must typeset the whole conjugation expression`,
    );
  }
  assert.equal(
    html.split(expected).length - 1,
    2,
    "actual UrecaCoverage must render both complete source-list entries",
  );
});

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test("laboratory status palettes support normal text on both retained light surfaces", async () => {
  const css = await readFile(
    new URL("../app/laboratories.css", import.meta.url),
    "utf8",
  );
  const declaration = (selector, property) => {
    const blocks = css.split(`\n${selector} {`);
    assert.equal(blocks.length, 2, `one exact ${selector} rule`);
    const body = blocks[1].split("}")[0];
    const match = body.match(
      new RegExp(`(?:^|;)\\s*${property}:\\s*(#[0-9a-f]{6})\\b`, "i"),
    );
    assert.ok(match, `${selector} declares ${property}`);
    return match[1];
  };
  const surfaces = [
    declaration(".algebra-app .exploration .visual-panel", "background"),
    declaration(".expression-preview", "background"),
  ];
  for (const selector of [".success-note", ".error-note"]) {
    const foreground = declaration(selector, "color");
    for (const background of surfaces) {
      const values = [luminance(foreground), luminance(background)];
      const ratio = (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
      assert.ok(
        ratio >= 4.5,
        `${selector} ${foreground} on ${background} has contrast ${ratio.toFixed(3)} < 4.5`,
      );
    }
  }
});
