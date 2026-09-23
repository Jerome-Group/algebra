export const s3Classes = [
  { name: "e", size: 1, fixedPoints: 3, sign: 1 },
  { name: "transposition", size: 3, fixedPoints: 1, sign: -1 },
  { name: "3-cycle", size: 2, fixedPoints: 0, sign: 1 },
] as const;
export const characterNames = ["trivial", "sign", "standard"] as const;
export type CharacterName = (typeof characterNames)[number];
export type Weighting = "class-size" | "equal-columns";
export type CharacterStage =
  "classes" | "representations" | "orthogonality" | "decomposition";
export const characterStages: CharacterStage[] = [
  "classes",
  "representations",
  "orthogonality",
  "decomposition",
];

export function s3Character(name: CharacterName) {
  return s3Classes.map((item) =>
    name === "trivial" ? 1 : name === "sign" ? item.sign : item.fixedPoints - 1,
  );
}

export function characterInnerProduct(
  a: number[],
  b: number[],
  weighting: Weighting,
) {
  const weights = s3Classes.map((item) =>
    weighting === "class-size" ? item.size : 1,
  );
  const denominator = weights.reduce((sum, value) => sum + value, 0);
  return (
    a.reduce(
      (sum, value, index) => sum + weights[index] * value * b[index],
      0,
    ) / denominator
  );
}

export function characterConstruction(
  first: CharacterName,
  second: CharacterName,
  weighting: Weighting,
) {
  const firstValues = s3Character(first);
  const secondValues = s3Character(second);
  const product = firstValues.map(
    (value, index) => value * secondValues[index],
  );
  const multiplicities = Object.fromEntries(
    characterNames.map((name) => [
      name,
      characterInnerProduct(product, s3Character(name), weighting),
    ]),
  ) as Record<CharacterName, number>;
  return {
    firstValues,
    secondValues,
    product,
    multiplicities,
    standardNorm: characterInnerProduct(
      s3Character("standard"),
      s3Character("standard"),
      weighting,
    ),
    order: s3Classes.reduce((sum, item) => sum + item.size, 0),
    degreesSquared: characterNames.reduce(
      (sum, name) => sum + s3Character(name)[0] ** 2,
      0,
    ),
  };
}
