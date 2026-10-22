import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { urecaLedgerSchema } from "../../lib/algebra/ureca-topics.ts";

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function ledgerDigest(ledger) {
  return createHash("sha256").update(stableJson(ledger)).digest("hex");
}

function passageValue(passage, catalogue) {
  const record =
    passage.source === "lesson"
      ? catalogue.lessons.find(({ id }) => id === passage.lessonId)
      : catalogue.guides[passage.lessonId];
  return passage.path
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce(
      (value, key) =>
        value && Object.hasOwn(value, key) ? value[key] : undefined,
      record,
    );
}

export function topicDigest(topic, catalogue, methods = []) {
  const relevantMethods = methods.filter(({ id }) =>
    topic.exerciseMethods.includes(id),
  );
  const passages = [
    ...topic.passages,
    ...relevantMethods.flatMap(({ passages }) => passages),
  ];
  const records = [...new Set(passages.map(({ lessonId }) => lessonId))]
    .sort()
    .map((id) => ({
      lesson: catalogue.lessons.find((lesson) => lesson.id === id),
      guide: catalogue.guides[id],
      metadata: catalogue.metadata[id],
    }));
  const lessonIds = new Set(passages.map(({ lessonId }) => lessonId));
  const units = catalogue.units
    .filter((unit) => unit.lessons.some((id) => lessonIds.has(id)))
    .map((unit) => ({ unit, assessment: catalogue.capstones[unit.id] }));
  const obligation = { ...topic };
  delete obligation.review;
  return createHash("sha256")
    .update(
      stableJson({ obligation, methods: relevantMethods, records, units }),
    )
    .digest("hex");
}

export function checkUrecaCoverage(input, catalogue, { release = false } = {}) {
  const ledger = urecaLedgerSchema.parse(input);
  const errors = [];
  const topicIds = new Set();
  const methods = new Map();
  const lessonIds = new Set(catalogue.lessons.map(({ id }) => id));
  for (const method of ledger.exerciseMethods) {
    if (methods.has(method.id)) errors.push(`Duplicate method: ${method.id}`);
    methods.set(method.id, method);
    if (!method.id.startsWith(`${method.set}-`))
      errors.push(`Method set mismatch: ${method.id}`);
  }
  const checkPassage = (passage, context) => {
    if (
      !lessonIds.has(passage.lessonId) ||
      !catalogue.guides[passage.lessonId] ||
      !catalogue.metadata[passage.lessonId]
    )
      errors.push(`Missing catalogue join: ${context}/${passage.lessonId}`);
    const value = passageValue(passage, catalogue);
    if (typeof value !== "string" || !value.includes(passage.excerpt))
      errors.push(
        `Dangling passage: ${context}/${passage.lessonId}${passage.path}`,
      );
  };
  for (const topic of ledger.topics) {
    if (topicIds.has(topic.id)) errors.push(`Duplicate topic: ${topic.id}`);
    topicIds.add(topic.id);
    if (topic.id.startsWith("T") !== (topic.classification === "required"))
      errors.push(`Topic classification mismatch: ${topic.id}`);
    for (const passage of topic.passages) checkPassage(passage, topic.id);
    for (const id of topic.exerciseMethods) {
      const method = methods.get(id);
      if (!method || !method.topicIds.includes(topic.id))
        errors.push(`Missing exercise obligation: ${topic.id}/${id}`);
    }
    if (topic.review.status === "reviewed") {
      for (const purpose of ["statement", "proof", "example", "boundary"])
        if (!topic.passages.some((passage) => passage.purpose === purpose))
          errors.push(`Missing ${purpose} passage: ${topic.id}`);
      if (
        topic.review.contentDigest !==
        topicDigest(topic, catalogue, ledger.exerciseMethods)
      )
        errors.push(`Stale independent review: ${topic.id}`);
    } else if (release && topic.classification === "required") {
      errors.push(`Unreviewed required topic: ${topic.id}`);
    }
  }
  for (const method of ledger.exerciseMethods) {
    for (const id of method.topicIds) {
      const topic = ledger.topics.find((topic) => topic.id === id);
      if (!topic || !topic.exerciseMethods.includes(method.id))
        errors.push(`Missing exercise topic join: ${method.id}/${id}`);
    }
    for (const passage of method.passages) checkPassage(passage, method.id);
  }
  for (let i = 1; i <= 86; i++) {
    const id = `T${String(i).padStart(2, "0")}`;
    if (!topicIds.has(id)) errors.push(`Missing retained topic: ${id}`);
  }
  for (let i = 1; i <= 6; i++) {
    const id = `P${String(i).padStart(2, "0")}`;
    const topic = ledger.topics.find((topic) => topic.id === id);
    if (topic?.classification !== (i <= 4 ? "candidate" : "prepared"))
      errors.push(`Missing candidate/preparation boundary: ${id}`);
  }
  return {
    errors,
    required: ledger.topics.filter(
      ({ classification }) => classification === "required",
    ).length,
    reviewed: ledger.topics.filter(({ review }) => review.status === "reviewed")
      .length,
    methods: methods.size,
  };
}

export async function checkReviewReports(ledger, root = process.cwd()) {
  const errors = [];
  const reports = new Map();
  for (const topic of ledger.topics) {
    if (topic.review.status !== "reviewed") continue;
    const { evidence, id, contentDigest } = topic.review;
    try {
      if (!reports.has(evidence))
        reports.set(
          evidence,
          await readFile(path.join(root, evidence), "utf8"),
        );
      const report = reports.get(evidence);
      if (
        !report.includes(id) ||
        !report.includes(topic.id) ||
        !report.includes(contentDigest)
      )
        errors.push(`Unbound review report: ${topic.id}`);
    } catch {
      errors.push(`Missing review report: ${topic.id}`);
    }
  }
  return errors;
}
