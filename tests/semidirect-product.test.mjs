import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
});
after(() => vite.close());
const { actionIsHomomorphism, elements, multiply, allSubgroups, isNormal } =
  await vite.ssrLoadModule("/lib/algebra/semidirect-product.ts");

test("only automorphism actions satisfying the C2 relation are accepted", () => {
  assert.equal(actionIsHomomorphism(0), false);
  assert.equal(actionIsHomomorphism(1), true);
  assert.equal(actionIsHomomorphism(2), true);
  assert.throws(() => multiply([0, 1], [1, 0], 0), /automorphisms/);
});

test("both product laws satisfy group axioms and have the stated subgroups", () => {
  for (const multiplier of [1, 2]) {
    for (const a of elements)
      for (const b of elements)
        for (const c of elements)
          assert.deepEqual(
            multiply(multiply(a, b, multiplier), c, multiplier),
            multiply(a, multiply(b, c, multiplier), multiplier),
          );
    const groups = allSubgroups(multiplier);
    assert.equal(groups.length, multiplier === 1 ? 4 : 6);
    assert.deepEqual(
      groups.map((group) => group.length).sort(),
      multiplier === 1 ? [1, 2, 3, 6] : [1, 2, 2, 2, 3, 6],
    );
    const complement = groups.find(
      (group) =>
        group.length === 2 && group.some(([a, b]) => a === 0 && b === 1),
    );
    assert.equal(isNormal(complement, multiplier), multiplier === 1);
  }
  assert.deepEqual(multiply([0, 1], [1, 0], 2), [2, 1]);
  assert.deepEqual(multiply([1, 0], [0, 1], 2), [1, 1]);
});
