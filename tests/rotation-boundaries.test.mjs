import test from "node:test";
import assert from "node:assert/strict";
import { axisRotation } from "../lib/algebra/rotations.ts";
import { det, matrixTex } from "../lib/algebra/engine.ts";
import { degreeTex, numberTex } from "../lib/algebra/numeric-tex.ts";
import { observeExportedProducer } from "../scripts/public-math-node-reporter.mjs";

const observedRotation = async (context, axis, angle) => {
  const inputs = { x: axis[0], y: axis[1], z: axis[2], angle };
  const matrix = await observeExportedProducer(
    context,
    { file: "lib/algebra/rotations.ts", exportName: "axisRotation", inputs },
    () => axisRotation(axis, angle),
  );
  await observeExportedProducer(
    context,
    { file: "lib/algebra/engine.ts", exportName: "matrixTex", inputs },
    () => matrixTex(matrix),
  );
  await observeExportedProducer(
    context,
    { file: "lib/algebra/numeric-tex.ts", exportName: "degreeTex", inputs },
    () => degreeTex(angle),
  );
  await observeExportedProducer(
    context,
    { file: "lib/algebra/numeric-tex.ts", exportName: "numberTex", inputs },
    () => numberTex(angle),
  );
  return matrix;
};

function assertRotation(matrix, unitAxis, angle) {
  const radians = (angle * Math.PI) / 180;
  const trace = matrix.reduce((sum, row, i) => sum + row[i], 0);
  assert.ok(
    Math.abs(trace - (1 + 2 * Math.cos(radians))) < 1e-12,
    `trace ${trace} must encode the requested ${angle} degree angle`,
  );
  const [x, y, z] = unitAxis;
  const perpendicular = y === 0 && z === 0 ? [0, 1, 0] : [0, -z, y];
  const cross = [
    y * perpendicular[2] - z * perpendicular[1],
    z * perpendicular[0] - x * perpendicular[2],
    x * perpendicular[1] - y * perpendicular[0],
  ];
  matrix.forEach((row, i) => {
    const actual = row.reduce(
      (sum, value, j) => sum + value * perpendicular[j],
      0,
    );
    const expected =
      Math.cos(radians) * perpendicular[i] + Math.sin(radians) * cross[i];
    assert.ok(
      Math.abs(actual - expected) < 1e-12,
      `right-handed perpendicular image component ${i}: ${actual} != ${expected}`,
    );
  });
  assert.ok(matrix.flat().every(Number.isFinite));
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const inner = matrix.reduce((sum, row) => sum + row[i] * row[j], 0);
      assert.ok(
        Math.abs(inner - Number(i === j)) < 1e-12,
        `Columns ${i},${j} have inner product ${inner}`,
      );
    }
  }
  assert.ok(Math.abs(det(matrix) - 1) < 1e-12, `det(R)=${det(matrix)}`);
  const fixed = matrix.map((row) =>
    row.reduce((sum, entry, i) => sum + entry * unitAxis[i], 0),
  );
  fixed.forEach((value, i) => assert.ok(Math.abs(value - unitAxis[i]) < 1e-12));
}

test("ordinary axes preserve lengths, orientation and their exact direction", async (t) => {
  for (const angle of [0, 45, 90, 120, 180, 360]) {
    assertRotation(
      await observedRotation(t, [1, 1, 0], angle),
      [1 / Math.sqrt(2), 1 / Math.sqrt(2), 0],
      angle,
    );
  }
});

test("nonzero subnormal axes define rotations with the same direction", async (t) => {
  for (const angle of [45, 90, 180]) {
    assertRotation(
      await observedRotation(t, [Number.MIN_VALUE, Number.MIN_VALUE, 0], angle),
      [1 / Math.sqrt(2), 1 / Math.sqrt(2), 0],
      angle,
    );
    assertRotation(
      await observedRotation(
        t,
        [0, Number.MIN_VALUE, -Number.MIN_VALUE],
        angle,
      ),
      [0, 1 / Math.sqrt(2), -1 / Math.sqrt(2)],
      angle,
    );
  }
});

test("large finite axes retain rotations when their unscaled norm overflows", async (t) => {
  for (const angle of [45, 90, 180]) {
    assertRotation(
      await observedRotation(t, [1.7e308, 1.7e308, 1.7e308], angle),
      [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)],
      angle,
    );
  }
});

test("zero, nonfinite and incorrectly sized axes remain invalid", () => {
  for (const axis of [
    [0, 0, 0],
    [Infinity, 0, 0],
    [NaN, 1, 0],
    [1, 1],
    [1, 1, 1, 1],
    [, 1, 0],
  ]) {
    assert.throws(() => axisRotation(axis, 90), /nonzero vector/);
  }
});

test("angle and right-hand image oracles reject an identity mutant", () => {
  const identity = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  assert.throws(
    () => assertRotation(identity, [0, 0, 1], 90),
    /requested 90 degree angle/,
  );
  assert.throws(
    () => assertRotation(axisRotation([0, 0, 1], -90), [0, 0, 1], 90),
    /right-handed perpendicular image/,
  );
});
