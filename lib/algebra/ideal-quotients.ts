import { integerGcd } from "./foundation-labs";

const divisors = (n: number) =>
  Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);

export function integerIdealQuotient(d: number) {
  if (!divisors(12).includes(d))
    throw new RangeError("Ideal generator must divide 12");
  const sourceIdeal = Array.from({ length: 12 }, (_, x) => x).filter(
    (x) => x % d === 0,
  );
  const elements = Array.from({ length: d }, (_, x) => x);
  const units = elements.filter((x) => integerGcd(x, d) === 1);
  const zeroDivisors = elements.filter(
    (x) => x !== 0 && elements.some((y) => y !== 0 && (x * y) % d === 0),
  );
  const correspondence = divisors(d).map((e) => ({
    generator: e,
    sourceIdeal: Array.from({ length: 12 }, (_, x) => x).filter(
      (x) => x % e === 0,
    ),
    quotientIdeal: elements.filter((x) => x % e === 0),
    containedIn: divisors(d).filter((f) => e % f === 0),
  }));
  return {
    d,
    sourceIdeal,
    elements,
    units,
    zeroDivisors,
    correspondence,
  };
}

export type PolynomialIdeal = "irreducible" | "double" | "split";
const polynomialIdeals = {
  irreducible: {
    label: "X²+X+1",
    constant: 1,
    linear: 1,
    factors: [
      { label: "1", element: 1 },
      { label: "X²+X+1", element: 0 },
    ],
  },
  double: {
    label: "X²+1=(X+1)²",
    constant: 1,
    linear: 0,
    factors: [
      { label: "1", element: 1 },
      { label: "X+1", element: 3 },
      { label: "X²+1", element: 0 },
    ],
  },
  split: {
    label: "X²+X=X(X+1)",
    constant: 0,
    linear: 1,
    factors: [
      { label: "1", element: 1 },
      { label: "X", element: 2 },
      { label: "X+1", element: 3 },
      { label: "X²+X", element: 0 },
    ],
  },
} as const;
export const quotientElementNames = ["0", "1", "X", "1+X"];

type QuadraticClass = 0 | 1 | 2 | 3;
const quadraticClasses: QuadraticClass[] = [0, 1, 2, 3];
const coefficients = (value: QuadraticClass) => ({
  constant: value % 2,
  linear: Math.floor(value / 2),
});
const classFromCoefficients = (constant: number, linear: number) =>
  (constant + 2 * linear) as QuadraticClass;

export function polynomialIdealQuotient(id: PolynomialIdeal) {
  const polynomial = polynomialIdeals[id];
  const elements = quadraticClasses;
  const multiply = (a: QuadraticClass, b: QuadraticClass) => {
    const left = coefficients(a);
    const right = coefficients(b);
    const cross = left.linear * right.linear;
    const constant =
      (left.constant * right.constant + cross * polynomial.constant) % 2;
    const linear =
      (left.constant * right.linear +
        left.linear * right.constant +
        cross * polynomial.linear) %
      2;
    return classFromCoefficients(constant, linear);
  };
  const units = elements.filter((a) =>
    elements.some((b) => multiply(a, b) === 1),
  );
  const zeroDivisors = elements.filter(
    (a) => a !== 0 && elements.some((b) => b !== 0 && multiply(a, b) === 0),
  );
  const principalIdeals = polynomial.factors.map((factor) => ({
    generator: factor.label,
    quotientIdeal: [
      ...new Set(elements.map((r) => multiply(factor.element, r))),
    ].sort(),
  }));
  const correspondence = principalIdeals.map((ideal) => ({
    ...ideal,
    containedIn: principalIdeals
      .filter((other) =>
        ideal.quotientIdeal.every((element) =>
          other.quotientIdeal.includes(element),
        ),
      )
      .map((other) => other.generator),
  }));
  return {
    id,
    label: polynomial.label,
    relation: `X²=${polynomial.constant ? "1" : ""}${polynomial.linear ? (polynomial.constant ? "+X" : "X") : ""}`,
    elements,
    multiply,
    units,
    zeroDivisors,
    correspondence,
    nonIdealWitness: {
      subgroup: "H={0,1}⊂F₂[X]",
      equivalent: "X and X+1 differ by 1∈H",
      products: "X·X=X² and (X+1)·X=X²+X differ by X∉H",
    },
  };
}
