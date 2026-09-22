export type CyclicFactor = 2 | 3;
export type DihedralElement = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export function dihedralIndex(value: number): DihedralElement {
  if (!Number.isInteger(value) || value < 0 || value >= 8)
    throw Error("Unknown D8 element");
  return value as DihedralElement;
}
export function cyclicExponent(order: CyclicFactor, value: number) {
  if (!Number.isInteger(value)) throw Error("Invalid cyclic exponent");
  return ((value % order) + order) % order;
}
export const dihedralElements = [
  "e",
  "r",
  "r²",
  "r³",
  "s",
  "rs",
  "r²s",
  "r³s",
] as const;
export type ComplexEntry = { real: number; imaginary: number };
const unit = (angle: number): ComplexEntry => ({
  real: Math.cos(angle),
  imaginary: Math.sin(angle),
});
const near = (value: number) =>
  Math.abs(value) < 1e-9
    ? 0
    : Math.abs(value - Math.round(value)) < 1e-9
      ? Math.round(value)
      : value;
export function cyclicScalar(
  order: CyclicFactor,
  exponent: number,
): ComplexEntry {
  const value = unit((2 * Math.PI * cyclicExponent(order, exponent)) / order);
  return { real: near(value.real), imaginary: near(value.imaginary) };
}
export function cyclicScalarLabel(order: CyclicFactor, exponent: number) {
  exponent = cyclicExponent(order, exponent);
  return exponent === 0
    ? "1"
    : order === 2
      ? "−1"
      : exponent === 1
        ? "ω"
        : "ω²";
}
export function dihedralMatrix(index: DihedralElement): number[][] {
  dihedralIndex(index);
  const quarterTurns = [
    [
      [1, 0],
      [0, 1],
    ],
    [
      [0, -1],
      [1, 0],
    ],
    [
      [-1, 0],
      [0, -1],
    ],
    [
      [0, 1],
      [-1, 0],
    ],
  ];
  const rotation = quarterTurns[index % 4];
  return index < 4 ? rotation : rotation.map(([a, b]) => [a, -b]);
}
export function dihedralScalar(index: DihedralElement): number | null {
  dihedralIndex(index);
  return index === 0 ? 1 : index === 2 ? -1 : null;
}
export function dihedralCharacter(index: DihedralElement) {
  const matrix = dihedralMatrix(index);
  return matrix[0][0] + matrix[1][1];
}
export function dihedralEigenvalues(index: DihedralElement): ComplexEntry[] {
  dihedralIndex(index);
  return index === 0
    ? [unit(0), unit(0)]
    : index === 1
      ? [unit(Math.PI / 2), unit(-Math.PI / 2)]
      : index === 2
        ? [unit(Math.PI), unit(Math.PI)]
        : index === 3
          ? [unit(-Math.PI / 2), unit(Math.PI / 2)]
          : [unit(0), unit(Math.PI)];
}
export function productCharacter(
  order: CyclicFactor,
  exponent: number,
  dihedral: DihedralElement,
): ComplexEntry {
  const scalar = cyclicScalar(order, exponent);
  const trace = dihedralCharacter(dihedral);
  return {
    real: near(trace * scalar.real),
    imaginary: near(trace * scalar.imaginary),
  };
}
export function pairInKernel(
  order: CyclicFactor,
  exponent: number,
  dihedral: DihedralElement,
) {
  const scalar = dihedralScalar(dihedral);
  const factor = cyclicScalar(order, exponent);
  return (
    scalar !== null &&
    near(factor.real * scalar) === 1 &&
    near(factor.imaginary * scalar) === 0
  );
}
export function productKernel(order: CyclicFactor) {
  return Array.from({ length: order }, (_, exponent) =>
    dihedralElements
      .map((_, index) => ({ exponent, index: dihedralIndex(index) }))
      .filter(({ exponent, index }) => pairInKernel(order, exponent, index)),
  ).flat();
}
export function productIrreducibleAccounting(order: CyclicFactor) {
  const dihedralDegrees = [1, 1, 1, 1, 2];
  const degrees = Array.from({ length: order }, () => dihedralDegrees).flat();
  return {
    degrees,
    rows: degrees.length,
    sumOfSquares: degrees.reduce((sum, degree) => sum + degree * degree, 0),
    groupOrder: order * 8,
  };
}
export function centerGcd(order: CyclicFactor) {
  return order === 2 ? 2 : 1;
}

export const dihedralCharacterClasses = [
  "e",
  "r²",
  "{r,r³}",
  "{s,r²s}",
  "{rs,r³s}",
] as const;
export const dihedralIrreducibleRows = [
  { name: "χ₊₊", degree: 1, values: [1, 1, 1, 1, 1] },
  { name: "χ₊₋", degree: 1, values: [1, 1, 1, -1, -1] },
  { name: "χ₋₊", degree: 1, values: [1, 1, -1, 1, -1] },
  { name: "χ₋₋", degree: 1, values: [1, 1, -1, -1, 1] },
  { name: "χplane", degree: 2, values: [2, -2, 0, 0, 0] },
] as const;
export function cyclicCharacterValueLabel(
  order: CyclicFactor,
  irreducible: number,
  element: number,
) {
  return cyclicScalarLabel(order, cyclicExponent(order, irreducible * element));
}
export function characterProductLabel(coefficient: number, scalar: string) {
  if (coefficient === 0) return "0";
  if (scalar === "1") return String(coefficient);
  if (scalar === "−1") return String(-coefficient);
  if (coefficient === 1) return scalar;
  if (coefficient === -1) return `−${scalar}`;
  return `${coefficient}${scalar}`;
}
export function productCharacterLabel(
  order: CyclicFactor,
  exponent: number,
  dihedral: DihedralElement,
) {
  return characterProductLabel(
    dihedralCharacter(dihedral),
    cyclicScalarLabel(order, exponent),
  );
}
