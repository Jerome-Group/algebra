import test from "node:test";
import assert from "node:assert/strict";
import {
  composePermutations,
  permutationMatrix,
} from "../lib/algebra/permutation-matrices.ts";

const allS3 = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];
const product = (a, b) =>
  a.map((row) =>
    b[0].map((_, col) =>
      row.reduce((sum, value, k) => sum + value * b[k][col], 0),
    ),
  );

test("column convention gives PσPτ=Pστ on every S3 pair and basis vector", () => {
  for (const sigma of allS3)
    for (const tau of allS3) {
      const composed = composePermutations(sigma, tau);
      assert.deepEqual(
        product(permutationMatrix(sigma), permutationMatrix(tau)),
        permutationMatrix(composed),
      );
      for (let j = 0; j < 3; j++)
        assert.equal(permutationMatrix(composed)[sigma[tau[j]]][j], 1);
    }
  assert.throws(() => permutationMatrix([0, 0, 1]), RangeError);
});
