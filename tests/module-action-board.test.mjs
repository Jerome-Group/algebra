import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
});
after(() => vite.close());
const { moduleBoard } = await vite.ssrLoadModule(
  "/lib/algebra/module-action-board.ts",
);

test("cyclic action distinguishes ring units from invertible module operators", () => {
  const onThree = moduleBoard(3, 2, 1, 1);
  assert.equal(onThree.regularModuleInvertible, false);
  assert.equal(onThree.action.inverse, 2);
  assert.deepEqual(onThree.action.images, [0, 2, 1]);
  const onSix = moduleBoard(6, 2, 2, 2);
  assert.equal(onSix.action.inverse, undefined);
  assert.deepEqual(onSix.action.kernel, [0, 3]);
  assert.deepEqual(onSix.action.image, [0, 2, 4]);
  assert.equal(onSix.action.image.length * onSix.action.kernel.length, 6);
  assert.equal(onSix.imageQuotientSize, onSix.action.image.length);
  assert.equal(onSix.cokernelSize, 2);
  assert.match(onSix.operatorExample.moduleMap, /p\(T\(a,b\)\)=2a/);
});

test("submodule, quotient and annihilator data obey the module laws", () => {
  for (const modulus of [3, 4, 6, 8, 12])
    for (const scalar of [-2, 0, 1, 2, 3])
      for (const generator of Array.from(
        { length: modulus },
        (_, i) => i + 1,
      ).filter((d) => modulus % d === 0)) {
        const model = moduleBoard(
          modulus,
          scalar,
          generator,
          Math.min(2, modulus - 1),
        );
        assert.equal(model.submodule.length * model.quotient.length, modulus);
        assert.ok(
          model.submodule.every((x) =>
            model.submodule.includes(
              (((scalar * x) % modulus) + modulus) % modulus,
            ),
          ),
        );
        assert.equal(model.imageQuotientSize, model.action.image.length);
        assert.equal(model.moduleAnnihilator, modulus);
        assert.ok(model.vectorAnnihilator > 0);
      }
  const six = moduleBoard(6, 2, 2, 2);
  assert.deepEqual(six.submodule, [0, 2, 4]);
  assert.deepEqual(six.quotient, [0, 1]);
  assert.deepEqual(six.quotientAction, [0, 0]);
  assert.equal(six.vectorAnnihilator, 3);
  assert.equal(moduleBoard(6, 2, 2, 0).vectorAnnihilator, 1);
});
