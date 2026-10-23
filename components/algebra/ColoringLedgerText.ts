import type { ColoringConfig } from "@/lib/algebra/fixed-colorings";

export function coloringElementTex(config: ColoringConfig, index: number) {
  if (config.kind === "cube") return `Q_{${index}}`;
  const power = index % config.size;
  const rotation = power === 0 ? "" : power === 1 ? "r" : `r^{${power}}`;
  return index < config.size ? rotation || "e" : `${rotation}s`;
}

export function coloringCycleTypeTex(cycles: number[][]) {
  const lengths = [...new Set(cycles.map((cycle) => cycle.length))].sort(
    (first, second) => first - second,
  );
  return lengths
    .map((length) => {
      const count = cycles.filter((cycle) => cycle.length === length).length;
      return count === 1 ? `${length}` : `${length}^{${count}}`;
    })
    .join(String.raw`\cdot `);
}
