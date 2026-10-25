import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { normalizeAxis, axisRotation } from "../lib/algebra/rotations.ts";
import { numberTex, degreeTex } from "../lib/algebra/numeric-tex.ts";
import { validateTex } from "../scripts/lib/math-presentation.mjs";

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
const { group, closure, cosets, inverse } = await vite.ssrLoadModule(
  "/lib/algebra/engine.ts",
);
const { groupPresentation } = await vite.ssrLoadModule(
  "/components/algebra/GroupPresentation.ts",
);
const { metricOrientationModel, cubeSymmetryMatch } = await vite.ssrLoadModule(
  "/lib/algebra/orthogonal-geometry.ts",
);
const { LaboratoryProvider } = await vite.ssrLoadModule(
  "/components/algebra/LaboratoryControls.tsx",
);
const { GroupLab, Range } = await vite.ssrLoadModule(
  "/components/algebra/Groups.tsx",
);
const { ConjugationLab } = await vite.ssrLoadModule(
  "/components/algebra/Conjugation.tsx",
);
const { AxisAngleLab } = await vite.ssrLoadModule(
  "/components/algebra/RotationLessons.tsx",
);
const { default: CubeLab } = await vite.ssrLoadModule(
  "/components/algebra/Cube.tsx",
);
const { PlaneReflectionLab } = await vite.ssrLoadModule(
  "/components/algebra/OrthogonalGeometry.tsx",
);
const lessons = JSON.parse(await readFile(`${root}/lib/algebra/lessons.json`));
const lesson = (id, parameters, machine) => {
  const source = lessons.find((item) => item.id === id);
  assert.ok(source, `actual lesson ${id}`);
  return {
    ...source,
    parameters: parameters ?? source.parameters,
    machine: machine ?? source.machine,
  };
};
const render = (component, props = {}) =>
  renderToStaticMarkup(
    React.createElement(
      LaboratoryProvider,
      null,
      React.createElement(component, props),
    ),
  );
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
const formulas = (html) =>
  [
    ...html.matchAll(
      /<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g,
    ),
  ].map(([, tex]) => decode(tex));
function checkedRender(component, props) {
  const html = render(component, props);
  assert.doesNotMatch(html, /katex-error/);
  const tex = formulas(html);
  assert.ok(tex.length > 0);
  for (const expression of tex) validateTex(expression);
  return { html, tex };
}

test("numeric TeX preserves complete scientific numerals and degree grouping", () => {
  const cases = [
    [0, "0", "{0}^{\\circ}"],
    [180, "180", "{180}^{\\circ}"],
    [1e-7, "10^{-7}", "\\left(10^{-7}\\right)^{\\circ}"],
    [-1e-7, "-10^{-7}", "\\left(-10^{-7}\\right)^{\\circ}"],
    [
      1.23e-7,
      "1.23\\times 10^{-7}",
      "\\left(1.23\\times 10^{-7}\\right)^{\\circ}",
    ],
    [1e21, "10^{21}", "\\left(10^{21}\\right)^{\\circ}"],
    [
      1.7e308,
      "1.7\\times 10^{308}",
      "\\left(1.7\\times 10^{308}\\right)^{\\circ}",
    ],
    [
      Number.MIN_VALUE,
      "5\\times 10^{-324}",
      "\\left(5\\times 10^{-324}\\right)^{\\circ}",
    ],
  ];
  for (const [value, numeral, degrees] of cases) {
    assert.equal(numberTex(value), numeral);
    assert.equal(degreeTex(value), degrees);
    for (const tex of [numeral, degrees, `1+2\\cos(${degrees})`]) {
      const html = validateTex(tex);
      assert.doesNotMatch(html, /<mi>e<\/mi>|katex-error/);
    }
  }
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.equal(numberTex(value), null);
    assert.equal(degreeTex(value), null);
  }
});

test("axis normalization keeps raw finite inputs and rejects the legacy invalid domain", () => {
  const cases = [
    [
      [1, 1, 0],
      [Math.SQRT1_2, Math.SQRT1_2, 0],
    ],
    [
      [Number.MIN_VALUE, Number.MIN_VALUE, 0],
      [Math.SQRT1_2, Math.SQRT1_2, 0],
    ],
    [
      [1.7e308, 1.7e308, 1.7e308],
      [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)],
    ],
    [
      [-Number.MAX_VALUE, Number.MIN_VALUE, 0],
      [-1, 0, 0],
    ],
  ];
  for (const [axis, expected] of cases) {
    const before = axis.slice();
    const actual = normalizeAxis(axis);
    actual.forEach((value, i) =>
      assert.ok(Math.abs(value - expected[i]) < 5e-15),
    );
    assert.deepEqual(axis, before);
    assert.ok(Math.abs(Math.hypot(...actual) - 1) < 5e-15);
    for (const scale of [-1.8, 1.8])
      assert.ok(actual.map((v) => v * scale).every(Number.isFinite));
  }
  for (const axis of [
    [0, 0, 0],
    [NaN, 1, 0],
    [Infinity, 0, 0],
    [, 1, 0],
    [1, 1],
    [1, 1, 1, 1],
  ]) {
    assert.equal(normalizeAxis(axis), null);
    assert.throws(
      () => axisRotation(axis, 90),
      /A rotation axis must be a nonzero vector in three dimensions/,
    );
  }
});

test("C and V presentations retain each semantic value through actual products, inverses, cosets and actions", () => {
  for (const [type, n] of [
    ["C", 3],
    ["C", 6],
    ["C", 24],
    ["V", 4],
  ]) {
    const g = group(type, n);
    const p = groupPresentation({ type, n, labels: g.labels });
    assert.equal(p.identity, type === "C" ? "0" : "(0,0)");
    assert.equal(p.product("a", "b"), "a+b");
    assert.equal(p.inverse("a"), "-a");
    assert.equal(p.conjugate("b", "H"), "b+H-b");
    assert.equal(p.action("regular").definition, "h\\cdot x=h+x");
    assert.equal(p.action("conjugation").definition, "h\\cdot x=h+x-h");
    assert.match(
      p.action("regular").explanation,
      type === "C" ? /h=0/ : /h=\(0,0\)/,
    );
    for (const [a, element] of p.elements.entries()) {
      assert.equal(Number(element.value), a);
      assert.equal(p.elements[Number(element.value)], element);
      const expectedTex =
        type === "C" ? String(a) : `(${a % 2},${Math.floor(a / 2)})`;
      assert.equal(element.tex, expectedTex);
      assert.equal(
        element.speech,
        type === "C" ? `residue ${a}` : `pair ${a % 2}, ${Math.floor(a / 2)}`,
      );
      assert.equal(p.coset(element.tex, "left"), `${expectedTex}+H`);
      assert.equal(p.coset(element.tex, "right"), `H+${expectedTex}`);
      assert.equal(p.doubleCoset(element.tex), `H+${expectedTex}+K`);
      const expectedInverse = type === "C" ? (n - a) % n : a;
      assert.equal(
        Number(p.elements[inverse(g, Number(element.value))].value),
        expectedInverse,
      );
      const H = closure(g, [a]);
      for (const side of [false, true]) {
        const partition = cosets(g, H, side);
        assert.equal(partition.flat().length, g.labels.length);
        assert.equal(new Set(partition.flat()).size, g.labels.length);
      }
      for (const [b, other] of p.elements.entries()) {
        const expectedProduct =
          type === "C"
            ? (a + b) % n
            : (((a % 2) + (b % 2)) % 2) +
              2 * ((Math.floor(a / 2) + Math.floor(b / 2)) % 2);
        const result = g.mul(Number(element.value), Number(other.value));
        assert.equal(Number(p.elements[result].value), expectedProduct);
        assert.equal(g.mul(g.mul(a, b), inverse(g, a)), b);
      }
    }
    for (const tex of [
      p.convention,
      p.product("a", "b"),
      p.inverse("a"),
      p.conjugate("b", "H"),
      ...p.elements.flatMap((element) => [
        element.tex,
        p.coset(element.tex, "left"),
        p.coset(element.tex, "right"),
        p.doubleCoset(element.tex),
      ]),
    ])
      validateTex(tex);
  }
});

test("multiplicative families keep values, actual identities and signed representative grouping", () => {
  for (const [type, n, identity] of [
    ["D", 24, "e"],
    ["S", 3, "()"],
    ["S", 4, "()"],
    ["Q", 8, "1"],
    ["U", 12, "1"],
  ]) {
    const g = group(type, n);
    const p = groupPresentation({ type, n, labels: g.labels });
    assert.equal(p.identity, identity);
    assert.equal(p.product("a", "b"), "ab");
    assert.equal(p.inverse("a"), "a^{-1}");
    assert.equal(p.conjugate("b", "H"), "bHb^{-1}");
    assert.equal(p.action("regular").definition, "h\\cdot x=hx");
    p.elements.forEach((element, i) => {
      assert.equal(element.value, String(i));
      assert.equal(p.elements[Number(element.value)], element);
      assert.equal(g.mul(i, inverse(g, i)), 0);
      for (const tex of [
        element.tex,
        p.coset(element.tex, "left"),
        p.coset(element.tex, "right"),
        p.doubleCoset(element.tex),
      ])
        validateTex(tex);
    });
    if (type === "D") {
      assert.equal(p.elements[10].tex, "r^{10}");
      assert.equal(p.elements[g.mul(24, 1)].tex, "r^{23}s");
    }
    if (type === "Q") {
      assert.equal(p.elements[g.mul(1, 2)].tex, "k");
      assert.equal(p.elements[g.mul(2, 1)].tex, "-k");
      assert.equal(p.coset("-i", "left"), "\\left(-i\\right)H");
      assert.equal(p.coset("-i", "right"), "H\\left(-i\\right)");
      assert.equal(p.doubleCoset("-i"), "H\\left(-i\\right)K");
    }
    if (type === "U") assert.equal(p.elements[g.mul(2, 2)].tex, "1");
  }
});

test("actual SSR views expose additive C/V and multiplicative orbit names as whole strict TeX", () => {
  const cyclic = checkedRender(GroupLab, {
    lesson: lesson("mh2220-subgroups", { group: "C6" }, "group"),
  });
  assert.ok(cyclic.tex.includes("a+b=3,\\quad b+a=3,\\quad -a=5"));
  assert.ok(cyclic.tex.includes("b+H-b=\\{0,1,2,3,4,5\\}"));
  assert.match(cyclic.html, /Finite group addition graph/);
  assert.match(cyclic.html, /Addition table/);
  const klein = checkedRender(GroupLab, {
    lesson: lesson("mh2220-subgroups", { group: "V4" }, "cosets"),
  });
  assert.ok(klein.tex.includes("a+b=(1,1),\\quad b+a=(1,1),\\quad -a=(1,0)"));
  assert.ok(klein.tex.includes("(0,0)+H"));
  assert.match(klein.html, /pair 1, 0/);
  const double = checkedRender(GroupLab, {
    lesson: lesson(
      "mh2220-subgroups",
      { group: "C6", mode: "double" },
      "cosets",
    ),
  });
  assert.ok(double.tex.includes("H+0+K"));
  const conjugation = checkedRender(ConjugationLab, {
    lesson: lesson("mh2220-subgroups", { group: "C6" }),
  });
  assert.ok(
    conjugation.tex.includes("G\\curvearrowright G,\\quad h\\cdot x=h+x-h"),
  );
  assert.match(conjugation.html, /Select orbit element residue 0/);
  const dihedral = checkedRender(ConjugationLab, {
    lesson: lesson("mh2220-subgroups", { group: "D4" }),
  });
  assert.match(dihedral.html, /Select orbit element identity/);
  assert.match(dihedral.html, /Select orbit element r to power 2/);
  assert.doesNotMatch(dihedral.html, /Select orbit element 1"/);
  const quaternion = checkedRender(ConjugationLab, {
    lesson: lesson("mh2220-subgroups", { group: "Q8" }),
  });
  assert.match(quaternion.html, /Select orbit element minus i/);
});

test("scientific axis-angle SSR keeps exact angle, approximate axis and numerical candidate distinct", () => {
  for (const angle of [1e-7, 1e-10, 179.9999999999, 0, 180, 360]) {
    const { html, tex } = checkedRender(AxisAngleLab, {
      lesson: lesson("orthogonal-axis-angle", {
        kind: "axis-angle",
        axis: [1, 1, 1],
        angle,
      }),
    });
    assert.ok(
      tex.includes(
        `Rn=n,\\quad\\operatorname{tr}(R)=1+2\\cos(${degreeTex(angle)})`,
      ),
    );
    assert.ok(tex.includes("n\\approx(0.577, 0.577, 0.577)"));
    assert.equal(
      html.includes("At the identity rotation every axis is possible"),
      angle === 0 || angle === 360,
    );
    assert.equal(html.includes("the axis line is determined"), angle === 180);
    assert.match(html, /entrywise tolerance/);
    assert.doesNotMatch(html, /Cube symmetry: yes|Cube symmetry: no/);
    if (angle === 1e-7) {
      assert.match(html, /Numerical cube candidate found/);
      assert.match(html, /Candidate vertex permutation/);
      assert.match(html, /Candidate generator word/);
      const matrix = axisRotation([1, 1, 1], angle);
      assert.notEqual(matrix[0][1], 0);
      assert.ok(cubeSymmetryMatch(matrix));
    }
  }
});

test("rounded matrix disclosures preserve exact structural identities", () => {
  const model = metricOrientationModel("rotation3", "x", 45);
  assert.equal(
    model.matrixEquation,
    "Q\\approx\\begin{pmatrix}0.71&-0.71&0\\\\0.71&0.71&0\\\\0&0&1\\end{pmatrix},\\quad Q^TQ=I_3,\\quad\\det Q=1",
  );
  assert.equal(2 * 0.71 ** 2, 1.0082);
  validateTex(model.matrixEquation);
  const plane = checkedRender(PlaneReflectionLab);
  assert.match(
    plane.html,
    /displayed matrix and image coordinates are rounded/,
  );
  assert.ok(plane.tex.includes("R_\\theta Fe_1\\approx(0.707, 0.707)"));
});

test("invalid Range values keep the readout recoverable and omit the invalid slider", () => {
  for (const value of [NaN, Infinity, -Infinity, -1, 361]) {
    const html = render(Range, {
      label: "Angle",
      min: 0,
      max: 360,
      value,
      onChange() {},
    });
    assert.doesNotMatch(html, /role="slider"|katex-error/);
    if (!Number.isFinite(value)) assert.match(html, new RegExp(String(value)));
  }
  const valid = checkedRender(Range, {
    label: "Angle",
    min: 0,
    max: 360,
    value: 1e-7,
    onChange() {},
  });
  assert.ok(valid.tex.includes("10^{-7}"));
  assert.match(valid.html, /role="slider"/);
});

test("cube point mappings remain one complete mathematical root per control", () => {
  const source = lessons.find((item) => item.machine === "cube");
  assert.ok(source);
  const { html } = checkedRender(CubeLab, { lesson: source });
  const buttons = [
    ...html.matchAll(
      /<button[^>]*aria-label="Follow point (\d+), image (\d+)"[^>]*>([\s\S]*?)<\/button>/g,
    ),
  ];
  assert.ok(buttons.length > 0);
  for (const [, point, image, body] of buttons)
    assert.deepEqual(formulas(body), [`${point}\\mapsto ${image}`]);
});
