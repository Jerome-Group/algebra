import { dihedralElementSpeech } from "./ChoiceSpeech";
import { Choice } from "./Groups";
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

import { Math as M, Prose } from "./Math";
import { matrixTex } from "@/lib/algebra/engine";
import { dihedralTex, characterValueTex } from "./RepresentationTex";

export const representationRouteId = "route-ureca-representation-theory";

const stages = [
  {
    id: "representations-maschke",
    move: String.raw`Average a projection to make it equivariant; the group order is invertible over $\mathbb C$.`,
    anchor: String.raw`The $D_8$ square plane can be averaged over its eight motions.`,
  },
  {
    id: "odyssey-schur",
    move: "An irreducible complex representation has only scalar equivariant endomorphisms.",
    anchor: String.raw`The central half-turn $r^2$ of $D_8$ acts as $-I_2$ on the square plane.`,
  },
  {
    id: "representations-characters",
    move: "Take traces of the same matrices and retain the field and degree.",
    anchor: String.raw`The $D_8$ square character has $\chi(e)=2$, $\chi(r)=0$, $\chi(r^2)=-2$ and $\chi(s)=0$.`,
  },
  {
    id: "odyssey-character-table",
    move: String.raw`Weight the five $D_8$ conjugacy classes by sizes $1,1,2,2,2$.`,
    anchor: String.raw`For $\chi=(2,-2,0,0,0)$, $\langle\chi,\chi\rangle=(4+4)/8=1$.`,
  },
  {
    id: "ureca-character-bound-kernel",
    move: "Separate scalar-image equality from the actual kernel test.",
    anchor: String.raw`The same $r^2$ has $|\chi|=2$ but acts as $-I_2$, outside the kernel.`,
  },
  {
    id: "ureca-external-tensor-products",
    move: "Let a second group act on a second complex space.",
    anchor: String.raw`Tensor the $D_8$ square plane with a $C_n$ character line; the product still has degree two.`,
  },
  {
    id: "ureca-direct-product-irreducibles",
    move: "Factor inner products and account for every squared degree.",
    anchor: String.raw`The $D_8$ degree-two row pairs with each $C_3$ character; all product rows total $24$.`,
  },
  {
    id: "ureca-product-kernel-scalar-matching",
    move: "Find reciprocal scalars rather than multiplying factor kernels.",
    anchor: String.raw`$D_8$ $r^2$ contributes $-I_2$; $C_2$ has a matching $-1$, while $C_3$ does not.`,
  },
  {
    id: "ureca-faithful-direct-product",
    move: "Apply the exact finite complex center criterion.",
    anchor: String.raw`The $C_2\times D_8$ product fails; the $C_3\times D_8$ product is irreducible and faithful.`,
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
    String.raw`Decomposition lab: in the four-vertex permutation space, $x=(1,0,-1,0)$ and $y=(0,1,0,-1)$ span this square plane. The decomposition is $4=1+1+2$; on the selected plane, $\rho(${dihedralTex[element]})=${matrixTex(matrix)}$.`,
    String.raw`Schur check: $${dihedralTex[element]}$ acts ${dihedralScalar(element) === null ? "non-scalarly" : `by $${dihedralScalar(element)}I_2$`}; central $r^2$ acts by $-I_2$.`,
    String.raw`Character sample: $\chi(${dihedralTex[element]})=\operatorname{tr}\rho(${dihedralTex[element]})=${trace}$.`,
    String.raw`The complete square-plane row $(2,-2,0,0,0)$ has norm $(4+4)/8=1$; the selected sample is $${trace}$.`,
    String.raw`Bound sample: $|\chi(${dihedralTex[element]})|=${Math.abs(trace)}$; ${element === 0 ? "kernel" : dihedralScalar(element) === null ? "strict bound" : "scalar equality outside the kernel"}.`,
    String.raw`Tensor sample with $C_3$ generator $a$: $\operatorname{tr}(\pi(a)\otimes\rho(${dihedralTex[element]}))=${characterValueTex[productCharacterLabel(3, 1, element)]}$.`,
    "Each of the $3$ cyclic character rows pairs with all $5$ $D_8$ rows; $15$ irreducibles and squared degrees sum to $24$.",
    `For the selected $${dihedralTex[element]}$, a reciprocal scalar pair occurs only when its image matches the inverse cyclic scalar.`,
    String.raw`$C_2\times D_8$ kernel size $${productKernel(2).length}$; $C_3\times D_8$ kernel size $${productKernel(3).length}$.`,
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
        <Prose>{String.raw`Carry the faithful complex two-dimensional $D_8$ square action through Maschke, Schur, characters, inner products, tables and direct products. $D_8$ has eight elements; matrices act on columns and products apply the right factor first. Each step has guided teaching and diagnostic checkpoints. Demonstrated competencies contribute to progress.`}</Prose>
      </p>
      <p>
        <a href={`#${representationRouteId}`}>Direct link to this route</a> ·
        The shared <Prose>{"$D_8$"}</Prose> square object follows you through
        its labs. Sign in to save your selection across devices; guest
        selections last this session.
      </p>
      <label>
        Same representation, selected element{" "}
        <M focusable={false}>{dihedralTex[element]}</M>
        <Choice
          label={`Same representation, selected element ${dihedralElements[element]}`}
          value={element}
          onChange={(value) => setElement(dihedralIndex(value))}
          options={dihedralElements.map((name, index) => ({
            value: index,
            presentation: `$${dihedralTex[index]}$`,
            speech: dihedralElementSpeech(index, 4),
          }))}
        />
      </label>
      <ol>
        {stages.map((stage, index) => {
          const lesson = lessons.find((item) => item.id === stage.id);
          if (!lesson) return null;
          const status = learningMetadata(lesson).teachingStatus;
          const completion = lessonCompletion(lesson, mastered);
          return (
            <li key={stage.id}>
              <h3>
                <Prose>{lesson.navTitle || lesson.title}</Prose>
              </h3>
              <p>
                <Prose>{stage.move}</Prose>
              </p>
              <p>
                <strong>Same object:</strong> <Prose>{stage.anchor}</Prose>
              </p>
              <p className="live-mathematics" aria-live="polite">
                <strong>Live step:</strong> <Prose>{routeSteps[index]}</Prose>
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
        <Prose>{String.raw`Cumulative challenge: Prove every irreducible of $C_n\times D_8$ is external, then decide for $n=2$ and $n=3$ whether a faithful irreducible exists. Use factored inner products, the squared-degree count and reciprocal scalar kernels. Work the proof before submitting the checkpoint.`}</Prose>
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
