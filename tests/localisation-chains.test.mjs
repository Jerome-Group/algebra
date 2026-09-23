import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
});
after(() => vite.close());
const { equivalentFractions, fractionReading, factorMapReading } =
  await vite.ssrLoadModule("/lib/algebra/localisation-model.ts");
const { chainReading } = await vite.ssrLoadModule(
  "/lib/algebra/ideal-chains.ts",
);

test("reduced fractions classify membership and units in each localization", () => {
  assert.deepEqual(
    ["atThree", "invertThree", "rationals"].map(
      (ring) => fractionReading(1, 2, ring).status,
    ),
    ["unit", "absent", "unit"],
  );
  assert.deepEqual(
    ["atThree", "invertThree", "rationals"].map(
      (ring) => fractionReading(3, 2, ring).status,
    ),
    ["nonunit", "absent", "unit"],
  );
  assert.deepEqual(
    ["atThree", "invertThree", "rationals"].map(
      (ring) => fractionReading(1, 3, ring).status,
    ),
    ["absent", "unit", "unit"],
  );
  assert.equal(fractionReading(3, 6, "atThree").status, "unit");
  assert.deepEqual(fractionReading(3, 6, "atThree").denominator, 2);
  assert.equal(fractionReading(0, 1, "rationals").status, "nonunit");
  assert.equal(fractionReading(9, 2, "atThree").valuationAtThree, 2);
  assert.match(fractionReading(1, 3, "invertThree").survivingPrimes, /p≠3/);
});

test("fraction equivalence and universal map retain their distinct hypotheses", () => {
  assert.equal(equivalentFractions(1, 2, 3, 6).equivalent, true);
  assert.equal(equivalentFractions(1, 2, 1, 3).equivalent, false);
  assert.equal(factorMapReading("powersThree", "atThree").exists, false);
  assert.equal(factorMapReading("outsideThree", "atThree").exists, true);
  assert.equal(factorMapReading("powersThree", "invertThree").exists, true);
  assert.equal(factorMapReading("outsideThree", "invertThree").exists, false);
  assert.equal(factorMapReading("powersThree", "rationals").exists, true);
  assert.equal(factorMapReading("powersThree", "rationals").source, "ℤ[1/3]");
  assert.equal(factorMapReading("outsideThree", "rationals").sample, "5/2");
  assert.match(
    factorMapReading("outsideThree", "rationals").formula,
    /ψ̄\(a\/s\)/,
  );
  assert.notEqual(1 % 6, 4 % 6);
  assert.ok((2 * (1 - 4)) % 6 === 0);
});

test("chains separate ACC from finite cardinality and DCC", () => {
  assert.equal(chainReading("integerAscending", 4).stable, true);
  assert.equal(chainReading("integerAscending", 6).ideal, "(1)");
  assert.equal(chainReading("infiniteVariables", 6).stable, false);
  assert.match(chainReading("infiniteVariables", 6).witness, /X7/);
  assert.equal(chainReading("integerDescending", 6).stable, false);
  assert.equal(chainReading("finiteRing", 4).stable, true);
  assert.match(chainReading("finiteRing", 4).theorem, /Artinian local/);
  assert.deepEqual(chainReading("primeChain", 3).generators, ["X", "Y"]);
  assert.match(chainReading("primeChain", 3).theorem, /upper bound/);
});
