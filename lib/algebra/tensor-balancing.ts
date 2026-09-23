import { integerGcd, residue } from "./foundation-labs";

export type RightCyclicModule = {
  readonly side: "right";
  readonly modulus: number;
};
export type LeftCyclicModule = {
  readonly side: "left";
  readonly modulus: number;
};

export function rightCyclicModule(modulus: number): RightCyclicModule {
  if (!Number.isInteger(modulus) || modulus < 2 || modulus > 12)
    throw new RangeError("Use a modulus from 2 to 12");
  return { side: "right", modulus };
}

export function leftCyclicModule(modulus: number): LeftCyclicModule {
  if (!Number.isInteger(modulus) || modulus < 2 || modulus > 12)
    throw new RangeError("Use a modulus from 2 to 12");
  return { side: "left", modulus };
}

export function tensorPresentation(
  right: RightCyclicModule,
  left: LeftCyclicModule,
  scalar: number,
  u: number,
  v: number,
) {
  if (right.side !== "right" || left.side !== "left")
    throw new TypeError("Tensor inputs must be a right and a left module");
  if (![scalar, u, v].every(Number.isInteger))
    throw new TypeError("Use integer representatives and scalar");
  const gcd = integerGcd(right.modulus, left.modulus);
  const leftRepresentative = residue(u * scalar, right.modulus);
  const rightRepresentative = residue(scalar * v, left.modulus);
  const leftValue = residue(leftRepresentative * v, gcd);
  const rightValue = residue(u * rightRepresentative, gcd);
  return {
    rightModulus: right.modulus,
    leftModulus: left.modulus,
    gcd,
    generatorOrder: gcd,
    tensorElements: Array.from({ length: gcd }, (_, index) => index),
    scalar,
    u: residue(u, right.modulus),
    v: residue(v, left.modulus),
    leftRepresentative,
    rightRepresentative,
    leftValue,
    rightValue,
    balanced: leftValue === rightValue,
    pureValue: residue(u * v, gcd),
    nonPureExample:
      "e₁⊗f₁+e₂⊗f₂ has matrix rank 2 in F²⊗_F F², so it is not a pure tensor",
    dualHomExample:
      "For finite-dimensional F-spaces V,W, V*⊗_F W≅Hom_F(V,W) by φ⊗w↦(v↦φ(v)w)",
  };
}
