import {
  symmetricThree,
  symmetricProduct,
  symmetricInverse,
  sameSet,
} from "./foundation-labs";

const elements = symmetricThree.map((_, index) => index);
const subgroups = {
  2: [
    [0, 1],
    [0, 2],
    [0, 3],
  ],
  3: [[0, 4, 5]],
} as const;
const conjugate = (g: number, subgroup: readonly number[]) =>
  subgroup.map((h) =>
    symmetricProduct(symmetricProduct(g, h), symmetricInverse(g)),
  );

export type SylowPrime = 2 | 3;
export function sylowWorkbench(
  prime: SylowPrime,
  subgroupIndex = 0,
  targetIndex = prime === 2 ? 1 : 0,
) {
  const sylows: number[][] = subgroups[prime].map((group) => [...group]);
  const P = sylows[subgroupIndex];
  const Q = sylows[targetIndex];
  if (!P || !Q) throw new RangeError("Unknown Sylow subgroup selection");
  const cosets = elements
    .map((g) => Q.map((h) => symmetricProduct(g, h)))
    .filter(
      (coset, index, all) =>
        all.findIndex((other) => sameSet(coset, other)) === index,
    );
  const cosetIndex = (g: number) =>
    cosets.findIndex((coset) => coset.includes(g));
  const fixedCosetIndices = cosets
    .map((coset, index) =>
      P.every((h) => cosetIndex(symmetricProduct(h, coset[0])) === index)
        ? index
        : -1,
    )
    .filter((index) => index >= 0);
  const fixedCosets = fixedCosetIndices.map((index) => cosets[index]);
  const fixedWitnesses = fixedCosets.map((coset) => ({
    coset,
    representative: coset[0],
    conjugate: conjugate(symmetricInverse(coset[0]), P),
  }));
  const pOrbits: number[][] = [];
  for (const coset of cosets) {
    const index = cosetIndex(coset[0]);
    if (pOrbits.some((orbit) => orbit.includes(index))) continue;
    pOrbits.push([
      ...new Set(P.map((h) => cosetIndex(symmetricProduct(h, coset[0])))),
    ]);
  }
  const conjugates = elements.map((g) =>
    sylows.findIndex((Q) => sameSet(conjugate(g, P), Q)),
  );
  const normalizer = elements.filter((g) => conjugates[g] === subgroupIndex);
  const fixedSylows = sylows
    .map((Q, index) => ({ Q, index }))
    .filter(({ Q }) => P.every((h) => sameSet(conjugate(h, Q), Q)))
    .map(({ index }) => index);
  const candidates = [1, 2, 3, 6].filter(
    (n) => (6 / P.length) % n === 0 && n % prime === 1,
  );
  const classOf = (x: number) => [
    ...new Set(
      elements.map((g) =>
        symmetricProduct(symmetricProduct(g, x), symmetricInverse(g)),
      ),
    ),
  ];
  const classSizes = [0, 1, 4].map((x) => ({
    representative: x,
    elements: classOf(x),
    centralizer: elements.filter(
      (g) => symmetricProduct(g, x) === symmetricProduct(x, g),
    ),
  }));
  return {
    prime,
    sylows,
    P,
    Q,
    cosets,
    pOrbits,
    fixedCosets,
    fixedCosetIndices,
    fixedWitnesses,
    conjugates,
    normalizer,
    fixedSylows,
    candidates,
    actualCount: sylows.length,
    classSizes,
  };
}
