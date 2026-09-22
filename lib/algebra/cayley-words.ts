import {
  composePermutations,
  permutationNames,
  residue,
  symmetricProduct,
  symmetricThree,
} from "./foundation-labs";

export type S3Letter = "r" | "rInverse" | "s";
const generators: Record<S3Letter, number> = { r: 4, rInverse: 5, s: 1 };
export const s3Letters: S3Letter[] = ["r", "rInverse", "s"];
export const s3LetterLabel: Record<S3Letter, string> = {
  r: "r=(123)",
  rInverse: "r⁻¹=(132)",
  s: "s=(12)",
};

export function evaluateS3Word(word: S3Letter[]) {
  return word.reduce(
    (value, letter) => symmetricProduct(value, generators[letter]),
    0,
  );
}

export function s3WordModel(word: S3Letter[]) {
  const words = new Map<number, S3Letter[]>([[0, []]]);
  const queue = [0];
  for (const element of queue)
    for (const letter of s3Letters) {
      const target = symmetricProduct(element, generators[letter]);
      if (!words.has(target)) {
        words.set(target, [...words.get(element)!, letter]);
        queue.push(target);
      }
    }
  const normalForms: { name: string; word: S3Letter[] }[] = [
    { name: "e", word: [] },
    { name: "r", word: ["r"] },
    { name: "r²", word: ["r", "r"] },
    { name: "s", word: ["s"] },
    { name: "rs", word: ["r", "s"] },
    { name: "r²s", word: ["r", "r", "s"] },
  ];
  return {
    current: evaluateS3Word(word),
    shortestWords: words,
    normalForms: normalForms.map((form) => ({
      ...form,
      element: evaluateS3Word(form.word),
    })),
    relations: [
      {
        name: "r³=e",
        left: ["r", "r", "r"] as S3Letter[],
        right: [] as S3Letter[],
      },
      { name: "s²=e", left: ["s", "s"] as S3Letter[], right: [] as S3Letter[] },
      {
        name: "srs=r⁻¹",
        left: ["s", "r", "s"] as S3Letter[],
        right: ["rInverse"] as S3Letter[],
      },
    ].map((relation) => ({
      ...relation,
      holds: evaluateS3Word(relation.left) === evaluateS3Word(relation.right),
    })),
  };
}

export function cyclicSubgroups(size: number) {
  return Array.from({ length: size }, (_, index) => index + 1)
    .filter((order) => size % order === 0)
    .map((order) => ({
      order,
      generator: size / order,
      elements: Array.from({ length: order }, (_, k) =>
        residue((size / order) * k, size),
      ).sort((a, b) => a - b),
    }));
}

export function regularActionModel(first: number, second: number) {
  const elements = symmetricThree.map((_, index) => index);
  const permutation = (g: number) =>
    elements.map((x) => symmetricProduct(g, x));
  const product = symmetricProduct(first, second);
  const firstPermutation = permutation(first);
  const secondPermutation = permutation(second);
  const productPermutation = permutation(product);
  return {
    elements,
    names: permutationNames,
    product,
    firstPermutation,
    secondPermutation,
    productPermutation,
    composedPermutation: composePermutations(
      firstPermutation,
      secondPermutation,
    ),
    allPermutations: elements.map((g) => permutation(g)),
  };
}
