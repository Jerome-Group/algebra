import { learningRoutes, type LearningUnit } from "./routes";
import { currentArgumentLesson } from "./argument-catalogue";
import { beginnerMoves, type BeginnerMove } from "./beginner";

export const productModes = [
  "home",
  "start",
  "learn",
  "explore",
  "reference",
  "sources",
] as const;
export type ProductMode = (typeof productModes)[number];
export type ViewMode = ProductMode | "lesson";
export type CapstoneDestination = { mode: "capstone"; unit: LearningUnit };
export type ArgumentSupport = { lessonId: string; lab: boolean };
export type WorkDestination = {
  mode: "work";
  targetId: string;
  unitId: string | null;
  support: ArgumentSupport | null;
};
export type Destination =
  | { mode: Exclude<ProductMode, "start"> }
  | { mode: "start"; move: BeginnerMove; returnTo: ArgumentSupport | null }
  | { mode: "lesson"; id: string; laboratory: boolean }
  | CapstoneDestination
  | WorkDestination;

export function beginnerTargetId(
  move: BeginnerMove = "name",
  returnTo: ArgumentSupport | null = null,
) {
  const query = new URLSearchParams();
  if (move !== "name") query.set("move", move);
  if (returnTo) {
    query.set("return", returnTo.lessonId);
    if (returnTo.lab) query.set("lab", "1");
  }
  return `start${query.size ? `?${query}` : ""}`;
}

export function workTargetId(
  targetId: string,
  unitId?: string | null,
  support?: ArgumentSupport | null,
) {
  const query = new URLSearchParams();
  if (unitId) query.set("unit", unitId);
  if (support) {
    query.set("support", support.lessonId);
    if (support.lab) query.set("lab", "1");
  }
  return `work:${encodeURIComponent(targetId)}${query.size ? `?${query}` : ""}`;
}

export function lessonUnit(lessonId: string, unitId: unknown) {
  return typeof unitId === "string" &&
    learningRoutes.some(
      (unit) => unit.id === unitId && unit.lessons.includes(lessonId),
    )
    ? unitId
    : null;
}

export function capstoneTargetId(unit: LearningUnit): `capstone:${string}` {
  return `capstone:${unit.id}`;
}

export function parseDestination(hash: string): Destination {
  const target = hash.replace(/^#/, "");
  if (!target) return { mode: "home" };
  if (target === "route-ureca-representation-theory") return { mode: "learn" };
  if (target === "start" || target.startsWith("start?")) {
    const fallback = { mode: "start", move: "name", returnTo: null } as const;
    try {
      const query = target.slice(6);
      decodeURIComponent(query);
      const params = new URLSearchParams(query);
      if (
        [...params.keys()].some(
          (key) =>
            !["move", "return", "lab"].includes(key) ||
            params.getAll(key).length !== 1,
        )
      )
        return fallback;
      const move = beginnerMoves.find(
        (move) => move === (params.get("move") ?? "name"),
      );
      const lesson = params.has("return")
        ? currentArgumentLesson(params.get("return") ?? "")
        : null;
      if (
        !move ||
        (params.has("return") && !lesson) ||
        (params.has("lab") && (params.get("lab") !== "1" || !lesson))
      )
        return fallback;
      return {
        mode: "start",
        move,
        returnTo: lesson
          ? { lessonId: lesson.id, lab: params.get("lab") === "1" }
          : null,
      };
    } catch {
      return fallback;
    }
  }
  const mode = productModes.find((mode) => mode === target);
  if (mode && mode !== "start") return { mode };
  if (target.startsWith("work:")) {
    try {
      const [encodedId, query = ""] = target.slice(5).split("?");
      const lesson = currentArgumentLesson(decodeURIComponent(encodedId));
      if (!lesson) return { mode: "reference" };
      const params = new URLSearchParams(query);
      const support = currentArgumentLesson(params.get("support") ?? "");
      return {
        mode: "work",
        targetId: lesson.id,
        unitId: lessonUnit(lesson.id, params.get("unit")),
        support: support
          ? { lessonId: support.id, lab: params.get("lab") === "1" }
          : null,
      };
    } catch {
      return { mode: "reference" };
    }
  }
  if (target.startsWith("capstone:")) {
    try {
      const id = decodeURIComponent(target.slice(9));
      const unit = learningRoutes.find((unit) => unit.id === id);
      return unit ? { mode: "capstone", unit } : { mode: "learn" };
    } catch {
      return { mode: "learn" };
    }
  }
  try {
    const laboratory = target.startsWith("lab:");
    return {
      mode: "lesson",
      id: decodeURIComponent(laboratory ? target.slice(4) : target),
      laboratory,
    };
  } catch {
    return { mode: "reference" };
  }
}
