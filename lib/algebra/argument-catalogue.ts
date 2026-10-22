import lessons from "./lessons.json" with { type: "json" };
import metadata from "./learning-metadata.json" with { type: "json" };
import guided from "./guided-lessons.json" with { type: "json" };
import units from "./units.json" with { type: "json" };
import type { TeachingEdition } from "./argument-records";
import type { Lesson } from "./engine";

export type ArgumentTarget = (typeof lessons)[number];
export type ArgumentPassage = {
  lessonId: string;
  label: string;
  text: string;
  proofIndex: number | null;
};
export type ArgumentSearchResult = {
  target: ArgumentTarget;
  passage: ArgumentPassage;
};

const targets = new Map(lessons.map((lesson) => [lesson.id, lesson]));
const learning = new Map(Object.entries(metadata));
const teaching = new Map(Object.entries(guided));
const readerLessons = lessons as Lesson[];

export function currentArgumentLesson(id: string): Lesson | undefined {
  return readerLessons.find(
    (lesson) => lesson.id === id || lesson.aliases?.includes(id),
  );
}

export function argumentTarget(id: string) {
  return (
    targets.get(id) ?? lessons.find((lesson) => lesson.aliases?.includes(id))
  );
}

export const curriculumSubjects: string[] = [
  ...new Set(lessons.map((lesson) => lesson.subject)),
];

export const argumentSubjects = curriculumSubjects.map((subject, index) => ({
  name: subject,
  number: index + 1,
  families: [
    ...new Set(
      lessons
        .filter((lesson) => lesson.subject === subject)
        .map((lesson) => lesson.family),
    ),
  ].map((family) => ({
    name: family,
    lessons: lessons.filter(
      (lesson) => lesson.subject === subject && lesson.family === family,
    ),
  })),
}));

export function argumentPrerequisites(id: string): ArgumentTarget[] {
  return (learning.get(id)?.prerequisites ?? []).flatMap((id) => {
    const target = targets.get(id);
    return target ? [target] : [];
  });
}

export function argumentUnits(id: string) {
  return units.filter((unit) => unit.lessons.includes(id));
}

export function argumentEvidence(
  id: string,
  demonstrated: ReadonlySet<string>,
) {
  const competencies = learning.get(id)?.competencies ?? [];
  return {
    count: competencies.filter((competency) => demonstrated.has(competency.id))
      .length,
    total: competencies.length,
  };
}

export function argumentPassages(id: string): ArgumentPassage[] {
  const lesson = targets.get(id);
  if (!lesson) return [];
  const guide = teaching.get(id);
  const passage = (
    label: string,
    text: string,
    proofIndex: number | null = null,
  ): ArgumentPassage => ({
    lessonId: id,
    label,
    text,
    proofIndex,
  });
  return [
    passage("Idea", lesson.intuition),
    passage("Definition", lesson.definition),
    passage("Statement", lesson.theorem),
    passage("Explanation", lesson.explanation),
    passage("Reference proof", lesson.proof),
    passage("Hypotheses", lesson.pitfall),
    ...(lesson.conventions ? [passage("Conventions", lesson.conventions)] : []),
    ...(lesson.worked?.steps.map((text) =>
      passage(lesson.worked?.title ?? "Worked example", text),
    ) ?? []),
    ...(lesson.reading?.flatMap((note) =>
      note.paragraphs.map((text) => passage(note.title, text)),
    ) ?? []),
    ...(guide
      ? [
          passage("Objects", guide.objects),
          passage("Entry question", guide.hook),
          ...guide.examples.flatMap((example) =>
            example.steps.map((text) => passage(example.title, text)),
          ),
          passage(guide.nonexample.title, guide.nonexample.explanation),
          ...guide.proofSteps.map((text, index) =>
            passage(`Proof reference ${index + 1}`, text, index),
          ),
          passage("Connection", guide.connection),
        ]
      : []),
  ].filter((passage) => passage.text.trim());
}

const normalized = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const searchIndex = lessons.map((target) => {
  const title = normalized(
    [target.title, target.navTitle, ...(target.aliases ?? [])].join(" "),
  );
  const passages = argumentPassages(target.id);
  return {
    target,
    title,
    passages,
    text: normalized(
      [
        title,
        target.subject,
        target.family,
        ...passages.map((passage) => passage.text),
      ].join(" "),
    ),
  };
});

export function searchArgumentSupport(query: string): ArgumentSearchResult[] {
  const terms = normalized(query).split(" ").filter(Boolean);
  if (!terms.length) return [];
  return searchIndex
    .filter((entry) => terms.every((term) => entry.text.includes(term)))
    .map((entry) => {
      const passage = [...entry.passages].sort((a, b) => {
        const score = (text: string) =>
          terms.filter((term) => normalized(text).includes(term)).length;
        return score(b.text) - score(a.text) || a.text.length - b.text.length;
      })[0];
      return {
        target: entry.target,
        passage,
        score: terms.filter((term) => entry.title.includes(term)).length,
      };
    })
    .filter(
      (entry): entry is typeof entry & { passage: ArgumentPassage } =>
        entry.passage !== undefined,
    )
    .sort((a, b) => b.score - a.score)
    .map(({ target, passage }) => ({ target, passage }));
}

export const balancingRecovery = {
  targetId: "ureca-constructions-induction-adjunction",
  bindings: [
    {
      lessonId: "ureca-constructions-induction-adjunction",
      digest:
        "b62db3397f9e40aaa9186ba6eeb1eea21f45aa86d3949d26ad2e7536bee32788",
    },
    {
      lessonId: "ureca-constructions-tensor-coset-identification",
      digest:
        "f119bb6f967e3527b58fde6c8b63f0de1cc9c08d6488f394874c71e4e36f1779",
    },
    {
      lessonId: "tensor-products",
      digest:
        "09daee994ebe6fc8b208079d54e0f2b09567310772404c56f2ba05caea7205a0",
    },
  ],
  question: "Why does the rule descend to the tensor quotient?",
  steps: [
    "For a unital ring map $A\\to B$, use B as a left B, right A bimodule. Let V be a unital left A-module, W a unital left B-module, and $\\alpha:V\\to\\operatorname{Res}_A^B W$ an A-linear map.",
    "The rule $F_\\alpha(b\\otimes v)=b\\alpha(v)$ must be additive in both inputs and balanced. Check $(ba)\\alpha(v)=b(a\\alpha(v))=b\\alpha(av)$ for every $a\\in A$. Associativity gives the first equality; A-linearity of alpha gives the second.",
    "The tensor-products laboratory tests cyclic integer modules. It illustrates balancing in those finite examples; the arbitrary-ring adjunction still needs the argument above and the remaining proof steps.",
  ],
};

export function recoveryMatches(editions: TeachingEdition[]) {
  return balancingRecovery.bindings.every((binding) =>
    editions.some(
      (edition) =>
        edition.lessonId === binding.lessonId &&
        edition.digest === binding.digest,
    ),
  );
}
