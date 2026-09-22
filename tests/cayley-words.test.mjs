import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
});
after(() => vite.close());
const { cyclicSubgroups, evaluateS3Word, regularActionModel, s3WordModel } =
  await vite.ssrLoadModule("/lib/algebra/cayley-words.ts");

test("S3 words have six distinct normal forms and shortest witnesses", () => {
  const model = s3WordModel(["s", "r", "s"]);
  assert.equal(model.shortestWords.size, 6);
  assert.equal(new Set(model.normalForms.map((form) => form.element)).size, 6);
  assert.ok(model.relations.every((relation) => relation.holds));
  assert.equal(model.current, evaluateS3Word(["rInverse"]));
  for (const [element, word] of model.shortestWords)
    assert.equal(evaluateS3Word(word), element);
  assert.equal(evaluateS3Word(["r", "r", "r"]), 0);
  assert.equal(evaluateS3Word(["s", "s"]), 0);
});

test("the regular action gives distinct permutations and preserves composition", () => {
  for (const g of [0, 1, 2, 3, 4, 5])
    for (const h of [0, 1, 2, 3, 4, 5]) {
      const model = regularActionModel(g, h);
      assert.deepEqual(model.composedPermutation, model.productPermutation);
      assert.equal(model.firstPermutation[0], g);
      assert.equal(
        new Set(model.allPermutations.map((row) => row.join(","))).size,
        6,
      );
      for (const row of model.allPermutations)
        assert.deepEqual([...row].sort(), model.elements);
    }
});

test("every C12 subgroup is listed once by divisor order", () => {
  const subgroups = cyclicSubgroups(12);
  assert.deepEqual(
    subgroups.map(({ order }) => order),
    [1, 2, 3, 4, 6, 12],
  );
  assert.deepEqual(
    subgroups.find(({ order }) => order === 3).elements,
    [0, 4, 8],
  );
  assert.deepEqual(subgroups.find(({ order }) => order === 2).elements, [0, 6]);
  assert.deepEqual(
    subgroups.find(({ order }) => order === 6).elements,
    [0, 2, 4, 6, 8, 10],
  );
  for (const subgroup of subgroups)
    assert.equal(subgroup.elements.length, subgroup.order);
  assert.equal([0, 4, 8, 6].includes(10), false);
});
