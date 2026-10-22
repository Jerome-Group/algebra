import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  argumentTarget,
  argumentSubjects,
  curriculumSubjects,
  currentArgumentLesson,
  argumentPrerequisites,
  argumentPassages,
  argumentUnits,
  argumentEvidence,
  searchArgumentSupport,
  balancingRecovery,
  recoveryMatches,
} from "../lib/algebra/argument-catalogue.ts";

const read = (file) =>
  JSON.parse(
    readFileSync(
      new URL(`../lib/algebra/${file}.json`, import.meta.url),
      "utf8",
    ),
  );
const lessons = read("lessons");
const metadata = read("learning-metadata");
const guided = read("guided-lessons");
const units = read("units");

test("argument targets and derived subjects retain the complete public catalogue", () => {
  assert.deepEqual(
    argumentSubjects
      .flatMap((subject) =>
        subject.families.flatMap((family) =>
          family.lessons.map((lesson) => lesson.id),
        ),
      )
      .sort(),
    lessons.map((lesson) => lesson.id).sort(),
  );
  assert.equal(
    argumentSubjects.length,
    new Set(lessons.map((lesson) => lesson.subject)).size,
  );
  assert.deepEqual(curriculumSubjects, [
    ...new Set(lessons.map((lesson) => lesson.subject)),
  ]);
  for (const [index, subject] of argumentSubjects.entries())
    assert.equal(subject.number, index + 1);
  for (const lesson of lessons) {
    assert.equal(argumentTarget(lesson.id)?.id, lesson.id);
    assert.equal(currentArgumentLesson(lesson.id)?.id, lesson.id);
    for (const alias of lesson.aliases ?? [])
      assert.equal(argumentTarget(alias)?.id, lesson.id);
    assert.deepEqual(
      argumentUnits(lesson.id).map((unit) => unit.id),
      units
        .filter((unit) => unit.lessons.includes(lesson.id))
        .map((unit) => unit.id),
    );
  }
  assert.equal(argumentTarget("missing-target"), undefined);
});

test("support returns direct metadata edges only and permits a branch to expand on demand", () => {
  for (const lesson of lessons)
    assert.deepEqual(
      argumentPrerequisites(lesson.id).map((target) => target.id),
      metadata[lesson.id].prerequisites,
    );
  const target = "ureca-constructions-induction-adjunction";
  assert.ok(
    !argumentPrerequisites(target).some(
      (lesson) => lesson.id === "tensor-products",
    ),
  );
  assert.ok(
    argumentPrerequisites(
      "ureca-constructions-tensor-coset-identification",
    ).some((lesson) => lesson.id === "tensor-products"),
  );
  assert.deepEqual(argumentPrerequisites("missing-target"), []);
});

test("support search returns exact existing passages including guided-only proof text", () => {
  assert.deepEqual(searchArgumentSupport(""), []);
  assert.deepEqual(searchArgumentSupport("unmatchablewordxyz"), []);
  for (const query of [
    "balancing",
    "unique coordinates",
    "noncommutative",
    "pure tensors generate",
    "natural transformation",
  ]) {
    const results = searchArgumentSupport(query);
    assert.ok(results.length, query);
    for (const result of results)
      assert.ok(
        argumentPassages(result.target.id).some(
          (passage) =>
            passage.text === result.passage.text &&
            passage.label === result.passage.label,
        ),
        query,
      );
  }
  const expected =
    guided["ureca-constructions-induction-adjunction"].proofSteps[1];
  assert.ok(
    searchArgumentSupport("pair map additive balancing").some(
      (result) =>
        result.target.id === "ureca-constructions-induction-adjunction" &&
        result.passage.text === expected,
    ),
  );
});

test("written references and self-review never count as prerequisite assessment evidence", () => {
  const id = "ureca-constructions-induction-adjunction";
  assert.deepEqual(argumentEvidence(id, new Set([id, "revisited"])), {
    count: 0,
    total: metadata[id].competencies.length,
  });
  assert.deepEqual(
    argumentEvidence(
      id,
      new Set(metadata[id].competencies.map((competency) => competency.id)),
    ),
    {
      count: metadata[id].competencies.length,
      total: metadata[id].competencies.length,
    },
  );
});

test("the small balancing recovery guide is bound to every exact teaching edition it uses", () => {
  const review = JSON.parse(
    readFileSync(
      new URL(
        "../docs/research/argument-recovery-review.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(review.review.verdict, "pass");
  assert.equal(review.review.independentOfAuthor, true);
  assert.equal(review.targetId, balancingRecovery.targetId);
  assert.equal(
    createHash("sha256")
      .update(JSON.stringify(balancingRecovery))
      .digest("hex"),
    review.guideDigest,
  );
  assert.deepEqual(review.editions, balancingRecovery.bindings);
  const editions = balancingRecovery.bindings.map((binding) => {
    const lesson = lessons.find((lesson) => lesson.id === binding.lessonId);
    const fields = {
      version: 1,
      lessonId: lesson.id,
      objects: guided[lesson.id].objects,
      statement: lesson.theorem,
      conventions: lesson.conventions ? [lesson.conventions] : [],
      proof: guided[lesson.id].proofSteps,
    };
    const digest = createHash("sha256")
      .update(JSON.stringify(fields))
      .digest("hex");
    assert.equal(digest, binding.digest, binding.lessonId);
    return { ...fields, digest };
  });
  assert.ok(recoveryMatches(editions));
  assert.equal(recoveryMatches(editions.slice(1)), false);
  assert.equal(
    recoveryMatches(
      editions.map((edition, index) =>
        index ? edition : { ...edition, digest: "0".repeat(64) },
      ),
    ),
    false,
  );
});
