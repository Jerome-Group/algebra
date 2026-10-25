import { z } from "zod";

const unique = (rows, key) => new Set(rows.map(key)).size === rows.length;
export const digestSchema = z.string().regex(/^[0-9a-f]{64}$/);
const name = z
  .string()
  .min(1)
  .max(400)
  .refine((value) => !value.includes("*"));
export const fileSchema = z
  .string()
  .max(400)
  .regex(/^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9_.@/-]+$/);
export const referenceSchema = z
  .object({ file: fileSchema, sha256: digestSchema })
  .strict();
export const nodeSchema = referenceSchema
  .extend({
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    nodeSha256: digestSchema,
  })
  .strict()
  .refine(({ start, end }) => end > start);
const nodes = z.array(nodeSchema).min(1);
export const stateSchema = z
  .record(z.union([z.string(), z.number().finite(), z.boolean(), z.null()]))
  .refine((value) => Object.keys(value).length > 0);
const namedState = z.object({ name, inputs: stateSchema }).strict();
const states = z
  .array(namedState)
  .min(1)
  .refine(
    (rows) =>
      unique(rows, ({ name }) => name) &&
      unique(rows, ({ inputs }) =>
        JSON.stringify(Object.entries(inputs).sort()),
      ),
  );
export const domainSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("finite"),
      states,
      claim: z.literal("all-declared-states"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("model"),
      inputContract: nodeSchema,
      invariants: z.array(name).min(1),
      boundaryStates: states.refine((rows) => rows.length >= 3),
      unexecutedDomain: z.string().min(12),
      claim: z.literal("reviewed-model-with-boundary-obligations"),
    })
    .strict(),
]);
export const segmentsSchema = z
  .array(
    z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("prose"), text: z.string() }).strict(),
      z
        .object({
          kind: z.literal("math"),
          tex: z.string().min(1),
          display: z.boolean(),
        })
        .strict(),
    ]),
  )
  .min(1);
export const fixtureSchema = z
  .object({
    runner: z.enum(["node:test", "playwright"]),
    case: name,
    titlePath: z.array(name).min(1),
    source: nodeSchema,
    parameters: z.record(
      z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
    ),
    project: z.string().nullable(),
    repeat: z.number().int().nonnegative(),
    closure: z
      .array(referenceSchema)
      .refine((rows) => unique(rows, ({ file }) => file)),
  })
  .strict()
  .refine(
    (value) =>
      value.titlePath.at(-1) === value.case &&
      (value.runner !== "node:test" ||
        (value.project === null && value.repeat === 0)),
  );
const fixture = fixtureSchema;
export const presentationSchema = z
  .object({
    region: name,
    inputs: z
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
          })
          .strict(),
      )
      .refine((rows) => unique(rows, ({ path }) => path)),
    resources: z
      .array(fileSchema)
      .refine((rows) => unique(rows, (file) => file)),
  })
  .strict();
export const valueSchema = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(valueSchema),
    z.record(valueSchema),
  ]),
);
const binary64Schema = z.record(z.string().regex(/^[0-9a-f]{16}$/));
const effectSample = z
  .object({
    state: name,
    inputs: stateSchema,
    expected: valueSchema,
    fixture,
    presentation: presentationSchema.nullable(),
  })
  .strict();
const expected = z
  .object({ raw: z.string(), segments: segmentsSchema })
  .strict();
export const outputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("static"), expected, fixture }).strict(),
  z
    .object({
      kind: z.literal("dynamic"),
      formatter: nodeSchema,
      domain: domainSchema,
      samples: z
        .array(
          z
            .object({
              state: name,
              inputs: stateSchema,
              expected,
              fixture,
              producerFixture: fixture.nullable(),
            })
            .strict(),
        )
        .min(1),
    })
    .strict(),
]);
const portBase = {
  id: name,
  producer: nodeSchema,
  consumer: nodeSchema,
  transforms: z.array(nodeSchema),
};
const renderer = z.enum([
  "tex",
  "delimited",
  "raw",
  "native-option",
  "svg-text",
]);
export const portSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...portBase,
      kind: z.literal("visible-content"),
      renderer,
      presentation: presentationSchema,
      role: z.enum([
        "mathematics",
        "mixed",
        "ordinary-prose",
        "english-article",
        "bibliographic-coordinate",
        "administrative-quantity",
      ]),
      output: outputSchema,
    })
    .strict(),
  z
    .object({
      ...portBase,
      kind: z.literal("accessible-speech"),
      visibleCounterpart: name,
      presentation: presentationSchema,
      output: outputSchema,
    })
    .strict(),
  z
    .object({
      ...portBase,
      kind: z.literal("private-writing"),
      storageField: name,
      ownerBoundary: nodeSchema,
    })
    .strict(),
  z
    .object({
      ...portBase,
      kind: z.literal("data-reference"),
      reference: z.enum(["answer-index", "node-id", "edge-id", "route-id"]),
      target: nodeSchema,
    })
    .strict(),
  z
    .object({
      ...portBase,
      kind: z.literal("structured-source"),
      schema: referenceSchema,
      audience: z.literal("public-tool"),
      fields: z.array(name).min(1),
    })
    .strict(),
  z
    .object({
      ...portBase,
      kind: z.literal("core-occurrence"),
      catalogue: referenceSchema,
      pointer: z.string().startsWith("/"),
      valueSha256: digestSchema,
      authority: z.literal("existing-strict-core-verifier"),
    })
    .strict(),
]);
const effectBase = {
  id: name,
  operation: nodeSchema,
  fixtures: z.array(fixture).min(1),
};
const input = z.object({ path: name, source: nodeSchema }).strict();
const resource = z.discriminatedUnion("kind", [
  z
    .object({ kind: z.literal("pinned-bytes"), source: referenceSchema })
    .strict(),
  z
    .object({
      kind: z.literal("local-fragment"),
      definition: nodeSchema,
      reference: nodeSchema,
      symbol: name,
    })
    .strict(),
]);
export const effectSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...effectBase,
      kind: z.literal("numeric-computation"),
      inputs: z.array(input).min(1),
      domain: domainSchema,
      outputs: z
        .array(
          z
            .object({
              path: name,
              source: nodeSchema,
              consumers: nodes,
              contentPorts: z.array(name),
            })
            .strict(),
        )
        .min(1),
      identities: z.array(name).min(1),
      errorBranches: z.array(nodeSchema),
      samples: z
        .array(
          effectSample.extend({ expectedBinary64: binary64Schema }).strict(),
        )
        .min(1),
    })
    .strict(),
  z
    .object({
      ...effectBase,
      kind: z.literal("geometry"),
      numericSource: nodeSchema,
      domain: domainSchema,
      property: z
        .string()
        .regex(
          /^(?:--[a-z][a-z0-9-]*|(?:width|height|top|left|right|bottom))$/,
        ),
      unit: z.enum(["px", "number"]),
      writer: nodeSchema,
      cssConsumers: nodes,
      numericOnly: z.literal(true),
      samples: z.array(effectSample).min(1),
    })
    .strict(),
  z
    .object({
      ...effectBase,
      kind: z.literal("svg-geometry"),
      domain: domainSchema,
      inputs: z.array(input).min(1),
      numericSource: nodeSchema,
      rotate: nodeSchema,
      project: nodeSchema,
      component: nodeSchema,
      figure: nodeSchema,
      nativeFigure: nodeSchema,
      viewBox: nodeSchema,
      expectedViewBox: z.literal("0 0 560 400"),
      writers: z
        .array(
          z
            .object({
              id: name,
              selector: name,
              element: nodeSchema,
              tag: z.enum(["line", "polygon"]),
              attributes: z.array(nodeSchema).min(1),
              values: z
                .array(
                  z
                    .object({
                      attribute: z.enum(["x1", "y1", "x2", "y2", "points"]),
                      source: nodeSchema,
                    })
                    .strict(),
                )
                .min(1),
            })
            .strict(),
        )
        .min(1),
      samples: z.array(effectSample).min(1),
      tolerance: z.number().finite().nonnegative().max(0.000001),
    })
    .strict(),
  z
    .object({
      ...effectBase,
      kind: z.literal("file-reset"),
      inputElement: nodeSchema,
      attributeOrder: nodes,
      finalEffectiveType: z.literal("file"),
      result: z.literal(""),
      readerBranches: nodes,
      errorBranches: nodes,
    })
    .strict(),
  z
    .object({
      ...effectBase,
      kind: z.literal("private-download"),
      fields: z.array(input).min(1),
      ownerBoundary: nodeSchema,
      serializer: nodeSchema,
      blob: nodeSchema,
      mime: z.literal("application/json"),
      anchor: nodeSchema,
      urlCreation: nodeSchema,
      activation: nodeSchema,
      revocation: nodeSchema,
      removal: nodeSchema,
      privateOnly: z.literal(true),
    })
    .strict(),
  z
    .object({
      ...effectBase,
      kind: z.literal("paint"),
      declarations: nodes,
      samples: z.array(effectSample).min(1),
      palette: z
        .array(
          z
            .string()
            .regex(/^(?:#[a-fA-F0-9]{3,8}|transparent|currentColor|none)$/),
        )
        .min(1),
      domain: domainSchema.refine((value) => value.kind === "finite"),
      writers: nodes,
      consumers: nodes,
      resources: z.array(resource),
      closedResourceBytes: z.literal(true),
    })
    .strict(),
  z
    .object({
      ...effectBase,
      kind: z.literal("resource"),
      resources: z.array(resource).min(1),
      consumers: nodes,
      purpose: z.enum(["teaching", "decoration"]),
      contentPorts: z.array(name),
      closedResourceBytes: z.literal(true),
    })
    .strict(),
]);
const dependency = referenceSchema
  .extend({
    decision: z.discriminatedUnion("kind", [
      z
        .object({
          kind: z.literal("derived"),
          reasons: z
            .array(
              z.enum([
                "owned-file",
                "import-caller-component",
                "shared-style",
                "ambient-effect-floor",
              ]),
            )
            .min(1),
        })
        .strict(),
      z
        .object({
          kind: z.literal("semantic"),
          relation: z.enum([
            "input-domain",
            "formatter",
            "consumer",
            "resource",
            "shared-effect",
          ]),
          witness: nodeSchema,
        })
        .strict(),
    ]),
  })
  .strict();
export const intentSchema = z
  .object({
    version: z.literal("public-math-local-v2"),
    file: referenceSchema,
    reachable: z.boolean(),
    contractDigest: digestSchema,
    navigationDigest: digestSchema,
    graphProjectionDigest: digestSchema,
    dependencies: z
      .array(dependency)
      .min(1)
      .refine((rows) => unique(rows, ({ file }) => file)),
    coverage: z.literal(
      "complete-file-all-public-branches-producers-consumers-and-implicit-effects",
    ),
    ordinaryProse: z.literal("independently-reviewed"),
    authority: z.literal("independent-semantic-attestation"),
    ports: z.array(portSchema).refine((rows) => unique(rows, ({ id }) => id)),
    effects: z
      .array(effectSchema)
      .refine((rows) => unique(rows, ({ id }) => id)),
  })
  .strict();
const report = referenceSchema
  .extend({
    file: fileSchema.regex(
      /^docs\/research\/public-math-v2\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.md$/,
    ),
    reviewer: z.string().min(3).max(240),
  })
  .strict();
export const receiptSchema = z
  .object({ intent: intentSchema, intentDigest: digestSchema, report })
  .strict();
export const savedEvidenceSchema = z
  .object({
    version: z.literal("public-math-local-evidence-v2"),
    receipts: z
      .array(receiptSchema)
      .refine((rows) => unique(rows, ({ intent }) => intent.file.file)),
  })
  .strict();

const producerBinding = z
  .object({ source: nodeSchema, formatter: nodeSchema.nullable() })
  .strict();
const requirementBase = {
  id: digestSchema,
  owner: fileSchema,
  target: name,
  state: name,
  fixture: digestSchema,
  inputs: z.record(
    z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
  ),
  producer: producerBinding,
};
export const observationRequirementSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...requirementBase,
      kind: z.literal("content"),
      expected,
      presentation: presentationSchema,
    })
    .strict(),
  z
    .object({
      ...requirementBase,
      kind: z.literal("producer"),
      expected: z.string(),
      presentation: z.null(),
    })
    .strict(),
  z
    .object({
      ...requirementBase,
      kind: z.literal("svg-geometry"),
      expected: valueSchema,
      presentation: presentationSchema,
      viewBox: z.literal("0 0 560 400"),
      writers: z
        .array(
          z
            .object({
              id: name,
              selector: name,
              tag: z.enum(["line", "polygon"]),
            })
            .strict(),
        )
        .min(1),
      tolerance: z.number().finite().nonnegative().max(0.000001),
    })
    .strict(),
  z
    .object({
      ...requirementBase,
      kind: z.literal("numeric-computation"),
      expected: valueSchema,
      expectedBinary64: binary64Schema,
      presentation: presentationSchema.nullable(),
    })
    .strict(),
  ...["geometry", "file-reset", "private-download", "paint", "resource"].map(
    (kind) =>
      z
        .object({
          ...requirementBase,
          kind: z.literal(kind),
          expected: valueSchema,
          presentation: presentationSchema.nullable(),
        })
        .strict(),
  ),
]);
export const sourceAcceptanceSchema = z
  .object({
    version: z.literal("public-math-source-acceptance-v2"),
    sourceSetDigest: digestSchema,
    contractDigest: digestSchema,
    graphDigest: digestSchema,
    coreDigest: digestSchema,
    evidence: referenceSchema,
    reports: z
      .array(
        z
          .object({ file: fileSchema, intentDigest: digestSchema, report })
          .strict(),
      )
      .refine((rows) => unique(rows, ({ file }) => file)),
    requiredCases: z
      .array(
        z.object({ id: digestSchema, declaration: fixtureSchema }).strict(),
      )
      .refine((rows) => unique(rows, ({ id }) => id)),
    observations: z
      .array(observationRequirementSchema)
      .refine((rows) => unique(rows, ({ id }) => id)),
  })
  .strict();
