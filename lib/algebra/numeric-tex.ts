export function numberTex(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const [coefficient, exponent] = String(value).split("e");
  if (exponent === undefined) return coefficient;
  const power = `10^{${Number(exponent)}}`;
  if (coefficient === "1") return power;
  if (coefficient === "-1") return `-${power}`;
  return `${coefficient}\\times ${power}`;
}

export function degreeTex(value: number): string | null {
  const numeral = numberTex(value);
  if (numeral === null) return null;
  return String(value).includes("e")
    ? `\\left(${numeral}\\right)^{\\circ}`
    : `{${numeral}}^{\\circ}`;
}
