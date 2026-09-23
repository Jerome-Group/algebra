import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
});
after(() => vite.close());
const { matrixUnitProduct, wedderburnLayers } = await vite.ssrLoadModule(
  "/lib/algebra/wedderburn-layers.ts",
);

test("matrix-unit products and regular multiplicity distinguish block from simple size", () => {
  for (const i of [1, 2])
    for (const j of [1, 2])
      for (const k of [1, 2])
        for (const l of [1, 2])
          assert.equal(
            matrixUnitProduct(i, j, k, l),
            j === k ? `E${i}${l}` : "0",
          );
  for (const field of ["Q", "F2"]) {
    const state = wedderburnLayers("matrix", field);
    assert.equal(state.dimension, 4);
    assert.equal(state.radicalDimension, 0);
    assert.equal(state.semisimple, true);
    assert.match(state.regular, /multiplicity 2/);
  }
});

test("radical layers and characteristic-two group algebra do not split", () => {
  const triangular = wedderburnLayers("triangular", "Q");
  assert.equal(triangular.radicalDimension, 1);
  assert.equal(triangular.quotient, "F×F");
  assert.equal(triangular.semisimple, false);
  assert.match(triangular.naturalModule, /nonsplit/);
  const split = wedderburnLayers("group-c2", "Q");
  assert.equal(split.radicalDimension, 0);
  assert.equal(split.semisimple, true);
  const nonsplit = wedderburnLayers("group-c2", "F2");
  assert.equal(nonsplit.radicalDimension, 1);
  assert.equal(nonsplit.semisimple, false);
  assert.match(nonsplit.naturalModule, /J²=0/);
});
