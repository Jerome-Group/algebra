const mod = (value: number, modulus: number) =>
  ((value % modulus) + modulus) % modulus;

export function powerSequence(element: number, modulus: number) {
  const powers: number[] = [];
  let value = 1;
  for (let exponent = 1; exponent <= modulus; exponent++) {
    value = mod(value * element, modulus);
    powers.push(value);
    if (value === 0 || powers.slice(0, -1).includes(value)) break;
  }
  return powers;
}

export function nilradicalElements(modulus: 6 | 8) {
  return Array.from({ length: modulus }, (_, value) => value).filter((value) =>
    powerSequence(value, modulus).includes(0),
  );
}

export function radicalPowers(modulus: 6 | 8) {
  const generator = modulus === 8 ? 2 : 6;
  const ideals: number[][] = [];
  let power = 1;
  for (let exponent = 1; exponent <= 3; exponent++) {
    power *= generator;
    ideals.push(
      Array.from({ length: modulus }, (_, value) => value).filter(
        (value) => value % power === 0,
      ),
    );
    if (ideals.at(-1)?.length === 1) break;
  }
  return ideals;
}
