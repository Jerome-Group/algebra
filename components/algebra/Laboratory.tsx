"use client";
import { type Lesson } from "@/lib/algebra/engine";
import { LinearQuotientLab, QuadraticQuotientLab } from "./Bridges";
import Cube from "./Cube";
import { GroupLab, PolygonLab, HomomorphismLab } from "./Groups";
import { RingLab, ProductLab, PolynomialLab, FieldLab } from "./Rings";
import {
  OrthogonalLab,
  PermutationLab,
  RepresentationLab,
  CharacterLab,
} from "./Representations";
import { StructureLab, ConjugationLab, ColoringLab } from "./Structure";
import {
  QuadraticLab,
  CyclicLab,
  MatrixFiniteLab,
  SylowCalculator,
  SemidirectLab,
  ModuleLab,
  SquareModesLab,
} from "./Advanced";
export default function Laboratory({ l }: { l: Lesson }) {
  if (l.machine === "linear-quotient") return <LinearQuotientLab />;
  if (l.machine === "quadratic-quotient") return <QuadraticQuotientLab />;
  if (l.id === "representations-actions-modules") return <Cube lesson={l} />;
  if (["m3220-modules", "m3220-submodules"].includes(l.id))
    return <ModuleLab />;
  if (
    ["representations-square-modes", "representations-maschke"].includes(l.id)
  )
    return <SquareModesLab />;
  if (l.id === "m3220-quadratic-integers") return <QuadraticLab />;
  if (l.id === "mh2220-finite-matrices") return <MatrixFiniteLab />;
  if (l.id === "mh2220-semidirect") return <SemidirectLab />;
  if (l.machine === "sylow")
    return (
      <>
        <SylowCalculator />
        <GroupLab lesson={l} />
      </>
    );
  if (/cyclic-eigenvalues|real-complex|orthogonal-axis-angle/.test(l.id))
    return <CyclicLab />;
  if (/conjugacy|p-groups|commutator|actions-regular-conjugation/.test(l.id))
    return <ConjugationLab />;
  if (/necklace|burnside$/.test(l.id) && !l.id.includes("cube"))
    return <ColoringLab />;
  if (l.id === "mh2220-units" || l.id === "mh2220-euler-fermat")
    return (
      <RingLab
        lesson={{
          ...l,
          parameters: { ...l.parameters, n: l.id.includes("euler") ? 10 : 8 },
        }}
      />
    );
  switch (l.machine) {
    case "cube":
    case "actions":
      return <Cube lesson={l} />;
    case "polygon":
      return <PolygonLab />;
    case "cayley":
    case "subgroups":
    case "cosets":
    case "sylow":
      return <GroupLab lesson={l} />;
    case "homomorphism":
      return <HomomorphismLab lesson={l} />;
    case "product":
      return <ProductLab lesson={l} />;
    case "permutation":
      return <PermutationLab />;
    case "orthogonal":
      return <OrthogonalLab />;
    case "representation":
      return <RepresentationLab lesson={l} />;
    case "characters":
      return <CharacterLab lesson={l} />;
    case "ring":
      return <RingLab lesson={l} />;
    case "polynomial":
      return <PolynomialLab lesson={l} />;
    case "field":
      return <FieldLab lesson={l} />;
    default:
      return <StructureLab lesson={l} />;
  }
}
