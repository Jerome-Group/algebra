import type {
  CoefficientField,
  PolynomialCase,
} from "@/lib/algebra/polynomial-factorisation";

export const fieldTex: Record<CoefficientField, string> = {
  Q: String.raw`\mathbb Q`,
  R: String.raw`\mathbb R`,
  C: String.raw`\mathbb C`,
  F2: String.raw`\mathbb F_2`,
};
export const polynomialTex: Record<PolynomialCase, string> = {
  quadratic: "X^2+1",
  shifted: "X^4+1",
  rootless: "X^4+3X^2+2",
  content: "2X^2+2X+2",
};
export const polynomialReadings: Record<
  PolynomialCase,
  Record<
    CoefficientField,
    { equation: string; roots: string; certificate: string }
  >
> = {
  quadratic: {
    Q: {
      equation: "X^2+1",
      roots: "No rational roots.",
      certificate: String.raw`Degree two over $\mathbb Q$: no rational root, so irreducible.`,
    },
    R: {
      equation: "X^2+1",
      roots: "No real roots.",
      certificate:
        "$X^2+1>0$ for every real $X$; a real quadratic without roots is irreducible.",
    },
    C: {
      equation: "(X-i)(X+i)",
      roots: "$i$ and $-i$.",
      certificate: "Direct multiplication verifies the two linear factors.",
    },
    F2: {
      equation: "(X+1)^2",
      roots: "$1$, with multiplicity two.",
      certificate: "In characteristic two, $(X+1)^2=X^2+1$.",
    },
  },
  shifted: {
    Q: {
      equation: "X^4+1",
      roots: "No rational roots.",
      certificate:
        "$(X+1)^4+1=X^4+4X^3+6X^2+4X+2$ is Eisenstein at $2$; translation preserves irreducibility.",
    },
    R: {
      equation: String.raw`(X^2+\sqrt2 X+1)(X^2-\sqrt2 X+1)`,
      roots: "No real roots.",
      certificate:
        "Multiply the quadratic factors: $(X^2+1)^2-2X^2=X^4+1$. Each has discriminant $-2$.",
    },
    C: {
      equation: String.raw`\prod_{k=0}^3(X-e^{(2k+1)\pi i/4})`,
      roots: String.raw`$e^{\pi i/4}$, $e^{3\pi i/4}$, $e^{5\pi i/4}$, $e^{7\pi i/4}$.`,
      certificate:
        "Each listed fourth root has fourth power $-1$; monic degree four gives the product.",
    },
    F2: {
      equation: "(X+1)^4",
      roots: "$1$, with multiplicity four.",
      certificate: "In characteristic two, $(X+1)^4=X^4+1$.",
    },
  },
  rootless: {
    Q: {
      equation: "(X^2+1)(X^2+2)",
      roots: "No rational roots.",
      certificate:
        "Direct product verifies reducibility, despite no rational linear factor.",
    },
    R: {
      equation: "(X^2+1)(X^2+2)",
      roots: "No real roots.",
      certificate: "Both positive quadratics are nonconstant real factors.",
    },
    C: {
      equation: String.raw`(X-i)(X+i)(X-i\sqrt2)(X+i\sqrt2)`,
      roots: String.raw`$\pm i$ and $\pm i\sqrt2$.`,
      certificate:
        "Pair conjugate linear factors to recover $X^2+1$ and $X^2+2$.",
    },
    F2: {
      equation: "X^2(X+1)^2",
      roots: "$0$ and $1$, each double.",
      certificate:
        "Coefficient reduction gives $X^4+X^2=X^2(X^2+1)=X^2(X+1)^2$.",
    },
  },
  content: {
    Q: {
      equation: "2(X^2+X+1)",
      roots: "No rational roots.",
      certificate: String.raw`Content is $2$; primitive part $X^2+X+1$ has discriminant $-3$ and is irreducible over $\mathbb Q$. The nonzero scalar $2$ is a unit in $\mathbb Q[X]$.`,
    },
    R: {
      equation: "2(X^2+X+1)",
      roots: "No real roots.",
      certificate: String.raw`Discriminant $-3$ excludes real roots; scalar $2$ is a unit in $\mathbb R[X]$.`,
    },
    C: {
      equation: String.raw`2(X-\omega)(X-\omega^2)`,
      roots: String.raw`$\omega=(-1+i\sqrt3)/2$ and $\omega^2=(-1-i\sqrt3)/2$.`,
      certificate: String.raw`$\omega+\omega^2=-1$ and $\omega\omega^2=1$ verify the primitive quadratic.`,
    },
    F2: {
      equation: "0",
      roots:
        "Every element is a root of the zero polynomial; multiplicity is undefined.",
      certificate:
        "All coefficients vanish modulo $2$. The degree drops, so a reduction-mod-$2$ irreducibility test is invalid and inconclusive for the original polynomial.",
    },
  },
};
