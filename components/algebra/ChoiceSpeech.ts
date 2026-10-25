import { cycles } from "@/lib/algebra/engine";

export const symmetricElementSpeech = [
  "identity",
  "transposition 1 2",
  "transposition 2 3",
  "transposition 1 3",
  "cycle 1 2 3",
  "cycle 1 3 2",
];

export function permutationSpeech(permutation: number[]) {
  return (
    cycles(permutation)
      .filter((cycle) => cycle.length > 1)
      .map((cycle) => `cycle ${cycle.map((point) => point + 1).join(" ")}`)
      .join(" followed by ") || "identity"
  );
}

export function dihedralElementSpeech(index: number, order: number) {
  const power = index % order;
  const rotation = power === 0 ? "" : power === 1 ? "r" : `r to power ${power}`;
  return index < order
    ? rotation || "identity"
    : rotation
      ? `${rotation} times s`
      : "s";
}

export function groupElementSpeech(
  type: string,
  order: number,
  index: number,
  label: string,
) {
  if (type === "D") return dihedralElementSpeech(index, order);
  if (type === "S") {
    if (label === "()") return "identity";
    return [...label.matchAll(/\(([^()]*)\)/g)]
      .map(([, cycle]) => `cycle ${cycle.split("\\,").join(" ")}`)
      .join(" followed by ");
  }
  if (type === "Q")
    return ["1", "i", "j", "k", "minus 1", "minus i", "minus j", "minus k"][
      index
    ];
  if (type === "V") return `pair ${label[0]}, ${label[1]}`;
  return type === "U" ? `unit ${label}` : `residue ${label}`;
}

export function groupElementTex(
  type: string,
  order: number,
  index: number,
  label: string,
) {
  if (type !== "D") return label;
  const power = index % order;
  const rotation = power === 0 ? "" : power === 1 ? "r" : `r^{${power}}`;
  return (index < order ? rotation : `${rotation}s`) || "e";
}

export const characterSpeech = [
  "trivial character",
  "sign character",
  "standard character",
  "standard character times sign",
  "two dimensional character",
];

export function cyclicElementSpeech(exponent: number) {
  return exponent === 0 ? "identity" : exponent === 1 ? "a" : "a squared";
}

export function cyclicScalarSpeech(order: number, exponent: number) {
  if (exponent === 0) return "1";
  if (order === 2) return "minus 1";
  return exponent === 1 ? "omega" : "omega squared";
}
