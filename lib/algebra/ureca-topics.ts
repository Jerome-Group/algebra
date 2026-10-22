import { z } from "zod";

const text = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0);
const passage = z
  .object({
    lessonId: text,
    source: z.enum(["lesson", "guide"]),
    path: z.string().regex(/^\/(?:[^/~]|~[01])+(?:\/(?:[^/~]|~[01])+)*$/),
    excerpt: text,
    purpose: z.enum(["statement", "proof", "example", "boundary"]),
  })
  .strict();
const review = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending") }).strict(),
  z
    .object({
      status: z.literal("reviewed"),
      id: text,
      reviewer: text,
      reviewedAt: z.string().datetime(),
      evidence: z.string().regex(/^docs\/research\/ureca-[a-z0-9-]+\.md$/),
      contentDigest: z.string().regex(/^[a-f0-9]{64}$/),
      summary: text,
    })
    .strict(),
]);

export const urecaTopicSchema = z
  .object({
    id: z.string().regex(/^(?:T|P)\d{2,}$/),
    title: text,
    section: text,
    classification: z.enum(["required", "candidate", "prepared"]),
    objectives: z.array(text).min(1),
    passages: z.array(passage),
    exerciseMethods: z.array(z.string().regex(/^E\d{2}-[a-z0-9-]+$/)),
    sources: z
      .array(
        z
          .object({ title: text, url: z.string().url(), section: text })
          .strict(),
      )
      .min(1),
    review,
  })
  .strict();

export const urecaLedgerSchema = z
  .object({
    schemaVersion: z.literal(1),
    scope: text,
    topics: z.array(urecaTopicSchema),
    exerciseMethods: z.array(
      z
        .object({
          id: z.string().regex(/^E\d{2}-[a-z0-9-]+$/),
          set: z.string().regex(/^E\d{2}$/),
          title: text,
          topicIds: z.array(text).min(1),
          passages: z.array(passage).min(1),
        })
        .strict(),
    ),
  })
  .strict();

export type UrecaTopic = z.infer<typeof urecaTopicSchema>;
export type UrecaLedger = z.infer<typeof urecaLedgerSchema>;
