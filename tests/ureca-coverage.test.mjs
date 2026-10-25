import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  checkUrecaCoverage,
  checkReviewReports,
  topicDigest,
} from "../scripts/lib/ureca-coverage.mjs";
import { urecaTopicSchema } from "../lib/algebra/ureca-topics.ts";
import {
  integrateProposals,
  proposalSchema,
} from "../scripts/lib/ureca-proposals.mjs";

const read = (file) =>
  JSON.parse(readFileSync(new URL(`../lib/algebra/${file}`, import.meta.url)));
const catalogue = {
  lessons: read("lessons.json"),
  guides: read("guided-lessons.json"),
  metadata: read("learning-metadata.json"),
  units: read("units.json"),
  capstones: read("capstone-assessments.json"),
};
const lesson = catalogue.lessons.find(({ id }) => id === "ureca-linear-action");
const guide = catalogue.guides[lesson.id];
const passage = (purpose) => ({
  lessonId: lesson.id,
  source: "lesson",
  path: "/proof",
  excerpt: lesson.proof.slice(0, 50),
  purpose,
});

function fixture() {
  const topics = Array.from({ length: 92 }, (_, i) => ({
    id: `${i < 86 ? "T" : "P"}${String(i < 86 ? i + 1 : i - 85).padStart(2, "0")}`,
    title: "Finite representation test obligation",
    section: "Fixture obligations",
    classification: i < 86 ? "required" : i < 90 ? "candidate" : "prepared",
    objectives: ["Check the typed action and its boundary."],
    passages: ["statement", "proof", "example", "boundary"].map(passage),
    exerciseMethods: [],
    sources: [
      {
        title: lesson.source.title,
        url: lesson.source.url,
        section: lesson.source.section,
      },
    ],
    review: { status: "pending" },
  }));
  return {
    schemaVersion: 1,
    scope: "Test fixture",
    topics,
    exerciseMethods: [],
  };
}

function review(topic, ledger) {
  topic.review = {
    status: "reviewed",
    id: "independent-fixture-review",
    reviewer: "Independent mathematics fixture",
    reviewedAt: "2026-10-22T00:00:00Z",
    evidence: "docs/research/ureca-fixture-review.md",
    contentDigest: topicDigest(topic, catalogue, ledger.exerciseMethods),
    summary:
      "The fixture checks binding behavior, not mathematical correctness.",
  };
}

test("release refuses pending required content and keeps preparation separate", () => {
  const ledger = fixture();
  assert.deepEqual(checkUrecaCoverage(ledger, catalogue).errors, []);
  assert.equal(
    checkUrecaCoverage(ledger, catalogue, { release: true }).errors.length,
    86,
  );
  ledger.topics
    .filter(({ classification }) => classification === "required")
    .forEach((topic) => review(topic, ledger));
  assert.deepEqual(
    checkUrecaCoverage(ledger, catalogue, { release: true }).errors,
    [],
  );
  ledger.topics[90].classification = "candidate";
  assert.match(
    checkUrecaCoverage(ledger, catalogue).errors.join("\n"),
    /preparation boundary/,
  );
});

test("passages must resolve to current text and complete catalogue joins", () => {
  const ledger = fixture();
  ledger.topics[0].passages[0].path = "/reading/999/paragraphs/0";
  assert.match(
    checkUrecaCoverage(ledger, catalogue).errors.join("\n"),
    /Dangling passage/,
  );
  ledger.topics[0].passages[0] = {
    ...passage("statement"),
    lessonId: "absent",
  };
  assert.match(
    checkUrecaCoverage(ledger, catalogue).errors.join("\n"),
    /Missing catalogue join/,
  );
});

test("editing reviewed proof, assessment or objective makes independent evidence stale", () => {
  for (const mutate of [
    (copy) => {
      copy.lessons.find(({ id }) => id === lesson.id).proof += " Changed";
    },
    (copy) => {
      copy.guides[lesson.id].application.answer =
        (guide.application.answer + 1) % 3;
    },
    (copy) => {
      const unit = copy.units.find((unit) => unit.lessons.includes(lesson.id));
      copy.capstones[unit.id].explanation += " Changed";
    },
  ]) {
    const ledger = fixture();
    review(ledger.topics[0], ledger);
    const changed = structuredClone(catalogue);
    mutate(changed);
    assert.match(
      checkUrecaCoverage(ledger, changed).errors.join("\n"),
      /Stale independent review/,
    );
  }
  const ledger = fixture();
  review(ledger.topics[0], ledger);
  ledger.topics[0].objectives.push("Another claim");
  assert.match(
    checkUrecaCoverage(ledger, catalogue).errors.join("\n"),
    /Stale independent review/,
  );
});

test("exercise methods have reciprocal topic joins and real teaching passages", () => {
  const ledger = fixture();
  ledger.topics[0].exerciseMethods.push("E04-action-construction");
  assert.match(
    checkUrecaCoverage(ledger, catalogue).errors.join("\n"),
    /Missing exercise obligation/,
  );
  ledger.exerciseMethods.push({
    id: "E04-action-construction",
    set: "E04",
    title: "Construct and check an action",
    topicIds: ["T01"],
    passages: [passage("example")],
  });
  assert.deepEqual(checkUrecaCoverage(ledger, catalogue).errors, []);
  ledger.topics[0].exerciseMethods = [];
  assert.match(
    checkUrecaCoverage(ledger, catalogue).errors.join("\n"),
    /Missing exercise topic join/,
  );
});

test("a retained topic cannot disappear or acquire a duplicate identity", () => {
  const ledger = fixture();
  ledger.topics[0].id = "T02";
  const errors = checkUrecaCoverage(ledger, catalogue).errors.join("\n");
  assert.match(errors, /Duplicate topic: T02/);
  assert.match(errors, /Missing retained topic: T01/);
});

function proposal() {
  const id = "ureca-foundations-fixture";
  const unitId = `${id}-unit`;
  return {
    partition: "foundations",
    entries: [
      {
        lesson: { ...structuredClone(lesson), id, aliases: [] },
        guide: structuredClone(guide),
        metadata: {
          ...structuredClone(catalogue.metadata[lesson.id]),
          competencies: ["boundaryCheck", "application", "transfer"].map(
            (key) => ({
              id: `${id}:${key}`,
              statement: `Demonstrate ${key}`,
              level: "explain",
            }),
          ),
        },
        topicIds: ["T01"],
      },
    ],
    units: [
      {
        ...structuredClone(catalogue.units[0]),
        id: unitId,
        lessons: [id, "foundations-functions", "foundations-fibers"],
        remediation: [id],
      },
    ],
    capstones: { [unitId]: structuredClone(catalogue.capstones.functions) },
    exerciseCoverage: [],
  };
}

test("proposal integration appends teaching without changing existing progress contracts", () => {
  const input = proposal();
  const before = JSON.stringify(catalogue);
  const result = integrateProposals(catalogue, [input]);
  assert.equal(JSON.stringify(catalogue), before);
  assert.equal(result.lessons.length, catalogue.lessons.length + 1);
  assert.deepEqual(result.lessons.slice(0, -1), catalogue.lessons);
  for (const [id, assessment] of Object.entries(catalogue.capstones))
    assert.deepEqual(result.capstones[id], assessment);
  for (const [id, existing] of Object.entries(catalogue.guides))
    assert.deepEqual(result.guides[id], existing, id);
  assert.deepEqual(
    result.guides[input.entries[0].lesson.id],
    input.entries[0].guide,
  );
});

test("proposal integration rejects overwrite, unknown prerequisites and broken competency joins", () => {
  const duplicate = proposal();
  duplicate.entries[0].lesson.id = lesson.id;
  assert.throws(
    () => integrateProposals(catalogue, [duplicate]),
    /Duplicate or unowned lesson/,
  );
  const missing = proposal();
  missing.entries[0].lesson.prerequisites = ["missing-prerequisite"];
  missing.entries[0].metadata.prerequisites = ["missing-prerequisite"];
  assert.throws(
    () => integrateProposals(catalogue, [missing]),
    /Unknown prerequisite/,
  );
  const broken = proposal();
  broken.entries[0].metadata.competencies[0].id = "wrong:boundaryCheck";
  assert.throws(
    () => integrateProposals(catalogue, [broken]),
    /Competency mismatch/,
  );
  const privatePath = proposal();
  privatePath.entries[0].lesson.proof += " /Volumes/private/source.tex";
  assert.throws(
    () => integrateProposals(catalogue, [privatePath]),
    /Private filesystem paths/,
  );
  const aliasCollision = proposal();
  aliasCollision.entries[0].lesson.aliases = [lesson.id];
  assert.throws(
    () => integrateProposals(catalogue, [aliasCollision]),
    /Ambiguous lesson alias/,
  );
  const repeatedAlias = proposal();
  repeatedAlias.entries[0].lesson.aliases = ["new alias", "new alias"];
  assert.throws(
    () => integrateProposals(catalogue, [repeatedAlias]),
    /Ambiguous lesson alias/,
  );
});

test("proposal privacy covers nested parameter strings and object keys", async (context) => {
  for (const privatePath of [
    "/Volumes/private/source.tex",
    "/Users/private/source.tex",
    "/home/private/source.tex",
    "https://example.org/%2FVolumes%2Fprivate%2Fsource.tex",
  ]) {
    for (const position of ["value", "key"]) {
      await context.test(`${position} rejects ${privatePath}`, () => {
        const input = proposal();
        input.entries[0].lesson.machine = "diagram";
        input.entries[0].lesson.parameters = {
          nodes: [
            position === "value"
              ? { id: "private", label: privatePath, text: true }
              : { id: "private", [privatePath]: "private label", text: true },
          ],
          edges: [],
        };
        assert.throws(
          () => integrateProposals(catalogue, [input]),
          /Private filesystem paths/,
        );
      });
    }
  }
});

test("proposal citations reject private paths and require HTTPS", async (context) => {
  for (const field of ["url", "chapterUrl"]) {
    for (const url of [
      "file:///Volumes/private/source.tex",
      "https://example.org/Users/private/source.tex",
      "https://example.org/%2Fhome%2Fprivate%2Fsource.tex",
      "http://example.org/math",
    ]) {
      await context.test(`${field} rejects ${url}`, () => {
        const input = proposal();
        input.entries[0].lesson.source[field] = url;
        assert.throws(() => integrateProposals(catalogue, [input]));
      });
    }
  }
  const input = proposal();
  input.entries[0].lesson.source.chapterUrl = "https://example.org/math";
  input.entries[0].lesson.parameters = {
    nodes: [{ id: "public", label: "A public diagram", text: true }],
    edges: [],
    label: "Public parameters remain intact",
  };
  const result = integrateProposals(catalogue, [input]);
  assert.deepEqual(result.lessons.at(-1), input.entries[0].lesson);
});

test("published URECA obligations have complete passages and current independent review", async () => {
  const ledger = read("ureca-topics.json");
  const result = checkUrecaCoverage(ledger, catalogue, { release: true });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(await checkReviewReports(ledger), []);
});

test("proposal duration keeps positive representable integers beyond the safe range", () => {
  for (const estimatedMinutes of [
    1,
    Number.MAX_SAFE_INTEGER,
    2 ** 53,
    1e100,
    Number.MAX_VALUE,
  ]) {
    const input = proposal();
    input.entries[0].metadata.estimatedMinutes = estimatedMinutes;
    assert.equal(
      proposalSchema.parse(input).entries[0].metadata.estimatedMinutes,
      estimatedMinutes,
    );
  }
  for (const estimatedMinutes of [0, -1, 1.5, Infinity, NaN]) {
    const input = proposal();
    input.entries[0].metadata.estimatedMinutes = estimatedMinutes;
    assert.equal(proposalSchema.safeParse(input).success, false);
  }
});

test("proposal citation and ledger URLs preserve raw accepted bytes and scheme rules", () => {
  for (const url of [
    "https://example.test/x\n",
    "https://exa\tmple.test/x",
    "https://example.test/x ",
    "https://例え.テスト/x",
  ]) {
    for (const field of ["url", "chapterUrl"]) {
      const input = proposal();
      input.entries[0].lesson.source[field] = url;
      assert.equal(
        proposalSchema.parse(input).entries[0].lesson.source[field],
        url,
      );
    }
    const topic = fixture().topics[0];
    topic.sources[0].url = url;
    assert.equal(urecaTopicSchema.parse(topic).sources[0].url, url);
  }
  for (const url of [
    " HTTPS://example.test",
    "http://example.test",
    "mailto:fixture@example.test",
    "urn:fixture:x",
  ]) {
    const topic = fixture().topics[0];
    topic.sources[0].url = url;
    assert.equal(urecaTopicSchema.parse(topic).sources[0].url, url);
    const input = proposal();
    input.entries[0].lesson.source.url = url;
    assert.equal(proposalSchema.safeParse(input).success, false);
  }
});

test("proposal string records retain their existing special-key output", () => {
  for (const field of ["parameters", "capstones"])
    for (const key of [
      "__proto__",
      "prototype",
      "constructor",
      "",
      "ordinary",
    ]) {
      const input = proposal();
      const value =
        field === "parameters"
          ? { retained: "bytes" }
          : catalogue.capstones.functions;
      const raw = JSON.parse(
        `{${JSON.stringify(key)}:${JSON.stringify(value)}}`,
      );
      if (field === "parameters") input.entries[0].lesson.parameters = raw;
      else input.capstones = raw;
      const parsed = proposalSchema.parse(input);
      const record =
        field === "parameters"
          ? parsed.entries[0].lesson.parameters
          : parsed.capstones;
      assert.deepEqual(Object.keys(record), key === "__proto__" ? [] : [key]);
      if (key !== "__proto__") assert.deepEqual(record[key], value);
      assert.equal(Object.hasOwn(raw, key), true);
    }
});

test("reviewed topic UTC timestamps retain minutes, fractions and calendar validation", () => {
  for (const reviewedAt of [
    "0000-02-29T00:00Z",
    "2000-02-29T23:59:59Z",
    `2024-02-29T12:34:56.${"1".repeat(128)}Z`,
  ]) {
    const ledger = fixture();
    review(ledger.topics[0], ledger);
    ledger.topics[0].review.reviewedAt = reviewedAt;
    assert.equal(
      urecaTopicSchema.parse(ledger.topics[0]).review.reviewedAt,
      reviewedAt,
    );
  }
  for (const reviewedAt of [
    "1900-02-29T00:00Z",
    "2024-02-30T00:00Z",
    "2024-02-29T24:00Z",
    "2024-02-29T00:00+00:00",
    "2024-02-29T00:00Z\n",
  ]) {
    const ledger = fixture();
    review(ledger.topics[0], ledger);
    ledger.topics[0].review.reviewedAt = reviewedAt;
    assert.equal(urecaTopicSchema.safeParse(ledger.topics[0]).success, false);
  }
});
