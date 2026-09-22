export const productModes = [
  "home",
  "learn",
  "explore",
  "reference",
  "sources",
] as const;
export type ProductMode = (typeof productModes)[number];
export type Destination =
  { mode: ProductMode } | { mode: "lesson"; id: string; laboratory: boolean };

export function parseDestination(hash: string): Destination {
  const target = hash.replace(/^#/, "");
  if (!target) return { mode: "home" };
  if (target === "route-ureca-representation-theory") return { mode: "learn" };
  if (productModes.includes(target as ProductMode))
    return { mode: target as ProductMode };
  if (target.startsWith("lab:"))
    return { mode: "lesson", id: target.slice(4), laboratory: true };
  return { mode: "lesson", id: target, laboratory: false };
}
