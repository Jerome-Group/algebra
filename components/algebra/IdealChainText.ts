import { chainReading, type ChainExample } from "@/lib/algebra/ideal-chains";

export const chainContext: Record<ChainExample, string> = {
  integerAscending: String.raw`Infinite Noetherian ring $\mathbb Z$`,
  integerDescending: String.raw`Infinite Noetherian ring $\mathbb Z$`,
  infiniteVariables: String.raw`$F[X_1,X_2,\ldots]$`,
  finiteRing: String.raw`Finite ring $\mathbb Z/12\mathbb Z$`,
  primeChain: "Polynomial ring $F[X,Y]$ over a field",
};
const chainTheorem: Record<ChainExample, string> = {
  integerAscending: String.raw`Every ideal of $\mathbb Z$ is principal; ACC holds although $\mathbb Z$ is infinite.`,
  integerDescending: String.raw`$\mathbb Z$ is Noetherian but not Artinian: ACC and DCC are different conditions.`,
  infiniteVariables: String.raw`The union $(X_1,X_2,\ldots)$ has no finite generating set; Hilbert’s basis theorem applies to finitely many variables over a Noetherian base, not infinitely many.`,
  finiteRing: String.raw`A finite ring has ACC and DCC, but finite cardinality is sufficient, not necessary, for ACC. Chinese remaindering gives $\mathbb Z/12\mathbb Z\cong\mathbb Z/3\mathbb Z\times\mathbb Z/4\mathbb Z$; both factors are Artinian local rings (the first a field, the second with maximal ideal $(2)$).`,
  primeChain: String.raw`This chain gives dimension at least two. The upper bound $\dim F[X,Y]=2$ needs the polynomial-ring dimension theorem; this finite display alone does not prove it.`,
};
export function chainText(example: ChainExample, stage: number) {
  const reading = chainReading(example, stage);
  const generator = reading.generators[0];
  const ideal =
    example === "infiniteVariables"
      ? String.raw`(X_1,\ldots,X_{${stage}})`
      : example === "finiteRing"
        ? String.raw`(${generator})\text{ in }\mathbb Z/12\mathbb Z`
        : reading.ideal;
  const generators =
    example === "infiniteVariables"
      ? reading.generators.map((_, i) => `X_{${i + 1}}`)
      : reading.generators;
  const witness =
    example === "infiniteVariables"
      ? `$X_{${stage + 1}}$ is outside this ideal and enters the next.`
      : example === "integerAscending"
        ? stage < 4
          ? `$${chainReading(example, stage + 1).generators[0]}$ belongs to the next ideal but not $(${generator})$.`
          : String.raw`The displayed chain has stabilized at $(1)=\mathbb Z$.`
        : example === "integerDescending"
          ? `$${generator}$ is not in $(${2 ** (stage + 1)})$, so the next ideal is strictly smaller.`
          : example === "primeChain"
            ? stage === 1
              ? "$X$ is outside $(0)$; $F[X,Y]/(0)$ is a domain."
              : stage === 2
                ? String.raw`$Y$ is outside $(X)$; $F[X,Y]/(X)\cong F[Y]$ is a domain.`
                : "$(X,Y)$ is maximal because its quotient is $F$. The displayed prime chain ends here."
            : reading.witness;
  return {
    ...reading,
    ideal,
    generators,
    witness,
    theorem: chainTheorem[example],
  };
}
