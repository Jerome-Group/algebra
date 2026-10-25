import { z } from "zod";
import {
  digestSchema,
  fileSchema,
  referenceSchema,
  nodeSchema,
  segmentsSchema,
  stateSchema,
  valueSchema,
} from "./schema.mjs";
const unique = (rows, key) => new Set(rows.map(key)).size === rows.length;
const name = z
  .string()
  .min(1)
  .max(1000)
  .refine((value) => !value.includes("*"));
export const identitySchema = z
  .object({
    version: z.literal(2),
    algorithm: z.literal("sha256"),
    sourceDigest: digestSchema,
    inputCount: z.number().int().positive(),
    directDependencyDigest: digestSchema,
    directDependencyCount: z.number().int().nonnegative(),
  })
  .strict();
export const snapshotSchema = z
  .object({
    sourceSetDigest: digestSchema,
    contractDigest: digestSchema,
    graphDigest: digestSchema,
    identity: identitySchema,
    dependencies: digestSchema,
  })
  .strict();
export const assetSchema = z
  .object({
    file: fileSchema,
    sha256: digestSchema,
    bytes: z.number().int().nonnegative(),
  })
  .strict();
const manifestChunk = z
  .object({
    file: fileSchema,
    src: z.string().optional(),
    name: z.string().optional(),
    isEntry: z.boolean().optional(),
    isDynamicEntry: z.boolean().optional(),
    imports: z.array(z.string()).optional(),
    dynamicImports: z.array(z.string()).optional(),
    css: z.array(fileSchema).optional(),
    assets: z.array(fileSchema).optional(),
  })
  .strict();
export const buildSchema = z
  .object({
    version: z.literal("public-math-build-v2"),
    sourceAcceptanceDigest: digestSchema,
    before: snapshotSchema,
    after: snapshotSchema,
    identity: identitySchema,
    command: z.array(name).min(1),
    runtime: z.literal("v24.19.0"),
    exitCode: z.literal(0),
    manifest: z
      .array(assetSchema)
      .min(1)
      .refine((rows) => unique(rows, ({ file }) => file)),
    manifestDigest: digestSchema,
    clientManifest: z.record(manifestChunk),
    excluded: z.literal("public-math-build.json"),
  })
  .strict();
const registration = z
  .object({
    id: name,
    parentId: name.nullable(),
    file: fileSchema,
    line: z.number().int().positive(),
    column: z.number().int().positive(),
    titlePath: z.array(name).min(1),
    rawTitlePath: z.array(z.string()).min(1),
    project: z.string().nullable(),
    repeat: z.number().int().nonnegative(),
    sourceSha256: digestSchema,
  })
  .strict();
const attempt = z
  .object({
    id: name,
    retry: z.number().int().nonnegative(),
    status: z.enum([
      "passed",
      "failed",
      "skipped",
      "timedOut",
      "interrupted",
      "cancelled",
    ]),
    expectedStatus: z.enum([
      "passed",
      "failed",
      "skipped",
      "timedOut",
      "interrupted",
    ]),
    skip: z.boolean(),
    todo: z.boolean(),
    errors: z.array(z.string()),
  })
  .strict();
const producer = z
  .object({ source: nodeSchema, formatter: nodeSchema.nullable() })
  .strict();
const observationBase = {
  id: digestSchema,
  caseId: name,
  inputs: stateSchema.or(z.object({}).strict()),
  producer,
};
const region = z
  .object({
    selector: name,
    count: z.literal(1),
    visible: z.literal(true),
    mode: z.literal("rendered"),
    route: z.string(),
    viewport: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict(),
  })
  .strict();
const controls = z
  .array(
    z
      .object({
        path: name,
        selector: name,
        read: z.enum([
          "value",
          "checked",
          "aria-valuenow",
          "selected-value",
          "number",
        ]),
        value: z.union([
          z.string(),
          z.number().finite(),
          z.boolean(),
          z.null(),
        ]),
      })
      .strict(),
  )
  .refine((rows) => unique(rows, ({ path }) => path));
export const observationSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...observationBase,
      kind: z.literal("content"),
      region,
      controls,
      segments: segmentsSchema,
    })
    .strict(),
  z
    .object({
      ...observationBase,
      kind: z.literal("producer"),
      value: valueSchema,
    })
    .strict(),
  z
    .object({
      ...observationBase,
      kind: z.literal("effect"),
      effectKind: z.enum([
        "numeric-computation",
        "geometry",
        "file-reset",
        "private-download",
        "paint",
        "resource",
      ]),
      value: valueSchema,
      binary64: z.record(z.string().regex(/^[0-9a-f]{16}$/)),
    })
    .strict(),
  z
    .object({
      ...observationBase,
      kind: z.literal("svg-geometry"),
      region,
      controls,
      namespace: z.literal("http://www.w3.org/2000/svg"),
      tag: z.literal("svg"),
      viewBox: z.string(),
      writers: z
        .array(
          z
            .object({
              id: name,
              selector: name,
              tag: z.enum(["line", "polygon"]),
              count: z.literal(1),
              namespace: z.literal("http://www.w3.org/2000/svg"),
              value: valueSchema,
            })
            .strict(),
        )
        .min(1),
    })
    .strict(),
]);
const target = z
  .object({
    root: z.string().min(1),
    origin: z.string().url(),
    ownerFile: fileSchema,
    ownerSha256: digestSchema,
    runId: z.string().uuid(),
    pid: z.number().int().positive(),
    processIdentity: name,
    kind: z.literal("built"),
    acknowledgedRunId: z.string().uuid(),
    identity: identitySchema,
    sourceMatch: z.literal("matched"),
    dependencyMatch: z.literal("matched"),
  })
  .strict();
export const executionBindingSchema = z
  .object({
    version: z.literal("public-math-binding-v3"),
    admission: referenceSchema,
    runId: z.string().uuid(),
    cohort: referenceSchema.nullable(),
    slot: z.string().nullable(),
  })
  .strict();
export const checksSchema = z
  .array(
    z
      .object({
        name: z.string().min(1),
        status: z.enum(["passed", "failed"]),
      })
      .passthrough(),
  )
  .min(1);
export const runSchema = z
  .object({
    version: z.literal("public-math-run-v2"),
    runId: z.string().uuid(),
    binding: executionBindingSchema.optional(),
    invocation: z.string().uuid(),
    runner: z.enum(["node:test", "playwright"]),
    runtime: name,
    argv: z.array(z.string()),
    sourceAcceptanceDigest: digestSchema,
    buildEvidenceDigest: digestSchema,
    snapshot: snapshotSchema,
    snapshotAfter: snapshotSchema,
    selection: z
      .object({
        shard: z
          .object({
            index: z.number().int().positive(),
            total: z.number().int().positive(),
          })
          .strict()
          .nullable(),
        filtered: z.boolean(),
      })
      .strict(),
    registrations: z
      .array(registration)
      .min(1)
      .refine((rows) => unique(rows, ({ id }) => id)),
    attempts: z.array(attempt),
    observations: z
      .array(observationSchema)
      .refine((rows) => unique(rows, ({ id }) => id)),
    resources: z.array(
      z
        .object({
          caseId: name,
          file: fileSchema,
          url: z.string().url(),
          status: z.literal(200),
          sha256: digestSchema,
          bytes: z.number().int().nonnegative(),
        })
        .strict(),
    ),
    targetBefore: target.nullable(),
    targetAfter: target.nullable(),
    exitCode: z.number().int(),
    interrupted: z.boolean(),
    recorderErrors: z.array(z.string()),
  })
  .strict();
export const executionIndexSchema = z
  .object({
    version: z.enum(["public-math-execution-v2", "public-math-execution-v3"]),
    runId: z.string().uuid(),
    sourceAcceptanceDigest: digestSchema,
    build: referenceSchema,
    binding: referenceSchema.optional(),
    checks: referenceSchema.optional(),
    descriptors: z.array(referenceSchema).min(1).optional(),
    invocationChecks: z.array(referenceSchema).min(1).optional(),
    targetOwner: referenceSchema.optional(),
    runs: z
      .array(referenceSchema)
      .min(1)
      .refine((rows) => unique(rows, ({ file }) => file)),
    cleanup: z
      .array(
        z
          .object({
            runId: z.string().uuid(),
            owner: referenceSchema,
            stopped: z.literal(true),
            portClosed: z.literal(true),
          })
          .strict(),
      )
      .refine((rows) => unique(rows, ({ runId }) => runId)),
  })
  .strict();
