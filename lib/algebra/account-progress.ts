import { z } from "zod";
import lessons from "./lessons.json" with { type: "json" };
import {
  assessmentRevision,
  emptyProgress,
  progressRecordSupported,
  progressStorageKey,
  readProgress,
  submitAttempt,
  type AssessmentRegistry,
  type Attempt,
  type Progress,
} from "./progress";

export const accountByteLimit = 1_900_000;
export const receiptLimit = 64;
export const progressBackupKey = `${progressStorageKey}-backup`;
export const resumeStorageKey = "algebra-resume-v1";
export const squareStorageKey = "algebra-ureca-square-element-v1";
export const legacyKeys = [
  progressStorageKey,
  progressBackupKey,
  resumeStorageKey,
  squareStorageKey,
] as const;

const keySchema = z
  .string()
  .min(1)
  .max(256)
  .refine((key) => !["__proto__", "prototype", "constructor"].includes(key));
const attemptSchema = z
  .object({
    revision: z.string().max(16_384),
    choice: z.number().int().nonnegative().safe(),
    submissions: z.number().int().positive().safe(),
  })
  .strict();
export const progressSchema = z
  .object({
    version: z.literal(1),
    attempts: z.record(keySchema, attemptSchema),
    archived: z.record(keySchema, z.array(attemptSchema)).optional(),
  })
  .strict();
const lessonIdSchema = z
  .string()
  .refine((id) => lessons.some((lesson) => lesson.id === id), "Unknown lesson");
export const preferencesSchema = z
  .object({
    resumeLessonId: lessonIdSchema.nullable(),
    squareElement: z.number().int().min(0).max(7).nullable(),
  })
  .strict();
export const accountDataSchema = z
  .object({
    progress: progressSchema,
    preferences: preferencesSchema,
  })
  .strict();
const revisionSchema = z.number().int().nonnegative().safe();
export const documentSchema = accountDataSchema
  .extend({
    schemaVersion: z.literal(1),
    revision: revisionSchema,
    previous: z
      .object({
        data: accountDataSchema,
        restorableAt: revisionSchema,
      })
      .strict()
      .nullable(),
    receipts: z
      .array(
        z
          .object({
            operationId: z.string().uuid(),
            payloadHash: z.string().regex(/^[0-9a-f]{64}$/),
            appliedRevision: revisionSchema,
          })
          .strict(),
      )
      .max(receiptLimit),
  })
  .strict()
  .refine(
    (document) =>
      document.receipts.every(
        (receipt) => receipt.appliedRevision <= document.revision,
      ) &&
      new Set(document.receipts.map((receipt) => receipt.operationId)).size ===
        document.receipts.length &&
      (document.previous === null ||
        document.previous.restorableAt === document.revision),
    "Inconsistent account revision",
  );
export const legacyRecordsSchema = z
  .object({
    [progressStorageKey]: z.string().nullable(),
    [progressBackupKey]: z.string().nullable(),
    [resumeStorageKey]: z.string().nullable(),
    [squareStorageKey]: z.string().nullable(),
  })
  .strict();
const submitSchema = z
  .object({
    kind: z.literal("submit"),
    assessmentId: keySchema,
    assessmentRevision: z.string().max(16_384),
    choice: z.number().int().nonnegative().safe(),
  })
  .strict();
export const operationSchema = z.discriminatedUnion("kind", [
  submitSchema,
  z.object({ kind: z.literal("resume"), lessonId: lessonIdSchema }).strict(),
  z
    .object({
      kind: z.literal("square"),
      element: z.number().int().min(0).max(7),
    })
    .strict(),
  z.object({ kind: z.literal("reset") }).strict(),
  z.object({ kind: z.literal("undo") }).strict(),
  z
    .object({
      kind: z.literal("import"),
      legacy: legacyRecordsSchema,
      draft: accountDataSchema.nullable(),
    })
    .strict(),
]);
export const mutationSchema = z
  .object({
    operationId: z.string().uuid(),
    expectedAccountId: z.string().min(1).max(512),
    expectedRevision: revisionSchema,
    operation: operationSchema,
  })
  .strict();
export const accountUserSchema = z
  .object({
    id: z.string().min(1).max(512),
    displayName: z.string(),
    email: z.string(),
  })
  .strict();
const recordSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("supported"), document: documentSchema }).strict(),
  z
    .object({
      kind: z.literal("unsupported"),
      raw: z.string(),
      revision: revisionSchema,
    })
    .strict(),
]);
export const accountResponseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("guest") }).strict(),
  z
    .object({
      kind: z.literal("account"),
      user: accountUserSchema,
      record: recordSchema,
      acknowledgement: z
        .object({
          operationId: z.string().uuid(),
          appliedRevision: revisionSchema,
        })
        .strict()
        .optional(),
      error: z.string().optional(),
    })
    .strict(),
]);
export type AccountData = z.infer<typeof accountDataSchema>;
export type AccountDocument = z.infer<typeof documentSchema>;
export type AccountUser = z.infer<typeof accountUserSchema>;
export type AccountResponse = z.infer<typeof accountResponseSchema>;
export type AccountMutation = z.infer<typeof mutationSchema>;
export type AccountOperation = z.infer<typeof operationSchema>;
export type LegacyRecords = z.infer<typeof legacyRecordsSchema>;
export const emptyAccountData = (): AccountData => ({
  progress: emptyProgress(),
  preferences: { resumeLessonId: null, squareElement: null },
});
export const emptyAccountDocument = (): AccountDocument => ({
  ...emptyAccountData(),
  schemaVersion: 1,
  revision: 0,
  previous: null,
  receipts: [],
});
export const emptyLegacyRecords = (): LegacyRecords => ({
  [progressStorageKey]: null,
  [progressBackupKey]: null,
  [resumeStorageKey]: null,
  [squareStorageKey]: null,
});
export const serializedBytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength;

export function legacyPreview(
  records: LegacyRecords,
  registry: AssessmentRegistry,
) {
  const currentRaw = records[progressStorageKey];
  const candidates: Progress[] = [];
  const statuses: { key: string; status: string }[] = [];
  const preserve = (raw: string | null) => {
    if (raw === null || !progressRecordSupported(raw)) return false;
    const parsed = progressSchema.safeParse(readProgress(raw, registry));
    if (!parsed.success) return false;
    candidates.push(parsed.data);
    return true;
  };
  const currentSupported = preserve(currentRaw);
  statuses.push({
    key: progressStorageKey,
    status:
      currentRaw === null
        ? "absent"
        : currentSupported
          ? "supported"
          : "unreadable or newer; export only",
  });
  const backupRaw = records[progressBackupKey];
  const backupSchema = z
    .object({
      version: z.literal(1),
      record: z.string().nullable(),
      restoreTarget: z.string().nullable().optional(),
    })
    .strict();
  let backupSupported = false;
  if (backupRaw !== null) {
    try {
      const backup = backupSchema.safeParse(JSON.parse(backupRaw));
      if (backup.success) {
        backupSupported = true;
        preserve(backup.data.record);
        preserve(backup.data.restoreTarget ?? null);
      }
    } catch {}
  }
  statuses.push({
    key: progressBackupKey,
    status:
      backupRaw === null
        ? "absent"
        : backupSupported
          ? "supported"
          : "unreadable or newer; export only",
  });
  const resume = lessonIdSchema.safeParse(records[resumeStorageKey]);
  const squareRaw = records[squareStorageKey];
  const square =
    squareRaw !== null && /^[0-7]$/.test(squareRaw) ? Number(squareRaw) : null;
  statuses.push({
    key: resumeStorageKey,
    status:
      records[resumeStorageKey] === null
        ? "absent"
        : resume.success
          ? "supported"
          : "unknown lesson; export only",
  });
  statuses.push({
    key: squareStorageKey,
    status:
      squareRaw === null
        ? "absent"
        : square !== null
          ? "supported"
          : "invalid element; export only",
  });
  return {
    statuses,
    candidates,
    preferences: {
      resumeLessonId: resume.success ? resume.data : null,
      squareElement: square,
    },
  };
}

function mergeProgress(account: Progress, incoming: Progress): Progress {
  const attempts = { ...account.attempts };
  const archived = { ...account.archived };
  const preserve = (id: string, attempt: Attempt) => {
    const history = Object.hasOwn(archived, id) ? archived[id] : [];
    if (
      !history.some((item) => JSON.stringify(item) === JSON.stringify(attempt))
    )
      Object.defineProperty(archived, id, {
        value: [...history, attempt],
        enumerable: true,
        configurable: true,
      });
  };
  for (const [id, history] of Object.entries(incoming.archived ?? {}))
    for (const attempt of history) preserve(id, attempt);
  for (const [id, attempt] of Object.entries(incoming.attempts)) {
    if (!Object.hasOwn(attempts, id))
      Object.defineProperty(attempts, id, {
        value: attempt,
        enumerable: true,
        configurable: true,
      });
    else if (JSON.stringify(attempts[id]) !== JSON.stringify(attempt))
      preserve(id, attempt);
  }
  return {
    version: 1,
    attempts,
    ...(Object.keys(archived).length ? { archived } : {}),
  };
}

export function importAccountData(
  data: AccountData,
  operation: Extract<AccountOperation, { kind: "import" }>,
  registry: AssessmentRegistry,
): AccountData {
  const preview = legacyPreview(operation.legacy, registry);
  let progress = readProgress(JSON.stringify(data.progress), registry);
  for (const incoming of preview.candidates)
    progress = mergeProgress(progress, incoming);
  if (operation.draft)
    progress = mergeProgress(
      progress,
      readProgress(JSON.stringify(operation.draft.progress), registry),
    );
  return {
    progress,
    preferences: {
      resumeLessonId:
        data.preferences.resumeLessonId ??
        preview.preferences.resumeLessonId ??
        operation.draft?.preferences.resumeLessonId ??
        null,
      squareElement:
        data.preferences.squareElement ??
        preview.preferences.squareElement ??
        operation.draft?.preferences.squareElement ??
        null,
    },
  };
}

export function validateAssessmentOperation(
  operation: AccountOperation,
  registry: AssessmentRegistry,
) {
  if (operation.kind !== "submit") return;
  const assessment = Object.hasOwn(registry, operation.assessmentId)
    ? registry[operation.assessmentId]
    : undefined;
  if (
    !assessment ||
    assessmentRevision(assessment) !== operation.assessmentRevision ||
    operation.choice >= assessment.choices.length
  )
    throw new Error(
      "Assessment changed or choice is invalid. Reload the question before submitting again.",
    );
}

export function applyAccountOperation(
  document: AccountDocument,
  operation: AccountOperation,
  registry: AssessmentRegistry,
): AccountDocument {
  if (document.revision === Number.MAX_SAFE_INTEGER)
    throw new Error("Revision limit reached; export your account record.");
  const revision = document.revision + 1;
  const base = {
    ...document,
    progress: readProgress(JSON.stringify(document.progress), registry),
    revision,
    previous: null,
  };
  switch (operation.kind) {
    case "submit": {
      validateAssessmentOperation(operation, registry);
      return {
        ...base,
        progress: submitAttempt(
          base.progress,
          registry,
          operation.assessmentId,
          operation.choice,
        ),
      };
    }
    case "resume":
      return {
        ...base,
        preferences: {
          ...base.preferences,
          resumeLessonId: operation.lessonId,
        },
      };
    case "square":
      return {
        ...base,
        preferences: { ...base.preferences, squareElement: operation.element },
      };
    case "reset":
      return {
        ...base,
        progress: emptyProgress(),
        previous: {
          data: {
            progress: document.progress,
            preferences: document.preferences,
          },
          restorableAt: revision,
        },
      };
    case "undo":
      if (
        !document.previous ||
        document.previous.restorableAt !== document.revision
      )
        throw new Error(
          "The reset can no longer be undone after another save.",
        );
      return { ...base, ...document.previous.data };
    case "import":
      return {
        ...base,
        ...importAccountData(document, operation, registry),
      };
  }
}
