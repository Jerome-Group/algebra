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
import { StructureLab } from "./Structure";
import { ConjugationLab } from "./Conjugation";
import { ColoringLab } from "./Coloring";
import { QuadraticLab } from "./QuadraticIntegers";
import { CyclicLab } from "./CyclicEigenvalues";
import { MatrixFiniteLab } from "./FiniteLinearGroups";
import { SylowCalculator } from "./SylowArithmetic";
import { SemidirectLab } from "./SemidirectProducts";
import { ModuleLab } from "./Modules";
import { SquareModesLab } from "./SquareModes";
import { AxisAngleLab, PlaneRepresentationLab } from "./RotationLessons";
import type { ComponentType } from "react";
import type { LaboratoryKind } from "@/lib/algebra/laboratory-types";
import { FunctionFiberLab } from "./FunctionFibers";
import { OperationChecker } from "./OperationChecker";
import { CayleyReachability } from "./CayleyReachability";
import { GeneratorRelationLab } from "./CayleyRelations";
import { CayleyEmbeddingLab } from "./CayleyEmbedding";
import { CosetConstructor } from "./CosetConstructor";
import { OrbitWorkbench } from "./OrbitWorkbench";
import { UrecaDirectProducts } from "./UrecaDirectProducts";
import { ModulePresentation } from "./ModulePresentation";
import { FixedColoringLab } from "./FixedColoringLab";
import { MetricOrientationLab, PlaneReflectionLab } from "./OrthogonalGeometry";
import { SylowWorkbench } from "./SylowWorkbench";
import { IdealQuotientLattice } from "./IdealQuotientLattice";
import { PolynomialFactorisation } from "./PolynomialFactorisation";
import { LocalisationMicroscope } from "./LocalisationMicroscope";
import { IdealChainExplorer } from "./IdealChainExplorer";
const laboratories: Record<
  LaboratoryKind,
  ComponentType<{ lesson: Lesson }>
> = {
  "fixed-colorings": FixedColoringLab,
  "ureca-direct-products": UrecaDirectProducts,
  "function-fibers": FunctionFiberLab,
  "operation-checker": OperationChecker,
  "cayley-reachability": ({ lesson }) =>
    lesson.id === "mh2220-generators" ? (
      <GeneratorRelationLab lesson={lesson} />
    ) : (
      <CayleyReachability lesson={lesson} />
    ),
  "cayley-embedding": CayleyEmbeddingLab,
  "coset-constructor": CosetConstructor,
  "orbit-workbench": OrbitWorkbench,
  "ideal-quotient-lattice": IdealQuotientLattice,
  "polynomial-factorisation": PolynomialFactorisation,
  "localisation-microscope": LocalisationMicroscope,
  "ideal-chain-explorer": IdealChainExplorer,
  "module-presentation": ModulePresentation,
  "axis-angle": AxisAngleLab,
  "plane-representation": PlaneRepresentationLab,
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
  sylow: ({ lesson }) =>
    lesson.id.startsWith("mh2220-sylow-") ? (
      <SylowWorkbench lesson={lesson} />
    ) : (
      <>
        <SylowCalculator />
        <GroupLab lesson={lesson} />
      </>
    ),
  homomorphism: HomomorphismLab,
  product: ProductLab,
  permutation: PermutationLab,
  orthogonal: ({ lesson }) =>
    lesson.id === "orthogonal-plane" ? (
      <PlaneReflectionLab />
    ) : lesson.id === "orthogonal-metric-orientation" ? (
      <MetricOrientationLab />
    ) : (
      <OrthogonalLab lesson={lesson} />
    ),
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
