import test from "node:test";
import assert from "node:assert/strict";
import {
  tetrahedralVertices,
  tetrahedralDisplacement,
} from "../lib/algebra/tetrahedral-displacements.ts";

test("the source tetrahedron has six equal edges and centroid zero", () => {
  assert.deepEqual(
    [0, 1, 2].map((axis) =>
      tetrahedralVertices.reduce((sum, r) => sum + r[axis], 0),
    ),
    [0, 0, 0],
  );
  const distances = tetrahedralVertices.flatMap((r, i) =>
    tetrahedralVertices
      .slice(i + 1)
      .map((s) =>
        r.reduce((sum, value, axis) => sum + (value - s[axis]) ** 2, 0),
      ),
  );
  assert.deepEqual(distances, [8, 8, 8, 8, 8, 8]);
});

test("translations and infinitesimal rotations leave every first-order spring extension zero", () => {
  for (const kind of ["translation", "rotation"]) {
    const state = tetrahedralDisplacement(kind);
    assert.equal(state.edges.length, 6);
    assert.deepEqual(
      state.edges.map(({ numerator }) => numerator),
      [0, 0, 0, 0, 0, 0],
    );
    assert(state.vectors.some((r) => r.some((coordinate) => coordinate !== 0)));
  }
});

test("breathing and symmetric shear give their actual signed edge extension patterns", () => {
  assert.deepEqual(
    tetrahedralDisplacement("breathing").edges.map(
      ({ numerator }) => numerator,
    ),
    [8, 8, 8, 8, 8, 8],
  );
  assert.deepEqual(
    tetrahedralDisplacement("shear").edges.map(({ numerator }) => numerator),
    [0, 0, 8, -8, 0, 0],
  );
});

test("edge numerators are the derivative of squared lengths divided by two", () => {
  for (const kind of ["translation", "rotation", "breathing", "shear"]) {
    const { vertices, vectors, edges } = tetrahedralDisplacement(kind);
    const squared = (i, j, t) =>
      vertices[i].reduce(
        (sum, value, axis) =>
          sum +
          (value +
            t * vectors[i][axis] -
            vertices[j][axis] -
            t * vectors[j][axis]) **
            2,
        0,
      );
    for (const { i, j, numerator } of edges) {
      const derivative = (squared(i, j, 1) - squared(i, j, -1)) / 4;
      assert.equal(derivative, numerator);
    }
  }
});
