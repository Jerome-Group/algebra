export function planeRotation(angle: number, reflection = false) {
  const c = Math.cos(angle),
    s = Math.sin(angle),
    sign = reflection ? -1 : 1;
  return [
    [c, -sign * s],
    [s, sign * c],
  ];
}

export function axisRotation(axis: number[], degrees: number) {
  const length = Math.hypot(...axis);
  if (axis.length !== 3 || !Number.isFinite(length) || length === 0)
    throw new Error(
      "A rotation axis must be a nonzero vector in three dimensions",
    );
  const [x, y, z] = axis.map((value) => value / length);
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
