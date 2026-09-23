import { integerGcd } from "./foundation-labs";

export type LocalRing = "atThree" | "invertThree" | "rationals";
export type InvertedSet = "powersThree" | "outsideThree";
export const localRingNames: Record<LocalRing, string> = {
  atThree: "ℤ₍₃₎",
  invertThree: "ℤ[1/3]",
  rationals: "ℚ",
};
export const survivingPrimeIdeals: Record<LocalRing, string> = {
  atThree: "(0) and 3ℤ₍₃₎",
  invertThree: "(0) and (p) for primes p≠3",
  rationals: "(0) only",
};
export const invertedSetNames: Record<InvertedSet, string> = {
  powersThree: "S={3ⁿ:n≥0}",
  outsideThree: "S={n∈ℤ:3∤n}",
};

export function reducedFraction(numerator: number, denominator: number) {
  if (
    !Number.isInteger(numerator) ||
    !Number.isInteger(denominator) ||
    denominator === 0
  )
    throw new RangeError("Use integer numerator and nonzero denominator");
  const gcd = integerGcd(numerator, denominator);
  const sign = denominator < 0 ? -1 : 1;
  return {
    numerator: (numerator / gcd) * sign,
    denominator: Math.abs(denominator / gcd),
  };
}

const powerOfThree = (n: number) => {
  while (n > 1 && n % 3 === 0) n /= 3;
  return n === 1;
};

export function fractionReading(
  numerator: number,
  denominator: number,
  ring: LocalRing,
) {
  const fraction = reducedFraction(numerator, denominator);
  const { numerator: a, denominator: b } = fraction;
  let valuationAtThree = 0;
  if (a === 0) valuationAtThree = Infinity;
  else {
    let magnitude = Math.abs(a);
    while (magnitude % 3 === 0) {
      valuationAtThree++;
      magnitude /= 3;
    }
    magnitude = b;
    while (magnitude % 3 === 0) {
      valuationAtThree--;
      magnitude /= 3;
    }
  }
  let status: "absent" | "unit" | "nonunit";
  if (ring === "atThree")
    status = b % 3 === 0 ? "absent" : a % 3 === 0 ? "nonunit" : "unit";
  else if (ring === "invertThree")
    status = !powerOfThree(b)
      ? "absent"
      : a !== 0 && powerOfThree(Math.abs(a))
        ? "unit"
        : "nonunit";
  else status = a === 0 ? "nonunit" : "unit";
  return {
    ...fraction,
    status,
    ring: localRingNames[ring],
    maximalIdeal: ring === "atThree" ? "3ℤ₍₃₎" : undefined,
    valuationAtThree,
    survivingPrimes: survivingPrimeIdeals[ring],
  };
}

export function equivalentFractions(
  a: number,
  b: number,
  c: number,
  d: number,
) {
  const left = reducedFraction(a, b);
  const right = reducedFraction(c, d);
  return {
    left,
    right,
    leftCross: a * d,
    rightCross: b * c,
    equivalent:
      left.numerator === right.numerator &&
      left.denominator === right.denominator,
  };
}

export function factorMapReading(inverted: InvertedSet, target: LocalRing) {
  const source =
    inverted === "powersThree"
      ? localRingNames.invertThree
      : localRingNames.atThree;
  const sample = inverted === "powersThree" ? "5/9" : "5/2";
  const exists =
    target === "rationals" ||
    (inverted === "powersThree" && target === "invertThree") ||
    (inverted === "outsideThree" && target === "atThree");
  const obstruction =
    !exists && inverted === "powersThree"
      ? "3 is not a unit in ℤ₍₃₎."
      : !exists
        ? "2 is not a unit in ℤ[1/3]."
        : undefined;
  return {
    exists,
    target: localRingNames[target],
    source,
    sample,
    formula: "ψ̄(a/s)=ψ(a)ψ(s)⁻¹",
    inverted: invertedSetNames[inverted],
    obstruction,
  };
}
