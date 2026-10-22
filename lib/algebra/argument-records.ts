import { z } from "zod";
import lessons from "./lessons.json" with { type: "json" };
import guided from "./guided-lessons.json" with { type: "json" };
import units from "./units.json" with { type: "json" };

export const argumentLimits = {
  records: 128,
  blocks: 32,
  sheetBytes: 96 * 1024,
  accountBytes: 4 * 1024 * 1024,
  textBytes: 16 * 1024,
  questionBytes: 2 * 1024,
  receipts: 4096,
  receiptLifetimeMs: 24 * 60 * 60 * 1000,
  requestBytes: 100 * 1024,
  importBytes: 8 * 1024 * 1024,
} as const;
export const argumentBytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength;
const boundedText = (bytes: number) =>
  z
    .string()
    .max(bytes)
    .refine(
      (value) => new TextEncoder().encode(value).byteLength <= bytes,
      "Text exceeds its UTF-8 byte limit.",
    );
const idSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/);
const lessonIdSchema = z
  .string()
  .max(128)
  .refine(
    (id) => lessons.some((lesson) => lesson.id === id),
    "Unknown public lesson.",
  );
const revisionSchema = z.number().int().nonnegative().safe();
export const teachingEditionSchema = z
  .object({
    version: z.literal(1),
    lessonId: lessonIdSchema,
    digest: z.string().regex(/^[0-9a-f]{64}$/),
    objects: boundedText(24 * 1024),
    statement: boundedText(24 * 1024),
    conventions: z.array(boundedText(8 * 1024)).max(32),
    proof: z
      .array(boundedText(16 * 1024))
      .min(1)
      .max(128),
  })
  .strict();
export const argumentBlockSchema = z
  .object({
    id: idSchema,
    text: boundedText(argumentLimits.textBytes),
    question: boundedText(argumentLimits.questionBytes),
    review: z.enum(["unreviewed", "needs-work", "revisited"]),
    reference: z.number().int().nonnegative().safe().nullable(),
  })
  .strict();
export const argumentSheetSchema = z
  .object({
    version: z.literal(1),
    id: idSchema,
    lessonId: lessonIdSchema,
    unitId: z
      .string()
      .max(128)
      .refine(
        (id) => units.some((unit) => unit.id === id),
        "Unknown public unit.",
      )
      .nullable(),
    edition: teachingEditionSchema,
    blocks: z.array(argumentBlockSchema).min(1).max(argumentLimits.blocks),
    activeBlockId: idSchema.nullable(),
  })
  .strict()
  .superRefine((sheet, context) => {
    if (
      sheet.edition.lessonId !== sheet.lessonId ||
      new Set(sheet.blocks.map((block) => block.id)).size !==
        sheet.blocks.length ||
      (sheet.activeBlockId !== null &&
        !sheet.blocks.some((block) => block.id === sheet.activeBlockId)) ||
      sheet.blocks.some(
        (block) =>
          block.reference !== null &&
          block.reference >= sheet.edition.proof.length,
      )
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Inconsistent sheet references.",
      });
    if (argumentBytes(sheet) > argumentLimits.sheetBytes)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Complete argument sheet exceeds 96 KiB.",
      });
  });
export const savedArgumentSchema = z
  .object({ sheet: argumentSheetSchema, revision: revisionSchema })
  .strict();
export type TeachingEdition = z.infer<typeof teachingEditionSchema>;
export type ArgumentBlock = z.infer<typeof argumentBlockSchema>;
export type ArgumentSheet = z.infer<typeof argumentSheetSchema>;
export type SavedArgument = z.infer<typeof savedArgumentSchema>;

export function teachingFields(
  edition: Omit<TeachingEdition, "digest"> | TeachingEdition,
) {
  return {
    version: edition.version,
    lessonId: edition.lessonId,
    objects: edition.objects,
    statement: edition.statement,
    conventions: edition.conventions,
    proof: edition.proof,
  };
}
export async function argumentDigest(value: unknown) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function teachingEdition(
  lessonId: string,
): Promise<TeachingEdition> {
  const lesson = lessons.find((entry) => entry.id === lessonId);
  if (!lesson) throw new Error("Unknown public lesson.");
  const source = Object.entries(guided).find(([id]) => id === lessonId)?.[1];
  const teaching = z
    .object({ objects: z.string(), proofSteps: z.array(z.string()).min(1) })
    .parse(source);
  const fields = {
    version: 1 as const,
    lessonId,
    objects: teaching.objects,
    statement: lesson.theorem,
    conventions:
      "conventions" in lesson && typeof lesson.conventions === "string"
        ? [lesson.conventions]
        : [],
    proof: teaching.proofSteps,
  };
  return teachingEditionSchema.parse({
    ...fields,
    digest: await argumentDigest(fields),
  });
}
export async function validateArgumentEdition(sheet: ArgumentSheet) {
  if (
    (await argumentDigest(teachingFields(sheet.edition))) !==
    sheet.edition.digest
  )
    throw new Error(
      "Teaching edition digest does not match its retained mathematical fields.",
    );
  const current = await teachingEdition(sheet.lessonId);
  return { current: current.digest === sheet.edition.digest, edition: current };
}

export const argumentMutationSchema = z
  .object({
    operationId: z.string().uuid(),
    expectedAccountId: z.string().min(1).max(512),
    createdAt: z.number().int().nonnegative().safe(),
    operation: z.discriminatedUnion("kind", [
      z
        .object({
          kind: z.literal("put"),
          expectedRevision: revisionSchema,
          sheet: argumentSheetSchema,
        })
        .strict(),
      z
        .object({
          kind: z.literal("delete"),
          expectedRevision: revisionSchema.min(1),
          id: idSchema,
        })
        .strict(),
    ]),
  })
  .strict();
export type ArgumentMutation = z.infer<typeof argumentMutationSchema>;
export const argumentRecordSchema = z.discriminatedUnion("kind", [
  z
    .object({ kind: z.literal("supported"), saved: savedArgumentSchema })
    .strict(),
  z
    .object({
      kind: z.literal("unsupported"),
      id: idSchema,
      revision: revisionSchema,
      raw: z.string(),
    })
    .strict(),
]);
export const argumentAcknowledgementSchema = z
  .object({
    operationId: z.string().uuid(),
    payloadHash: z.string().regex(/^[0-9a-f]{64}$/),
    recordId: idSchema,
    revision: revisionSchema,
    kind: z.enum(["put", "delete"]),
  })
  .strict();
export const argumentResponseSchema = z
  .object({
    kind: z.literal("account"),
    accountId: z.string().min(1).max(512),
    records: z.array(argumentRecordSchema).max(argumentLimits.records),
    acknowledgement: argumentAcknowledgementSchema.optional(),
    error: z.string().optional(),
  })
  .strict();
export type ArgumentResponse = z.infer<typeof argumentResponseSchema>;
export const argumentErrorSchema = z.object({ error: z.string() }).strict();

const backupSchema = z
  .object({
    format: z.literal("algebra-arguments-export-v1"),
    saved: z.array(savedArgumentSchema).max(argumentLimits.records),
    active: argumentSheetSchema.nullable(),
    unsupported: z
      .array(
        z
          .object({ id: idSchema, revision: revisionSchema, raw: z.string() })
          .strict(),
      )
      .max(argumentLimits.records),
    pending: argumentMutationSchema.nullable(),
  })
  .strict();
export function previewArgumentImport(raw: unknown): {
  sheets: ArgumentSheet[];
  warnings: string[];
} {
  if (typeof raw === "string") {
    if (new TextEncoder().encode(raw).byteLength > argumentLimits.importBytes)
      throw new Error("Argument import exceeds 8 MiB.");
    raw = JSON.parse(raw);
  }
  if (argumentBytes(raw) > argumentLimits.importBytes)
    throw new Error("Argument import exceeds 8 MiB.");
  const parsed = backupSchema.parse(raw);
  const sheets = new Map(parsed.saved.map(({ sheet }) => [sheet.id, sheet]));
  if (parsed.active) sheets.set(parsed.active.id, parsed.active);
  if (sheets.size > argumentLimits.records)
    throw new Error("Argument import contains too many sheets.");
  return {
    sheets: [...sheets.values()],
    warnings: [
      "Imported writing is temporary until explicitly saved. New record IDs will belong to the currently confirmed account.",
      "Retained teaching may be historical. Its digest is checked before import; self-review grants no competency credit.",
      ...(parsed.unsupported.length
        ? [
            "Unreadable or newer records remain in the original export; this version cannot import them.",
          ]
        : []),
      ...(parsed.pending
        ? [
            "An unresolved operation is retained in the original export. Import creates copies; it does not retry that delivery.",
          ]
        : []),
    ],
  };
}
