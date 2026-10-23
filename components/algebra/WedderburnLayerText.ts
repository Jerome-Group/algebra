import type {
  AlgebraChoice,
  FieldChoice,
} from "@/lib/algebra/wedderburn-layers";

const layers = {
  matrix: {
    quotient: "M_2(F)",
    blocks: "One simple block $M_2(F)$",
    simples: "One simple left module $F^2$ of $F$-dimension $2$",
    regular: String.raw`The left regular module $M_2(F)\cong F^2\oplus F^2$; multiplicity $2$, not $1$`,
    naturalModule: String.raw`$F^2$ is simple; $\operatorname{soc}(F^2)=F^2$ and $\operatorname{rad}(F^2)=0$`,
    failure:
      "Block dimension $4$ is not the dimension of its simple module: that dimension is $2$",
  },
  triangular: {
    quotient: String.raw`F\times F`,
    blocks:
      "The semisimple quotient has two one-dimensional blocks; $A$ itself is not their direct product",
    simples: "Two simple one-dimensional diagonal modules $S_1$ and $S_2$",
    regular:
      "The natural module $V=F^2$ has submodule $Fe_1$ and quotient $S_2$",
    naturalModule: String.raw`$JV=Fe_1=\operatorname{soc}(V)=\operatorname{rad}(V)$; $V/Fe_1\cong S_2$; $0\to S_1\to V\to S_2\to0$ is nonsplit`,
    failure:
      "$E_{12}e_2=e_1$, so no line complement to $Fe_1$ is stable under all of $T_2(F)$",
  },
  groupQ: {
    quotient: String.raw`F\times F`,
    blocks: String.raw`$F[C_2]\cong F\times F$ via $a+bg\mapsto(a+b,a-b)$`,
    simples: "Two simple one-dimensional modules, trivial and sign",
    regular: String.raw`Regular module is $\mathrm{trivial}\oplus\mathrm{sign}$, multiplicity $1$ each`,
    naturalModule: String.raw`$J=0$; idempotents $(1\pm g)/2$ split the algebra`,
    failure:
      "Changing to characteristic $2$ makes $1/2$ unavailable and merges the two idempotents",
  },
  groupF2: {
    quotient: "F",
    blocks: String.raw`$\mathbb F_2[C_2]\cong\mathbb F_2[\varepsilon]/(\varepsilon^2)$, $\varepsilon=g+1$`,
    simples: "One simple one-dimensional trivial module",
    regular:
      "Regular module has two trivial composition factors but does not split",
    naturalModule: String.raw`$J=(g+1)$, $J^2=0$; $A/J\cong\mathbb F_2$`,
    failure: String.raw`The regular $\mathbb F_2[C_2]$-module has semisimple layers but is not semisimple`,
  },
};
export const wedderburnText = (algebra: AlgebraChoice, field: FieldChoice) =>
  algebra === "group-c2"
    ? layers[field === "Q" ? "groupQ" : "groupF2"]
    : layers[algebra];
