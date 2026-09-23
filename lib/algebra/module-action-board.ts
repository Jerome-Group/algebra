import { cyclicModule, integerGcd, residue } from "./foundation-labs";

export const moduleStages = [
  "action",
  "presentation",
  "submodule",
  "exactness",
] as const;
export type ModuleStage = (typeof moduleStages)[number];

export function moduleBoard(
  modulus: number,
  scalar: number,
  submoduleGenerator: number,
  vector: number,
) {
  if (!Number.isInteger(modulus) || modulus < 2 || modulus > 12)
    throw new RangeError("Use a modulus from 2 to 12");
  if (
    !Number.isInteger(scalar) ||
    !Number.isInteger(vector) ||
    vector < 0 ||
    vector >= modulus
  )
    throw new RangeError("Use an integer scalar and module vector");
  if (
    !Number.isInteger(submoduleGenerator) ||
    modulus % submoduleGenerator !== 0
  )
    throw new RangeError("Submodule generator must divide the modulus");
  const action = cyclicModule(modulus, scalar);
  const submodule = Array.from(
    { length: modulus / submoduleGenerator },
    (_, k) => k * submoduleGenerator,
  );
  const quotient = Array.from({ length: submoduleGenerator }, (_, k) => k);
  const quotientAction = quotient.map((element) =>
    residue(scalar * element, submoduleGenerator),
  );
  const vectorAnnihilator = modulus / integerGcd(modulus, vector);
  return {
    modulus,
    scalar,
    vector,
    action,
    submoduleGenerator,
    submodule,
    quotient,
    quotientAction,
    vectorAnnihilator,
    moduleAnnihilator: modulus,
    regularModuleInvertible: Math.abs(scalar) === 1,
    imageQuotientSize: modulus / action.kernel.length,
    cokernelSize: modulus / action.image.length,
    operatorExample: {
      invariantLine: "ℚe₁ is stable under T=diag(2,1)",
      failedLine: "ℚ(e₁+e₂) is not stable: T(e₁+e₂)=2e₁+e₂",
      moduleMap:
        "For T=diag(2,1) on M=ℚ² and X acting as 2 on N=ℚ, p(a,b)=a is ℚ[X]-linear: p(T(a,b))=2a=X·p(a,b). Its kernel is ℚe₂, its image is ℚ, and M/ℚe₂≅ℚ as ℚ[X]-modules.",
    },
  };
}
