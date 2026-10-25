import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import { createServer } from "vite";
import ts from "typescript";

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
const { Choice } = await vite.ssrLoadModule("/components/algebra/Groups.tsx");
const publicLessons = JSON.parse(
  await readFile(`${root}/lib/algebra/lessons.json`),
);
const lesson = (id, parameters) => {
  const source = publicLessons.find((item) => item.id === id);
  assert.ok(source, `real lesson ${id}`);
  return parameters ? { ...source, parameters } : source;
};
const noop = () => {};
const selection = (order = 2, exponent = 1) => ({
  order,
  exponent,
  element: 2,
  setExponent: noop,
  setElement: noop,
  changeOrder: noop,
});
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
const render = (component, props = {}) =>
  renderToStaticMarkup(
    React.createElement(
      LaboratoryProvider,
      null,
      React.createElement(component, props),
    ),
  );
const triggers = (html) =>
  [
    ...html.matchAll(/<button\b[^>]*role="combobox"[^>]*>[\s\S]*?<\/button>/g),
  ].map(([html]) => ({
    html,
    label: decode(html.match(/aria-label="([^"]*)"/)[1]),
    tex: annotations(html),
  }));
const load = async (name, exported = name) =>
  (await vite.ssrLoadModule(`/components/algebra/${name}.tsx`))[exported];

const nativeFamilies = [
  ["BurnsideClassLab"],
  ["CayleyEmbedding", "CayleyEmbeddingLab"],
  [
    "CayleyReachability",
    "CayleyReachability",
    { lesson: lesson("mh2220-inverse-order") },
  ],
  ["CosetConstructor", "CosetConstructor", { lesson: lesson("mh2220-cosets") }],
  ["CubeColoringLab"],
  [
    "FunctionFibers",
    "FunctionFiberLab",
    { lesson: lesson("foundations-fibers") },
  ],
  ["IdealChainExplorer"],
  ["IdealQuotientLattice"],
  [
    "InductionReciprocityLab",
    "InductionReciprocityLab",
    { lesson: lesson("tensor-products") },
  ],
  [
    "InvariantIntertwinerLab",
    "InvariantIntertwinerLab",
    { lesson: lesson("ureca-permutation-module") },
  ],
  ["LocalisationMicroscope"],
  [
    "ModuleActionBoard",
    "ModuleActionBoard",
    { lesson: lesson("m3220-modules") },
  ],
  [
    "ModulePresentation",
    "ModulePresentation",
    { lesson: lesson("m3220-modules") },
  ],
  ["NilradicalLab"],
  [
    "OperationChecker",
    "OperationChecker",
    { lesson: lesson("mh2220-subgroups") },
  ],
  [
    "OrbitWorkbench",
    "OrbitWorkbench",
    { lesson: lesson("mh2220-orbit-stabilizer") },
  ],
  ["OrthogonalGeometry", "PlaneReflectionLab"],
  ["OrthogonalGeometry", "MetricOrientationLab"],
  [
    "PolygonColoringLab",
    "PolygonColoringLab",
    { lessonId: "mh2220-necklaces" },
  ],
  ["PolynomialFactorisation"],
  [
    "RepresentationJourney",
    "RepresentationJourney",
    { lessons: publicLessons, open: noop },
  ],
  [
    "SylowWorkbench",
    "SylowWorkbench",
    { lesson: lesson("mh2220-sylow-conjugacy") },
  ],
  [
    "TensorBalancingLab",
    "TensorBalancingLab",
    { lesson: lesson("tensor-products") },
  ],
  ["UrecaIrreducibles", "UrecaIrreducibles", { state: selection() }],
  ["UrecaLabControls", "CyclicFactorControl", { state: selection() }],
  ["UrecaLabControls", "CyclicElementControl", { state: selection(3, 2) }],
  ["UrecaLabControls", "DihedralElementControl", { state: selection() }],
  [
    "WedderburnLayerLab",
    "WedderburnLayerLab",
    { lesson: lesson("tensor-products") },
  ],
];
const previousFamilies = [
  ["Bridges", "LinearQuotientLab"],
  ["Bridges", "QuadraticQuotientLab"],
  ["Coloring", "ColoringLab"],
  ["Conjugation", "ConjugationLab", { lesson: lesson("mh2220-conjugacy") }],
  ["Cube", "default", { lesson: lesson("cube-orbit-stabilizer") }],
  ["CyclicEigenvalues", "CyclicLab", { lesson: lesson("tensor-products") }],
  ["Groups", "GroupLab", { lesson: lesson("mh2220-subgroups") }],
  ["Groups", "PolygonLab"],
  ["QuadraticIntegers", "QuadraticLab"],
  [
    "Representations",
    "OrthogonalLab",
    { lesson: lesson("orthogonal-metric-orientation", { dimension: 3 }) },
  ],
  ["Representations", "RepresentationLab"],
  ["Representations", "CharacterLab", { lesson: lesson("tensor-products") }],
  ["Rings", "RingLab", { lesson: lesson("m3220-rings") }],
  ["Rings", "ProductLab", { lesson: lesson("m3220-rings") }],
  ["Rings", "PolynomialLab", { lesson: lesson("m3220-polynomial") }],
  ["Rings", "FieldLab", { lesson: lesson("m3220-finite-field-four") }],
  [
    "RotationLessons",
    "PlaneRepresentationLab",
    { lesson: lesson("representations-real-complex") },
  ],
  [
    "SemidirectProducts",
    "SemidirectLab",
    { lesson: lesson("mh2220-semidirect") },
  ],
  ["SquareModes", "SquareModesLab"],
  ["Structure", "StructureLab", { lesson: lesson("m3220-localization") }],
  ["SylowArithmetic", "SylowCalculator"],
];

for (const [file, exported = file, props] of [
  ...nativeFamilies,
  ...previousFamilies,
]) {
  test(`ordinary SSR mathematical choice family ${file}.${exported}`, async () => {
    const html = render(await load(file, exported), props);
    const controls = triggers(html);
    assert.ok(controls.length > 0, "actual component renders its choices");
    for (const control of controls) {
      const descriptive = new Set([
        "Coloring equivalence",
        "Orientation",
        "Lattice ring",
        "Operation",
        "Invariant component",
        "Prediction: do the displayed pairs commute?",
      ]);
      assert.ok(
        control.tex.length > 0 || descriptive.has(control.label),
        `${control.label} renders its mathematical selection as MathML`,
      );
      assert.doesNotMatch(
        control.html,
        /katex-error|tabindex="0"[^>]*class="math/,
      );
      const speech = control.html.match(
        /<span\b[^>]*class="sr-only"[^>]*>([^<]*)<\/span>/,
      )?.[1];
      assert.ok(
        speech?.trim(),
        `${control.label} has a selected plain name or placeholder`,
      );
      assert.doesNotMatch(
        decode(speech),
        /[$\\]/,
        `${control.label} does not speak TeX source`,
      );
      for (const tex of control.tex) {
        assert.match(control.html, /<math /);
        assert.doesNotThrow(
          () =>
            katex.renderToString(tex, {
              throwOnError: true,
              strict: "error",
              trust: false,
            }),
          `${control.label}: ${tex}`,
        );
      }
    }
  });
}

test("beginner mapping, output reading and missing-output placeholder use the same boundary", async () => {
  const { initialRunway } = await vite.ssrLoadModule(
    "/lib/algebra/beginner.ts",
  );
  const map = render(await load("BeginnerMap"), {
    state: initialRunway(),
    dispatch: noop,
  });
  assert.deepEqual(
    triggers(map).map((control) => control.tex),
    [["a"], ["a"], ["b"]],
  );
  const Runway = await load("BeginnerRunway");
  const read = render(Runway, {
    move: "read",
    returnTo: null,
    open: noop,
    openLab: noop,
    requestFocus: noop,
  });
  assert.deepEqual(
    triggers(read).find((control) => control.label === "Output to inspect").tex,
    ["c"],
  );
  const reason = render(Runway, {
    move: "reason",
    returnTo: null,
    open: noop,
    openLab: noop,
    requestFocus: noop,
  });
  const placeholder = triggers(reason).find(
    (control) => control.label === "Missing output witness",
  );
  assert.ok(placeholder);
  assert.match(placeholder.html, /data-placeholder=""/);
  assert.match(placeholder.html, /Choose an output/);
  assert.deepEqual(placeholder.tex, []);
});

test("selectable empty reset is distinct from a null placeholder and disabled choices", () => {
  const options = [
    {
      value: "",
      presentation: "Choose a prediction",
      speech: "Choose a prediction",
    },
    { value: "yes", presentation: "Yes", speech: "Yes" },
    { value: "no", presentation: "No", speech: "No", disabled: true },
  ];
  const reset = triggers(
    render(Choice, { label: "Prediction", value: "", options, onChange: noop }),
  )[0];
  assert.match(reset.html, /Choose a prediction/);
  assert.doesNotMatch(reset.html, /data-placeholder=""/);
  const unselected = triggers(
    render(Choice, {
      label: "Prediction",
      value: null,
      options,
      onChange: noop,
      placeholder: "Choose an answer",
    }),
  )[0];
  assert.match(unselected.html, /data-placeholder=""/);
  assert.match(unselected.html, /Choose an answer/);
  const disabled = triggers(
    render(Choice, {
      label: "Prediction",
      value: "no",
      options,
      onChange: noop,
      disabled: true,
    }),
  )[0];
  assert.match(disabled.html, /disabled=""/);
});

test("choice boundary rejects duplicate semantic values and empty speech", () => {
  const option = { value: 1, presentation: "$1$", speech: "one" };
  assert.throws(
    () =>
      render(Choice, {
        label: "Distinct values",
        value: 1,
        options: [option, option],
        onChange: noop,
      }),
    /repeats value/,
  );
  assert.throws(
    () =>
      render(Choice, {
        label: "Distinct values",
        value: 1,
        options: [option, { ...option, value: "1" }],
        onChange: noop,
      }),
    /repeats value/,
  );
  assert.throws(
    () =>
      render(Choice, {
        label: "Speech",
        value: 1,
        options: [{ ...option, speech: "" }],
        onChange: noop,
      }),
    /requires a plain option name/,
  );
});

test("group, permutation and cyclic speech retain mathematical meaning across their finite domains", async () => {
  const { group } = await vite.ssrLoadModule("/lib/algebra/engine.ts");
  const source = await vite.ssrLoadModule(
    "/components/algebra/ChoiceSpeech.ts",
  );
  for (const type of ["C", "D", "V", "Q", "S", "U"]) {
    for (const size of type === "S" ? [3, 4] : [3, 4, 6, 12, 24]) {
      const domain = group(type, size);
      const names = domain.labels.map((label, index) =>
        source.groupElementSpeech(type, size, index, label),
      );
      assert.equal(new Set(names).size, domain.labels.length);
      for (const [index, name] of names.entries()) {
        assert.ok(name.trim());
        assert.doesNotMatch(name, /[$\\^{}]/);
        katex.renderToString(
          source.groupElementTex(type, size, index, domain.labels[index]),
          { throwOnError: true, strict: "error", trust: false },
        );
      }
    }
  }
  assert.equal(source.groupElementTex("D", 24, 10, "r^10"), "r^{10}");
  assert.equal(
    source.groupElementSpeech("D", 24, 34, "r^10s"),
    "r to power 10 times s",
  );
  assert.equal(source.permutationSpeech([1, 2, 0]), "cycle 1 2 3");
  assert.equal(source.cyclicElementSpeech(2), "a squared");
  assert.equal(source.cyclicScalarSpeech(3, 2), "omega squared");
});

test("only the 14 descriptive or administrative native selects remain", async () => {
  const expected = {
    "ArgumentWriting.tsx": 1,
    "CharacterConstruction.tsx": 4,
    "CubeColoringLab.tsx": 1,
    "InductionReciprocityLab.tsx": 1,
    "ModuleActionBoard.tsx": 1,
    "ReferenceAtlas.tsx": 6,
  };
  const actual = {};
  for (const name of await readdir(`${root}/components/algebra`)) {
    if (!name.endsWith(".tsx")) continue;
    const source = await readFile(`${root}/components/algebra/${name}`, "utf8");
    const syntax = ts.createSourceFile(
      name,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node) => {
      if (
        ts.isJsxOpeningElement(node) &&
        node.tagName.getText(syntax) === "select"
      )
        actual[name] = (actual[name] ?? 0) + 1;
      ts.forEachChild(node, visit);
    };
    visit(syntax);
  }
  assert.deepEqual(actual, expected);
  assert.equal(
    Object.values(actual).reduce((sum, count) => sum + count, 0),
    14,
  );
});
