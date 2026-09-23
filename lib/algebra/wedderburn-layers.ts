export type AlgebraChoice = "matrix" | "triangular" | "group-c2";
export type FieldChoice = "Q" | "F2";

export function matrixUnitProduct(i: 1 | 2, j: 1 | 2, k: 1 | 2, l: 1 | 2) {
  return j === k ? `E${i}${l}` : "0";
}

export function wedderburnLayers(algebra: AlgebraChoice, field: FieldChoice) {
  const finiteDimensionalUnital = true;
  if (algebra === "matrix")
    return {
      algebra,
      field,
      finiteDimensionalUnital,
      dimension: 4,
      radicalDimension: 0,
      quotient: "M₂(F)",
      blocks: "One simple block M₂(F)",
      simples: "One simple left module F² of F-dimension 2",
      regular: "The left regular module M₂(F)≅F²⊕F²; multiplicity 2, not 1",
      naturalModule: "F² is simple; socle(F²)=F² and rad(F²)=0",
      failure:
        "Block dimension 4 is not the dimension of its simple module: that dimension is 2",
      semisimple: true,
    };
  if (algebra === "triangular")
    return {
      algebra,
      field,
      finiteDimensionalUnital,
      dimension: 3,
      radicalDimension: 1,
      quotient: "F×F",
      blocks:
        "The semisimple quotient has two one-dimensional blocks; A itself is not their direct product",
      simples: "Two simple one-dimensional diagonal modules S₁ and S₂",
      regular: "The natural module V=F² has submodule Fe₁ and quotient S₂",
      naturalModule: "JV=Fe₁=soc(V)=rad(V); V/Fe₁≅S₂; 0→S₁→V→S₂→0 is nonsplit",
      failure:
        "E₁₂e₂=e₁, so no line complement to Fe₁ is stable under all of T₂(F)",
      semisimple: false,
    };
  const odd = field === "Q";
  return {
    algebra,
    field,
    finiteDimensionalUnital,
    dimension: 2,
    radicalDimension: odd ? 0 : 1,
    quotient: odd ? "F×F" : "F",
    blocks: odd ? "F[C₂]≅F×F via a+bg↦(a+b,a−b)" : "F₂[C₂]≅F₂[ε]/(ε²), ε=g+1",
    simples: odd
      ? "Two simple one-dimensional modules, trivial and sign"
      : "One simple one-dimensional trivial module",
    regular: odd
      ? "Regular module is trivial⊕sign, multiplicity 1 each"
      : "Regular module has two trivial composition factors but does not split",
    naturalModule: odd
      ? "J=0; idempotents (1±g)/2 split the algebra"
      : "J=(g+1), J²=0; A/J≅F₂",
    failure: odd
      ? "Changing to characteristic 2 makes 1/2 unavailable and merges the two idempotents"
      : "The regular F₂[C₂]-module has semisimple layers but is not semisimple",
    semisimple: odd,
  };
}
