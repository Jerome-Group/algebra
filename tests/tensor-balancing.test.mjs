import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
});
after(() => vite.close());
const { rightCyclicModule, leftCyclicModule, tensorPresentation } =
  await vite.ssrLoadModule("/lib/algebra/tensor-balancing.ts");

test("cyclic tensor relation has exact gcd order and stays balanced", () => {
  for (const m of [2, 3, 4, 6, 8, 12])
    for (const n of [2, 3, 4, 6, 8, 12])
      for (const scalar of [0, 1, 2, 3, 5]) {
        const result = tensorPresentation(
          rightCyclicModule(m),
          leftCyclicModule(n),
          scalar,
          m - 1,
          n - 1,
        );
        assert.equal(result.generatorOrder, result.gcd);
        assert.equal(result.tensorElements.length, result.gcd);
        assert.equal(result.balanced, true);
        assert.equal(result.leftValue, result.rightValue);
      }
  assert.equal(
    tensorPresentation(rightCyclicModule(2), leftCyclicModule(3), 1, 1, 1).gcd,
    1,
  );
  assert.equal(
    tensorPresentation(rightCyclicModule(2), leftCyclicModule(4), 1, 1, 1).gcd,
    2,
  );
});

test("module sides are checked before balancing", () => {
  assert.throws(
    () =>
      tensorPresentation(leftCyclicModule(2), rightCyclicModule(4), 1, 1, 1),
    /right and a left/,
  );
  assert.throws(() => rightCyclicModule(1), RangeError);
});
