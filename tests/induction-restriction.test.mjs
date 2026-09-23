import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
});
after(() => vite.close());
const { inducedMatrix, multiply3, inducedState } = await vite.ssrLoadModule(
  "/lib/algebra/induction-restriction.ts",
);
const identity = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

test("both induced representations obey S3 relations with the H correction", () => {
  for (const character of ["trivial", "sign"]) {
    const r = inducedMatrix(character, "r");
    const s = inducedMatrix(character, "s");
    const r2 = multiply3(r, r);
    assert.deepEqual(multiply3(r2, r), identity);
    assert.deepEqual(multiply3(s, s), identity);
    assert.deepEqual(multiply3(multiply3(s, r), s), r2);
  }
  assert.deepEqual(inducedState("sign", "s", 1, "sign").generatorS, [
    [-1, 0, 0],
    [0, 0, -1],
    [0, -1, 0],
  ]);
  assert.equal(inducedState("sign", "s", 1, "sign").targetBasis, 2);
  assert.equal(inducedState("sign", "s", 1, "sign").coefficient, -1);
});

test("induced traces and restricted Hom dimensions agree for all targets", () => {
  for (const character of ["trivial", "sign"])
    for (const target of ["trivial", "sign", "standard"]) {
      const state = inducedState(character, "s", 0, target);
      assert.equal(state.innerProduct, state.restrictedHomDimension);
      assert.equal(state.dimension, 3);
      assert.deepEqual(state.inducedValues, [
        3,
        character === "trivial" ? 1 : -1,
        0,
      ]);
    }
  assert.equal(inducedState("sign", "s", 0, "sign").innerProduct, 1);
  assert.equal(inducedState("sign", "s", 0, "trivial").innerProduct, 0);
});
