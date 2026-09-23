export type FieldChoice = "R" | "C";
export type ActingGroup = "rotation" | "dihedral";
export type LineChoice = "real-axis" | "complex-eigenline" | "whole";
export type MapChoice = "basis-change" | "identity" | "singular";
type Matrix2 = readonly [readonly [number, number], readonly [number, number]];

export const rotation: Matrix2 = [
  [0, -1],
  [1, 0],
];
export const reflection: Matrix2 = [
  [1, 0],
  [0, -1],
];
export const inverseRotation: Matrix2 = [
  [0, 1],
  [-1, 0],
];
export const identity: Matrix2 = [
  [1, 0],
  [0, 1],
];
export const singular: Matrix2 = [
  [1, 0],
  [0, 0],
];

export function multiply2(a: Matrix2, b: Matrix2): Matrix2 {
  const entry = (row: number, column: number) =>
    a[row][0] * b[0][column] + a[row][1] * b[1][column] || 0;
  return [
    [entry(0, 0), entry(0, 1)],
    [entry(1, 0), entry(1, 1)],
  ];
}

export function matrixText(a: Matrix2) {
  return `[[${a[0].join(", ")}], [${a[1].join(", ")}]]`;
}

export function representationState(
  field: FieldChoice,
  group: ActingGroup,
  line: LineChoice,
  map: MapChoice,
) {
  const candidate =
    map === "basis-change"
      ? reflection
      : map === "identity"
        ? identity
        : singular;
  const leftRotation = multiply2(candidate, rotation);
  const rightRotation = multiply2(inverseRotation, candidate);
  const leftReflection = multiply2(candidate, reflection);
  const rightReflection = multiply2(reflection, candidate);
  const rotationIntertwines =
    matrixText(leftRotation) === matrixText(rightRotation);
  const reflectionIntertwines =
    matrixText(leftReflection) === matrixText(rightReflection);
  const lineDefined = line !== "complex-eigenline" || field === "C";
  const rotationStable = line === "whole" || line === "complex-eigenline";
  const reflectionStable = line === "whole" || line === "real-axis";
  const invariant =
    lineDefined && rotationStable && (group === "rotation" || reflectionStable);
  return {
    field,
    group,
    line,
    lineDefined,
    rotationStable: lineDefined && rotationStable,
    reflectionStable: lineDefined && reflectionStable,
    invariant,
    candidate,
    leftRotation,
    rightRotation,
    leftReflection,
    rightReflection,
    rotationIntertwines,
    reflectionIntertwines,
    intertwines: rotationIntertwines && reflectionIntertwines,
    invertible: map !== "singular",
    projection: {
      source: "V⊕𝔽 with V=𝔽² carrying ρ and 𝔽 trivial",
      formula: "q(x,y,z)=z",
      kernel: "V⊕0",
      image: "𝔽",
      equation: "q((ρ(g)v,z))=z=g·q(v,z) for r and s",
    },
  };
}
