import test from "node:test";
import assert from "node:assert/strict";
import {
  nilradicalElements,
  powerSequence,
  radicalPowers,
} from "../lib/algebra/nilradical.ts";

test("Z/8 has a nilpotent radical and Z/6 is reduced", () => {
  assert.deepEqual(nilradicalElements(8), [0, 2, 4, 6]);
  assert.deepEqual(radicalPowers(8), [[0, 2, 4, 6], [0, 4], [0]]);
  assert.deepEqual(powerSequence(2, 8), [2, 4, 0]);
  assert.deepEqual(nilradicalElements(6), [0]);
  assert.deepEqual(radicalPowers(6), [[0]]);
  assert.ok(!powerSequence(2, 6).includes(0));
});
