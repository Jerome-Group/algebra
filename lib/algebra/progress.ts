import type { Lesson } from "./engine";
import { guidedContent, type Assessment } from "./guided";
import { learningMetadata } from "./learning";
import { learningRoutes } from "./routes";
import capstones from "./capstone-assessments.json" with { type: "json" };

export const progressStorageKey = "algebra-competency-progress-v1";
export type Attempt = { revision: string; choice: number; submissions: number };
export type Progress = { version: 1; attempts: Record<string, Attempt> };
export type AssessmentRegistry = Record<string, Assessment>;
export const emptyProgress = (): Progress => ({ version: 1, attempts: {} });
export const assessmentRevision = (assessment: Assessment) =>
  JSON.stringify(assessment);
export function capstoneAssessment(id: string): Assessment | undefined {
  return (capstones as AssessmentRegistry)[id];
}
export function assessmentRegistry(lessons: Lesson[]): AssessmentRegistry {
  const registry: AssessmentRegistry = {};
  for (const lesson of lessons) {
    const content = guidedContent(lesson.id);
    if (!content || learningMetadata(lesson).teachingStatus !== "guided")
      continue;
    for (const field of ["boundaryCheck", "application", "transfer"] as const) {
      const id = `${lesson.id}:${field}`;
      if (learningMetadata(lesson).competencies.some((item) => item.id === id))
        registry[id] = content[field];
    }
  }
  for (const unit of learningRoutes) {
    const assessment = capstoneAssessment(unit.id);
    if (assessment) registry[`unit:${unit.id}`] = assessment;
  }
  return registry;
}
export function readProgress(
  serialized: string | null,
  registry: AssessmentRegistry,
): Progress {
  const clean = emptyProgress();
  if (!serialized) return clean;
  try {
    const value = JSON.parse(serialized);
    if (
      value?.version !== 1 ||
      !value.attempts ||
      typeof value.attempts !== "object" ||
      Array.isArray(value.attempts)
    )
      return clean;
    for (const [id, assessment] of Object.entries(registry)) {
      const attempt = value.attempts[id];
      if (
        attempt &&
        attempt.revision === assessmentRevision(assessment) &&
        Number.isInteger(attempt.choice) &&
        attempt.choice >= 0 &&
        attempt.choice < assessment.choices.length &&
        Number.isSafeInteger(attempt.submissions) &&
        attempt.submissions > 0
      )
        clean.attempts[id] = {
          revision: attempt.revision,
          choice: attempt.choice,
          submissions: attempt.submissions,
        };
    }
  } catch {
    /* A malformed or future device record must not grant competency. */
  }
  return clean;
}
export function submitAttempt(
  progress: Progress,
  registry: AssessmentRegistry,
  id: string,
  choice: number,
): Progress {
  const assessment = registry[id];
  if (
    !assessment ||
    !Number.isInteger(choice) ||
    choice < 0 ||
    choice >= assessment.choices.length
  )
    return progress;
  const previous = progress.attempts[id];
  const submissions =
    previous?.revision === assessmentRevision(assessment)
      ? Math.min(previous.submissions + 1, Number.MAX_SAFE_INTEGER)
      : 1;
  return {
    version: 1,
    attempts: {
      ...progress.attempts,
      [id]: { revision: assessmentRevision(assessment), choice, submissions },
    },
  };
}
export function demonstrated(
  progress: Progress,
  registry: AssessmentRegistry,
): ReadonlySet<string> {
  return new Set(
    Object.entries(progress.attempts)
      .filter(
        ([id, attempt]) =>
          registry[id] &&
          attempt.revision === assessmentRevision(registry[id]) &&
          attempt.choice === registry[id].answer,
      )
      .map(([id]) => id),
  );
}
export function lessonCompletion(
  lesson: Lesson,
  mastered: ReadonlySet<string>,
) {
  const metadata = learningMetadata(lesson);
  const required =
    metadata.teachingStatus === "guided" ? metadata.competencies : [];
  const count = required.filter((item) => mastered.has(item.id)).length;
  return {
    count,
    total: required.length,
    complete: required.length > 0 && count === required.length,
  };
}
export function unitCompletion(
  unit: (typeof learningRoutes)[number],
  lessons: Lesson[],
  mastered: ReadonlySet<string>,
) {
  const required = unit.lessons.map((id) =>
    lessons.find((lesson) => lesson.id === id),
  );
  const teachingReady =
    required.length > 0 &&
    required.every(
      (lesson) =>
        lesson && learningMetadata(lesson).teachingStatus === "guided",
    );
  const results = required
    .filter((lesson): lesson is Lesson => !!lesson)
    .map((lesson) => lessonCompletion(lesson, mastered));
  const capstone = mastered.has(`unit:${unit.id}`);
  return {
    count: results.reduce((sum, result) => sum + result.count, 0),
    total: results.reduce((sum, result) => sum + result.total, 0),
    teachingReady,
    capstone,
    complete:
      teachingReady && results.every((result) => result.complete) && capstone,
  };
}
