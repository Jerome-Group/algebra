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
const { Prose } = await vite.ssrLoadModule("/components/algebra/Math.tsx");
const strictMath = (tex) =>
  katex.renderToString(tex, {
    throwOnError: true,
    strict: "error",
    trust: false,
  });
function proseMath(text) {
  assert.equal((text.match(/(?<!\\)\$/g) || []).length % 2, 0, text);
  return [...text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$]*)\$/g)].map(
    (match) => match[1] ?? match[2],
  );
}

function renderedNarrative(html) {
  return [
    ...html.matchAll(
      /<span>([^<]*)<\/span>|<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g,
    ),
  ]
    .map(([, prose, tex]) => (tex === undefined ? prose : `$${tex}$`))
    .join("");
}

test("coloring narratives annotate fixed, cycle and prescribed-inventory counts in context", async () => {
  const { ColoringLedgerView } = await vite.ssrLoadModule(
    "/components/algebra/ColoringLedgerView.tsx",
  );
  const { fixedColoringLedger } = await vite.ssrLoadModule(
    "/lib/algebra/fixed-colorings.ts",
  );
  const config = {
    kind: "polygon",
    size: 6,
    reflections: true,
    colors: 2,
    firstColorCount: 2,
  };
  const html = renderToStaticMarkup(
    React.createElement(ColoringLedgerView, {
      config,
      ledger: fixedColoringLedger(config),
      selected: 11,
      setSelected() {},
    }),
  );
  const paragraphs = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(
    ([, paragraph]) => renderedNarrative(paragraph),
  );
  assert.equal(
    paragraphs[0],
    "$r^{5}s$ has $0$ fixed beads but $3$ cycles, so it fixes $2^{3}=8$ colorings.",
  );
  assert.equal(
    paragraphs[2],
    "Fixed-coloring sum $156$ divided by group order $12$ gives $156/12=13$ orbits. With exactly $2$ beads of the first color, the coefficient of $x^{2}y^{4}$ gives $3$ orbits.",
  );
});

test("mixed cube narration annotates the selected orbit cardinality in context", async () => {
  const { default: Cube } = await vite.ssrLoadModule(
    "/components/algebra/Cube.tsx",
  );
  const { LaboratoryProvider } = await vite.ssrLoadModule(
    "/components/algebra/LaboratoryControls.tsx",
  );
  const html = renderToStaticMarkup(
    React.createElement(
      LaboratoryProvider,
      null,
      React.createElement(Cube, {
        lesson: { parameters: { object: "mixed" } },
      }),
    ),
  );
  const explanation = html.match(/<p class="lab-explain">([\s\S]*?)<\/p>/)[1];
  assert.ok(
    renderedNarrative(explanation).startsWith(
      "The selected point lies in an orbit of size $8$. Vertices and faces form two separate orbits, so the action is faithful but not transitive.",
    ),
  );
});

test("numeric laboratory contract quantities retain annotations and their surrounding prose", async () => {
  const { labContractPresentation } = await vite.ssrLoadModule(
    "/lib/algebra/lab-contract-presentations.ts",
  );
  for (const [owner, field, expected] of [
    [
      "mh2220-axioms",
      "prediction",
      "Before choosing subtraction modulo $3$, predict which axiom will fail.",
    ],
    [
      "mh2220-burnside",
      "counterexample",
      "A nonidentity triangle rotation fixes no bead, but fixes both constant binary colorings. Naive division of $8$ by $3$ fails.",
    ],
    [
      "mh2220-necklaces",
      "question",
      "Why do six binary beads give $14$ necklaces but $13$ bracelets?",
    ],
    [
      "mh2220-solid-colorings",
      "objects",
      "The $24$ orientation-preserving signed-permutation matrices act separately on cube vertices, face centers and edge midpoints.",
    ],
    [
      "mh2220-solid-colorings",
      "invariant",
      "The five proper cube rotation conjugacy classes have $1$, $6$, $3$, $8$ and $6$ elements. A class of size $m$ whose action has $c$ cycles contributes $m\\cdot q^c$ fixed colorings before averaging.",
    ],
  ]) {
    const html = renderToStaticMarkup(
      React.createElement(Prose, null, labContractPresentation(owner)[field]),
    );
    assert.equal(renderedNarrative(html), expected, `${owner}.${field}`);
  }
});

test("all laboratory contract formulas compile strictly and render MathML", async () => {
  const sourceContracts = JSON.parse(
    await readFile(
      new URL("../lib/algebra/lab-contracts.json", import.meta.url),
    ),
  );
  const { labContractPresentation } = await vite.ssrLoadModule(
    "/lib/algebra/lab-contract-presentations.ts",
  );
  const contracts = Object.fromEntries(
    Object.keys(sourceContracts).map((id) => [id, labContractPresentation(id)]),
  );
  let expressions = 0;
  for (const [id, contract] of Object.entries(contracts)) {
    for (const [field, text] of Object.entries(contract)) {
      const formulas = proseMath(text);
      for (const tex of formulas) {
        assert.doesNotThrow(() => strictMath(tex), `${id}.${field}: ${tex}`);
        expressions++;
      }
      if (formulas.length) {
        const html = renderToStaticMarkup(
          React.createElement(Prose, null, text),
        );
        assert.match(html, /<math /, `${id}.${field}`);
        assert.doesNotMatch(html, /katex-error/, `${id}.${field}`);
      }
    }
  }
  assert.ok(
    expressions > 500,
    "the contracts include their mathematical objects and debriefs",
  );
  assert.match(
    contracts["tensor-products"].invariant,
    /\(ur\)\\otimes v=u\\otimes\(rv\)/,
  );
  assert.match(
    contracts["mh2220-cayley-embedding"].invariant,
    /\\lambda_\{gh\}/,
  );
});

test("tensor controls retain names and keep formula labels outside the tab order", async () => {
  const { TensorBalancingLab } = await vite.ssrLoadModule(
    "/components/algebra/TensorBalancingLab.tsx",
  );
  const html = renderToStaticMarkup(
    React.createElement(TensorBalancingLab, {
      lesson: { title: "Tensor products" },
    }),
  );
  assert.match(html, /aria-label="Right module U=ℤ\/mℤ; choose m"/);
  assert.match(html, /aria-label="Left module V=ℤ\/nℤ; choose n"/);
  for (const label of html.matchAll(/<label[\s\S]*?<\/label>/g)) {
    assert.doesNotMatch(
      label[0],
      /tabindex="0"/,
      "formula labels add no tab stop",
    );
  }
  assert.match(html, /U=\\mathbb Z\/m\\mathbb Z/);
  assert.match(html, /V=\\mathbb Z\/n\\mathbb Z/);
  assert.match(html, /<textarea[^>]*aria-label="Your mathematical prediction"/);
  assert.match(
    html,
    /<button[^>]*disabled=""[^>]*>Test my prediction<\/button>/,
  );
});

test("all cyclic and dihedral character values have explicit, strict TeX", async () => {
  const domain = await vite.ssrLoadModule("/lib/algebra/direct-products.ts");
  const display = await vite.ssrLoadModule(
    "/components/algebra/RepresentationTex.ts",
  );
  for (const order of [2, 3]) {
    for (let power = 0; power < order; power++) {
      assert.doesNotThrow(() =>
        strictMath(display.cyclicScalarTex(order, power)),
      );
      for (const row of domain.dihedralIrreducibleRows) {
        for (const value of row.values) {
          const label = domain.characterProductLabel(
            value,
            domain.cyclicScalarLabel(order, power),
          );
          assert.ok(Object.hasOwn(display.characterValueTex, label), label);
          assert.doesNotThrow(() =>
            strictMath(display.characterValueTex[label]),
          );
        }
      }
    }
  }
  assert.equal(display.characterValueTex["-2ω²"], String.raw`-2\omega^2`);
  assert.deepEqual(display.dihedralTex, [
    "e",
    "r",
    "r^2",
    "r^3",
    "s",
    "rs",
    "r^2s",
    "r^3s",
  ]);
});

test("all polynomial presentation cases compile with radical and exponent scope retained", async () => {
  const { polynomialReadings, polynomialTex, fieldTex } =
    await vite.ssrLoadModule(
      "/components/algebra/PolynomialFactorisationText.ts",
    );
  for (const [id, fields] of Object.entries(polynomialReadings)) {
    for (const [field, reading] of Object.entries(fields)) {
      assert.doesNotThrow(() =>
        strictMath(`${polynomialTex[id]}=${reading.equation}`),
      );
      assert.doesNotThrow(() => strictMath(fieldTex[field]));
      for (const prose of [reading.roots, reading.certificate])
        for (const tex of proseMath(prose))
          assert.doesNotThrow(() => strictMath(tex));
    }
  }
  const real = strictMath(polynomialReadings.shifted.R.equation);
  assert.match(real, /<msqrt><mn>2<\/mn><\/msqrt><mi>X<\/mi>/);
  assert.match(
    strictMath(polynomialReadings.shifted.C.equation),
    /<msubsup><mo>∏<\/mo><mrow><mi>k<\/mi><mo>=<\/mo><mn>0<\/mn><\/mrow><mn>3<\/mn><\/msubsup>/,
  );
  assert.match(polynomialReadings.content.F2.certificate, /degree drops/);
});

test("every ideal-chain stage retains its model verdict and marks variable indices explicitly", async () => {
  const { chainReading, chainExamples } = await vite.ssrLoadModule(
    "/lib/algebra/ideal-chains.ts",
  );
  const { chainText, chainContext } = await vite.ssrLoadModule(
    "/components/algebra/IdealChainText.ts",
  );
  for (const example of Object.keys(chainExamples)) {
    for (let stage = 1; stage <= 6; stage++) {
      const model = chainReading(example, stage),
        text = chainText(example, stage);
      assert.equal(text.stable, model.stable);
      assert.doesNotThrow(() => strictMath(text.ideal));
      for (const prose of [text.witness, text.theorem, chainContext[example]])
        for (const tex of proseMath(prose))
          assert.doesNotThrow(() => strictMath(tex));
      if (example === "infiniteVariables") {
        assert.equal(text.generators.at(-1), `X_{${stage}}`);
        assert.match(text.witness, new RegExp(`X_\\{${stage + 1}\\}`));
      }
    }
  }
  assert.match(
    chainText("integerDescending", 6).witness,
    /\$64\$.*\$\(128\)\$/,
  );
});

test("contract English articles remain prose rather than an algebraic A", async () => {
  const { labContractPresentation } = await vite.ssrLoadModule(
    "/lib/algebra/lab-contract-presentations.ts",
  );
  const articleFields = {
    "foundations-functions": ["objects"],
    "foundations-quotient-rules": ["invariant", "debrief"],
    "mh2220-axioms": ["debrief"],
    "mh2220-inverse-order": ["invariant"],
    "mh2220-quotient": ["invariant"],
    "mh2220-orbit-stabilizer": ["counterexample"],
    "representations-real-complex": ["counterexample"],
    "linear-quotient": ["objects", "counterexample"],
    "ureca-character-bound-kernel": ["debrief"],
    "ureca-direct-product-irreducibles": ["counterexample"],
    "ureca-product-kernel-scalar-matching": ["objects", "invariant"],
    "mh2220-burnside": ["objects", "invariant", "counterexample"],
    "mh2220-necklaces": ["invariant"],
    "mh2220-solid-colorings": ["invariant", "counterexample"],
    "orthogonal-metric-orientation": ["counterexample"],
    "mh2220-sylow-existence": ["counterexample"],
    "mh2220-sylow-conjugacy": ["objects", "counterexample"],
    "m3220-polynomial-division": ["counterexample"],
    "m3220-gauss": ["invariant"],
    "m3220-eisenstein": ["invariant"],
    "m3220-irreducibility-tests": ["invariant"],
    "m3220-fractions": ["invariant"],
    "m3220-localization": ["invariant"],
    "m3220-prime-localization": ["invariant"],
    "characters-burnside": ["objects"],
  };
  for (const [owner, fields] of Object.entries(articleFields)) {
    for (const field of fields) {
      const html = renderToStaticMarkup(
        React.createElement(Prose, null, labContractPresentation(owner)[field]),
      );
      assert.doesNotMatch(html, /<mi>A<\/mi>/, `${owner}.${field}`);
      assert.match(
        html.replace(/<[^>]*>/g, ""),
        /(?:^|[. ])A /,
        `${owner}.${field}`,
      );
    }
  }
  assert.match(
    labContractPresentation("foundations-functions").objects,
    /^A function/,
  );
});

test("contract operators and operands stay together inside mathematical expressions", async () => {
  const { labContractPresentation } = await vite.ssrLoadModule(
    "/lib/algebra/lab-contract-presentations.ts",
  );
  for (const [owner, field, expected] of [
    ["foundations-quotient-rules", "objects", String.raw`\sim`],
    ["mh2220-generators", "objects", "-g"],
    ["mh2220-normal", "objects", "ab"],
    ["mh2220-normal", "invariant", "a"],
    ["actions-stabilizer-kernel-core", "counterexample", String.raw`\{e\}`],
    ["actions-regular-conjugation", "prediction", "(12)"],
    ["mh2220-solid-colorings", "invariant", "c"],
    ["m3220-polynomial-division", "counterexample", String.raw`\mathbb Z[X]`],
    ["odyssey-induction", "counterexample", "+1"],
    ["m3220-submodules", "fallback", "x"],
  ]) {
    const html = renderToStaticMarkup(
      React.createElement(Prose, null, labContractPresentation(owner)[field]),
    );
    assert.ok(
      html.includes(
        `<annotation encoding="application/x-tex">${expected}</annotation>`,
      ),
      `${owner}.${field}: ${expected}`,
    );
  }
});

test("coloring ledgers render actual group words and complete cycle-type exponents", async () => {
  const { ColoringLedgerView } = await vite.ssrLoadModule(
    "/components/algebra/ColoringLedgerView.tsx",
  );
  const { fixedColoringLedger } = await vite.ssrLoadModule(
    "/lib/algebra/fixed-colorings.ts",
  );
  const configs = [];
  for (let size = 3; size <= 10; size++)
    for (const reflections of [false, true])
      configs.push({
        kind: "polygon",
        size,
        reflections,
        colors: 2,
        firstColorCount: 2,
      });
  for (const feature of ["vertices", "faces", "edges"])
    configs.push({ kind: "cube", feature, colors: 2 });
  for (const config of configs) {
    const ledger = fixedColoringLedger(config);
    const html = renderToStaticMarkup(
      React.createElement(ColoringLedgerView, {
        config,
        ledger,
        selected: ledger.rows.length - 1,
        setSelected() {},
      }),
    );
    assert.doesNotMatch(html, /katex-error/);
    assert.match(html, /aria-label="Inspect group element"/);
    assert.doesNotMatch(
      html.match(/<label[\s\S]*?<\/label>/)[0],
      /tabindex="0"/,
    );
    const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];
    const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)];
    assert.equal(rows.length, ledger.groups.length);
    for (const [, row] of rows) {
      assert.match(
        row.match(/<th scope="row">([\s\S]*?)<\/th>/)[1],
        /<math /,
        "every group element is mathematical notation",
      );
      const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)];
      assert.match(
        cells[config.kind === "cube" ? 2 : 1][1],
        /<math /,
        "every cycle signature is mathematical notation",
      );
    }
    for (const [, tex] of html.matchAll(
      /<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g,
    ))
      assert.doesNotThrow(() =>
        strictMath(
          tex
            .replaceAll("&amp;", "&")
            .replaceAll("&lt;", "<")
            .replaceAll("&gt;", ">"),
        ),
      );
    if (config.kind === "polygon" && config.size === 10 && config.reflections)
      assert.match(
        html,
        /<annotation encoding="application\/x-tex">r\^\{9\}s<\/annotation>/,
      );
    assert.ok(
      html.includes(
        `<annotation encoding="application/x-tex">1^{${config.kind === "polygon" ? config.size : config.feature === "vertices" ? 8 : config.feature === "faces" ? 6 : 12}}</annotation>`,
      ),
      "identity cycle type retains its full exponent",
    );
  }
});

test("generic prediction labels and existing mathematical buttons introduce no nested tab stops", async () => {
  const { LaboratoryProvider } = await vite.ssrLoadModule(
    "/components/algebra/LaboratoryControls.tsx",
  );
  const { default: Exploration } = await vite.ssrLoadModule(
    "/components/algebra/Exploration.tsx",
  );
  const prediction = renderToStaticMarkup(
    React.createElement(Exploration, {
      lesson: {
        id: "foundations-functions",
        machine: "function-fibers",
        title: "Functions",
      },
    }),
  );
  const label = prediction.match(
    /<label class="prediction-prompt">[\s\S]*?<\/label>/,
  )[0];
  assert.match(label, /<math /);
  assert.doesNotMatch(label, /tabindex="0"/);
  assert.match(label, /aria-label="Your mathematical prediction"/);
  for (const [file, name, props] of [
    [
      "Conjugation",
      "ConjugationLab",
      { lesson: { parameters: { group: "D4" } } },
    ],
    [
      "RotationLessons",
      "AxisAngleLab",
      {
        lesson: {
          parameters: { kind: "axis-angle", axis: [1, 1, 1], angle: 120 },
        },
      },
    ],
    ["Bridges", "LinearQuotientLab", {}],
    ["SquareModes", "SquareModesLab", {}],
    ["FiniteLinearGroups", "MatrixFiniteLab", {}],
    ["Rings", "FieldLab", { lesson: { parameters: { mode: "finite-field" } } }],
    ["Rings", "RingLab", { lesson: { parameters: { n: 6 } } }],
  ]) {
    const labModule = await vite.ssrLoadModule(
      `/components/algebra/${file}.tsx`,
    );
    const html = renderToStaticMarkup(
      React.createElement(
        LaboratoryProvider,
        null,
        React.createElement(labModule[name], props),
      ),
    );
    for (const [control] of html.matchAll(
      /<(?:button|label)\b[\s\S]*?<\/(?:button|label)>/g,
    ))
      assert.doesNotMatch(control, /tabindex="0"/, `${file} control`);
    assert.doesNotMatch(html, /aria-label="[^"$]*\$/);
  }
});
