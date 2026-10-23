import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import katex from "katex";
import { createServer } from "vite";

const read = (file) =>
  JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const lessons = read("../lib/algebra/lessons.json");
const guided = read("../lib/algebra/guided-lessons.json");
const units = read("../lib/algebra/units.json");
const capstones = read("../lib/algebra/capstone-assessments.json");
const before = read("./fixtures/catalogue-math-before.json");
const lesson = (id) => lessons.find((entry) => entry.id === id);
const expressions = (text) =>
  [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
const mathml = (text, select) => {
  const tex = expressions(text).find(select);
  assert.ok(tex, `Missing complete expression in ${text}`);
  return katex
    .renderToString(tex, {
      output: "mathml",
      throwOnError: true,
      strict: "error",
      trust: false,
    })
    .split("<annotation")[0];
};
const mod = (n, modulus) => ((n % modulus) + modulus) % modulus;
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

test("the four residue-fiber passages specify a projection, unlike a constant map", () => {
  const texts = [
    lesson("foundations-fibers").worked.steps[0],
    guided["foundations-fibers"].examples[0].steps[0],
    units.find(({ id }) => id === "functions").capstone.question,
    capstones.functions.question,
  ];
  for (const text of texts) {
    const output = mathml(text, (tex) => tex.startsWith("f(n)="));
    assert.match(
      output,
      /<mo>=<\/mo><mo[^>]*>\[<\/mo><mi>n<\/mi><msub><mo[^>]*>\]<\/mo><mn>3<\/mn><\/msub>/,
    );
  }
  const domain = Array.from({ length: 19 }, (_, i) => i - 9);
  const fibers = (f) =>
    [0, 1, 2].map((target) => domain.filter((n) => f(n) === target));
  const projection = fibers((n) => mod(n, 3));
  assert.deepEqual(
    projection.flat().sort((a, b) => a - b),
    domain,
  );
  assert.ok(
    projection.every((fiber, target) =>
      fiber.every((n) => mod(n - target, 3) === 0),
    ),
  );
  assert.deepEqual(
    fibers(() => 0),
    [domain, [], []],
  );
  assert.notDeepEqual(
    fibers(() => 0),
    projection,
  );
  assert.equal(mod(0, 3), mod(3, 3));
  assert.notEqual(mod(0 ** 2, 6), mod(3 ** 2, 6));
});

test("the cyclic prime-square assessment uses a nontrivial proper subgroup", () => {
  const transfer = guided["mh2220-p-groups"].transfer;
  assert.match(transfer.question, /prime p/);
  assert.match(transfer.question, /cyclic group/);
  const output = mathml(transfer.question, (tex) => tex.startsWith("C_"));
  assert.match(
    output,
    /<msub><mi>C<\/mi><msup><mi>p<\/mi><mn>2<\/mn><\/msup><\/msub>/,
  );
  assert.match(output, /<mo>=<\/mo><mo[^>]*>⟨<\/mo><mi>g<\/mi>/);
  for (const p of [2, 3, 5, 7]) {
    const cyclicSubgroup = new Set(
      Array.from({ length: p * p }, (_, k) => mod(k * p, p * p)),
    );
    assert.equal(cyclicSubgroup.size, p);
    assert.ok(cyclicSubgroup.size > 1 && cyclicSubgroup.size < p * p);
    assert.equal(cyclicSubgroup.has(p), true);
    for (let a = 0; a < p; a++)
      for (let b = 0; b < p; b++)
        assert.deepEqual([mod(p * a, p), mod(p * b, p)], [0, 0]);
  }
});

test("Euler and polynomial content examples report independently computed values", () => {
  const euler = guided["mh2220-euler-fermat"].nonexample.explanation;
  const residue = Number(euler.match(/^2⁴≡(\d+)/)?.[1]);
  assert.equal(residue, mod(2 ** 4, 10));
  assert.notEqual(residue, 1);
  assert.notEqual(gcd(2, 10), 1);
  const example = guided["m3220-gauss"].nonexample;
  const coefficients = [
    ...example.explanation.matchAll(/^(\d+)X²\+(\d+)X\+(\d+)/g),
  ][0]
    .slice(1)
    .map(Number);
  assert.equal(
    Number(example.title.match(/Content (\d+)/)?.[1]),
    coefficients.reduce(gcd),
  );
  const title = guided["m3220-polynomial"].examples[1].title;
  assert.doesNotMatch(title, /nonzero polynomial function/);
  assert.deepEqual(
    [0, 1].map((x) => mod(x * x - x, 2)),
    [0, 0],
  );
  assert.notDeepEqual([0, -1, 1], [0, 0, 0]);
});

test("identity and cancellation descriptions name the objects in their calculations", () => {
  const identity = guided["m3220-characteristic"].examples[1].steps[1];
  assert.match(identity, /multiplicative identity satisfies 1\+1=0/);
  assert.equal(mod(1 + 1, 2), 0);
  assert.equal(mod(1 * 1, 2), 1);
  const cancellation = guided["m3220-fractions"].boundaryCheck.explanation;
  assert.match(cancellation, /^atu=cts/);
  assert.doesNotMatch(cancellation, /\bA\b|Atu/);
  const [a, s, b, t, c, u] = [2, 3, 4, 6, 6, 9];
  assert.equal(a * t, b * s);
  assert.equal(b * u, c * t);
  assert.equal(a * t * u, c * t * s);
  assert.equal(a * u, c * s);
  assert.equal(mod(2 * (1 - 4), 6), 0);
  assert.notEqual(mod(1 - 4, 6), 0);
});

test("corrected source TeX preserves sets, whole indices and indexed spaces in MathML", () => {
  const singleton = mathml(lesson("mh2220-direct-product").explanation, (tex) =>
    tex.includes("\\cap"),
  );
  assert.match(singleton, /<mo[^>]*>\{<\/mo><mi>e<\/mi><mo[^>]*>\}<\/mo>/);
  for (const text of [
    lesson("mh2220-finite-matrices").explanation,
    guided["mh2220-finite-matrices"].objects,
  ]) {
    const dimension = mathml(text, (tex) => tex.startsWith("U_"));
    assert.match(
      dimension,
      /<msub><mi>U<\/mi><mrow><mi[^>]*>∣<\/mi><mi>G<\/mi><mi[^>]*>∣<\/mi><\/mrow><\/msub>/,
    );
    assert.match(
      dimension,
      /<msub><mi mathvariant="double-struck">F<\/mi><mi>p<\/mi><\/msub>/,
    );
  }
  for (const text of [
    lesson("ureca-cyclic-eigenvalues").explanation,
    guided["ureca-cyclic-eigenvalues"].objects,
  ])
    assert.match(
      mathml(text, (tex) => tex.startsWith("V") && tex.includes("\\lambda")),
      /<msub><mi>V<\/mi><mi>λ<\/mi><\/msub>/,
    );
  assert.match(
    mathml(lesson("representations-characters").explanation, (tex) =>
      tex.startsWith("\\chi"),
    ),
    /<msub><mi>χ<\/mi><mi>V<\/mi><\/msub>/,
  );
  assert.match(
    mathml(lesson("cube-orbit-stabilizer").proof, (tex) =>
      tex.startsWith("[G"),
    ),
    /<mo[^>]*>\[<\/mo><mi>G<\/mi><mo>:<\/mo><msub><mi>G<\/mi><mi>x<\/mi><\/msub><mo[^>]*>\]<\/mo>/,
  );
  assert.match(
    mathml(lesson("orthogonal-axis-angle").proof, (tex) =>
      tex.includes("\\perp"),
    ),
    /<msup><mi>n<\/mi><mo>⊥<\/mo><\/msup>/,
  );
  assert.match(
    mathml(lesson("m3220-polynomial-division").proof, (tex) =>
      tex.startsWith("(q"),
    ),
    /<mi>d<\/mi><mo>=<\/mo>.*<mi>r<\/mi>.*<mo>−<\/mo><mi>r<\/mi>/,
  );
  assert.match(
    mathml(lesson("m3220-fractions").proof, (tex) => tex.startsWith("s")),
    /<msup><mi>s<\/mi><mo[^>]*>′<\/mo><\/msup>/,
  );
  for (const text of [
    lesson("mh2220-simple-composition").explanation,
    lesson("mh2220-simple-composition").proof,
    guided["mh2220-simple-composition"].objects,
  ]) {
    assert.match(text, /Jordan–Hölder/);
    assert.doesNotMatch(text, /\$H\$ölder/);
  }
});

test("the quaternion example states the complex-structure equation explicitly", () => {
  const text =
    guided["ureca-foundations-conjugate-representation"].examples[1].steps[1];
  const output = mathml(text, (tex) => tex.startsWith("J"));
  assert.match(
    output,
    /<msup><mi>J<\/mi><mn>2<\/mn><\/msup><mo>=<\/mo><mo>−<\/mo><mi>I<\/mi>/,
  );
  const multiply = (a, b) =>
    a.map((row) =>
      b[0].map((_, j) =>
        row.reduce((sum, entry, k) => sum + entry * b[k][j], 0),
      ),
    );
  const j = [
    [0, -1],
    [1, 0],
  ];
  assert.deepEqual(multiply(j, j), [
    [-1, 0],
    [0, -1],
  ]);
  for (const [a, b] of [
    [0, 0],
    [1, 2],
    [-3, 4],
  ]) {
    const square = multiply(
      [
        [a, b],
        [b, -a],
      ],
      [
        [a, b],
        [b, -a],
      ],
    );
    assert.deepEqual(square, [
      [a * a + b * b, 0],
      [0, a * a + b * b],
    ]);
    assert.ok(square[0][0] >= 0);
  }
  assert.match(
    guided["ureca-theory-alternating-splitting"].nonexample.title,
    /^A 3-cycle/,
  );
});

const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());
const progress = await vite.ssrLoadModule("/lib/algebra/progress.ts");
const records = await vite.ssrLoadModule("/lib/algebra/argument-records.ts");

test("actual old assessment attempts survive byte-for-byte without crediting revised questions", () => {
  const current = progress.assessmentRegistry(lessons);
  let previous = progress.emptyProgress();
  for (const [id, assessment] of Object.entries(before.assessments))
    previous = progress.submitAttempt(
      previous,
      before.assessments,
      id,
      assessment.answer,
    );
  const raw = JSON.stringify(previous);
  const restored = progress.readProgress(raw, current);
  const unaffected = "foundations-functions:boundaryCheck";
  assert.equal(
    JSON.stringify(restored.attempts[unaffected]),
    JSON.stringify(previous.attempts[unaffected]),
  );
  for (const id of Object.keys(before.assessments).filter(
    (key) => key !== unaffected,
  )) {
    assert.notEqual(
      progress.assessmentRevision(current[id]),
      progress.assessmentRevision(before.assessments[id]),
    );
    assert.equal(restored.attempts[id], undefined);
    assert.equal(progress.demonstrated(restored, current).has(id), false);
    assert.equal(
      JSON.stringify(restored.archived[id][0]),
      JSON.stringify(previous.attempts[id]),
    );
    const answered = progress.submitAttempt(
      restored,
      current,
      id,
      current[id].answer,
    );
    assert.equal(progress.demonstrated(answered, current).has(id), true);
    assert.equal(
      JSON.stringify(answered.archived[id]),
      JSON.stringify(restored.archived[id]),
    );
  }
  assert.equal(progress.demonstrated(restored, current).has(unaffected), true);
  assert.equal(
    JSON.stringify(progress.readProgress(JSON.stringify(restored), current)),
    JSON.stringify(restored),
  );
  assert.equal(JSON.stringify(previous), raw);
});

test("actual earlier teaching editions import unchanged and validate as historical", async () => {
  for (const [id, edition] of Object.entries(before.editions)) {
    const retained = {
      version: 1,
      id: `retained-${id}`,
      lessonId: id,
      unitId: null,
      edition,
      blocks: [
        {
          id: "proof",
          text: "Retained public fixture",
          question: "",
          review: "unreviewed",
          reference: 0,
        },
      ],
      activeBlockId: "proof",
    };
    const raw = JSON.stringify(retained);
    const preview = records.previewArgumentImport({
      format: "algebra-arguments-export-v1",
      saved: [{ sheet: retained, revision: 3 }],
      active: null,
      unsupported: [],
      pending: null,
    });
    assert.equal(JSON.stringify(preview.sheets[0]), raw);
    assert.equal(
      await records.argumentDigest(records.teachingFields(edition)),
      edition.digest,
    );
    const validation = await records.validateArgumentEdition(preview.sheets[0]);
    assert.equal(validation.current, false);
    assert.notEqual(validation.edition.digest, edition.digest);
    assert.equal(JSON.stringify(preview.sheets[0]), raw);
    await assert.rejects(
      () =>
        records.validateArgumentEdition({
          ...retained,
          edition: { ...edition, objects: `${edition.objects} tampered` },
        }),
      /digest/,
    );
  }
});
