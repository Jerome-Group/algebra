"use client";
import { lazy, type ComponentType } from "react";
import { type Lesson } from "@/lib/algebra/engine";
import type { LaboratoryKind } from "@/lib/algebra/laboratory-types";
import { LaboratoryLoadBoundary } from "./LaboratoryLoadBoundary";
const LinearQuotientLab = lazy(() =>
  import("./Bridges").then((module) => ({ default: module.LinearQuotientLab })),
);
const QuadraticQuotientLab = lazy(() =>
  import("./Bridges").then((module) => ({
    default: module.QuadraticQuotientLab,
  })),
);
const Cube = lazy(() => import("./Cube"));
const GroupLab = lazy(() =>
  import("./Groups").then((module) => ({ default: module.GroupLab })),
);
const PolygonLab = lazy(() =>
  import("./Groups").then((module) => ({ default: module.PolygonLab })),
);
const HomomorphismLab = lazy(() =>
  import("./Groups").then((module) => ({ default: module.HomomorphismLab })),
);
const RingLab = lazy(() =>
  import("./Rings").then((module) => ({ default: module.RingLab })),
);
const ProductLab = lazy(() =>
  import("./Rings").then((module) => ({ default: module.ProductLab })),
);
const PolynomialLab = lazy(() =>
  import("./Rings").then((module) => ({ default: module.PolynomialLab })),
);
const FieldLab = lazy(() =>
  import("./Rings").then((module) => ({ default: module.FieldLab })),
);
const OrthogonalLab = lazy(() =>
  import("./Representations").then((module) => ({
    default: module.OrthogonalLab,
  })),
);
const PermutationLab = lazy(() =>
  import("./Representations").then((module) => ({
    default: module.PermutationLab,
  })),
);
const RepresentationLab = lazy(() =>
  import("./Representations").then((module) => ({
    default: module.RepresentationLab,
  })),
);
const CharacterLab = lazy(() =>
  import("./Representations").then((module) => ({
    default: module.CharacterLab,
  })),
);
const StructureLab = lazy(() =>
  import("./Structure").then((module) => ({ default: module.StructureLab })),
);
const ConjugationLab = lazy(() =>
  import("./Conjugation").then((module) => ({
    default: module.ConjugationLab,
  })),
);
const ColoringLab = lazy(() =>
  import("./Coloring").then((module) => ({ default: module.ColoringLab })),
);
const QuadraticLab = lazy(() =>
  import("./QuadraticIntegers").then((module) => ({
    default: module.QuadraticLab,
  })),
);
const CyclicLab = lazy(() =>
  import("./CyclicEigenvalues").then((module) => ({
    default: module.CyclicLab,
  })),
);
const MatrixFiniteLab = lazy(() =>
  import("./FiniteLinearGroups").then((module) => ({
    default: module.MatrixFiniteLab,
  })),
);
const SylowCalculator = lazy(() =>
  import("./SylowArithmetic").then((module) => ({
    default: module.SylowCalculator,
  })),
);
const SemidirectLab = lazy(() =>
  import("./SemidirectProducts").then((module) => ({
    default: module.SemidirectLab,
  })),
);
const ModuleLab = lazy(() =>
  import("./Modules").then((module) => ({ default: module.ModuleLab })),
);
const SquareModesLab = lazy(() =>
  import("./SquareModes").then((module) => ({
    default: module.SquareModesLab,
  })),
);
const AxisAngleLab = lazy(() =>
  import("./RotationLessons").then((module) => ({
    default: module.AxisAngleLab,
  })),
);
const PlaneRepresentationLab = lazy(() =>
  import("./RotationLessons").then((module) => ({
    default: module.PlaneRepresentationLab,
  })),
);
const FunctionFiberLab = lazy(() =>
  import("./FunctionFibers").then((module) => ({
    default: module.FunctionFiberLab,
  })),
);
const OperationChecker = lazy(() =>
  import("./OperationChecker").then((module) => ({
    default: module.OperationChecker,
  })),
);
const CayleyReachability = lazy(() =>
  import("./CayleyReachability").then((module) => ({
    default: module.CayleyReachability,
  })),
);
const GeneratorRelationLab = lazy(() =>
  import("./CayleyRelations").then((module) => ({
    default: module.GeneratorRelationLab,
  })),
);
const CayleyEmbeddingLab = lazy(() =>
  import("./CayleyEmbedding").then((module) => ({
    default: module.CayleyEmbeddingLab,
  })),
);
const CosetConstructor = lazy(() =>
  import("./CosetConstructor").then((module) => ({
    default: module.CosetConstructor,
  })),
);
const OrbitWorkbench = lazy(() =>
  import("./OrbitWorkbench").then((module) => ({
    default: module.OrbitWorkbench,
  })),
);
const UrecaDirectProducts = lazy(() =>
  import("./UrecaDirectProducts").then((module) => ({
    default: module.UrecaDirectProducts,
  })),
);
const ModulePresentation = lazy(() =>
  import("./ModulePresentation").then((module) => ({
    default: module.ModulePresentation,
  })),
);
const FixedColoringLab = lazy(() =>
  import("./FixedColoringLab").then((module) => ({
    default: module.FixedColoringLab,
  })),
);
const MetricOrientationLab = lazy(() =>
  import("./OrthogonalGeometry").then((module) => ({
    default: module.MetricOrientationLab,
  })),
);
const PlaneReflectionLab = lazy(() =>
  import("./OrthogonalGeometry").then((module) => ({
    default: module.PlaneReflectionLab,
  })),
);
const SylowWorkbench = lazy(() =>
  import("./SylowWorkbench").then((module) => ({
    default: module.SylowWorkbench,
  })),
);
const IdealQuotientLattice = lazy(() =>
  import("./IdealQuotientLattice").then((module) => ({
    default: module.IdealQuotientLattice,
  })),
);
const PolynomialFactorisation = lazy(() =>
  import("./PolynomialFactorisation").then((module) => ({
    default: module.PolynomialFactorisation,
  })),
);
const LocalisationMicroscope = lazy(() =>
  import("./LocalisationMicroscope").then((module) => ({
    default: module.LocalisationMicroscope,
  })),
);
const IdealChainExplorer = lazy(() =>
  import("./IdealChainExplorer").then((module) => ({
    default: module.IdealChainExplorer,
  })),
);
const ModuleActionBoard = lazy(() =>
  import("./ModuleActionBoard").then((module) => ({
    default: module.ModuleActionBoard,
  })),
);
const TensorBalancingLab = lazy(() =>
  import("./TensorBalancingLab").then((module) => ({
    default: module.TensorBalancingLab,
  })),
);
const InductionReciprocityLab = lazy(() =>
  import("./InductionReciprocityLab").then((module) => ({
    default: module.InductionReciprocityLab,
  })),
);
const WedderburnLayerLab = lazy(() =>
  import("./WedderburnLayerLab").then((module) => ({
    default: module.WedderburnLayerLab,
  })),
);
const InvariantIntertwinerLab = lazy(() =>
  import("./InvariantIntertwinerLab").then((module) => ({
    default: module.InvariantIntertwinerLab,
  })),
);
const CharacterConstruction = lazy(() =>
  import("./CharacterConstruction").then((module) => ({
    default: module.CharacterConstruction,
  })),
);
const BurnsideClassLab = lazy(() =>
  import("./BurnsideClassLab").then((module) => ({
    default: module.BurnsideClassLab,
  })),
);
const NilradicalLab = lazy(() =>
  import("./NilradicalLab").then((module) => ({
    default: module.NilradicalLab,
  })),
);
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
  "module-action-board": ModuleActionBoard,
  "tensor-balancing": TensorBalancingLab,
  "induction-reciprocity": InductionReciprocityLab,
  "wedderburn-layers": WedderburnLayerLab,
  "invariant-intertwiner": InvariantIntertwinerLab,
  "character-construction": CharacterConstruction,
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
  ring: ({ lesson }) =>
    lesson.id === "m3220-nilradical" ? (
      <NilradicalLab />
    ) : (
      <RingLab lesson={lesson} />
    ),
  polynomial: PolynomialLab,
  field: FieldLab,
  diagram: ({ lesson }) =>
    lesson.id === "characters-burnside" ? (
      <BurnsideClassLab />
    ) : (
      <StructureLab lesson={lesson} />
    ),
};
export default function Laboratory({ l }: { l: Lesson }) {
  const Component = laboratories[l.machine];
  if (!Component) throw Error(`Unknown laboratory: ${l.machine}`);
  return (
    <LaboratoryLoadBoundary key={l.id} title={l.title}>
      <Component lesson={l} />
    </LaboratoryLoadBoundary>
  );
}
