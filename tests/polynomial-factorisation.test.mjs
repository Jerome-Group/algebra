import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
});
after(() => vite.close());
const { polynomialReading } = await vite.ssrLoadModule(
  "/lib/algebra/polynomial-factorisation.ts",
);

test("field changes alter factorisation and roots without changing source content", () => {
  const rational = polynomialReading("quadratic", "Q");
  const complex = polynomialReading("quadratic", "C");
  const binary = polynomialReading("quadratic", "F2");
  assert.equal(rational.verdict, "irreducible");
  assert.equal(complex.equation, "(X−i)(X+i)");
  assert.equal(binary.equation, "(X+1)²");
  assert.deepEqual(
    [rational.content, complex.content, binary.content],
    [1, 1, 1],
  );
});

test("proof certificates distinguish shift, rootless quartic and invalid reduction", () => {
  assert.match(
    polynomialReading("shifted", "Q").certificate,
    /Eisenstein at 2/,
  );
  const quartic = polynomialReading("rootless", "Q");
  assert.match(quartic.roots, /No rational roots/);
  assert.equal(quartic.equation, "(X²+1)(X²+2)");
  assert.equal(quartic.verdict, "reducible");
  const collapsed = polynomialReading("content", "F2");
  assert.equal(collapsed.content, 2);
  assert.equal(collapsed.equation, "0");
  assert.equal(collapsed.verdict, "inconclusive");
});

test("displayed factor and shifted-Eisenstein identities hold independently", () => {
  for (const x of [-3, -1, 0, 1, 4]) {
    assert.equal((x * x + 1) * (x * x + 2), x ** 4 + 3 * x * x + 2);
    assert.ok(
      Math.abs(
        (x * x + Math.SQRT2 * x + 1) * (x * x - Math.SQRT2 * x + 1) -
          (x ** 4 + 1),
      ) < 1e-9,
    );
    assert.equal((x + 1) ** 4 + 1, x ** 4 + 4 * x ** 3 + 6 * x * x + 4 * x + 2);
  }
  const shifted = [2, 4, 6, 4, 1];
  assert.equal(shifted.at(-1) % 2, 1);
  assert.ok(shifted.slice(0, -1).every((coefficient) => coefficient % 2 === 0));
  assert.notEqual(shifted[0] % 4, 0);
});
