import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  publicFiles,
  sourceSchema,
  sha256,
  delimiterParts,
  validateTex,
} from "./math-presentation.mjs";

export const reviewFile = "lib/algebra/math-presentation/review.json";
const digestSchema = z.string().regex(/^[0-9a-f]{64}$/);
export const reviewSchema = z
  .object({
    version: z.literal(1),
    status: z.literal("reviewed"),
    sources: sourceSchema,
    annotationDigest: digestSchema,
    queueDigest: digestSchema,
    reviewedStrings: z.number().int().nonnegative().safe(),
    reviewedOccurrences: z.number().int().nonnegative().safe(),
    reports: z
      .array(
        z
          .object({
            path: z
              .string()
              .max(240)
              .regex(
                /^docs\/research\/(?:[A-Za-z0-9][A-Za-z0-9._-]*\/)*[A-Za-z0-9][A-Za-z0-9._-]*\.md$/,
              ),
            sha256: digestSchema,
          })
          .strict(),
      )
      .min(1)
      .max(32)
      .refine(
        (reports) =>
          new Set(reports.map(({ path }) => path)).size === reports.length,
        "Review report paths must be distinct",
      ),
  })
  .strict();

export async function readReview(root) {
  let bytes;
  try {
    bytes = await readFile(path.resolve(root, reviewFile), "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return null;
  }
  return reviewSchema.parse(JSON.parse(bytes));
}

export function reviewBindings(catalogue, manifest) {
  return {
    sources: Object.fromEntries(
      publicFiles.map((file) => [file, catalogue.sources[file].hash]),
    ),
    annotationDigest: sha256(JSON.stringify(manifest)),
    queueDigest: sha256(JSON.stringify(catalogue.entries)),
    reviewedStrings: catalogue.entries.length,
    reviewedOccurrences: catalogue.entries.reduce(
      (count, entry) => count + entry.occurrences.length,
      0,
    ),
  };
}

function validateDelimitedTex(text) {
  for (const part of delimiterParts(text))
    if (part.kind !== "text") validateTex(part.text);
}

function sourceString(catalogue, occurrence) {
  return occurrence.pointer
    .slice(1)
    .split("/")
    .map((key) => key.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce(
      (value, key) => value[key],
      catalogue.sources[occurrence.file].value,
    );
}

function validateCatalogueTex(catalogue, compiled) {
  const validate = (text, context, direct = false) => {
    try {
      if (direct) validateTex(text);
      else validateDelimitedTex(text);
    } catch (error) {
      throw new Error(`Invalid TeX at ${context}: ${error.message}`);
    }
  };
  for (const entry of catalogue.entries)
    validate(entry.text, `${entry.source.file}${entry.source.pointer}`);
  for (const occurrence of catalogue.excluded)
    validate(
      sourceString(catalogue, occurrence),
      `${occurrence.file}${occurrence.pointer}`,
      occurrence.reason === "direct-tex",
    );
  for (const record of compiled.mappings)
    validate(
      record.presented,
      `presentation ${record.source.file}${record.source.pointer}`,
    );
}

export async function verifyCompleteReview({
  root,
  catalogue,
  manifest,
  compiled,
  review,
}) {
  if (!review)
    throw new Error(`Missing reviewed-completeness attestation ${reviewFile}`);
  const expected = reviewBindings(catalogue, manifest);
  for (const file of publicFiles)
    if (review.sources[file] !== expected.sources[file])
      throw new Error(`Review source hash changed for ${file}`);
  for (const field of [
    "annotationDigest",
    "queueDigest",
    "reviewedStrings",
    "reviewedOccurrences",
  ])
    if (review[field] !== expected[field])
      throw new Error(
        `Review ${field} does not match the complete current catalogue`,
      );
  const researchRoot = path.join(await realpath(root), "docs/research");
  for (const report of review.reports) {
    const file = await realpath(path.resolve(root, report.path));
    if (
      !file.startsWith(researchRoot + path.sep) ||
      !(await stat(file)).isFile()
    )
      throw new Error(
        `Review report is outside docs/research or is not a file: ${report.path}`,
      );
    if (sha256(await readFile(file)) !== report.sha256)
      throw new Error(`Review report bytes changed for ${report.path}`);
  }
  validateCatalogueTex(catalogue, compiled);
  return expected;
}
