export function planeRotation(angle: number, reflection = false) {
  const c = Math.cos(angle),
    s = Math.sin(angle),
    sign = reflection ? -1 : 1;
  return [
    [c, -sign * s],
    [s, sign * c],
  ];
}

export type Vector3 = readonly [number, number, number];

export function normalizeAxis(axis: readonly number[]): Vector3 | null {
  if (axis.length !== 3 || !axis.every(Number.isFinite)) return null;
  const scale = Math.max(...axis.map(Math.abs));
  if (!(scale > 0)) return null;
  const x = axis[0] / scale;
  const y = axis[1] / scale;
  const z = axis[2] / scale;
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

export function axisRotation(axis: readonly number[], degrees: number) {
  const direction = normalizeAxis(axis);
  if (!direction)
    throw new Error(
      "A rotation axis must be a nonzero vector in three dimensions",
    );
  const [x, y, z] = direction;
  const t = (degrees * Math.PI) / 180,
    c = Math.cos(t),
    s = Math.sin(t),
    d = 1 - c;
  return [
    [c + x * x * d, x * y * d - z * s, x * z * d + y * s],
    [y * x * d + z * s, c + y * y * d, y * z * d - x * s],
    [z * x * d - y * s, z * y * d + x * s, c + z * z * d],
  ];
}
