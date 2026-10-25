import { z } from "zod";
import { laboratoryKinds } from "../../lib/algebra/laboratory-types.ts";
import { urecaSourceUrlSchema } from "../../lib/algebra/ureca-schema-values.ts";

const text = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0);
const strings = z.array(text);
const httpsUrl = urecaSourceUrlSchema.startsWith("https://");
const citation = z
  .object({
    title: text,
    url: httpsUrl,
    section: text,
    pages: text.optional(),
    pdfPages: text.optional(),
    role: text.optional(),
    chapterUrl: httpsUrl.optional(),
  })
  .strict();
const example = z.object({ title: text, steps: strings.min(2) }).strict();
const assessment = z
  .object({
    kind: z.enum([
      "recognise",
      "compute",
      "explain",
      "proof-step",
      "hypotheses",
      "transfer",
    ]),
    question: text,
    choices: strings.min(2),
    answer: z.number().int().nonnegative(),
    explanation: text,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.answer >= value.choices.length)
      context.addIssue({
        code: "custom",
        message: "Answer is outside choices",
      });
    if (new Set(value.choices).size !== value.choices.length)
      context.addIssue({ code: "custom", message: "Choices must be distinct" });
  });
const lesson = z
  .object({
    id: text,
    title: text,
    navTitle: text.optional(),
    track: text,
    section: text,
    source: citation,
    references: z.array(citation).optional(),
    aliases: strings.optional(),
    subject: text.optional(),
    family: text.optional(),
    connections: strings.optional(),
    worked: example.optional(),
    proofStatus: text,
    exampleStatus: text.optional(),
    prerequisites: strings,
    objective: text,
    labScope: text,
    level: text,
    conventions: text,
    practice: z
      .array(z.object({ question: text, hint: text, answer: text }).strict())
      .optional(),
    reading: z
      .array(
        z
          .object({ title: text, paragraphs: strings.min(1), source: citation })
          .strict(),
      )
      .optional(),
    intuition: text,
    definition: text,
    explanation: text,
    theorem: text,
    proof: text,
    pitfall: text,
    prompt: text,
    machine: z.enum(laboratoryKinds),
    parameters: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
const guide = z
  .object({
    hook: text,
    objects: text,
    prerequisiteCheck: assessment,
    examples: z.array(example).min(2),
    nonexample: z.object({ title: text, explanation: text }).strict(),
    proofSteps: strings.min(2),
    boundaryCheck: assessment,
    application: assessment,
    transfer: assessment,
    connection: text,
  })
  .strict();
const metadata = z
  .object({
    teachingStatus: z.literal("guided"),
    courseTier: z.enum(["foundation", "core", "advanced"]),
    estimatedMinutes: z.number().refine(Number.isInteger).positive(),
    prerequisites: strings,
    competencies: z
      .array(
        z
          .object({
            id: text,
            statement: text,
            level: z.enum([
              "recognise",
              "compute",
              "explain",
              "prove",
              "transfer",
            ]),
          })
          .strict(),
      )
      .length(3),
    visualisationType: z.enum([
      "none",
      "illustration",
      "experiment",
      "proof-animation",
      "constructor",
      "checker",
      "reference-diagram",
    ]),
    sourceCollections: strings.refine((values) => values.includes("URECA Y2"), {
      message: "Missing URECA Y2 collection",
    }),
    conceptKind: z.enum(["object", "theorem", "technique"]),
  })
  .strict();
const unit = z
  .object({
    id: text,
    title: text,
    description: text,
    lessons: strings.min(3).max(7),
    entryCompetencies: strings.min(1),
    outcomes: strings.min(1),
    capstone: z.object({ question: text, answer: text }).strict(),
    completionCriteria: text,
    remediation: strings.min(1),
    prerequisiteUnits: strings,
  })
  .strict();

function containsPrivatePath(value) {
  if (typeof value === "string") {
    const decoded = value.replace(/%([a-f0-9]{2})/gi, (_, byte) =>
      String.fromCharCode(Number.parseInt(byte, 16)),
    );
    return /\/(?:Volumes|Users|home)\//.test(decoded);
  }
  if (Array.isArray(value)) return value.some(containsPrivatePath);
  return (
    value !== null &&
    typeof value === "object" &&
    Object.entries(value).some(
      ([key, nested]) =>
        containsPrivatePath(key) || containsPrivatePath(nested),
    )
  );
}

export const proposalSchema = z
  .object({
    partition: z.enum(["foundations", "constructions", "theory"]),
    entries: z.array(
      z.object({ lesson, guide, metadata, topicIds: strings.min(1) }).strict(),
    ),
    units: z.array(unit),
    capstones: z.record(z.string(), assessment),
    exerciseCoverage: z.array(
      z
        .object({
          set: text,
          methods: strings.min(1),
          lessonIds: strings.min(1),
          explanation: text,
        })
        .strict(),
    ),
  })
  .strict()
  .refine((proposal) => !containsPrivatePath(proposal), {
    message: "Private filesystem paths cannot enter public teaching",
  });

export function integrateProposals(catalogue, proposals) {
  const result = structuredClone(catalogue);
  const lessonIds = new Set(result.lessons.map(({ id }) => id));
  const unitIds = new Set(result.units.map(({ id }) => id));
  for (const input of proposals) {
    const proposal = proposalSchema.parse(input);
    const prefix = `ureca-${proposal.partition}-`;
    if (!proposal.entries.length)
      throw new Error(`Empty proposal: ${proposal.partition}`);
    for (const entry of proposal.entries) {
      const id = entry.lesson.id;
      if (!id.startsWith(prefix) || lessonIds.has(id))
        throw new Error(`Duplicate or unowned lesson: ${id}`);
      if (
        JSON.stringify(entry.lesson.prerequisites) !==
        JSON.stringify(entry.metadata.prerequisites)
      )
        throw new Error(`Prerequisite mismatch: ${id}`);
      const expected = ["boundaryCheck", "application", "transfer"].map(
        (checkpoint) => `${id}:${checkpoint}`,
      );
      if (
        expected.some(
          (competency) =>
            !entry.metadata.competencies.some(({ id }) => id === competency),
        )
      )
        throw new Error(`Competency mismatch: ${id}`);
      lessonIds.add(id);
      result.lessons.push(entry.lesson);
      result.guides[id] = entry.guide;
      result.metadata[id] = entry.metadata;
    }
    for (const unit of proposal.units) {
      if (!unit.id.startsWith(prefix) || unitIds.has(unit.id))
        throw new Error(`Duplicate or unowned unit: ${unit.id}`);
      if (!proposal.capstones[unit.id])
        throw new Error(`Missing capstone: ${unit.id}`);
      const assessment = proposal.capstones[unit.id];
      if (
        !assessment.question.startsWith(unit.capstone.question) ||
        assessment.explanation !== unit.capstone.answer
      )
        throw new Error(`Capstone solution mismatch: ${unit.id}`);
      if (unit.remediation.some((id) => !unit.lessons.includes(id)))
        throw new Error(`Remediation leaves its unit: ${unit.id}`);
      unitIds.add(unit.id);
      result.units.push(unit);
      result.capstones[unit.id] = proposal.capstones[unit.id];
    }
    for (const id of Object.keys(proposal.capstones))
      if (!proposal.units.some((unit) => unit.id === id))
        throw new Error(`Orphan capstone: ${id}`);
    for (const { lesson } of proposal.entries)
      if (!proposal.units.some((unit) => unit.lessons.includes(lesson.id)))
        throw new Error(`New lesson has no learning unit: ${lesson.id}`);
    for (const coverage of proposal.exerciseCoverage)
      for (const id of coverage.lessonIds)
        if (!lessonIds.has(id))
          throw new Error(`Unknown exercise lesson: ${id}`);
  }
  const navigationIds = new Set(lessonIds);
  for (const lesson of result.lessons) {
    for (const alias of lesson.aliases ?? []) {
      if (navigationIds.has(alias))
        throw new Error(`Ambiguous lesson alias: ${alias}`);
      navigationIds.add(alias);
    }
    for (const id of lesson.prerequisites ?? [])
      if (!lessonIds.has(id))
        throw new Error(`Unknown prerequisite ${id} in ${lesson.id}`);
  }
  for (const unit of result.units) {
    for (const id of [...unit.lessons, ...unit.remediation])
      if (!lessonIds.has(id)) throw new Error(`Unknown unit lesson: ${id}`);
    for (const id of unit.prerequisiteUnits)
      if (!unitIds.has(id)) throw new Error(`Unknown prerequisite unit: ${id}`);
  }
  return result;
}
