export const residue = (value: number, modulus: number) =>
  ((value % modulus) + modulus) % modulus;
export function linearQuotient(prime: number, matrix: number[]) {
  const points = Array.from({ length: prime * prime }, (_, i) => [
    i % prime,
    Math.floor(i / prime),
  ]);
  const apply = ([x, y]: number[]) => [
    residue(matrix[0] * x + matrix[1] * y, prime),
    residue(matrix[2] * x + matrix[3] * y, prime),
  ];
  const encode = ([x, y]: number[]) => x + prime * y;
  const images = points.map((point) => encode(apply(point)));
  const kernel = points.filter((_, i) => images[i] === 0);
  const image = [...new Set(images)];
  return { points, images, kernel, image, apply, encode };
}
export function quadraticQuotient(
  prime: number,
  linear: number,
  constant: number,
) {
  const elements = Array.from({ length: prime * prime }, (_, i) => [
    i % prime,
    Math.floor(i / prime),
  ]);
  const encode = (a: number, b: number) =>
    residue(a, prime) + prime * residue(b, prime);
  const add = (x: number, y: number) =>
    encode(elements[x][0] + elements[y][0], elements[x][1] + elements[y][1]);
  const multiply = (x: number, y: number) => {
    const [a, b] = elements[x],
      [c, d] = elements[y];
    return encode(a * c - constant * b * d, a * d + b * c - linear * b * d);
  };
  const roots = Array.from({ length: prime }, (_, i) => i).filter(
    (x) => residue(x * x + linear * x + constant, prime) === 0,
  );
  const inverse = (x: number) =>
    elements.findIndex((_, y) => multiply(x, y) === 1);
  const annihilators = (x: number) =>
    elements.flatMap((_, y) => (y !== 0 && multiply(x, y) === 0 ? [y] : []));
  const label = (x: number) => {
    const [a, b] = elements[x];
    return b === 0 ? `${a}` : `${a ? `${a}+` : ""}${b === 1 ? "" : b}\\alpha`;
  };
  return { elements, add, multiply, roots, inverse, annihilators, label };
}
