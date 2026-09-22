import test from "node:test";
import assert from "node:assert/strict";
import { fixedColoringLedger } from "../lib/algebra/fixed-colorings.ts";

const polygon = (size, reflections, colors = 2, firstColorCount = 2) =>
  fixedColoringLedger({
    kind: "polygon",
    size,
    reflections,
    colors,
    firstColorCount,
  });
const cube = (feature, colors = 2) =>
  fixedColoringLedger({ kind: "cube", feature, colors });

test("polygon conjugacy classes yield exact necklace, bracelet and inventory counts", () => {
  const rotations = polygon(6, false);
  assert.deepEqual(
    rotations.rows.map((row) => row.fixedColorings),
    [64, 2, 4, 8, 4, 2],
  );
  assert.equal(
    rotations.groups.length,
    6,
    "C6 is abelian: every conjugacy class is a singleton",
  );
  assert.equal(rotations.orbits, 14);
  const dihedral = polygon(6, true);
  assert.equal(dihedral.rows.length, 12);
  assert.equal(dihedral.groups.length, 6);
  assert.deepEqual(
    dihedral.rows
      .slice(6)
      .map((row) => row.fixedColorings)
      .sort((a, b) => a - b),
    [8, 8, 8, 16, 16, 16],
  );
  assert.equal(dihedral.orbits, 13);
  assert.equal(dihedral.rows[1].fixedPositions, 0);
  assert.equal(dihedral.rows[1].fixedColorings, 2);
  assert.equal(polygon(8, true).groups.length, 7);
  assert.equal(polygon(4, false).orbits, 6);
  assert.equal(polygon(3, false).inventory, 1);
  assert.equal(polygon(4, false).inventory, 2);
});

test("proper cube rotations form five classes and act differently on feature sets", () => {
  const vertices = cube("vertices");
  assert.equal(vertices.rows.length, 24);
  assert.equal(vertices.groups.length, 5);
  assert.deepEqual(
    Object.fromEntries(
      vertices.groups.map((group) => [group.family, group.elements.length]),
    ),
    {
      identity: 1,
      "face-axis half-turn": 3,
      "face-axis quarter-turn": 6,
      "edge-axis half-turn": 6,
      "vertex-axis third-turn": 8,
    },
  );
  assert.equal(vertices.orbits, 23);
  const quarterVertex = vertices.rows.find(
    (row) => row.family === "face-axis quarter-turn",
  );
  const faces = cube("faces");
  const quarterFace = faces.rows.find(
    (row) => row.family === "face-axis quarter-turn",
  );
  assert.equal(quarterVertex.fixedPositions, 0);
  assert.equal(quarterVertex.fixedColorings, 4);
  assert.equal(quarterFace.fixedPositions, 2);
  assert.equal(quarterFace.fixedColorings, 8);
  for (const feature of ["vertices", "faces", "edges"]) {
    const ledger = cube(feature);
    assert.equal(
      new Set(ledger.rows.map((row) => row.matrix.flat().join(","))).size,
      24,
    );
    for (const row of ledger.rows)
      assert.deepEqual(
        [...row.permutation].sort((a, b) => a - b),
        row.permutation.map((_, index) => index),
      );
    for (const group of ledger.groups)
      assert.equal(
        new Set(
          ledger.rows
            .filter((row) => row.classId === group.classId)
            .map((row) => row.signature),
        ).size,
        1,
      );
  }
  assert.equal(faces.orbits, 10);
  assert.equal(cube("edges").orbits, 218);
});
