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
const { Prose } = await vite.ssrLoadModule("/components/algebra/Math.tsx");
const decode = (value) =>
  value.replace(
    /&(?:amp|lt|gt|quot|#x27|#39);/g,
    (entity) =>
      ({
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&#x27;": "'",
        "&#39;": "'",
      })[entity],
  );
const annotations = (html) =>
  [
    ...html.matchAll(
      /<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g,
    ),
  ].map(([, tex]) => decode(tex));
function narrative(html) {
  let result = "";
  for (let i = 0; i < html.length;) {
    if (html.startsWith('<span class="katex">', i)) {
      const tags = /<\/?span\b[^>]*>/g;
      tags.lastIndex = i;
      let depth = 0;
      let end = i;
      for (let match; (match = tags.exec(html));) {
        depth += match[0].startsWith("</") ? -1 : 1;
        if (!depth) {
          end = tags.lastIndex;
          break;
        }
      }
      assert.ok(end > i, "balanced rendered KaTeX span");
      const math = html.slice(i, end);
      assert.match(math, /<math /);
      assert.equal(annotations(math).length, 1);
      result += `$${annotations(math)[0]}$`;
      i = end;
    } else if (html[i] === "<") {
      i = html.indexOf(">", i) + 1;
    } else {
      const end = html.indexOf("<", i);
      result += html.slice(i, end === -1 ? html.length : end);
      i = end === -1 ? html.length : end;
    }
  }
  return decode(result).replace(/\s+/g, " ").trim();
}
const paragraphs = (html) =>
  [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(([, inner]) =>
    narrative(inner),
  );
const renderLab = (component, props = {}) =>
  renderToStaticMarkup(
    React.createElement(
      LaboratoryProvider,
      null,
      React.createElement(component, props),
    ),
  );
const publicLessons = JSON.parse(
  await readFile(new URL("../lib/algebra/lessons.json", import.meta.url)),
);
const lesson = (id) => {
  const found = publicLessons.find((item) => item.id === id);
  assert.ok(found, `real lesson fixture ${id}`);
  return found;
};
const noop = () => {};
const selection = (order = 2) => ({
  order,
  exponent: 1,
  element: 0,
  setExponent: noop,
  setElement: noop,
  changeOrder: noop,
});

test("group cardinalities, double-coset sizes and both normality branches render their full mathematics", async () => {
  const { GroupLab } = await vite.ssrLoadModule(
    "/components/algebra/Groups.tsx",
  );
  const cyclic = renderLab(GroupLab, {
    lesson: lesson("mh2220-congruence"),
  });
  const stats = cyclic.match(
    /<div class="stat-strip">([\s\S]*?)<\/div><span class="math-display"/,
  )[1];
  assert.deepEqual(annotations(stats), [
    "6",
    "\\operatorname{ord}(a)",
    "6",
    "|H|",
    "1",
    "[G:H]",
    "4",
  ]);
  assert.ok(
    paragraphs(cyclic).includes(
      "The selected generated subgroup is $H=\\{0,1,2,3,4,5\\}$. Following addition arrows returns to the identity after $6$ steps. Cosets partition $G$ into $1$ equal pieces of size $6$.",
    ),
  );
  assert.ok(
    paragraphs(cyclic).includes(
      "$H$ is normal: its cosets form a quotient group.",
    ),
  );
  const dihedral = renderLab(GroupLab, {
    lesson: {
      ...lesson("mh2220-double-cosets"),
      parameters: { group: "D3", subgroup: "reflection", mode: "double" },
    },
  });
  assert.ok(
    paragraphs(dihedral).includes(
      "$H=\\langle a\\rangle$ and $K=\\langle b\\rangle$. A double coset $HgK$ lets $H$ act on the left and $K$ on the right; unlike ordinary cosets, double cosets can have different sizes. Here the sizes are $6$.",
    ),
  );
  assert.ok(
    paragraphs(dihedral).includes(
      "$H$ is not normal: left and right cosets can differ, and coset multiplication is not well-defined.",
    ),
  );
  for (const button of dihedral.matchAll(
    /<button\b[^>]*>[\s\S]*?<\/button>/g,
  )) {
    assert.doesNotMatch(button[0], /tabindex="0"/);
  }
});

test("large dihedral powers retain complete exponents in the model and its readout", async () => {
  const { GroupLab } = await vite.ssrLoadModule(
    "/components/algebra/Groups.tsx",
  );
  for (const n of [12, 24]) {
    const html = renderLab(GroupLab, {
      lesson: {
        ...lesson("mh2220-congruence"),
        parameters: { group: `D${n}` },
      },
    });
    const tex = annotations(html);
    assert.ok(tex.includes(`r^{${n - 1}}`));
    assert.ok(
      tex.includes(`ab=r^{3},\\quad ba=r^{3},\\quad a^{-1}=r^{${n - 1}}`),
    );
    for (const formula of tex) assert.doesNotMatch(formula, /r\^\d\d/);
  }
});

test("ordinary homology and homomorphism source names stay prose", async () => {
  const { publicMathText } = await vite.ssrLoadModule(
    "/components/algebra/PublicMathText.ts",
  );
  for (const text of [
    "Antoine Touze, Homology of groups",
    "Section 1 · Homomorphism, correspondence and isomorphism theorems",
  ]) {
    const html = renderToStaticMarkup(
      React.createElement(Prose, null, publicMathText.get(text) ?? text),
    );
    assert.equal(narrative(html), text);
    assert.equal(annotations(html).length, 0);
  }
});

test("subgroup identifiers retain their indices and composition-factor orders", async () => {
  const { GroupLab } = await vite.ssrLoadModule(
    "/components/algebra/Groups.tsx",
  );
  const html = renderLab(GroupLab, {
    lesson: lesson("mh2220-simple-composition"),
  });
  assert.ok(annotations(html).some((tex) => /^H_\{\d+\}$/.test(tex)));
  assert.ok(!annotations(html).some((tex) => /^H\d+$/.test(tex)));
  assert.ok(
    paragraphs(html).some((text) =>
      text.startsWith(
        "Each subgroup is normal in the preceding one; the factors have orders $2,3,2,2$",
      ),
    ),
  );
  assert.ok(
    annotations(html).includes(
      "S_4\\triangleright A_4\\triangleright V_4\\triangleright C_2\\triangleright 1",
    ),
  );
});

test("complete congruences include the modulus within each expression", async () => {
  const { HomomorphismLab } = await vite.ssrLoadModule(
    "/components/algebra/Groups.tsx",
  );
  const html = renderLab(HomomorphismLab, { lesson: lesson("m3220-ring-hom") });
  assert.ok(
    paragraphs(html).includes(
      "Preserving multiplication also requires $k^{2} \\equiv k \\pmod m$; preserving the multiplicative identity requires $k \\equiv 1 \\pmod m$. Unital: yes.",
    ),
  );
});

test("polygon labels and mathematical choice values render current typeset quantities", async () => {
  const { PolygonColoringLab } = await vite.ssrLoadModule(
    "/components/algebra/PolygonColoringLab.tsx",
  );
  const html = renderLab(PolygonColoringLab, { lessonId: "mh2220-necklaces" });
  assert.equal(
    paragraphs(html)[0],
    "The acting group permutes $6$ bead positions. A coloring is fixed exactly when it is constant on each permutation cycle. Colors are labeled and may be unused.",
  );
  const labels = [...html.matchAll(/<label>([\s\S]*?)<\/label>/g)].map(
    ([, label]) => label,
  );
  assert.deepEqual(
    labels.slice(0, 4).map((label) => annotations(label)),
    [
      ["n", "6", "6"],
      ["D_{6}", "D_n"],
      ["q", "2", "2"],
      ["2", "2"],
    ],
  );
  for (const label of labels) assert.doesNotMatch(label, /tabindex="0"/);
  assert.equal(
    paragraphs(html).at(-1),
    "A nonidentity rotation may fix no bead and still fix colorings: assign one color per cycle. Naive division by the group order assumes every coloring orbit has full size. The table verifies this finite action; double-counting $(g,\\text{coloring})$ proves the general formula.",
  );
});

test("Cayley narratives annotate order and shortest-word length without losing English articles", async () => {
  const { CayleyReachability } = await vite.ssrLoadModule(
    "/components/algebra/CayleyReachability.tsx",
  );
  const { S3RelationLab } = await vite.ssrLoadModule(
    "/components/algebra/CayleyRelations.tsx",
  );
  const cyclic = renderLab(CayleyReachability, {
    lesson: { ...lesson("mh2220-inverse-order"), parameters: { generator: 4 } },
  });
  assert.ok(
    paragraphs(cyclic).includes(
      "Order of $g$: $\\frac{12}{\\gcd(12,4)}=3$. $3$ copies return to zero. The relation $3g=0$ holds in $C_{12}$; it is a defining relation only for the subgroup generated by $g$, whose order is $3$.",
    ),
  );
  const symmetric = renderLab(S3RelationLab);
  assert.ok(
    paragraphs(symmetric).includes(
      "Written word $e$ evaluates to $e$. Shortest word length for this element: $0$.",
    ),
  );
  assert.ok(!annotations(cyclic).includes("A"));
});

test("domain, codomain, group elements, eigenvalues and vertex labels use real SVG MathML", async () => {
  const { FunctionFiberLab } = await vite.ssrLoadModule(
    "/components/algebra/FunctionFibers.tsx",
  );
  const { CayleyReachability } = await vite.ssrLoadModule(
    "/components/algebra/CayleyReachability.tsx",
  );
  const { UrecaCharacterBound } = await vite.ssrLoadModule(
    "/components/algebra/UrecaCharacterBound.tsx",
  );
  const { SymmetryDesk } = await vite.ssrLoadModule(
    "/components/algebra/SymmetryDesk.tsx",
  );
  for (const [component, props, expected] of [
    [
      FunctionFiberLab,
      { lesson: lesson("foundations-fibers") },
      ["0", "1", "2", "3", "4", "5", "0", "1", "2"],
    ],
    [
      CayleyReachability,
      {
        lesson: {
          ...lesson("mh2220-inverse-order"),
          parameters: { generator: 4 },
        },
      },
      Array.from({ length: 12 }, (_, index) => String(index)),
    ],
    [UrecaCharacterBound, { state: selection() }, ["1", "-1"]],
    [
      SymmetryDesk,
      { open: noop },
      ["\\mathrm{A}", "\\mathrm{B}", "\\mathrm{C}", "\\mathrm{D}"],
    ],
  ]) {
    const html = renderLab(component, props);
    const svg = [...html.matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/g)]
      .map(([svg]) => svg)
      .find((svg) => svg.includes("<foreignObject"));
    assert.ok(svg, "mathematical diagram exists");
    assert.deepEqual(annotations(svg), expected);
    assert.equal(
      (svg.match(/<foreignObject\b/g) ?? []).length,
      expected.length,
    );
    assert.equal((svg.match(/<math /g) ?? []).length, expected.length);
    for (const tex of annotations(svg))
      assert.doesNotThrow(() =>
        katex.renderToString(tex, {
          throwOnError: true,
          strict: "error",
          trust: false,
        }),
      );
  }
});

test("cube and finite-field explanations annotate dimensions, group sizes, scalars and origin", async () => {
  const { default: Cube } = await vite.ssrLoadModule(
    "/components/algebra/Cube.tsx",
  );
  const { FieldLab } = await vite.ssrLoadModule(
    "/components/algebra/Rings.tsx",
  );
  const cube = paragraphs(
    renderLab(Cube, { lesson: lesson("cube-generator-words") }),
  );
  assert.ok(
    cube.some((text) =>
      text.endsWith("the geometric matrix $Q$ has dimension $3$."),
    ),
  );
  assert.ok(
    cube.includes(
      "Column vectors; $AB$ applies $B$ first. Every button left-multiplies $Q$. The matrix product is exact; camera movement is independent of the group action.",
    ),
  );
  assert.ok(
    cube.includes(
      "$A$ and $B$ generate all $24$ rotations. Adjoining $J$ yields $48$ symmetries. Determinant $-1$ includes inversion and rotoreflections, not only plane reflections.",
    ),
  );
  const finite = paragraphs(
    renderLab(FieldLab, { lesson: lesson("m3220-finite-field-four") }),
  );
  assert.ok(
    finite.some((text) =>
      text.startsWith("Addition is coefficient-wise modulo $2$."),
    ),
  );
  assert.ok(
    finite.includes(
      "There are four elements but the characteristic is $2$. This field is not $\\mathbb Z /4\\mathbb Z$, where $2\\cdot 2=0$.",
    ),
  );
  const gaussian = paragraphs(
    renderLab(FieldLab, { lesson: lesson("m3220-norm-trace") }),
  );
  assert.ok(
    gaussian.some((text) =>
      text.includes("squared distance from $0$, and $N(zw)=N(z)N(w)$"),
    ),
  );
});

test("product row counts and cube color state render exact mathematical cardinalities", async () => {
  const { UrecaIrreducibles } = await vite.ssrLoadModule(
    "/components/algebra/UrecaIrreducibles.tsx",
  );
  for (const [order, count] of [
    [2, 10],
    [3, 15],
  ]) {
    const html = renderLab(UrecaIrreducibles, { state: selection(order) });
    assert.ok(
      paragraphs(html).some((text) =>
        text.startsWith(`$${count}$ product rows; squared-degree sum $`),
      ),
    );
    const button = html.match(
      /<button\b[^>]*aria-label="Check all 15 rows of C₃×D₈"[^>]*>[\s\S]*?<\/button>/,
    )[0];
    assert.equal(narrative(button), "Check all $15$ rows of $C_3\\times D_8$");
    assert.doesNotMatch(button, /tabindex="0"/);
  }
  const { CubeColoringLab } = await vite.ssrLoadModule(
    "/components/algebra/CubeColoringLab.tsx",
  );
  const html = renderLab(CubeColoringLab);
  const label = [...html.matchAll(/<label>([\s\S]*?)<\/label>/g)][1][1];
  assert.deepEqual(annotations(label), ["q", "2", "2"]);
});

test("URECA display overrides render actual ledger fields and preserve English A", async () => {
  const { UrecaCoverage } = await vite.ssrLoadModule(
    "/components/algebra/UrecaCoverage.tsx",
  );
  const lessons = JSON.parse(
    await readFile(new URL("../lib/algebra/lessons.json", import.meta.url)),
  );
  const html = renderToStaticMarkup(
    React.createElement(UrecaCoverage, { lessons, open: noop }),
  );
  const text = narrative(html);
  for (const expected of [
    "Kernel and image of an arbitrary endomorphism need not split $V$",
    "Centre of $\\mathbb C G$ versus centre of $G$",
    "Cube signed-permutation construction, $48$ full symmetries, $24$ rotations, and explicit generators.",
    "Mackey restriction-of-induction decomposition. $H\\backslash G/K$",
    "Tensor-$\\operatorname{Hom}$ adjunction with an $(S,R)$-bimodule",
    "Every displacement is $c+Ar_i$",
    "$\\mathrm{SF}_6$ $O_h$ polar action",
    "$\\mathrm{GL}_2$ over a finite field",
    "replacing $1$ by $\\chi$.",
  ])
    assert.ok(text.includes(expected), expected);
  const { publicMathText } = await vite.ssrLoadModule(
    "/components/algebra/PublicMathText.ts",
  );
  for (const value of publicMathText.values()) {
    const rendered = renderToStaticMarkup(
      React.createElement(Prose, null, value),
    );
    assert.equal(narrative(rendered), value);
    for (const tex of annotations(rendered))
      assert.doesNotThrow(() =>
        katex.renderToString(tex, {
          throwOnError: true,
          strict: "error",
          trust: false,
        }),
      );
  }
  for (const sentence of [
    "A double coset $HgK$ has a size.",
    "A representation has a kernel.",
    "An $A$-linear map preserves addition.",
  ]) {
    const rendered = renderToStaticMarkup(
      React.createElement(Prose, null, sentence),
    );
    assert.equal(narrative(rendered), sentence);
  }
});

test("actual citation sources typeset group labels and mathematical counts while preserving bibliographic prose", async () => {
  const { Reference } = await vite.ssrLoadModule(
    "/components/algebra/Sources.tsx",
  );
  const expected = new Map([
    [
      "Primary reciprocity input; the displayed S5/A4 matrix and decompositions are independently computed here",
      "Primary reciprocity input; the displayed $S_5/A_4$ matrix and decompositions are independently computed here",
    ],
    [
      "Primary theorem inputs; the displayed A5 table is independently derived here by restriction",
      "Primary theorem inputs; the displayed $A_5$ table is independently derived here by restriction",
    ],
    [
      "Primary class-splitting input; the A6 table is an original computation from the S6 construction and index-two restriction proof",
      "Primary class-splitting input; the $A_6$ table is an original computation from the $S_6$ construction and index-two restriction proof",
    ],
    [
      "§15 The Character Table: row orthogonality; S₃ example",
      "§15 The Character Table: row orthogonality; $S_3$ example",
    ],
    [
      "Chapter 6, Lemma 6.2 (24 rotations); Theorem 6.5 (Burnside). Full 48-element actions are original coordinate extensions.",
      "Chapter 6, Lemma 6.2 ($24$ rotations); Theorem 6.5 (Burnside). Full $48$-element actions are original coordinate extensions.",
    ],
  ]);
  const counts = new Map([...expected.keys()].map((text) => [text, 0]));
  for (const entry of publicLessons) {
    for (const source of [
      entry.source,
      ...(entry.references ?? []),
      ...(entry.reading ?? []).map((note) => note.source),
    ]) {
      for (const field of ["role", "title", "section"]) {
        const presented = expected.get(source[field]);
        if (!presented) continue;
        const html = renderToStaticMarkup(
          React.createElement(Reference, { source }),
        );
        assert(narrative(html).includes(presented), `${entry.id}: ${field}`);
        assert.doesNotMatch(html, /class="katex-error"/);
        if (source.pages)
          assert(narrative(html).includes(`printed pp. ${source.pages}`));
        if (source.pdfPages)
          assert(narrative(html).includes(`PDF pp. ${source.pdfPages}`));
        assert(html.includes(source.url.replaceAll("&", "&amp;")));
        counts.set(source[field], counts.get(source[field]) + 1);
      }
    }
  }
  assert.deepEqual([...counts.values()], [1, 1, 1, 6, 6]);
});

test("argument recovery renders every module and balancing variable without changing source records", async () => {
  const { ArgumentSupport } = await vite.ssrLoadModule(
    "/components/algebra/ArgumentSupport.tsx",
  );
  const { teachingEdition, argumentSheetSchema } = await vite.ssrLoadModule(
    "/lib/algebra/argument-records.ts",
  );
  const sheet = argumentSheetSchema.parse({
    version: 1,
    id: "residual-ssr",
    lessonId: "tensor-products",
    unitId: null,
    edition: await teachingEdition("tensor-products"),
    blocks: [
      {
        id: "block",
        text: "",
        question: "",
        review: "unreviewed",
        reference: null,
      },
    ],
    activeBlockId: "block",
  });
  const html = renderToStaticMarkup(
    React.createElement(ArgumentSupport, {
      sheet,
      support: null,
      navigate: noop,
      returnToWriting: noop,
      chooseSupport: noop,
      recovery: true,
    }),
  );
  const recovery = html.match(
    /<details class="argument-recovery">([\s\S]*?)<\/details>/,
  )[1];
  const steps = [...recovery.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(
    ([, step]) => narrative(step),
  );
  assert.equal(
    steps[0],
    "For a unital ring map $A\\to B$, use $B$ as a left $B$, right $A$ bimodule. Let $V$ be a unital left $A$-module, $W$ a unital left $B$-module, and $\\alpha:V\\to\\operatorname{Res}_A^B W$ an $A$-linear map.",
  );
  assert.equal(
    steps[1],
    "The rule $F_\\alpha(b\\otimes v)=b\\alpha(v)$ must be additive in both inputs and balanced. Check $(ba)\\alpha(v)=b(a\\alpha(v))=b\\alpha(av)$ for every $a\\in A$. Associativity gives the first equality; $A$-linearity of $\\alpha$ gives the second.",
  );
  assert.equal(
    steps[2],
    "The tensor-products laboratory tests cyclic integer modules. It illustrates balancing in those finite examples; the arbitrary-ring adjunction still needs the argument above and the remaining proof steps.",
  );
});

test("finite matrix choices, tensor degrees, permutation labels and reflection axes render exact math", async () => {
  const { MatrixFiniteLab } = await vite.ssrLoadModule(
    "/components/algebra/FiniteLinearGroups.tsx",
  );
  assert.ok(
    paragraphs(renderLab(MatrixFiniteLab)).includes(
      "Choose a nonzero first column ($3$ choices), then a second column outside its span ($2$ choices). Act on the three nonzero vectors.",
    ),
  );
  const { UrecaExternalTensor } = await vite.ssrLoadModule(
    "/components/algebra/UrecaExternalTensor.tsx",
  );
  const tensor = renderLab(UrecaExternalTensor, { state: selection() });
  const board = tensor.match(
    /<div class="presentation-board">([\s\S]*?)<\/div>/,
  )[1];
  assert.deepEqual(annotations(board), [
    "1",
    "2",
    "v\\otimes w_1",
    "v\\otimes w_2",
  ]);
  const { PermutationLab } = await vite.ssrLoadModule(
    "/components/algebra/Representations.tsx",
  );
  const permutation = renderLab(PermutationLab);
  assert.equal(
    narrative(permutation.match(/<label>([\s\S]*?)<\/label>/)[1]),
    "Permutation $p$, images of $1,2,\\ldots$",
  );
  const { PlaneReflectionLab, MetricOrientationLab } = await vite.ssrLoadModule(
    "/components/algebra/OrthogonalGeometry.tsx",
  );
  const plane = renderLab(PlaneReflectionLab);
  assert.deepEqual(
    annotations(
      [...plane.matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/g)]
        .map(([svg]) => svg)
        .find((svg) => svg.includes("<foreignObject")),
    ),
    ["x\\text{-axis: fixed by }F"],
  );
  assert.ok(
    annotations(renderLab(MetricOrientationLab)).includes(
      "\\text{fixed }x\\text{-axis}",
    ),
  );
  const { labContractPresentation } = await vite.ssrLoadModule(
    "/lib/algebra/lab-contract-presentations.ts",
  );
  assert.equal(
    narrative(
      renderToStaticMarkup(
        React.createElement(
          Prose,
          null,
          labContractPresentation("mh2220-normal").prediction,
        ),
      ),
    ),
    "For $A_3$, predict whether conjugating a $3$-cycle by a transposition fixes that element or swaps it.",
  );
});
