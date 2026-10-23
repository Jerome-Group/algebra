import {
  cyclicScalarLabel,
  type CyclicFactor,
} from "@/lib/algebra/direct-products";

export const dihedralTex = ["e", "r", "r^2", "r^3", "s", "rs", "r^2s", "r^3s"];
export const dihedralClassTex = [
  "e",
  "r^2",
  String.raw`\{r,r^3\}`,
  String.raw`\{s,r^2s\}`,
  String.raw`\{rs,r^3s\}`,
];
export const dihedralCharacterTex = [
  String.raw`\chi_{++}`,
  String.raw`\chi_{+-}`,
  String.raw`\chi_{-+}`,
  String.raw`\chi_{--}`,
  String.raw`\chi_{\mathrm{plane}}`,
];
export const characterValueTex: Record<string, string> = {
  "-2": "-2",
  "-1": "-1",
  "0": "0",
  "1": "1",
  "2": "2",
  "−1": "-1",
  ω: String.raw`\omega`,
  "ω²": String.raw`\omega^2`,
  "−ω": String.raw`-\omega`,
  "−ω²": String.raw`-\omega^2`,
  "2ω": String.raw`2\omega`,
  "2ω²": String.raw`2\omega^2`,
  "-2ω": String.raw`-2\omega`,
  "-2ω²": String.raw`-2\omega^2`,
};
export const cyclicElementTex = (exponent: number) =>
  exponent === 0 ? "e" : exponent === 1 ? "a" : "a^2";
export const cyclicScalarTex = (order: CyclicFactor, exponent: number) =>
  characterValueTex[cyclicScalarLabel(order, exponent)];
