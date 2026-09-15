export type RotationConfig =
  | { kind: "axis-angle"; axis: [1, 1, 1]; angle: number }
  | {
      kind: "plane-representation";
      order: 3;
      dimension: 2;
      field: "real" | "complex";
    };
export function rotationConfig(value: unknown): RotationConfig {
  if (!value || typeof value !== "object")
    throw new Error("Missing rotation configuration");
  const config = value as Record<string, unknown>;
  if (
    config.kind === "plane-representation" &&
    config.order === 3 &&
    config.dimension === 2 &&
    (config.field === "real" || config.field === "complex")
  )
    return config as RotationConfig;
  if (
    config.kind === "axis-angle" &&
    Array.isArray(config.axis) &&
    config.axis.length === 3 &&
    config.axis.every((v) => v === 1) &&
    Math.hypot(...config.axis) > 0 &&
    typeof config.angle === "number" &&
    Number.isFinite(config.angle) &&
    config.angle >= 0 &&
    config.angle <= 360
  )
    return config as RotationConfig;
  throw new Error(
    "Unsupported rotation configuration: group, field, dimension and axis must match the laboratory",
  );
}
