export type SpatialVector = readonly [number, number, number];
export type DisplacementKind =
  "translation" | "rotation" | "breathing" | "shear";

export const tetrahedralVertices: readonly SpatialVector[] = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
];

const subtract = (a: SpatialVector, b: SpatialVector): SpatialVector => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
const dot = (a: SpatialVector, b: SpatialVector) =>
  a.reduce((sum, coordinate, axis) => sum + coordinate * b[axis], 0);

export function tetrahedralDisplacement(kind: DisplacementKind) {
  const displacement = (r: SpatialVector): SpatialVector => {
    switch (kind) {
      case "translation":
        return [1, 0, 0];
      case "rotation":
        return [0, -r[2], r[1]];
      case "breathing":
        return r;
      case "shear":
        return [r[1], r[0], 0];
    }
  };
  const vectors = tetrahedralVertices.map(displacement);
  const edges = tetrahedralVertices.flatMap((vertex, i) =>
    tetrahedralVertices.slice(i + 1).map((other, offset) => {
      const j = i + offset + 1;
      return {
        i,
        j,
        numerator: dot(
          subtract(other, vertex),
          subtract(vectors[j], vectors[i]),
        ),
      };
    }),
  );
  return { kind, vertices: tetrahedralVertices, vectors, edges };
}
