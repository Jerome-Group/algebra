import test from "node:test";
import assert from "node:assert/strict";
import { axisRotation } from "../lib/algebra/rotations.ts";
import { det } from "../lib/algebra/engine.ts";

function assertRotation(matrix, unitAxis) {
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

test("ordinary axes preserve lengths, orientation and their exact direction", () => {
  for (const angle of [0, 45, 90, 120, 180, 360]) {
    assertRotation(axisRotation([1, 1, 0], angle), [
      1 / Math.sqrt(2),
      1 / Math.sqrt(2),
      0,
    ]);
  }
});

test("nonzero subnormal axes define rotations with the same direction", () => {
  for (const angle of [45, 90, 180]) {
    assertRotation(
      axisRotation([Number.MIN_VALUE, Number.MIN_VALUE, 0], angle),
      [1 / Math.sqrt(2), 1 / Math.sqrt(2), 0],
    );
    assertRotation(
      axisRotation([0, Number.MIN_VALUE, -Number.MIN_VALUE], angle),
      [0, 1 / Math.sqrt(2), -1 / Math.sqrt(2)],
    );
  }
});

test("large finite axes retain rotations when their unscaled norm overflows", () => {
  for (const angle of [45, 90, 180]) {
    assertRotation(axisRotation([1.7e308, 1.7e308, 1.7e308], angle), [
      1 / Math.sqrt(3),
      1 / Math.sqrt(3),
      1 / Math.sqrt(3),
    ]);
  }
});

test("zero, nonfinite and incorrectly sized axes remain invalid", () => {
  for (const axis of [
    [0, 0, 0],
    [Infinity, 0, 0],
    [NaN, 1, 0],
    [1, 1],
    [1, 1, 1, 1],
  ]) {
    assert.throws(() => axisRotation(axis, 90), /nonzero vector/);
  }
});
