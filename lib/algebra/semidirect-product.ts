export type Pair = readonly [number, number];

const mod3 = (value: number) => ((value % 3) + 3) % 3;
const key = ([a, b]: Pair) => `${a},${b}`;

export const elements: Pair[] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [0, 1],
  [1, 1],
  [2, 1],
];

export function actionIsHomomorphism(multiplier: number) {
  return (
    [1, 2].includes(mod3(multiplier)) && mod3(multiplier * multiplier) === 1
  );
}

export function multiply(left: Pair, right: Pair, multiplier: number): Pair {
  if (!actionIsHomomorphism(multiplier)) {
    throw new Error("C₂ must act through automorphisms, with α(s)²=id");
  }
  const [a, b] = left;
  const [c, d] = right;
  return [mod3(a + (b ? multiplier : 1) * c), (b + d) % 2];
}

export function generatedSubgroup(generators: Pair[], multiplier: number) {
  const seen = new Map<string, Pair>([["0,0", [0, 0]]]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const left of [...seen.values()]) {
      for (const right of generators) {
        const product = multiply(left, right, multiplier);
        if (!seen.has(key(product))) {
          seen.set(key(product), product);
          changed = true;
        }
      }
    }
  }
  return elements.filter((element) => seen.has(key(element)));
}

export function allSubgroups(multiplier: number) {
  const groups = new Map<string, Pair[]>();
  for (const first of elements) {
    for (const second of elements) {
      const subgroup = generatedSubgroup([first, second], multiplier);
      groups.set(subgroup.map(key).join(";"), subgroup);
    }
  }
  return [...groups.values()].sort((a, b) => a.length - b.length);
}

export function isNormal(subgroup: Pair[], multiplier: number) {
  const keys = new Set(subgroup.map(key));
  return elements.every((g) =>
    subgroup.every((h) => {
      const gh = multiply(g, h, multiplier);
      return elements.some(
        (inverse) =>
          key(multiply(g, inverse, multiplier)) === "0,0" &&
          keys.has(key(multiply(gh, inverse, multiplier))),
      );
    }),
  );
}
