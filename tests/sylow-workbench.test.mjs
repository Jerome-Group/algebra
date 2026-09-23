import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
});
after(() => vite.close());
const { sylowWorkbench } = await vite.ssrLoadModule(
  "/lib/algebra/sylow-workbench.ts",
);

test("S3 distinguishes allowed Sylow counts from its realized subgroups", () => {
  const two = sylowWorkbench(2);
  assert.deepEqual(two.candidates, [1, 3]);
  assert.equal(two.actualCount, 3);
  assert.equal(two.normalizer.length, 2);
  assert.deepEqual(two.pOrbits.map((orbit) => orbit.length).sort(), [1, 2]);
  assert.deepEqual(two.fixedSylows, [0]);
  assert.equal(two.fixedCosets.length, 1);
  assert.notDeepEqual(two.P, two.Q);
  assert.deepEqual(new Set(two.fixedWitnesses[0].conjugate), new Set(two.Q));
  const three = sylowWorkbench(3);
  assert.deepEqual(three.candidates, [1]);
  assert.equal(three.actualCount, 1);
  assert.equal(three.normalizer.length, 6);
  assert.equal(three.fixedCosets.length, 2);
});

test("every displayed conjugate and centralizer follows actual S3 multiplication", () => {
  for (const prime of [2, 3]) {
    const initial = sylowWorkbench(prime);
    for (let index = 0; index < initial.sylows.length; index++) {
      const target = prime === 2 ? (index + 1) % 3 : 0;
      const model = sylowWorkbench(prime, index, target);
      assert.equal(new Set(model.conjugates).size, model.actualCount);
      assert.equal(model.normalizer.length * model.actualCount, 6);
      assert.deepEqual(model.fixedSylows, [index]);
      assert.equal(model.pOrbits.flat().length, model.cosets.length);
      for (const witness of model.fixedWitnesses)
        assert.deepEqual(new Set(witness.conjugate), new Set(model.Q));
      assert.equal(
        model.pOrbits.reduce((sum, orbit) => sum + orbit.length, 0),
        model.cosets.length,
      );
    }
  }
  const classes = sylowWorkbench(2).classSizes;
  assert.deepEqual(
    classes.map((item) => item.elements.length),
    [1, 3, 2],
  );
  assert.deepEqual(
    classes.map((item) => item.centralizer.length),
    [6, 2, 3],
  );
});
