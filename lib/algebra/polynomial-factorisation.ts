import { integerGcd } from "./foundation-labs";

export type CoefficientField = "Q" | "R" | "C" | "F2";
export type PolynomialCase = "quadratic" | "shifted" | "rootless" | "content";

export const polynomialCases: Record<
  PolynomialCase,
  { label: string; coefficients: number[]; name: string }
> = {
  quadratic: {
    label: "X²+1",
    coefficients: [1, 0, 1],
    name: "Quadratic comparison",
  },
  shifted: {
    label: "X⁴+1",
    coefficients: [1, 0, 0, 0, 1],
    name: "Shifted Eisenstein",
  },
  rootless: {
    label: "X⁴+3X²+2",
    coefficients: [2, 0, 3, 0, 1],
    name: "Rootless quartic",
  },
  content: {
    label: "2X²+2X+2",
    coefficients: [2, 2, 2],
    name: "Content and reduction",
  },
};

export const fieldLabels: Record<CoefficientField, string> = {
  Q: "ℚ",
  R: "ℝ",
  C: "ℂ",
  F2: "F₂",
};

type Reading = {
  equation: string;
  roots: string;
  certificate: string;
  verdict: "irreducible" | "reducible" | "inconclusive";
};
const readings: Record<PolynomialCase, Record<CoefficientField, Reading>> = {
  quadratic: {
    Q: {
      equation: "X²+1",
      roots: "No rational roots.",
      certificate: "Degree two over ℚ: no rational root, so irreducible.",
      verdict: "irreducible",
    },
    R: {
      equation: "X²+1",
      roots: "No real roots.",
      certificate:
        "X²+1>0 for every real X; a real quadratic without roots is irreducible.",
      verdict: "irreducible",
    },
    C: {
      equation: "(X−i)(X+i)",
      roots: "i and −i.",
      certificate: "Direct multiplication verifies the two linear factors.",
      verdict: "reducible",
    },
    F2: {
      equation: "(X+1)²",
      roots: "1, with multiplicity two.",
      certificate: "In characteristic two, (X+1)²=X²+1.",
      verdict: "reducible",
    },
  },
  shifted: {
    Q: {
      equation: "X⁴+1",
      roots: "No rational roots.",
      certificate:
        "(X+1)⁴+1=X⁴+4X³+6X²+4X+2 is Eisenstein at 2; translation preserves irreducibility.",
      verdict: "irreducible",
    },
    R: {
      equation: "(X²+√2X+1)(X²−√2X+1)",
      roots: "No real roots.",
      certificate:
        "Multiply the quadratic factors: (X²+1)²−2X²=X⁴+1. Each has discriminant −2.",
      verdict: "reducible",
    },
    C: {
      equation: "∏ₖ₌₀³(X−e^{(2k+1)πi/4})",
      roots: "e^{πi/4}, e^{3πi/4}, e^{5πi/4}, e^{7πi/4}.",
      certificate:
        "Each listed fourth root has fourth power −1; monic degree four gives the product.",
      verdict: "reducible",
    },
    F2: {
      equation: "(X+1)⁴",
      roots: "1, with multiplicity four.",
      certificate: "In characteristic two, (X+1)⁴=X⁴+1.",
      verdict: "reducible",
    },
  },
  rootless: {
    Q: {
      equation: "(X²+1)(X²+2)",
      roots: "No rational roots.",
      certificate:
        "Direct product verifies reducibility, despite no rational linear factor.",
      verdict: "reducible",
    },
    R: {
      equation: "(X²+1)(X²+2)",
      roots: "No real roots.",
      certificate: "Both positive quadratics are nonconstant real factors.",
      verdict: "reducible",
    },
    C: {
      equation: "(X−i)(X+i)(X−i√2)(X+i√2)",
      roots: "±i and ±i√2.",
      certificate: "Pair conjugate linear factors to recover X²+1 and X²+2.",
      verdict: "reducible",
    },
    F2: {
      equation: "X²(X+1)²",
      roots: "0 and 1, each double.",
      certificate: "Coefficient reduction gives X⁴+X²=X²(X²+1)=X²(X+1)².",
      verdict: "reducible",
    },
  },
  content: {
    Q: {
      equation: "2(X²+X+1)",
      roots: "No rational roots.",
      certificate:
        "Content is 2; primitive part X²+X+1 has discriminant −3 and is irreducible over ℚ. The nonzero scalar 2 is a unit in ℚ[X].",
      verdict: "irreducible",
    },
    R: {
      equation: "2(X²+X+1)",
      roots: "No real roots.",
      certificate:
        "Discriminant −3 excludes real roots; scalar 2 is a unit in ℝ[X].",
      verdict: "irreducible",
    },
    C: {
      equation: "2(X−ω)(X−ω²)",
      roots: "ω=(−1+i√3)/2 and ω²=(−1−i√3)/2.",
      certificate: "ω+ω²=−1 and ωω²=1 verify the primitive quadratic.",
      verdict: "reducible",
    },
    F2: {
      equation: "0",
      roots:
        "Every element is a root of the zero polynomial; multiplicity is undefined.",
      certificate:
        "All coefficients vanish modulo 2. The degree drops, so a reduction-mod-2 irreducibility test is invalid and inconclusive for the original polynomial.",
      verdict: "inconclusive",
    },
  },
};

export function polynomialReading(id: PolynomialCase, field: CoefficientField) {
  const polynomial = polynomialCases[id];
  const reading = readings[id][field];
  const content = polynomial.coefficients.reduce(integerGcd, 0);
  return { ...polynomial, ...reading, field: fieldLabels[field], content };
}
