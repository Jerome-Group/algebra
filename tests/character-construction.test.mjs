import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
});
after(() => vite.close());
const {
  s3Classes,
  characterNames,
  s3Character,
  characterInnerProduct,
  characterConstruction,
} = await vite.ssrLoadModule("/lib/algebra/character-construction.ts");

test("S3 rows are derived from point traces and sign, then orthogonal with class sizes", () => {
  assert.deepEqual(
    s3Classes.map((item) => item.fixedPoints),
    [3, 1, 0],
  );
  assert.deepEqual(s3Character("trivial"), [1, 1, 1]);
  assert.deepEqual(s3Character("sign"), [1, -1, 1]);
  assert.deepEqual(s3Character("standard"), [2, 0, -1]);
  for (const first of characterNames)
    for (const second of characterNames)
      assert.equal(
        characterInnerProduct(
          s3Character(first),
          s3Character(second),
          "class-size",
        ),
        first === second ? 1 : 0,
      );
  assert.equal(
    characterConstruction("standard", "standard", "class-size").degreesSquared,
    6,
  );
});

test("standard square decomposes and incorrect equal-column weighting fails", () => {
  const good = characterConstruction("standard", "standard", "class-size");
  assert.deepEqual(good.product, [4, 0, 1]);
  assert.deepEqual(good.multiplicities, { trivial: 1, sign: 1, standard: 1 });
  const bad = characterConstruction("standard", "standard", "equal-columns");
  assert.equal(bad.standardNorm, 5 / 3);
  assert.notEqual(bad.multiplicities.trivial, 1);
});
