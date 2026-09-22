export const residue = (value: number, modulus: number) =>
  ((value % modulus) + modulus) % modulus;
export const integerGcd = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : integerGcd(b, a % b);

export function fiberModel(
  outputs: number[],
  targetSize: number,
  classModulus: number,
) {
  const domain = outputs.map((_, index) => index);
  const fibers = Array.from({ length: targetSize }, (_, value) =>
    domain.filter((input) => outputs[input] === value),
  );
  const classes = Array.from({ length: classModulus }, (_, value) =>
    domain.filter((input) => input % classModulus === value),
  );
  const witness = classes.flatMap((group) =>
    group.flatMap((a) =>
      group.filter((b) => outputs[a] !== outputs[b]).map((b) => [a, b]),
    ),
  )[0];
  return {
    domain,
    fibers,
    classes,
    injective: fibers.every((fiber) => fiber.length <= 1),
    surjective: fibers.every((fiber) => fiber.length > 0),
    wellDefined: !witness,
    witness,
  };
}

export type OperationKind =
  "addition" | "multiplication" | "subtraction" | "unbounded-addition";
export function operationModel(size: number, kind: OperationKind) {
  const elements = Array.from({ length: size }, (_, index) => index);
  const apply = (a: number, b: number) =>
    kind === "addition"
      ? (a + b) % size
      : kind === "multiplication"
        ? (a * b) % size
        : kind === "subtraction"
          ? residue(a - b, size)
          : a + b;
  const table = elements.map((a) => elements.map((b) => apply(a, b)));
  const closureWitness = elements.flatMap((a) =>
    elements
      .filter((b) => !elements.includes(apply(a, b)))
      .map((b) => ({ a, b, value: apply(a, b) })),
  )[0];
  const identity = closureWitness
    ? undefined
    : elements.find((e) =>
        elements.every((a) => apply(e, a) === a && apply(a, e) === a),
      );
  const missingInverse =
    identity === undefined
      ? undefined
      : elements.find(
          (a) =>
            !elements.some(
              (b) => apply(a, b) === identity && apply(b, a) === identity,
            ),
        );
  let associativityWitness:
    | { a: number; b: number; c: number; left: number; right: number }
    | undefined;
  if (!closureWitness) {
    for (const a of elements)
      for (const b of elements)
        for (const c of elements) {
          const left = apply(apply(a, b), c),
            right = apply(a, apply(b, c));
          if (left !== right && !associativityWitness)
            associativityWitness = { a, b, c, left, right };
        }
  }
  return {
    elements,
    table,
    closureWitness,
    identity,
    missingInverse,
    associativityWitness,
    isGroup:
      !closureWitness &&
      identity !== undefined &&
      missingInverse === undefined &&
      !associativityWitness,
  };
}

export const symmetricThree = [
  [0, 1, 2],
  [1, 0, 2],
  [0, 2, 1],
  [2, 1, 0],
  [1, 2, 0],
  [2, 0, 1],
];
export const permutationNames = ["e", "(12)", "(23)", "(13)", "(123)", "(132)"];
export const composePermutations = (a: number[], b: number[]) =>
  b.map((value) => a[value]);
export const symmetricProduct = (a: number, b: number) => {
  const product = composePermutations(symmetricThree[a], symmetricThree[b]);
  return symmetricThree.findIndex((permutation) =>
    permutation.every((value, index) => value === product[index]),
  );
};
export const symmetricInverse = (a: number) =>
  symmetricThree.findIndex((_, b) => symmetricProduct(a, b) === 0);
const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && a.every((value) => b.includes(value));

export function cosetModel(subgroup: number[]) {
  const elements = symmetricThree.map((_, index) => index);
  const left = (a: number) =>
    subgroup.map((h) => symmetricProduct(a, h)).sort();
  const right = (a: number) =>
    subgroup.map((h) => symmetricProduct(h, a)).sort();
  const cosets = elements
    .map(left)
    .filter(
      (coset, index, list) =>
        list.findIndex((other) => sameSet(coset, other)) === index,
    );
  const normal = elements.every((a) => sameSet(left(a), right(a)));
  const classOf = (a: number) => cosets.findIndex((coset) => coset.includes(a));
  let witness:
    | {
        first: number;
        replacement: number;
        second: number;
        originalClass: number;
        changedClass: number;
      }
    | undefined;
  for (const first of elements)
    for (const replacement of left(first))
      for (const second of elements) {
        const originalClass = classOf(symmetricProduct(first, second));
        const changedClass = classOf(symmetricProduct(replacement, second));
        if (originalClass !== changedClass && !witness)
          witness = { first, replacement, second, originalClass, changedClass };
      }
  const quotientTable = normal
    ? cosets.map((a) =>
        cosets.map((b) => classOf(symmetricProduct(a[0], b[0]))),
      )
    : null;
  return { elements, cosets, normal, witness, left, right, quotientTable };
}

export type SymmetricAction = "letters" | "regular" | "conjugation";
export function actionModel(action: SymmetricAction, point: number) {
  const group = symmetricThree.map((_, index) => index);
  const points = action === "letters" ? [0, 1, 2] : group;
  const apply = (g: number, x: number) =>
    action === "letters"
      ? symmetricThree[g][x]
      : action === "regular"
        ? symmetricProduct(g, x)
        : symmetricProduct(symmetricProduct(g, x), symmetricInverse(g));
  const orbit = [...new Set(group.map((g) => apply(g, point)))].sort();
  const stabilizer = group.filter((g) => apply(g, point) === point);
  const kernel = group.filter((g) => points.every((x) => apply(g, x) === x));
  const core = group.filter((h) =>
    group.every((g) =>
      stabilizer.includes(
        symmetricProduct(symmetricProduct(symmetricInverse(g), h), g),
      ),
    ),
  );
  return { group, points, apply, orbit, stabilizer, kernel, core };
}

export function cyclicReachability(size: number, generators: number[]) {
  const words = new Map<number, number[]>([[0, []]]);
  const queue = [0];
  for (const element of queue)
    for (const generator of generators) {
      const target = residue(element + generator, size);
      if (!words.has(target)) {
        words.set(target, [...words.get(element)!, generator]);
        queue.push(target);
      }
    }
  return { reachable: [...words.keys()].sort((a, b) => a - b), words };
}

export function cyclicModule(modulus: number, scalar: number) {
  const elements = Array.from({ length: modulus }, (_, i) => i);
  const images = elements.map((element) => residue(scalar * element, modulus));
  const kernel = elements.filter((_, i) => images[i] === 0);
  const image = [...new Set(images)].sort((a, b) => a - b);
  const inverse = elements.find(
    (candidate) => residue(candidate * scalar, modulus) === 1,
  );
  return {
    elements,
    images,
    kernel,
    image,
    inverse,
    annihilatorGenerator: modulus,
    quotientSize: integerGcd(modulus, scalar),
  };
}
