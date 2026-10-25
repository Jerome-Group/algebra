import { lstat } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../math-presentation.mjs";
export const stableValue = (value) =>
  Array.isArray(value)
    ? value.map(stableValue)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, stableValue(value[key])]),
        )
      : value;
export const canonical = (value) => JSON.stringify(stableValue(value));
export const hashValue = (value) => sha256(canonical(value));
export const slash = (file) => file.split(path.sep).join("/");

export async function existing(file) {
  try {
    return await lstat(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return null;
  }
}
