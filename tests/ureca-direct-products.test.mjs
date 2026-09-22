import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  cyclicScalar,
  dihedralCharacter,
  dihedralIrreducibleRows,
  dihedralCharacterClasses,
  dihedralElements,
  dihedralMatrix,
  dihedralIndex,
  dihedralScalar,
  pairInKernel,
  productCharacter,
  productIrreducibleAccounting,
  productKernel,
} from "../lib/algebra/direct-products.ts";
const multiply = (a, b) =>
  a.map((row) =>
    b[0].map((_, j) => row.reduce((sum, value, k) => sum + value * b[k][j], 0)),
  );
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const lessons = JSON.parse(
  fs.readFileSync(new URL("../lib/algebra/lessons.json", import.meta.url)),
);
const guides = JSON.parse(
  fs.readFileSync(
    new URL("../lib/algebra/guided-lessons.json", import.meta.url),
  ),
);
const units = JSON.parse(
  fs.readFileSync(new URL("../lib/algebra/units.json", import.meta.url)),
);

test("the selected D8 matrices form a faithful irreducible complex representation", () => {
  const matrices = dihedralElements.map((_, i) => dihedralMatrix(i));
  assert.equal(new Set(matrices.map(JSON.stringify)).size, 8);
  const I = matrices[0],
    R = matrices[1],
    S = matrices[4];
  assert.ok(same(multiply(multiply(R, R), multiply(R, R)), I));
  assert.ok(same(multiply(S, S), I));
  assert.ok(same(multiply(multiply(S, R), S), matrices[3]));
  const characterNorm =
    (dihedralCharacter(0) ** 2 +
      dihedralCharacter(2) ** 2 +
      2 * [1, 4, 5].reduce((sum, i) => sum + dihedralCharacter(i) ** 2, 0)) /
    8;
  assert.equal(characterNorm, 1);
});
test("character equality separates scalar images from the kernel", () => {
  assert.throws(() => dihedralIndex(8), /Unknown D8 element/);
  assert.throws(() => dihedralMatrix(8), /Unknown D8 element/);
  for (let index = 0; index < 8; index++) {
    const absolute = Math.abs(dihedralCharacter(index));
    assert.ok(absolute <= 2);
    assert.equal(absolute === 2, dihedralScalar(index) !== null);
    assert.equal(dihedralCharacter(index) === 2, index === 0);
  }
  assert.equal(dihedralCharacter(2), -2);
  assert.equal(dihedralScalar(2), -1);
});
test("external-product traces and reciprocal scalar kernels match the two test groups", () => {
  for (const order of [2, 3]) {
    for (let exponent = 0; exponent < order; exponent++)
      for (let index = 0; index < 8; index++) {
        const scalar = cyclicScalar(order, exponent),
          trace = dihedralCharacter(index),
          product = productCharacter(order, exponent, index);
        assert.ok(Math.abs(product.real - scalar.real * trace) < 1e-9);
        assert.ok(
          Math.abs(product.imaginary - scalar.imaginary * trace) < 1e-9,
        );
      }
    assert.equal(productKernel(order).length, order === 2 ? 2 : 1);
    assert.equal(productIrreducibleAccounting(order).sumOfSquares, 8 * order);
    assert.equal(productIrreducibleAccounting(order).rows, 5 * order);
  }
  assert.equal(pairInKernel(2, 1, 2), true);
  assert.equal(pairInKernel(3, 1, 2), false);
  assert.deepEqual(
    productKernel(2).map(({ exponent, index }) => [exponent, index]),
    [
      [0, 0],
      [1, 2],
    ],
  );
});
test("the five source-gap lessons and integrated unit retain proof and teaching boundaries", () => {
  const ids = [
    "ureca-character-bound-kernel",
    "ureca-external-tensor-products",
    "ureca-direct-product-irreducibles",
    "ureca-product-kernel-scalar-matching",
    "ureca-faithful-direct-product",
  ];
  const tensor = units.find((unit) => unit.id === "tensor");
  assert.ok(ids.every((id) => tensor.lessons.includes(id)));
  assert.ok(tensor.lessons.length <= 7);
  for (const id of ids) {
    const lesson = lessons.find((item) => item.id === id),
      guide = guides[id];
    assert.ok(lesson && guide, id);
    assert.match(lesson.conventions, /finite|Finite/);
    assert.match(lesson.conventions, /complex/);
    assert.match(lesson.conventions, /column/);
    assert.match(lesson.conventions, /reconstruct/);
    assert.ok(guide.examples.length >= 2);
    assert.ok(guide.proofSteps.length >= 3);
  }
  assert.match(lessons.find((item) => item.id === ids[0]).pitfall, /−I/);
  assert.match(lessons.find((item) => item.id === ids[3]).definition, /lambda/);
});

test("D8 character rows factor into distinct irreducible product rows", () => {
  const classSizes = [1, 1, 2, 2, 2];
  assert.equal(dihedralCharacterClasses.length, 5);
  for (let i = 0; i < dihedralIrreducibleRows.length; i++)
    for (let j = 0; j < dihedralIrreducibleRows.length; j++) {
      const inner =
        dihedralIrreducibleRows[i].values.reduce(
          (sum, value, k) =>
            sum + classSizes[k] * value * dihedralIrreducibleRows[j].values[k],
          0,
        ) / 8;
      assert.equal(inner, i === j ? 1 : 0);
    }
  for (const order of [2, 3])
    for (let a = 0; a < order; a++)
      for (let b = 0; b < order; b++) {
        const inner =
          Array.from({ length: order }, (_, element) => {
            const x = cyclicScalar(order, a * element),
              y = cyclicScalar(order, b * element);
            return x.real * y.real + x.imaginary * y.imaginary;
          }).reduce((sum, value) => sum + value, 0) / order;
        assert.ok(Math.abs(inner - (a === b ? 1 : 0)) < 1e-9);
      }
});
