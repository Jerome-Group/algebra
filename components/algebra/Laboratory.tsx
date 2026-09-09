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
import { QuadraticLab } from "./QuadraticIntegers";
import { CyclicLab } from "./CyclicEigenvalues";
import { MatrixFiniteLab } from "./FiniteLinearGroups";
import { SylowCalculator } from "./SylowArithmetic";
import { SemidirectLab } from "./SemidirectProducts";
import { ModuleLab } from "./Modules";
import { SquareModesLab } from "./SquareModes";
import type { ComponentType } from "react";
import type { LaboratoryKind } from "@/lib/algebra/laboratory-types";
const laboratories: Record<
  LaboratoryKind,
  ComponentType<{ lesson: Lesson }>
> = {
  "linear-quotient": LinearQuotientLab,
  "quadratic-quotient": QuadraticQuotientLab,
  module: ModuleLab,
  "square-modes": SquareModesLab,
  "quadratic-integers": QuadraticLab,
  "finite-matrices": MatrixFiniteLab,
  semidirect: SemidirectLab,
  "cyclic-eigenvalues": CyclicLab,
  conjugation: ConjugationLab,
  coloring: ColoringLab,
  cube: Cube,
  actions: Cube,
  polygon: PolygonLab,
  cayley: GroupLab,
  subgroups: GroupLab,
  cosets: GroupLab,
  sylow: ({ lesson }) => (
    <>
      <SylowCalculator />
      <GroupLab lesson={lesson} />
    </>
  ),
  homomorphism: HomomorphismLab,
  product: ProductLab,
  permutation: PermutationLab,
  orthogonal: OrthogonalLab,
  representation: RepresentationLab,
  characters: CharacterLab,
  ring: RingLab,
  polynomial: PolynomialLab,
  field: FieldLab,
  diagram: StructureLab,
};
export default function Laboratory({ l }: { l: Lesson }) {
  const Component = laboratories[l.machine];
  if (!Component) throw Error(`Unknown laboratory: ${l.machine}`);
  return <Component lesson={l} />;
}
