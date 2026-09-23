export type HCharacter = "trivial" | "sign";
export type S3Element = "e" | "r" | "s";
export type TargetCharacter = "trivial" | "sign" | "standard";
type Matrix3 = number[][];

const targetValues: Record<TargetCharacter, [number, number, number]> = {
  trivial: [1, 1, 1],
  sign: [1, -1, 1],
  standard: [2, 0, -1],
};
const classSizes = [1, 3, 2];

export function inducedMatrix(
  character: HCharacter,
  element: S3Element,
): Matrix3 {
  const matrix = Array.from({ length: 3 }, () => [0, 0, 0]);
  const sign = character === "trivial" ? 1 : -1;
  for (let basis = 0; basis < 3; basis++) {
    const target =
      element === "r"
        ? (basis + 1) % 3
        : element === "s"
          ? (3 - basis) % 3
          : basis;
    matrix[target][basis] = element === "s" ? sign : 1;
  }
  return matrix;
}

export function multiply3(a: Matrix3, b: Matrix3): Matrix3 {
  return a.map((row) =>
    row.map((_, column) =>
      row.reduce((sum, value, index) => sum + value * b[index][column], 0),
    ),
  );
}

export function inducedState(
  character: HCharacter,
  element: S3Element,
  basis: number,
  target: TargetCharacter,
) {
  if (!Number.isInteger(basis) || basis < 0 || basis > 2)
    throw new RangeError("Basis index must be 0, 1 or 2");
  const matrix = inducedMatrix(character, element);
  const targetBasis = matrix.findIndex((row) => row[basis] !== 0);
  const coefficient = matrix[targetBasis][basis];
  const inducedValues: [number, number, number] = [
    3,
    character === "trivial" ? 1 : -1,
    0,
  ];
  const targetRow = targetValues[target];
  const innerProduct =
    inducedValues.reduce(
      (sum, value, index) => sum + classSizes[index] * value * targetRow[index],
      0,
    ) / 6;
  const hSign = character === "trivial" ? 1 : -1;
  const restrictedHomDimension = (targetRow[0] + hSign * targetRow[1]) / 2;
  return {
    matrix,
    generatorR: inducedMatrix(character, "r"),
    generatorS: inducedMatrix(character, "s"),
    targetBasis,
    coefficient,
    correction: element === "s" ? "s∈H" : "e∈H",
    inducedValues,
    targetRow,
    innerProduct,
    restrictedHomDimension,
    dimension: 3,
    doubleCosets: ["H={e,s}", "HrH={r,r²,rs,r²s}"],
  };
}
