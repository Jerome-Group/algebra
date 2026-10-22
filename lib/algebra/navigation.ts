import { learningRoutes, type LearningUnit } from "./routes";

export const productModes = [
  "home",
  "learn",
  "explore",
  "reference",
  "sources",
] as const;
export type ProductMode = (typeof productModes)[number];
export type ViewMode = ProductMode | "lesson";
export type CapstoneDestination = { mode: "capstone"; unit: LearningUnit };
export type Destination =
  | { mode: ProductMode }
  | { mode: "lesson"; id: string; laboratory: boolean }
  | CapstoneDestination;

export function capstoneTargetId(unit: LearningUnit): `capstone:${string}` {
  return `capstone:${unit.id}`;
}

export function parseDestination(hash: string): Destination {
  const target = hash.replace(/^#/, "");
  if (!target) return { mode: "home" };
  if (target === "route-ureca-representation-theory") return { mode: "learn" };
  const mode = productModes.find((mode) => mode === target);
  if (mode) return { mode };
  if (target.startsWith("capstone:")) {
    try {
      const id = decodeURIComponent(target.slice(9));
      const unit = learningRoutes.find((unit) => unit.id === id);
      return unit ? { mode: "capstone", unit } : { mode: "learn" };
    } catch {
      return { mode: "learn" };
    }
  }
  if (target.startsWith("lab:"))
    return { mode: "lesson", id: target.slice(4), laboratory: true };
  return { mode: "lesson", id: target, laboratory: false };
}
