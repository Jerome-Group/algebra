import { cube, matrixTex, mv, type Mat } from "./engine";
import { axisRotation, planeRotation } from "./rotations";

export type PlaneProduct = "RF" | "FR";
export type MetricState = "plane2" | "plane3" | "inversion3" | "rotation3";
export type CoordinateNormal = "x" | "y" | "z";

export const rounded = (value: number) =>
  Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(3));

export function cubeSymmetryMatch(matrix: Mat) {
  if (matrix.length !== 3) return undefined;
  return cube.find(({ matrix: candidate }) =>
    candidate.every((row, i) =>
      row.every((entry, j) => Math.abs(entry - matrix[i][j]) < 1e-8),
    ),
  );
}

export function planeReflectionModel(angle: number, product: PlaneProduct) {
  const radians = (angle * Math.PI) / 180;
  const right = planeRotation(radians, true);
  const left = planeRotation(-radians, true);
  const matrix = product === "RF" ? right : left;
  const lineDegrees = ((product === "RF" ? 1 : -1) * angle) / 2;
  return {
    right,
    left,
    matrix,
    lineDegrees,
    image: mv(matrix, [1, 0]),
  };
}

export function metricOrientationModel(
  state: MetricState,
  normal: CoordinateNormal,
  angle: number,
) {
  let dimension: 2 | 3;
  let matrix: Mat;
  let determinant: 1 | -1;
  let fixedSpace: string;
  switch (state) {
    case "plane2":
      dimension = 2;
      matrix = [
        [1, 0],
        [0, -1],
      ];
      determinant = -1;
      fixedSpace = "x-axis, dimension 1";
      break;
    case "plane3": {
      dimension = 3;
      const axis = { x: 0, y: 1, z: 2 }[normal];
      matrix = Array.from({ length: 3 }, (_, i) =>
        Array.from({ length: 3 }, (_, j) =>
          i === j ? (i === axis ? -1 : 1) : 0,
        ),
      );
      determinant = -1;
      fixedSpace = `plane ${normal}=0, dimension 2`;
      break;
    }
    case "inversion3":
      dimension = 3;
      matrix = [
        [-1, 0, 0],
        [0, -1, 0],
        [0, 0, -1],
      ];
      determinant = -1;
      fixedSpace = "{0}, dimension 0";
      break;
    case "rotation3":
      dimension = 3;
      matrix = axisRotation([0, 0, 1], angle);
      determinant = 1;
      fixedSpace =
        angle === 0 || angle === 360
          ? "all R³, dimension 3"
          : "z-axis, dimension 1";
      break;
  }
  const u = dimension === 2 ? [1, 2] : [1, 2, 0];
  const v = dimension === 2 ? [0, 1] : [0, 1, 1];
  const dot = (a: number[], b: number[]) =>
    a.reduce((sum, entry, i) => sum + entry * b[i], 0);
  return {
    dimension,
    matrix,
    matrixEquation: String.raw`Q=${matrixTex(matrix)},\quad Q^TQ=I_${dimension},\quad\det Q=${determinant}`,
    determinant,
    fixedSpace,
    cubePreserved: dimension === 3 ? Boolean(cubeSymmetryMatch(matrix)) : null,
    u,
    v,
    originalDot: dot(u, v),
    transformedDot: rounded(dot(mv(matrix, u), mv(matrix, v))),
  };
}
