import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
});
after(() => vite.close());
const { integerIdealQuotient, polynomialIdealQuotient } =
  await vite.ssrLoadModule("/lib/algebra/ideal-quotients.ts");

test("integer quotient lattice follows ideal containment and actual unit/zero-divisor arithmetic", () => {
  for (const d of [1, 2, 3, 4, 6, 12]) {
    const model = integerIdealQuotient(d);
    assert.equal(model.sourceIdeal.length * d, 12);
    assert.deepEqual(
      model.elements,
      Array.from({ length: d }, (_, x) => x),
    );
    for (const x of model.elements) {
      assert.equal(
        model.units.includes(x),
        model.elements.some((y) => (x * y) % d === 1 % d),
      );
      assert.equal(
        model.zeroDivisors.includes(x),
        x !== 0 && model.elements.some((y) => y !== 0 && (x * y) % d === 0),
      );
    }
    for (const row of model.correspondence) {
      assert.ok(row.sourceIdeal.every((x) => x % row.generator === 0));
      for (const f of row.containedIn)
        assert.ok(row.quotientIdeal.every((x) => x % f === 0));
    }
  }
});

test("quadratic F2 quotients have distinct fields, nilpotents and split zero divisors", () => {
  const expected = {
    irreducible: { units: [1, 2, 3], zeroDivisors: [], lattice: 2 },
    double: { units: [1, 2], zeroDivisors: [3], lattice: 3 },
    split: { units: [1], zeroDivisors: [2, 3], lattice: 4 },
  };
  for (const [id, result] of Object.entries(expected)) {
    const model = polynomialIdealQuotient(id);
    assert.deepEqual(model.units, result.units);
    assert.deepEqual(model.zeroDivisors, result.zeroDivisors);
    assert.equal(model.correspondence.length, result.lattice);
    for (const a of model.elements) {
      assert.equal(model.multiply(a, 1), a);
      for (const b of model.elements)
        for (const c of model.elements) {
          assert.equal(
            model.multiply(model.multiply(a, b), c),
            model.multiply(a, model.multiply(b, c)),
          );
          assert.equal(
            model.multiply(a, b ^ c),
            model.multiply(a, b) ^ model.multiply(a, c),
          );
        }
    }
    for (const row of model.correspondence) {
      assert.ok(row.quotientIdeal.includes(0));
      for (const x of row.quotientIdeal)
        for (const y of model.elements)
          assert.ok(row.quotientIdeal.includes(model.multiply(x, y)));
      for (const larger of row.containedIn) {
        const upper = model.correspondence.find(
          (candidate) => candidate.generator === larger,
        );
        assert.ok(
          row.quotientIdeal.every((x) => upper.quotientIdeal.includes(x)),
        );
      }
    }
  }
  assert.equal(polynomialIdealQuotient("double").multiply(3, 3), 0);
  assert.equal(polynomialIdealQuotient("split").multiply(2, 3), 0);
});

test("constants in F2[X] fail representative-independent multiplication", () => {
  const H = new Set([0, 1]);
  const x = 2,
    xPlusOne = 3;
  assert.ok(H.has(x ^ xPlusOne));
  const xSquared = 4,
    xSquaredPlusX = 6;
  assert.ok(!H.has(xSquared ^ xSquaredPlusX));
  assert.throws(() => integerIdealQuotient(8), RangeError);
});
