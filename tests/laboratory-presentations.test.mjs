import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import katex from "katex";

const root = fileURLToPath(new URL("..", import.meta.url));
const lessons = JSON.parse(
  await readFile(
    new URL("../lib/algebra/lessons.json", import.meta.url),
    "utf8",
  ),
);
const presentations = JSON.parse(
  await readFile(
    new URL("../lib/algebra/laboratory-presentations.json", import.meta.url),
    "utf8",
  ),
);
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());
const { StructureLab } = await vite.ssrLoadModule(
  "/components/algebra/Structure.tsx",
);
const { LaboratoryProvider } = await vite.ssrLoadModule(
  "/components/algebra/LaboratoryControls.tsx",
);
const { Prose } = await vite.ssrLoadModule("/components/algebra/Math.tsx");
const { workedExampleContext } = await vite.ssrLoadModule(
  "/components/algebra/WorkedExampleContext.ts",
);
const render = (lesson) =>
  renderToStaticMarkup(
    React.createElement(
      LaboratoryProvider,
      null,
      React.createElement(StructureLab, { lesson }),
    ),
  );
const expressions = (html) =>
  [
    ...html.matchAll(
      /<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/g,
    ),
  ].map(([, value]) => value);
const decode = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
const beforeSteps = (lesson) => {
  const html = render(lesson);
  const stepStart = html.indexOf('<ol class="worked-steps">');
  assert(stepStart > 0, lesson.id);
  const context = html.slice(0, stepStart);
  assert.doesNotMatch(context, /<details/, lesson.id);
  return context;
};

test("every actual lesson has one presentation disposition with no extra IDs", () => {
  assert.deepEqual(
    Object.keys(presentations).sort(),
    lessons.map(({ id }) => id).sort(),
  );
  assert(
    Object.values(presentations).every((kind) =>
      ["model", "reference-diagram", "worked-example"].includes(kind),
    ),
  );
});

test("worked illustrations render actual retained steps instead of a words-and-arrows graph", () => {
  for (const lesson of lessons.filter(
    ({ id }) => presentations[id] === "worked-example",
  )) {
    assert(lesson.worked?.steps.length, lesson.id);
    const html = render(lesson);
    const context = beforeSteps(lesson);
    assert(
      context.includes(
        renderToStaticMarkup(
          React.createElement(Prose, null, lesson.explanation),
        ),
      ),
      lesson.id,
    );
    assert(
      expressions(context).map(decode).includes(lesson.definition),
      lesson.id,
    );
    assert.match(html, /Worked mathematical construction/, lesson.id);
    assert.doesNotMatch(
      html,
      /class="structure-node"|class="relationship-steps"/,
      lesson.id,
    );
    const expected = lesson.worked.steps.map((step) =>
      renderToStaticMarkup(React.createElement(Prose, null, step)),
    );
    for (const step of expected)
      assert(
        html.includes(step),
        `${lesson.id}: retained worked step is presented exactly`,
      );
    assert.doesNotMatch(html, /class="katex-error"/, lesson.id);
  }
});

const antecedents = [
  [
    "ureca-foundations-direct-sum-maps",
    [
      String.raw`C_2=\langle s\mid s^2=e\rangle`,
      "S(x,y)=(y,x)",
      String.raw`U_+=\mathbb C(1,1)`,
      String.raw`U_-=\mathbb C(1,-1)`,
    ],
  ],
  [
    "ureca-foundations-order-eighteen",
    [
      String.raw`A=\operatorname{diag}(\alpha,\alpha^{-1}),\ B=\operatorname{diag}(\beta,\beta^{-1}),\ S=\begin{pmatrix}0&1\\1&0\end{pmatrix},\quad\alpha^3=\beta^3=1`,
    ],
  ],
  [
    "ureca-foundations-commutants",
    [
      String.raw`R=\begin{pmatrix}0&-1\\1&0\end{pmatrix}`,
      String.raw`S=\operatorname{diag}(1,-1)`,
    ],
  ],
  [
    "ureca-foundations-icosahedral-groups",
    [
      String.raw`\phi=(1+\sqrt5)/2`,
      String.raw`a=\phi^{-1}=\phi-1`,
      String.raw`Re_1=(a,1,-\phi)/2`,
      String.raw`Re_2=(-1,\phi,a)/2`,
      String.raw`Re_3=(\phi,a,1)/2`,
    ],
  ],
  [
    "ureca-theory-tetrahedron-displacement-character",
    [
      "r_1=a(1,1,1)",
      "r_2=a(1,-1,-1)",
      "r_3=a(-1,1,-1)",
      "r_4=a(-1,-1,1)",
      "a>0",
    ],
  ],
  [
    "ureca-foundations-isotypic-projections",
    [
      String.raw`e_{1,1}=\frac18\sum_{g\in D_8}[g],\qquad e_\sigma=\frac12([1]-[r^2])`,
    ],
  ],
  [
    "ureca-constructions-binary-tetrahedral",
    [String.raw`\chi=\delta\lambda`, String.raw`\delta=2a`],
  ],
  [
    "ureca-constructions-s4-tensors",
    [
      String.raw`V\otimes V\cong1\oplus V\oplus Q\oplus(\varepsilon\otimes V),\quad S^2V\cong1\oplus V\oplus Q,\quad\Lambda^2V\cong\varepsilon\otimes V.`,
    ],
  ],
  [
    "ureca-constructions-adjunction-naturality",
    [
      String.raw`\Phi:\operatorname{Hom}_B(B\otimes_AV,W)\longrightarrow\operatorname{Hom}_A(V,\operatorname{Res}W),\quad\Phi(F)(v)=F(1\otimes v).`,
    ],
  ],
  [
    "ureca-constructions-class-fusion",
    [
      String.raw`(\operatorname{Ind}f)(1)=3f(1)`,
      String.raw`(\operatorname{Ind}f)(2)=f(s)`,
      String.raw`(\operatorname{Ind}f)(2^2)=f(r^2)+2f(rs)`,
      String.raw`(\operatorname{Ind}f)(3)=0`,
      String.raw`(\operatorname{Ind}f)(4)=f(r)`,
    ],
  ],
  [
    "ureca-constructions-order-twenty-one",
    [
      String.raw`R=\{1,2,4\}`,
      String.raw`N=\{3,5,6\}`,
      String.raw`\lambda(a)=\zeta`,
      String.raw`\chi(a^k)=\zeta^k+\zeta^{2k}+\zeta^{4k}`,
    ],
  ],
  [
    "ureca-foundations-five-cubes",
    [String.raw`\phi=(1+\sqrt5)/2`, String.raw`a=\phi^{-1}=\phi-1`],
  ],
  ...[
    "ureca-foundations-central-algebra",
    "ureca-foundations-character-values",
    "ureca-foundations-conjugate-representation",
  ].map((id) => [
    id,
    [
      String.raw`\omega=e^{2\pi i/3}`,
      String.raw`\omega\ne1`,
      String.raw`1+\omega+\omega^2=0`,
    ],
  ]),
  [
    "ureca-constructions-clifford",
    [
      String.raw`\lambda(r)=\omega`,
      String.raw`\overline\lambda(r)=\omega^2`,
      String.raw`\omega=e^{2\pi i/3}`,
    ],
  ],
  [
    "ureca-constructions-induced-character",
    ["r=(123)", String.raw`H=\langle(12)\rangle\le S_3`, "1,r,r^2"],
  ],
  [
    "ureca-foundations-regular-character",
    [String.raw`0\le j<4`, String.raw`j\equiv0\pmod4`],
  ],
];

test("all eighteen source antecedents are visible before substitution in ordinary SSR", () => {
  assert.equal(antecedents.length, 18);
  for (const [id, required] of antecedents) {
    const lesson = lessons.find((lesson) => lesson.id === id);
    const html = beforeSteps(lesson);
    const tex = expressions(html).map(decode);
    for (const formula of required)
      assert(tex.includes(formula), `${id}: ${formula}`);
    for (const entry of workedExampleContext(lesson)) {
      for (const citation of entry.citations) {
        const source = lessons.find(({ id }) => id === citation.lessonId);
        assert.equal(citation.title, source.title);
        assert.equal(citation.source.url, source.source.url);
        assert(html.includes(citation.field), `${id}: source field`);
        assert(
          html.includes(citation.source.url.replaceAll("&", "&amp;")),
          `${id}: source link`,
        );
      }
    }
  }
});

test("selected context keeps each example paired with its reviewed canonical source fields", () => {
  const pairings = {
    "ureca-foundations-direct-sum-maps": [
      "ureca-foundations-direct-sum-maps.worked.steps[0]",
      "ureca-foundations-direct-sum-maps.worked.steps[1]",
    ],
    "ureca-foundations-order-eighteen": [
      "ureca-foundations-order-eighteen.theorem",
    ],
    "ureca-foundations-commutants": [
      "ureca-foundations-complement-boundaries.worked.steps[0]",
    ],
    "ureca-foundations-icosahedral-groups": [
      "ureca-foundations-dodecahedral-coordinates.explanation",
      "ureca-foundations-icosahedral-groups.proof",
    ],
    "ureca-theory-tetrahedron-displacement-character": [
      "ureca-theory-tetrahedron-spring-model.explanation",
    ],
    "ureca-foundations-isotypic-projections": [
      "ureca-foundations-isotypic-projections.proof",
    ],
    "ureca-constructions-binary-tetrahedral": [
      "ureca-constructions-binary-tetrahedral.proof",
    ],
    "ureca-constructions-s4-tensors": [
      "ureca-constructions-s4-tensors.theorem",
    ],
    "ureca-constructions-adjunction-naturality": [
      "ureca-constructions-induction-adjunction.explanation",
      "ureca-constructions-induction-adjunction.definition",
    ],
    "ureca-constructions-class-fusion": [
      "ureca-constructions-class-fusion.proof",
    ],
    "ureca-constructions-order-twenty-one": [
      "ureca-constructions-order-twenty-one.proof",
    ],
    "ureca-foundations-five-cubes": [
      "ureca-foundations-dodecahedral-coordinates.explanation",
    ],
    "ureca-foundations-central-algebra": [
      "ureca-foundations-order-eighteen.worked.steps[0]",
    ],
    "ureca-foundations-character-values": [
      "ureca-foundations-order-eighteen.worked.steps[0]",
    ],
    "ureca-foundations-conjugate-representation": [
      "ureca-foundations-order-eighteen.worked.steps[0]",
    ],
    "ureca-constructions-clifford": [
      "ureca-foundations-order-eighteen.worked.steps[0]",
      "ureca-constructions-s4-c3-matrix.explanation",
    ],
    "ureca-constructions-induced-character": [
      "ureca-theory-normal-induced-irreducibility.worked.steps[0]",
      "ureca-constructions-induced-character.worked.steps[0]",
    ],
    "ureca-foundations-regular-character": [
      "ureca-foundations-regular-character.worked.steps[0]",
      "ureca-foundations-regular-character.worked.steps[1]",
    ],
  };
  for (const [id, expected] of Object.entries(pairings)) {
    const context = workedExampleContext(
      lessons.find((lesson) => lesson.id === id),
    );
    const actual = [
      ...new Set(
        context.flatMap(({ citations }) =>
          citations.map(({ lessonId, field }) => `${lessonId}.${field}`),
        ),
      ),
    ];
    assert.deepEqual(actual, expected, id);
  }
});

test("source bindings fail closed for missing operators, drift and wrong displayed equations", () => {
  const commutants = lessons.find(
    ({ id }) => id === "ureca-foundations-commutants",
  );
  const operatorSource = "ureca-foundations-complement-boundaries";
  assert.throws(
    () =>
      workedExampleContext(
        commutants,
        lessons.filter(({ id }) => id !== operatorSource),
      ),
    /Missing worked context source/,
  );
  assert.throws(
    () =>
      workedExampleContext(
        commutants,
        lessons.map((lesson) =>
          lesson.id === operatorSource
            ? { ...lesson, worked: { ...lesson.worked, steps: [] } }
            : lesson,
        ),
      ),
    /Worked context source drift/,
  );
  const matrices = lessons.find(
    ({ id }) => id === "ureca-foundations-order-eighteen",
  );
  assert.throws(
    () =>
      workedExampleContext({
        ...matrices,
        theorem: matrices.theorem.replace("0&1", "0&2"),
      }),
    /Worked context source drift/,
  );
  const fusion = lessons.find(
    ({ id }) => id === "ureca-constructions-class-fusion",
  );
  assert.throws(
    () =>
      workedExampleContext({
        ...fusion,
        proof: fusion.proof + " New unreviewed context.",
      }),
    /Worked context presentation drift/,
  );
});

test("all rendered worked TeX parses strictly and English articles remain prose", () => {
  for (const lesson of lessons.filter(
    ({ id }) => presentations[id] === "worked-example",
  )) {
    for (const expression of expressions(render(lesson)).map(decode))
      assert.doesNotThrow(
        () =>
          katex.renderToString(expression, {
            throwOnError: true,
            strict: "error",
            trust: false,
          }),
        `${lesson.id}: ${expression}`,
      );
  }
  const cubes = beforeSteps(
    lessons.find(({ id }) => id === "ureca-foundations-five-cubes"),
  );
  assert.match(cubes, /A cube here means its set/);
  assert.doesNotMatch(
    cubes,
    /<annotation encoding="application\/x-tex">A<\/annotation>[\s\S]{0,100}cube here/,
  );
});

test("Euclidean ideals and divisions come from the same selected input", () => {
  const original = lessons.find(({ id }) => id === "m3220-euclidean");
  for (const [a, b, final] of [
    [84, 30, 6],
    [85, 30, 5],
    [89, 55, 1],
  ]) {
    const html = render({
      ...original,
      parameters: { ...original.parameters, a, b },
    });
    const tex = expressions(html);
    assert(tex.includes(`\\langle ${a},${b}\\rangle_{\\mathbb Z}`));
    assert(tex.includes(`\\langle ${final}\\rangle_{\\mathbb Z}`));
    assert(tex.includes(`\\gcd(${a},${b})=${final}`));
    if (a !== 84) assert(!tex.some((value) => value.includes("84")));
    assert.doesNotMatch(html, /class="katex-error"/);
  }
});

test("Krull comparison keeps prime ideals in separate ambient rings", () => {
  const html = render(lessons.find(({ id }) => id === "m3220-krull"));
  assert.match(html, /aria-label="Integer ring"/);
  assert.match(html, /aria-label="Polynomial ring over a field"/);
  assert.doesNotMatch(html, /class="structure-node"/);
  assert(
    expressions(html).includes(
      String.raw`(0)\subsetneq(2)\quad\text{in }\mathbb Z`,
    ),
  );
  assert(
    expressions(html).includes(
      String.raw`(0)\subsetneq(X)\subsetneq(X,Y)\quad\text{in }F[X,Y]`,
    ),
  );
  assert.match(html, /lower bound/);
});

test("diagram schemas reject missing objects, duplicate identities and unknown arrow endpoints", () => {
  const lesson = lessons.find(({ id }) => id === "m3220-subrings");
  assert.throws(
    () => render({ ...lesson, parameters: {} }),
    /Missing mathematical diagram/,
  );
  assert.throws(
    () =>
      render({
        ...lesson,
        parameters: {
          nodes: [
            { id: "same", label: "R" },
            { id: "same", label: "S" },
          ],
          edges: [],
        },
      }),
    /Duplicate mathematical object/,
  );
  assert.throws(
    () =>
      render({
        ...lesson,
        parameters: {
          nodes: [{ id: "R", label: "R" }],
          edges: [["R", "missing", "inclusion"]],
        },
      }),
    /Unknown mathematical arrow endpoint/,
  );
});
