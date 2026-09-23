import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
});
after(() => vite.close());
const {
  multiply2,
  rotation,
  reflection,
  inverseRotation,
  identity,
  representationState,
} = await vite.ssrLoadModule("/lib/algebra/invariant-intertwiner.ts");

test("D8 matrices satisfy their presentation and one fixed intertwiner", () => {
  const square = multiply2(rotation, rotation);
  assert.deepEqual(multiply2(square, square), identity);
  assert.deepEqual(multiply2(reflection, reflection), identity);
  assert.deepEqual(
    multiply2(multiply2(reflection, rotation), reflection),
    inverseRotation,
  );
  const good = representationState("R", "dihedral", "whole", "basis-change");
  assert.equal(good.intertwines, true);
  assert.equal(good.invertible, true);
  for (const map of ["identity", "singular"])
    assert.equal(
      representationState("R", "dihedral", "whole", map).intertwines,
      false,
    );
});

test("invariance depends on field and every acting generator", () => {
  assert.equal(
    representationState("R", "rotation", "complex-eigenline", "basis-change")
      .lineDefined,
    false,
  );
  assert.equal(
    representationState("C", "rotation", "complex-eigenline", "basis-change")
      .invariant,
    true,
  );
  assert.equal(
    representationState("C", "dihedral", "complex-eigenline", "basis-change")
      .invariant,
    false,
  );
  assert.equal(
    representationState("R", "dihedral", "real-axis", "basis-change").invariant,
    false,
  );
  assert.equal(
    representationState("R", "dihedral", "whole", "basis-change").invariant,
    true,
  );
});
