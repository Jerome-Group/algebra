import { groupElementSpeech, groupElementTex } from "./ChoiceSpeech";

type SymbolicAtom = "a" | "b" | "h" | "x" | "H";

export type GroupAction = "regular" | "conjugation";

export function groupPresentation({
  type,
  n,
  labels,
}: {
  type: string;
  n: number;
  labels: readonly string[];
}) {
  const additive = type === "C" || type === "V";
  const elements = labels.map((label, index) => ({
    value: String(index),
    tex:
      type === "V"
        ? `(${label[0]},${label[1]})`
        : groupElementTex(type, n, index, label),
    speech: groupElementSpeech(type, n, index, label),
  }));
  const identity = elements[0].tex;
  const operation = additive ? "+" : "";
  const product = (left: SymbolicAtom, right: SymbolicAtom) =>
    `${left}${operation}${right}`;
  const inverse = (value: SymbolicAtom) =>
    additive ? `-${value}` : `${value}^{-1}`;
  const conjugate = (actor: SymbolicAtom, value: SymbolicAtom) =>
    `${product(actor, value)}${additive ? "-" + actor : inverse(actor)}`;
  const cosetRepresentative = (value: string) =>
    !additive && value.startsWith("-") ? `\\left(${value}\\right)` : value;
  return {
    elements,
    identity,
    convention:
      type === "C"
        ? `C_{${n}}=\\mathbb Z/${n}\\mathbb Z,\\quad 0\\text{ is the identity}`
        : type === "V"
          ? "V_4=(\\mathbb Z/2\\mathbb Z)^2,\\quad (a,b)+(c,d)=(a+c,b+d)\\pmod 2"
          : null,
    operationWord: additive ? "addition" : "multiplication",
    graphCaption: additive
      ? "ADDING THE SELECTED ELEMENT"
      : "RIGHT MULTIPLICATION BY THE SELECTED ELEMENT",
    product,
    inverse,
    coset: (representative: string, side: "left" | "right") =>
      side === "left"
        ? `${cosetRepresentative(representative)}${operation}H`
        : `H${operation}${cosetRepresentative(representative)}`,
    doubleCoset: (representative: string) =>
      `H${operation}${cosetRepresentative(representative)}${operation}K`,
    conjugate,
    action: (mode: GroupAction) => {
      const term = mode === "regular" ? product("h", "x") : conjugate("h", "x");
      return {
        presentation: `${mode === "regular" ? "Left translation" : "Conjugation"} $${term}$`,
        speech:
          mode === "regular"
            ? additive
              ? "Left translation, h plus x"
              : "Left translation, h times x"
            : additive
              ? "Conjugation, h plus x minus h"
              : "Conjugation, h x h inverse",
        definition: `h\\cdot x=${term}`,
        explanation:
          mode === "regular"
            ? `Left translation is transitive and free. Only the identity fixes $x$, since $${term}=x$ implies $h=${identity}$.`
            : "Under conjugation the stabilizer is $C_G(x)$; singleton orbits are exactly the central elements.",
      };
    },
  };
}
