import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { group, normal, subgroups, order } from "../lib/algebra/engine.ts";
import { createServer } from "vite";
const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
});
after(() => vite.close());
const { fractionReading } = await vite.ssrLoadModule(
  "/lib/algebra/localisation-model.ts",
);
const { polynomialIdealQuotient } = await vite.ssrLoadModule(
  "/lib/algebra/ideal-quotients.ts",
);

const read = (path) =>
  JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));
const lessons = read("../lib/algebra/lessons.json");
const guides = read("../lib/algebra/guided-lessons.json");
const metadata = read("../lib/algebra/learning-metadata.json");
const audit = read("../docs/research/teaching-audit.json");
const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
};
const chosen = (id, field) => {
  const assessment = guides[id][field];
  return assessment.choices[assessment.answer];
};

test("prerequisite audit leaves only the foundational maps entry without earlier concepts", () => {
  const reaches = (id, target, seen = new Set()) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return byId
      .get(id)
      .prerequisites.some((p) => p === target || reaches(p, target, seen));
  };
  assert.deepEqual(
    lessons.filter((l) => !l.prerequisites.length).map((l) => l.id),
    ["foundations-functions"],
  );
  for (const id of [
    "mh2220-second-isomorphism",
    "mh2220-third-isomorphism",
    "mh2220-correspondence",
  ])
    assert.ok(reaches(id, "mh2220-first-isomorphism"), id);
  assert.ok(reaches("mh2220-burnside", "mh2220-orbit-stabilizer"));
  assert.ok(
    reaches("orthogonal-metric-orientation", "foundations-linear-algebra"),
  );
  assert.ok(
    reaches("ureca-character-bound-kernel", "representations-characters"),
  );
  for (const row of audit.rows) {
    assert.equal(row.prerequisiteAudit.reviewed, true);
    assert.deepEqual(row.prerequisites, byId.get(row.id).prerequisites);
  }
});

test("symmetric-color inventories agree with permutation fixed-color averages", () => {
  const permutations = (values) =>
    values.length
      ? values.flatMap((v, i) =>
          permutations(values.filter((_, j) => j !== i)).map((p) => [v, ...p]),
        )
      : [[]];
  const cycles = (p) => {
    const seen = new Set();
    let count = 0;
    for (let i = 0; i < p.length; i++)
      if (!seen.has(i)) {
        count++;
        let j = i;
        while (!seen.has(j)) {
          seen.add(j);
          j = p[j];
        }
      }
    return count;
  };
  for (let r = 0; r <= 5; r++)
    for (let q = 1; q <= 4; q++) {
      const ps = permutations(Array.from({ length: r }, (_, i) => i));
      const fixedTotal = ps.reduce((sum, p) => sum + q ** cycles(p), 0);
      const rising = Array.from({ length: r }, (_, i) => q + i).reduce(
        (a, b) => a * b,
        1,
      );
      assert.equal(fixedTotal, rising, `r=${r}, q=${q}`);
      const counts = (slots, remaining) =>
        slots === 1
          ? 1
          : Array.from({ length: remaining + 1 }, (_, n) =>
              counts(slots - 1, remaining - n),
            ).reduce((a, b) => a + b, 0);
      assert.equal(fixedTotal / ps.length, counts(q, r));
    }
});

test("integer monic reduction evaluates exactly in Gaussian integers", () => {
  const evaluate = (coefficients) =>
    coefficients.reduce(
      ([re, im], c, j) => [
        re + c * [1, 0, -1, 0][j % 4],
        im + c * [0, 1, 0, -1][j % 4],
      ],
      [0, 0],
    );
  for (const coefficients of [
    [1, 0, 1],
    [2, -3, 5, 7, -11],
    [0, 0, 0, 0, 1],
    [-4, 1, 0, -5, 3, 2],
  ]) {
    const remainder = coefficients.slice();
    const quotient = [];
    for (let j = remainder.length - 1; j >= 2; j--) {
      const c = remainder[j];
      quotient[j - 2] = c;
      remainder[j] = 0;
      remainder[j - 2] -= c;
    }
    assert.deepEqual(evaluate(coefficients), [
      remainder[0] ?? 0,
      remainder[1] ?? 0,
    ]);
    const reconstructed = Array(coefficients.length).fill(0);
    reconstructed[0] = remainder[0] ?? 0;
    reconstructed[1] = remainder[1] ?? 0;
    quotient.forEach((c, j) => {
      reconstructed[j] += c;
      reconstructed[j + 2] += c;
    });
    assert.deepEqual(reconstructed, coefficients);
  }
});

test("order thirty Sylow candidates cannot both be nonunique", () => {
  const candidates = (p) =>
    Array.from({ length: 30 / p }, (_, i) => i + 1).filter(
      (n) => (30 / p) % n === 0 && n % p === 1,
    );
  assert.deepEqual(candidates(5), [1, 6]);
  assert.deepEqual(candidates(3), [1, 10]);
  assert.equal(6 * (5 - 1) + 10 * (3 - 1), 44);
  assert.ok(44 > 30 - 1);
  // Distinct prime-order subgroups intersect only at identity: their intersection order divides both primes.
  assert.equal([1, 2, 3].filter((n) => 3 % n === 0 && 5 % n === 0).length, 1);
});

test("natural S3 orbit is equivariantly identified with stabilizer cosets", () => {
  const symmetric = group("S", 3);
  const images = symmetric.labels.map((label) => {
    const image = [0, 1, 2];
    for (const match of label.matchAll(/\(([^)]*)\)/g)) {
      const cycle = (match[1].match(/\d/g) ?? []).map(Number);
      cycle.forEach((x, i) => {
        image[x - 1] = cycle[(i + 1) % cycle.length] - 1;
      });
    }
    return image;
  });
  const action = (g, x) => images[g][x];
  const H = symmetric.labels.map((_, i) => i).filter((g) => action(g, 0) === 0);
  const cosets = [];
  for (let g = 0; g < symmetric.labels.length; g++) {
    const coset = H.map((h) => symmetric.mul(g, h)).sort((a, b) => a - b);
    if (!cosets.some((c) => JSON.stringify(c) === JSON.stringify(coset)))
      cosets.push(coset);
  }
  assert.equal(H.length, 2);
  assert.equal(cosets.length, 3);
  assert.equal(new Set(cosets.map((c) => action(c[0], 0))).size, 3);
  for (const c of cosets)
    for (const g of c) assert.equal(action(g, 0), action(c[0], 0));
  for (let g = 0; g < 6; g++)
    for (const c of cosets)
      assert.equal(
        action(symmetric.mul(g, c[0]), 0),
        action(g, action(c[0], 0)),
      );
});

test("triangular module simple layers and nonsplitting are exact over F2", () => {
  const vectors = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ];
  const matrices = Array.from({ length: 8 }, (_, n) => [
    n & 1,
    (n >> 1) & 1,
    (n >> 2) & 1,
  ]);
  const act = ([a, b, c], [x, y]) => [(a * x + b * y) % 2, (c * y) % 2];
  const equal = (x, y) => x.every((v, i) => v === y[i]);
  const lines = vectors.slice(1).filter((v) =>
    matrices.every((m) => {
      const image = act(m, v);
      return equal(image, [0, 0]) || equal(image, v);
    }),
  );
  assert.deepEqual(lines, [[1, 0]]);
  const J = [0, 1, 0];
  assert.deepEqual(
    vectors.filter((v) => equal(act(J, v), [0, 0])),
    [
      [0, 0],
      [1, 0],
    ],
  );
  assert.deepEqual(
    [...new Set(vectors.map((v) => JSON.stringify(act(J, v))))].sort(),
    ["[0,0]", "[1,0]"],
  );
  assert.ok(vectors.every((v) => equal(act(J, act(J, v)), [0, 0])));
});

test("all 150 existing concepts have teaching; original 79 assessment contracts survive", () => {
  assert.equal(lessons.length, 150);
  assert.equal(Object.keys(guides).length, 150);
  assert.equal(audit.rows.length, 150);
  assert.equal(audit.rows.filter((row) => row.newScaffolding).length, 71);
  const positions = [0, 0, 0];
  for (const row of audit.rows) {
    const lesson = byId.get(row.id);
    assert.ok(lesson, row.id);
    assert.deepEqual(lesson.source, row.originalSource, row.id);
    assert.deepEqual(lesson.references ?? [], row.originalReferences, row.id);
    assert.deepEqual(
      lesson.prerequisites,
      metadata[row.id].prerequisites,
      row.id,
    );
    if (row.baselineGuideSha256) {
      const fields = [
        "prerequisiteCheck",
        "boundaryCheck",
        "application",
        "transfer",
      ];
      const hash = createHash("sha256")
        .update(
          JSON.stringify(
            canonical(
              Object.fromEntries(
                fields.map((field) => [field, guides[row.id][field]]),
              ),
            ),
          ),
        )
        .digest("hex");
      assert.equal(
        hash,
        row.baselineAssessmentSha256,
        `${row.id}: original assessments changed`,
      );
      if (!row.guideChangedReason)
        assert.equal(
          createHash("sha256")
            .update(JSON.stringify(canonical(guides[row.id])))
            .digest("hex"),
          row.baselineGuideSha256,
        );
    }
    if (row.newScaffolding)
      for (const field of [
        "prerequisiteCheck",
        "boundaryCheck",
        "application",
        "transfer",
      ])
        positions[guides[row.id][field].answer]++;
  }
  assert.ok(
    positions.every((count) => count > 50),
    `answer positions ${positions}`,
  );
});

test("finite prime-power center claim excludes the trivial group; classification retains abelianity", () => {
  assert.match(guides["mh2220-p-groups"].objects, /nontrivial.*a≥1/);
  assert.match(byId.get("mh2220-finite-abelian").theorem, /finite abelian/);
  const dihedral = group("D", 4);
  const center = dihedral.labels
    .map((_, index) => index)
    .filter((x) =>
      dihedral.labels.every(
        (_, y) => dihedral.mul(x, y) === dihedral.mul(y, x),
      ),
    );
  assert.equal(dihedral.labels.length, 8);
  assert.equal(center.length, 2);
  assert.ok(
    dihedral.labels.some((_, x) =>
      dihedral.labels.some((_, y) => dihedral.mul(x, y) !== dihedral.mul(y, x)),
    ),
  );
});

test("new root boundary examples separate domains, zero polynomials and zero divisors", () => {
  const roots = (modulus) =>
    Array.from({ length: modulus }, (_, x) => x).filter(
      (x) => (x * x - 1) % modulus === 0,
    );
  assert.deepEqual(roots(8), [1, 3, 5, 7]);
  for (const prime of [2, 3, 5, 7, 11]) assert.ok(roots(prime).length <= 2);
  assert.match(chosen("m3220-roots", "boundaryCheck"), /domain.*nonzero/);
  assert.match(
    guides["m3220-roots"].examples[1].steps.join(" "),
    /four distinct roots/,
  );
});

test("quadratic quotient examples have the promised units and nilpotents", () => {
  const field = polynomialIdealQuotient("irreducible");
  const repeated = polynomialIdealQuotient("double");
  const split = polynomialIdealQuotient("split");
  assert.equal(field.units.length, 3);
  assert.equal(field.zeroDivisors.length, 0);
  assert.equal(repeated.multiply(3, 3), 0);
  assert.equal(split.multiply(2, 3), 0);
  assert.notEqual(split.multiply(2, 2), 0);
  assert.match(chosen("quadratic-quotient", "application"), /^0$/);
  assert.match(
    byId.get("m3220-prime-irreducible").definition,
    /p\\ne0.*p\\notin/,
  );
});

test("Nakayama counterexample and valuation examples keep the finite-generation boundary", () => {
  assert.match(
    guides["m3220-nakayama"].examples[1].steps.join(" "),
    /not finitely generated/,
  );
  assert.equal(fractionReading(18, 5, "atThree").valuationAtThree, 2);
  assert.equal(fractionReading(18, 5, "atThree").status, "nonunit");
  assert.equal(fractionReading(2, 9, "atThree").status, "absent");
  assert.equal(fractionReading(0, 5, "atThree").valuationAtThree, Infinity);
  assert.match(byId.get("m3220-dvr").definition, /v\(0\)=\\infty/);
  assert.match(
    byId.get("m3220-artinian-decomposition").theorem,
    /commutative nonzero unital Artinian/,
  );
});

test("solvable and nilpotent examples have distinct finite-group behavior", () => {
  const triangle = group("S", 3);
  const twos = subgroups(triangle).filter((subgroup) => subgroup.length === 2);
  assert.equal(twos.length, 3);
  assert.ok(twos.every((subgroup) => !normal(triangle, subgroup)));
  assert.ok(
    twos.some((first) =>
      twos.some(
        (second) => !second.every((element) => first.includes(element)),
      ),
    ),
  );
  assert.match(byId.get("group-solvable").theorem, /some such Hall subgroup/);
  const maximumOrder = Math.max(
    ...triangle.labels.map((_, index) => order(triangle, index)),
  );
  assert.equal(maximumOrder, 3);
  assert.match(chosen("group-solvable", "application"), /e/);
  assert.match(chosen("group-nilpotent", "boundaryCheck"), /^No/);
});

test("large imported theorem teaching retains proof boundaries rather than claiming example proofs", () => {
  for (const id of [
    "mh2220-finite-abelian",
    "mh2220-simple-composition",
    "m3220-nilradical",
    "m3220-artinian-decomposition",
    "group-complements",
    "linear-projective",
    "characters-burnside",
    "actions-frobenius",
  ])
    assert.match(guides[id].proofSteps.join(" "), /import|roadmap/i, id);
  assert.match(byId.get("m3220-hilbert").theorem, /Noetherian/);
  assert.match(byId.get("group-extensions").theorem, /abelian with fixed/);
});
