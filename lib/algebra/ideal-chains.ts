export type ChainExample =
  | "integerAscending"
  | "infiniteVariables"
  | "integerDescending"
  | "finiteRing"
  | "primeChain";
export const chainExamples: Record<
  ChainExample,
  { label: string; context: string; condition: string }
> = {
  integerAscending: {
    label: "Ascending ideals in ℤ",
    context: "Infinite Noetherian ring ℤ",
    condition: "ACC holds",
  },
  infiniteVariables: {
    label: "Fresh-variable ideals",
    context: "F[X₁,X₂,…]",
    condition: "ACC fails",
  },
  integerDescending: {
    label: "Descending ideals in ℤ",
    context: "Infinite Noetherian ring ℤ",
    condition: "DCC fails",
  },
  finiteRing: {
    label: "Ideals in ℤ/12ℤ",
    context: "Finite ring ℤ/12ℤ",
    condition: "ACC and DCC hold",
  },
  primeChain: {
    label: "Prime ideals in F[X,Y]",
    context: "Polynomial ring F[X,Y] over a field",
    condition:
      "Displayed prime chain has length two; an upper bound needs a dimension theorem",
  },
};

export function chainReading(example: ChainExample, stage: number) {
  if (!Number.isInteger(stage) || stage < 1 || stage > 6)
    throw new RangeError("Stage must be 1–6");
  if (example === "integerAscending") {
    const generators = [12, 6, 3, 1];
    const generator = generators[Math.min(stage - 1, 3)];
    return {
      ideal: `(${generator})`,
      witness:
        stage < 4
          ? `${generators[stage]} belongs to the next ideal but not (${generator}).`
          : "The displayed chain has stabilized at (1)=ℤ.",
      generators: [generator.toString()],
      stable: stage >= 4,
      theorem:
        "Every ideal of ℤ is principal; ACC holds although ℤ is infinite.",
    };
  }
  if (example === "infiniteVariables")
    return {
      ideal: `(X₁,…,X${stage})`,
      witness: `X${stage + 1} is outside this ideal and enters the next.`,
      generators: Array.from({ length: stage }, (_, i) => `X${i + 1}`),
      stable: false,
      theorem:
        "The union (X₁,X₂,…) has no finite generating set; Hilbert’s basis theorem applies to finitely many variables over a Noetherian base, not infinitely many.",
    };
  if (example === "integerDescending")
    return {
      ideal: `(${2 ** stage})`,
      witness: `${2 ** stage} is not in (${2 ** (stage + 1)}), so the next ideal is strictly smaller.`,
      generators: [(2 ** stage).toString()],
      stable: false,
      theorem:
        "ℤ is Noetherian but not Artinian: ACC and DCC are different conditions.",
    };
  if (example === "primeChain") {
    const ideals = ["(0)", "(X)", "(X,Y)"];
    const generators = [[], ["X"], ["X", "Y"]];
    const index = Math.min(stage - 1, 2);
    return {
      ideal: ideals[index],
      witness:
        stage === 1
          ? "X is outside (0); F[X,Y]/(0) is a domain."
          : stage === 2
            ? "Y is outside (X); F[X,Y]/(X)≅F[Y] is a domain."
            : "(X,Y) is maximal because its quotient is F. The displayed prime chain ends here.",
      generators: generators[index],
      stable: stage >= 3,
      theorem:
        "This chain gives dimension at least two. The upper bound dim F[X,Y]=2 needs the polynomial-ring dimension theorem; this finite display alone does not prove it.",
    };
  }
  const generators = [0, 6, 2, 1];
  const generator = generators[Math.min(stage - 1, 3)];
  return {
    ideal: `(${generator}) in ℤ/12ℤ`,
    witness:
      stage < 4
        ? "The next displayed ideal strictly contains this one."
        : "This displayed chain has stabilized at the whole ring.",
    generators: [generator.toString()],
    stable: stage >= 4,
    theorem:
      "A finite ring has ACC and DCC, but finite cardinality is sufficient, not necessary, for ACC. Chinese remaindering gives ℤ/12ℤ≅ℤ/3ℤ×ℤ/4ℤ; both factors are Artinian local rings (the first a field, the second with maximal ideal (2)).",
  };
}
