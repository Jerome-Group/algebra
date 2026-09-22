import type { Lesson } from "@/lib/algebra/engine";
import { learningMetadata } from "@/lib/algebra/learning";
import { lessonCompletion } from "@/lib/algebra/progress";
import { useLearningProgress } from "./LearningProgress";
import { Checkpoint } from "./Checkpoint";
import { useRepresentationObject } from "./RepresentationObject";
import {
  dihedralCharacter,
  dihedralElements,
  dihedralIndex,
  dihedralMatrix,
  dihedralScalar,
  productCharacterLabel,
  productKernel,
} from "@/lib/algebra/direct-products";
import { capstoneAssessment } from "@/lib/algebra/progress";

export const representationRouteId = "route-ureca-representation-theory";

const stages = [
  {
    id: "representations-maschke",
    move: "Average a projection to make it equivariant; the group order is invertible over C.",
    anchor: "The D₈ square plane can be averaged over its eight motions.",
  },
  {
    id: "odyssey-schur",
    move: "An irreducible complex representation has only scalar equivariant endomorphisms.",
    anchor: "The central half-turn r² of D₈ acts as −I₂ on the square plane.",
  },
  {
    id: "representations-characters",
    move: "Take traces of the same matrices and retain the field and degree.",
    anchor: "The D₈ square character has χ(e)=2, χ(r)=0, χ(r²)=−2 and χ(s)=0.",
  },
  {
    id: "odyssey-character-table",
    move: "Weight the five D₈ conjugacy classes by sizes 1,1,2,2,2.",
    anchor: "For χ=(2,−2,0,0,0), ⟨χ,χ⟩=(4+4)/8=1.",
  },
  {
    id: "ureca-character-bound-kernel",
    move: "Separate scalar-image equality from the actual kernel test.",
    anchor: "The same r² has |χ|=2 but acts as −I₂, outside the kernel.",
  },
  {
    id: "ureca-external-tensor-products",
    move: "Let a second group act on a second complex space.",
    anchor:
      "Tensor the D₈ square plane with a Cₙ character line; the product still has degree two.",
  },
  {
    id: "ureca-direct-product-irreducibles",
    move: "Factor inner products and account for every squared degree.",
    anchor:
      "The D₈ degree-two row pairs with each C₃ character; all product rows total 24.",
  },
  {
    id: "ureca-product-kernel-scalar-matching",
    move: "Find reciprocal scalars rather than multiplying factor kernels.",
    anchor: "D₈ r² contributes −I₂; C₂ has a matching −1, while C₃ does not.",
  },
  {
    id: "ureca-faithful-direct-product",
    move: "Apply the exact finite complex center criterion.",
    anchor:
      "The C₂×D₈ product fails; the C₃×D₈ product is irreducible and faithful.",
  },
] as const;
export const representationJourneyIds = stages.map((stage) => stage.id);
export function RepresentationJourney({
  lessons,
  open,
}: {
  lessons: Lesson[];
  open: (id: string) => void;
}) {
  const { mastered } = useLearningProgress();
  const { element, setElement } = useRepresentationObject();
  const matrix = dihedralMatrix(element);
  const trace = dihedralCharacter(element);
  const capstone = capstoneAssessment(representationRouteId);
  const routeSteps = [
    `Decomposition lab: in the four-vertex permutation space, x=(1,0,−1,0) and y=(0,1,0,−1) span this square plane. The decomposition is 4=1+1+2; on the selected plane, ρ(${dihedralElements[element]}) = [${matrix.map((row) => row.join(", ")).join("; ")}].`,
    `Schur check: ${dihedralElements[element]} acts ${dihedralScalar(element) === null ? "non-scalarly" : `by ${dihedralScalar(element)}I₂`}; central r² acts by −I₂.`,
    `Character sample: χ(${dihedralElements[element]}) = tr ρ(${dihedralElements[element]}) = ${trace}.`,
    `The complete square-plane row (2, −2, 0, 0, 0) has norm (4+4)/8=1; the selected sample is ${trace}.`,
    `Bound sample: |χ(${dihedralElements[element]})|=${Math.abs(trace)}; ${element === 0 ? "kernel" : dihedralScalar(element) === null ? "strict bound" : "scalar equality outside the kernel"}.`,
    `Tensor sample with C₃ generator a: tr(π(a)⊗ρ(${dihedralElements[element]})) = ${productCharacterLabel(3, 1, element)}.`,
    `Each of the 3 cyclic character rows pairs with all 5 D₈ rows; 15 irreducibles and squared degrees sum to 24.`,
    `For the selected ${dihedralElements[element]}, a reciprocal scalar pair occurs only when its image matches the inverse cyclic scalar.`,
    `C₂×D₈ kernel size ${productKernel(2).length}; C₃×D₈ kernel size ${productKernel(3).length}.`,
  ];
  return (
    <section
      className="representation-journey"
      aria-labelledby="representation-journey-heading"
    >
      <p className="section-kicker">
        URECA Y2 · CONNECTED REPRESENTATION ROUTE
      </p>
      <h2 id="representation-journey-heading">
        One representation, nine proof moves
      </h2>
      <p>
        Carry the faithful complex two-dimensional D₈ square action through
        Maschke, Schur, characters, inner products, tables and direct products.
        D₈ has eight elements; matrices act on columns and products apply the
        right factor first. The early pages are worked illustrations; only
        authored guided checkpoints record competencies.
      </p>
      <p>
        <a href={`#${representationRouteId}`}>Direct link to this route</a> ·
        Shared D₈ square object is kept on this device as you open its labs.
      </p>
      <label>
        Same representation, selected element {dihedralElements[element]}
        <select
          value={element}
          onChange={(event) =>
            setElement(dihedralIndex(Number(event.target.value)))
          }
        >
          {dihedralElements.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <ol>
        {stages.map((stage, index) => {
          const lesson = lessons.find((item) => item.id === stage.id);
          if (!lesson) return null;
          const status = learningMetadata(lesson).teachingStatus;
          const completion = lessonCompletion(lesson, mastered);
          return (
            <li key={stage.id}>
              <h3>{lesson.navTitle || lesson.title}</h3>
              <p>{stage.move}</p>
              <p>
                <strong>Same object:</strong> {stage.anchor}
              </p>
              <p className="live-mathematics" aria-live="polite">
                <strong>Live step:</strong> {routeSteps[index]}
              </p>
              <p>
                {status.replaceAll("-", " ")}
                {completion.complete ? " · competencies demonstrated" : ""}
              </p>
              <button onClick={() => open(stage.id)}>Open this step</button>
            </li>
          );
        })}
      </ol>
      <p>
        <strong>Cumulative challenge:</strong> Prove every irreducible of Cₙ×D₈
        is external, then decide for n=2 and n=3 whether a faithful irreducible
        exists. Use factored inner products, the squared-degree count and
        reciprocal scalar kernels. Work the proof before submitting the
        checkpoint.
      </p>
      {capstone && (
        <Checkpoint
          competencyId="route:ureca-representation-theory"
          title="URECA route capstone"
          assessment={capstone}
        />
      )}
      <p role="status">
        Route capstone{" "}
        {mastered.has("route:ureca-representation-theory")
          ? "demonstrated"
          : "not yet demonstrated"}
        .
      </p>
    </section>
  );
}
