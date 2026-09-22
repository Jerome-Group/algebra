import metadata from "./learning-metadata.json" with { type: "json" };
import type { Lesson } from "./engine";

export const teachingStatuses = [
  "guided",
  "worked-illustration",
  "proof-roadmap",
  "reference-only",
] as const;
export const visualisationTypes = [
  "none",
  "illustration",
  "experiment",
  "proof-animation",
  "constructor",
  "checker",
  "reference-diagram",
] as const;
export type Competency = {
  id: string;
  statement: string;
  level: "recognise" | "compute" | "explain" | "prove" | "transfer";
};
export type LearningMetadata = {
  teachingStatus: (typeof teachingStatuses)[number];
  courseTier: "foundation" | "core" | "advanced";
  estimatedMinutes: number;
  prerequisites: string[];
  competencies: Competency[];
  visualisationType: (typeof visualisationTypes)[number];
  sourceCollections: string[];
  conceptKind: "object" | "theorem" | "technique";
};
const catalogue = metadata as Record<string, LearningMetadata>;

export function learningMetadata(lesson: Lesson): LearningMetadata {
  return (
    catalogue[lesson.id] ?? {
      teachingStatus: "reference-only",
      courseTier: "advanced",
      estimatedMinutes: 15,
      prerequisites: lesson.prerequisites ?? [],
      competencies: [],
      visualisationType:
        lesson.machine === "diagram" ? "reference-diagram" : "illustration",
      sourceCollections: [lesson.track],
      conceptKind: "object",
    }
  );
}

export function guidedLessons(lessons: Lesson[]) {
  return lessons.filter(
    (lesson) => learningMetadata(lesson).teachingStatus === "guided",
  );
}

export function prerequisitesMet(
  lesson: Lesson,
  mastered: ReadonlySet<string>,
  lessons: Lesson[],
): boolean {
  return learningMetadata(lesson).prerequisites.every((id) => {
    const prerequisite = lessons.find((item) => item.id === id);
    if (!prerequisite) return false;
    const competencies = learningMetadata(prerequisite).competencies;
    return (
      competencies.length > 0 &&
      competencies.every((item) => mastered.has(item.id))
    );
  });
}
