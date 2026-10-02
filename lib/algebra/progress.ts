import type { Lesson } from "./engine";
import { guidedContent, type Assessment } from "./guided";
import { learningMetadata } from "./learning";
import { learningRoutes } from "./routes";
import capstones from "./capstone-assessments.json" with { type: "json" };

export const progressStorageKey = "algebra-competency-progress-v1";
export type Attempt = { revision: string; choice: number; submissions: number };
export type Progress = {
  version: 1;
  attempts: Record<string, Attempt>;
  archived?: Record<string, Attempt[]>;
};
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
  const representationRoute = capstoneAssessment(
    "route-ureca-representation-theory",
  );
  if (representationRoute)
    registry["route:ureca-representation-theory"] = representationRoute;
  return registry;
}
function validAttempt(value: unknown): value is Attempt {
  if (!value || typeof value !== "object") return false;
  const attempt = value as Attempt;
  return (
    typeof attempt.revision === "string" &&
    Number.isSafeInteger(attempt.choice) &&
    attempt.choice >= 0 &&
    Number.isSafeInteger(attempt.submissions) &&
    attempt.submissions > 0
  );
}
export function progressRecordSupported(serialized: string | null): boolean {
  if (serialized === null) return true;
  try {
    const value = JSON.parse(serialized);
    return (
      value?.version === 1 &&
      !!value.attempts &&
      typeof value.attempts === "object" &&
      !Array.isArray(value.attempts) &&
      Object.values(value.attempts).every(validAttempt) &&
      (value.archived === undefined ||
        (!!value.archived &&
          typeof value.archived === "object" &&
          !Array.isArray(value.archived) &&
          Object.values(value.archived).every(
            (history) => Array.isArray(history) && history.every(validAttempt),
          )))
    );
  } catch {
    return false;
  }
}
export function readProgress(
  serialized: string | null,
  registry: AssessmentRegistry,
): Progress {
  const clean = emptyProgress();
  if (!serialized || !progressRecordSupported(serialized)) return clean;
  const value = JSON.parse(serialized);
  const archived: Record<string, Attempt[]> = {};
  const preserve = (id: string, attempt: Attempt) => {
    const history = Object.hasOwn(archived, id) ? archived[id] : [];
    if (
      !history.some((item) => JSON.stringify(item) === JSON.stringify(attempt))
    )
      Object.defineProperty(archived, id, {
        value: [...history, { ...attempt }],
        enumerable: true,
        configurable: true,
      });
  };
  if (
    value.archived &&
    typeof value.archived === "object" &&
    !Array.isArray(value.archived)
  ) {
    for (const [id, history] of Object.entries(value.archived))
      if (Array.isArray(history))
        for (const attempt of history)
          if (validAttempt(attempt)) preserve(id, attempt);
  }
  for (const [id, attempt] of Object.entries(value.attempts)) {
    if (!validAttempt(attempt)) continue;
    const assessment = Object.hasOwn(registry, id) ? registry[id] : undefined;
    if (
      assessment &&
      attempt.revision === assessmentRevision(assessment) &&
      attempt.choice < assessment.choices.length
    )
      clean.attempts[id] = { ...attempt };
    else preserve(id, attempt);
  }
  if (Object.keys(archived).length) clean.archived = archived;
  return clean;
}
export function submitAttempt(
  progress: Progress,
  registry: AssessmentRegistry,
  id: string,
  choice: number,
): Progress {
  const assessment = Object.hasOwn(registry, id) ? registry[id] : undefined;
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
    ...progress,
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
