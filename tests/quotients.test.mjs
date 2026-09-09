import test from "node:test";
import assert from "node:assert/strict";
import { linearQuotient, quadraticQuotient } from "../lib/algebra/quotients.ts";

test("every small linear map has kernel cosets as fibers and quotient cardinality equal to image", () => {
  for (const p of [2, 3, 5])
    for (let code = 0; code < p ** 4; code++) {
      const matrix = Array.from(
        { length: 4 },
        (_, i) => Math.floor(code / p ** i) % p,
      );
      const q = linearQuotient(p, matrix);
      assert.equal(q.kernel.length * q.image.length, p * p);
      for (const image of q.image)
        assert.equal(
          q.images.filter((x) => x === image).length,
          q.kernel.length,
        );
      for (const v of q.points)
        for (const k of q.kernel) {
          const translated = v.map((x, i) => (x + k[i]) % p);
          assert.equal(q.encode(q.apply(v)), q.encode(q.apply(translated)));
        }
    }
});
test("quadratic quotient multiplication obeys ring laws and the imposed relation", () => {
  for (const p of [2, 3, 5])
    for (const [b, c] of [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ]) {
      const q = quadraticQuotient(p, b, c),
        n = p * p;
      assert.equal(q.add(q.add(q.multiply(p, p), q.multiply(b, p)), c), 0);
      for (let x = 0; x < n; x++) {
        assert.equal(q.multiply(x, 1), x);
        assert.equal(q.multiply(x, 0), 0);
        if (x) assert.equal(q.inverse(x) >= 0, q.annihilators(x).length === 0);
        for (let y = 0; y < n; y++) {
          assert.equal(q.multiply(x, y), q.multiply(y, x));
          for (let z = 0; z < n; z++) {
            assert.equal(
              q.multiply(q.multiply(x, y), z),
              q.multiply(x, q.multiply(y, z)),
            );
            assert.equal(
              q.multiply(x, q.add(y, z)),
              q.add(q.multiply(x, y), q.multiply(x, z)),
            );
          }
        }
      }
      assert.equal(
        q.roots.length === 0,
        Array.from({ length: n - 1 }, (_, i) => i + 1).every(
          (x) => q.inverse(x) >= 0,
        ),
      );
    }
});
