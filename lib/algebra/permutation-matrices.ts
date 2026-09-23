export function permutationMatrix(images: number[]) {
  const n = images.length;
  if (
    n < 1 ||
    new Set(images).size !== n ||
    images.some((image) => !Number.isInteger(image) || image < 0 || image >= n)
  )
    throw new RangeError("Expected a permutation of 0,…,n−1");
  return Array.from({ length: n }, (_, row) =>
    images.map((image) => Number(image === row)),
  );
}

export function composePermutations(left: number[], right: number[]) {
  if (left.length !== right.length) throw new RangeError("Different degrees");
  permutationMatrix(left);
  permutationMatrix(right);
  return right.map((image) => left[image]);
}
