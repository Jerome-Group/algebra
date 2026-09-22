import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { axisRotation, planeRotation } from "../lib/algebra/rotations.ts";
import { det } from "../lib/algebra/engine.ts";
const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
});
after(() => vite.close());
const { cubeSymmetryMatch, metricOrientationModel, planeReflectionModel } =
  await vite.ssrLoadModule("/lib/algebra/orthogonal-geometry.ts");

const near = (a, b) => Math.abs(a - b) < 1e-9;
const apply = (matrix, vector) =>
  matrix.map((row) =>
    row.reduce((sum, entry, i) => sum + entry * vector[i], 0),
  );
const dot = (a, b) => a.reduce((sum, entry, i) => sum + entry * b[i], 0);
test("RθF and FRθ use the same F and split their fixed lines", () => {
  const F = planeRotation(0, true);
  assert.deepEqual(F, [
    [1, 0],
    [0, -1],
  ]);
  for (const product of ["RF", "FR"])
    assert.ok(
      planeReflectionModel(0, product).matrix.every((row, i) =>
        row.every((entry, j) => near(entry, F[i][j])),
      ),
    );
  assert.equal(planeReflectionModel(90, "RF").lineDegrees, 45);
  assert.equal(planeReflectionModel(90, "FR").lineDegrees, -45);
  for (const angle of [0, Math.PI / 2, Math.PI, 1.23]) {
    const right = planeRotation(angle, true);
    const left = planeRotation(-angle, true);
    const fixedRight = [Math.cos(angle / 2), Math.sin(angle / 2)];
    const fixedLeft = [Math.cos(-angle / 2), Math.sin(-angle / 2)];
    assert.ok(apply(right, fixedRight).every((x, i) => near(x, fixedRight[i])));
    assert.ok(apply(left, fixedLeft).every((x, i) => near(x, fixedLeft[i])));
  }
  assert.ok(
    !near(
      planeRotation(Math.PI / 2, true)[0][1],
      planeRotation(-Math.PI / 2, true)[0][1],
    ),
  );
});

test("Rodrigues accepts arbitrary axes but only cube-preserving rotations have cube matches", () => {
  const u = [2, -1, 3],
    v = [1, 4, 0];
  for (const axis of [
    [1, 1, 1],
    [1, 2, 0],
    [0.5, -1.25, 3],
  ]) {
    for (const angle of [0, 37, 120, 180, 360]) {
      const R = axisRotation(axis, angle);
      assert.ok(near(dot(apply(R, u), apply(R, v)), dot(u, v)));
      assert.ok(near(det(R), 1));
      assert.ok(apply(R, axis).every((x, i) => near(x, axis[i])));
    }
  }
  for (const angle of [0, 120, 240, 360])
    assert.ok(cubeSymmetryMatch(axisRotation([1, 1, 1], angle)));
  for (const angle of [60, 180])
    assert.equal(cubeSymmetryMatch(axisRotation([1, 1, 1], angle)), undefined);
  assert.equal(cubeSymmetryMatch(axisRotation([1, 2, 0], 60)), undefined);
  assert.throws(() => axisRotation([0, 0, 0], 60), /nonzero vector/);
});

test("metric states synchronize dimension, determinant, fixed space and cube action", () => {
  const plane2 = metricOrientationModel("plane2", "x", 37);
  assert.equal(plane2.dimension, 2);
  assert.equal(plane2.fixedSpace, "x-axis, dimension 1");
  assert.equal(plane2.cubePreserved, null);
  for (const normal of ["x", "y", "z"]) {
    const plane3 = metricOrientationModel("plane3", normal, 37);
    assert.equal(plane3.dimension, 3);
    assert.equal(plane3.determinant, -1);
    assert.equal(plane3.fixedSpace, `plane ${normal}=0, dimension 2`);
    assert.equal(plane3.cubePreserved, true);
  }
  const inversion = metricOrientationModel("inversion3", "x", 37);
  assert.equal(inversion.determinant, -1);
  assert.equal(inversion.fixedSpace, "{0}, dimension 0");
  assert.equal(inversion.cubePreserved, true);
  const general = metricOrientationModel("rotation3", "x", 37);
  assert.equal(general.determinant, 1);
  assert.equal(general.cubePreserved, false);
  assert.equal(general.originalDot, general.transformedDot);
  assert.equal(
    metricOrientationModel("rotation3", "x", 0).fixedSpace,
    "all R³, dimension 3",
  );
});
