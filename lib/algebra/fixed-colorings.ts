export type CubeFeature = "vertices" | "faces" | "edges";
export type ColoringConfig =
  | {
      kind: "polygon";
      size: number;
      reflections: boolean;
      colors: number;
      firstColorCount: number;
    }
  | { kind: "cube"; feature: CubeFeature; colors: number };
export type ColoringFamily =
  | "rotation"
  | "vertex-axis reflection"
  | "opposite-bead reflection"
  | "opposite-gap reflection"
  | "identity"
  | "face-axis quarter-turn"
  | "face-axis half-turn"
  | "vertex-axis third-turn"
  | "edge-axis half-turn";

function cycles(images: number[]) {
  const seen = new Set<number>();
  const result: number[][] = [];
  for (let start = 0; start < images.length; start++) {
    if (seen.has(start)) continue;
    const cycle: number[] = [];
    for (
      let position = start;
      !seen.has(position);
      position = images[position]
    ) {
      seen.add(position);
      cycle.push(position);
    }
    result.push(cycle);
  }
  return result;
}

export type ColoringAction = {
  label: string;
  family: ColoringFamily;
  permutation: number[];
  matrix?: number[][];
};
export type FixedColoringRow = ColoringAction & {
  classId: number;
  cycles: number[][];
  signature: string;
  fixedPositions: number;
  fixedColorings: number;
};
export type GroupedColoringRow = {
  classId: number;
  family: ColoringFamily;
  signature: string;
  elements: string[];
  cycles: number;
  fixedPositions: number;
  fixedColorings: number;
};
export type ColoringLedger = {
  rows: FixedColoringRow[];
  groups: GroupedColoringRow[];
  total: number;
  orbits: number;
  inventory: number | null;
};
const mod = (value: number, size: number) => ((value % size) + size) % size;
const exponent = (value: number) =>
  value === 0 ? "e" : value === 1 ? "r" : `r^${value}`;

function polygonActions(size: number, reflections: boolean): ColoringAction[] {
  if (!Number.isInteger(size) || size < 3 || size > 10)
    throw Error("Polygon size must be 3–10");
  const rotations: ColoringAction[] = Array.from(
    { length: size },
    (_, step) => ({
      label: exponent(step),
      family: "rotation" as const,
      permutation: Array.from({ length: size }, (_, point) =>
        mod(point + step, size),
      ),
    }),
  );
  if (!reflections) return rotations;
  return rotations.concat(
    Array.from({ length: size }, (_, step) => {
      const permutation = Array.from({ length: size }, (_, point) =>
        mod(step - point, size),
      );
      const fixed = permutation.filter(
        (image, point) => image === point,
      ).length;
      return {
        label: step === 0 ? "s" : `${exponent(step)}s`,
        family:
          size % 2
            ? "vertex-axis reflection"
            : fixed
              ? "opposite-bead reflection"
              : "opposite-gap reflection",
        permutation,
      };
    }),
  );
}

function cubeFamily(matrix: number[][]): ColoringFamily {
  const trace = matrix[0][0] + matrix[1][1] + matrix[2][2];
  if (trace === 3) return "identity";
  if (trace === 1) return "face-axis quarter-turn";
  if (trace === 0) return "vertex-axis third-turn";
  if (matrix.some((row, index) => row[index] === 1))
    return "face-axis half-turn";
  return "edge-axis half-turn";
}
const axes = [0, 1, 2];
const coordinatePermutations = axes.flatMap((first) =>
  axes
    .filter((second) => second !== first)
    .map((second) => [
      first,
      second,
      axes.find((third) => third !== first && third !== second)!,
    ]),
);
const parity = (order: number[]) =>
  (order[0] > order[1] ? -1 : 1) *
  (order[0] > order[2] ? -1 : 1) *
  (order[1] > order[2] ? -1 : 1);
const cubePoints: Record<CubeFeature, number[][]> = {
  vertices: [-1, 1].flatMap((x) =>
    [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z])),
  ),
  faces: axes.flatMap((axis) =>
    [-1, 1].map((sign) => axes.map((index) => (index === axis ? sign : 0))),
  ),
  edges: axes.flatMap((zero) =>
    [-1, 1].flatMap((first) =>
      [-1, 1].map((second) => {
        const signs = [first, second];
        return axes.map((axis) =>
          axis === zero ? 0 : signs[axis < zero ? axis : axis - 1],
        );
      }),
    ),
  ),
};
function cubeRotationActions(feature: CubeFeature): ColoringAction[] {
  const points = cubePoints[feature];
  const actions: ColoringAction[] = [];
  for (const order of coordinatePermutations)
    for (const x of [1, -1])
      for (const y of [1, -1])
        for (const z of [1, -1]) {
          const signs = [x, y, z];
          if (parity(order) * x * y * z !== 1) continue;
          const matrix = axes.map((row) =>
            axes.map((column) => (order[row] === column ? signs[row] : 0)),
          );
          const images = points.map((point) => {
            const moved = axes.map((row) => signs[row] * point[order[row]]);
            return points.findIndex((candidate) =>
              candidate.every((value, index) => value === moved[index]),
            );
          });
          if (images.some((index) => index < 0))
            throw Error("Cube action left its feature set");
          actions.push({
            label: `Q${actions.length}`,
            family: cubeFamily(matrix),
            permutation: images,
            matrix,
          });
        }
  return actions;
}
function compose(first: number[], second: number[]) {
  return second.map((image) => first[image]);
}
function inverse(images: number[]) {
  const result: number[] = [];
  images.forEach((image, index) => (result[image] = index));
  return result;
}
function conjugacyClasses(actions: ColoringAction[]) {
  const lookup = new Map(
    actions.map((action, index) => [action.permutation.join(","), index]),
  );
  const ids = actions.map(() => -1);
  let nextClass = 0;
  actions.forEach((action, index) => {
    if (ids[index] >= 0) return;
    for (const conjugator of actions) {
      const conjugate = compose(
        compose(conjugator.permutation, action.permutation),
        inverse(conjugator.permutation),
      );
      const member = lookup.get(conjugate.join(","));
      if (member === undefined)
        throw Error("Action is not closed under conjugation");
      ids[member] = nextClass;
    }
    nextClass++;
  });
  return ids;
}
function fixedColoringRows(
  actions: ColoringAction[],
  colors: number,
): FixedColoringRow[] {
  if (!Number.isInteger(colors) || colors < 2 || colors > 5)
    throw Error("Color count must be 2–5");
  const classIds = conjugacyClasses(actions);
  return actions.map((action, index) => {
    const decomposition = cycles(action.permutation);
    const lengths = decomposition
      .map((cycle) => cycle.length)
      .sort((a, b) => a - b);
    const multiplicities = new Map<number, number>();
    lengths.forEach((length) =>
      multiplicities.set(length, (multiplicities.get(length) || 0) + 1),
    );
    return {
      ...action,
      classId: classIds[index],
      cycles: decomposition,
      signature: [...multiplicities]
        .map(([length, count]) => `${length}${count > 1 ? `^${count}` : ""}`)
        .join("·"),
      fixedPositions: action.permutation.filter(
        (image, point) => image === point,
      ).length,
      fixedColorings: colors ** decomposition.length,
    };
  });
}
function coloringOrbitCount(rows: FixedColoringRow[]) {
  return rows.reduce((sum, row) => sum + row.fixedColorings, 0) / rows.length;
}
function inventoryFixedCount(cycles: number[][], firstColorCount: number) {
  const coefficients = Array.from({ length: firstColorCount + 1 }, () => 0);
  coefficients[0] = 1;
  for (const cycle of cycles)
    for (let degree = firstColorCount; degree >= 0; degree--)
      coefficients[degree] +=
        degree >= cycle.length ? coefficients[degree - cycle.length] : 0;
  return coefficients[firstColorCount];
}
function inventoryOrbitCount(
  rows: FixedColoringRow[],
  firstColorCount: number,
) {
  return (
    rows.reduce(
      (sum, row) => sum + inventoryFixedCount(row.cycles, firstColorCount),
      0,
    ) / rows.length
  );
}
function groupedRows(rows: FixedColoringRow[]): GroupedColoringRow[] {
  const groups = new Map<number, GroupedColoringRow>();
  for (const row of rows) {
    const key = row.classId;
    const group = groups.get(key);
    if (group) group.elements.push(row.label);
    else
      groups.set(key, {
        classId: row.classId,
        family: row.family,
        signature: row.signature,
        elements: [row.label],
        cycles: row.cycles.length,
        fixedPositions: row.fixedPositions,
        fixedColorings: row.fixedColorings,
      });
  }
  return [...groups.values()];
}

export function fixedColoringLedger(config: ColoringConfig): ColoringLedger {
  const actions =
    config.kind === "cube"
      ? cubeRotationActions(config.feature)
      : polygonActions(config.size, config.reflections);
  const rows = fixedColoringRows(actions, config.colors);
  const total = rows.reduce((sum, row) => sum + row.fixedColorings, 0);
  return {
    rows,
    groups: groupedRows(rows),
    total,
    orbits: coloringOrbitCount(rows),
    inventory:
      config.kind === "polygon" && config.colors === 2
        ? inventoryOrbitCount(
            rows,
            Math.min(config.firstColorCount, config.size),
          )
        : null,
  };
}
