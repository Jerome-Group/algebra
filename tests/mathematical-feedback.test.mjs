import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import { createServer } from "vite";

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
const { LaboratoryProvider } = await vite.ssrLoadModule(
  "/components/algebra/LaboratoryControls.tsx",
);
const lessons = JSON.parse(
  await readFile(`${root}/lib/algebra/lessons.json`, "utf8"),
);
const lesson = (id) => {
  const found = lessons.find((item) => item.id === id);
  assert.ok(found, `Actual catalogue lesson ${id}`);
  return found;
};
const render = (component, props = {}) =>
  renderToStaticMarkup(
    React.createElement(
      LaboratoryProvider,
      null,
      React.createElement(component, props),
    ),
  );
const decode = (text) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
const expressions = (html) =>
  [
    ...html.matchAll(
      /<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g,
    ),
  ].map(([, tex]) => decode(tex));
function strictExpressions(html) {
  assert.doesNotMatch(html, /katex-error/);
  const tex = expressions(html);
  assert.ok(tex.length, "Actual component renders mathematics");
  for (const expression of tex)
    katex.renderToString(expression, {
      throwOnError: true,
      strict: "error",
      trust: false,
    });
  return tex;
}

test("initial S3 empty word reports the trivial identity relation", async () => {
  const { S3RelationLab } = await vite.ssrLoadModule(
    "/components/algebra/CayleyRelations.tsx",
  );
  const html = render(S3RelationLab);
  assert.match(html, /The empty word is the trivial identity relation/);
  assert.doesNotMatch(html, /The current word is not an identity relation/);
  assert.match(html, /This alone does not prove a presentation complete/);
  strictExpressions(html);
  assert.deepEqual(
    expressions(
      html.match(/<div class="live-mathematics"[^>]*>([\s\S]*?)<\/div>/)[1],
    ),
    ["e", "e", "0", "S_3", String.raw`r^3=e,\qquad s^2=e,\qquad srs=r^{-1}`],
  );
});

test("quadratic quotient grid names its displayed alpha rather than its encoding index", async () => {
  const { QuadraticQuotientLab } = await vite.ssrLoadModule(
    "/components/algebra/Bridges.tsx",
  );
  const html = render(QuadraticQuotientLab);
  const buttons = [
    ...html.matchAll(
      /<button\b[^>]*aria-label="Select quotient element ([^"]*)"[^>]*>[\s\S]*?<\/button>/g,
    ),
  ];
  assert.deepEqual(
    buttons.map(([, name]) => decode(name)),
    ["0", "1", "alpha", "1 plus alpha"],
  );
  assert.deepEqual(
    buttons.map(([button]) => expressions(button)),
    [["0"], ["1"], [String.raw`\alpha`], [String.raw`1+\alpha`]],
  );
  strictExpressions(html);
});

test("actual DVR initial display contains each of its three strict descents once", async () => {
  const { StructureLab } = await vite.ssrLoadModule(
    "/components/algebra/Structure.tsx",
  );
  const tex = strictExpressions(
    render(StructureLab, { lesson: lesson("m3220-dvr") }),
  );
  assert.ok(
    tex.includes(String.raw`R\supsetneq(t)\supsetneq(t^{2})\supsetneq(t^{3})`),
    `Expected the complete finite chain; observed ${tex.find((value) => value.startsWith("R\\supsetneq"))}`,
  );
});

test("finite chain SSR renders distinct adjacent ideals for every permitted step", async () => {
  const { IdealChain } = await vite.ssrLoadModule(
    "/components/algebra/Structure.tsx",
  );
  const cases = [
    [
      false,
      String.raw`\supsetneq`,
      [
        "R",
        "(t)",
        "(t^{2})",
        "(t^{3})",
        "(t^{4})",
        "(t^{5})",
        "(t^{6})",
        "(t^{7})",
      ],
    ],
    [
      true,
      String.raw`\subsetneq`,
      [
        "(X_{1})",
        "(X_{1},X_{2})",
        "(X_{1},X_{2},X_{3})",
        "(X_{1},X_{2},X_{3},X_{4})",
        "(X_{1},X_{2},X_{3},X_{4},X_{5})",
        "(X_{1},X_{2},X_{3},X_{4},X_{5},X_{6})",
        "(X_{1},X_{2},X_{3},X_{4},X_{5},X_{6},X_{7})",
        "(X_{1},X_{2},X_{3},X_{4},X_{5},X_{6},X_{7},X_{8})",
      ],
    ],
  ];
  for (const [ascending, relation, ideals] of cases)
    for (let step = 1; step <= 7; step++) {
      const tex = strictExpressions(render(IdealChain, { ascending, step }));
      assert.deepEqual(tex, [ideals.slice(0, step + 1).join(relation)]);
      const terms = tex[0].split(relation);
      assert.equal(terms.length, step + 1);
      assert.equal(new Set(terms).size, terms.length);
      assert.doesNotMatch(tex[0], /\\cdots|\\ldots/);
    }
  assert.equal(
    lessons.some(
      (item) =>
        item.machine === "diagram" &&
        item.parameters?.mode === "ascending-chain",
    ),
    false,
    "Ascending Structure branch is SSR-only; current catalogue uses a different chain laboratory",
  );
});

test("synthetic S4 CharacterLab configuration keeps the complete tuple inside one TeX expression", async () => {
  assert.equal(
    lessons.some(
      (item) =>
        item.machine === "characters" && item.parameters?.group === "S4",
    ),
    false,
    "No actual catalogue route currently selects this S4 CharacterLab branch",
  );
  const { CharacterLab } = await vite.ssrLoadModule(
    "/components/algebra/Representations.tsx",
  );
  const html = render(CharacterLab, {
    lesson: {
      ...lesson("odyssey-character-table"),
      parameters: { group: "S4" },
    },
  });
  const tex = strictExpressions(html);
  assert.ok(
    tex.includes("(3,-1,-1,0,1)"),
    `Expected one whole tuple; observed ${tex.filter((value) => value.includes("3,-1,-1,0,1"))}`,
  );
  assert.ok(!tex.includes("3,-1,-1,0,1"));
});
