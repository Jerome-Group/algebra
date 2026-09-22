import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { guidedContent, assessmentKinds } from "../lib/algebra/guided.ts";
import { learningMetadata } from "../lib/algebra/learning.ts";
const lessons = JSON.parse(
  fs.readFileSync(new URL("../lib/algebra/lessons.json", import.meta.url)),
);
const guides = JSON.parse(
  fs.readFileSync(
    new URL("../lib/algebra/guided-lessons.json", import.meta.url),
  ),
);

test("guided promotion requires the complete authored teaching contract", () => {
  for (const lesson of lessons) {
    const metadata = learningMetadata(lesson);
    if (metadata.teachingStatus !== "guided") continue;
    const guide = guidedContent(lesson.id);
    assert.ok(guide, lesson.id);
    assert.ok(guide.hook && guide.objects && guide.connection, lesson.id);
    assert.ok(guide.examples.length >= 2, lesson.id);
    for (const example of guide.examples)
      assert.ok(example.title && example.steps.length >= 2, lesson.id);
    assert.ok(
      guide.nonexample.title && guide.nonexample.explanation,
      lesson.id,
    );
    assert.ok(guide.proofSteps.length >= 3, lesson.id);
    for (const field of [
      "prerequisiteCheck",
      "boundaryCheck",
      "application",
      "transfer",
    ]) {
      const assessment = guide[field];
      assert.ok(
        assessmentKinds.includes(assessment.kind),
        `${lesson.id}:${field}`,
      );
      assert.ok(assessment.question && assessment.explanation, lesson.id);
      assert.ok(
        assessment.choices.length >= 2 &&
          new Set(assessment.choices).size === assessment.choices.length,
        lesson.id,
      );
      assert.ok(
        Number.isInteger(assessment.answer) &&
          assessment.answer >= 0 &&
          assessment.answer < assessment.choices.length,
        lesson.id,
      );
      if (field !== "prerequisiteCheck")
        assert.ok(
          metadata.competencies.some(
            (item) => item.id === `${lesson.id}:${field}`,
          ),
          lesson.id,
        );
    }
  }
  for (const id of Object.keys(guides))
    assert.ok(
      lessons.some((lesson) => lesson.id === id),
      id,
    );
});

test("the first unit's new bridges do not require group theory", () => {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  for (const id of [
    "foundations-functions",
    "foundations-fibers",
    "foundations-quotient-rules",
  ]) {
    const visit = (target) => {
      assert.ok(target.startsWith("foundations-"), target);
      byId.get(target).prerequisites.forEach(visit);
    };
    visit(id);
  }
});

test("new quotient witnesses use the stated right-to-left permutation convention", () => {
  const compose = (a, b) => b.map((image) => a[image]);
  const e = [0, 1, 2],
    s = [1, 0, 2],
    t = [0, 2, 1],
    r = [1, 2, 0];
  const coset = (a) =>
    [compose(a, e), compose(a, s)].map((p) => p.join("")).sort();
  assert.deepEqual(compose(s, t), r);
  assert.deepEqual(coset(t), ["021", "201"]);
  assert.deepEqual(coset(compose(s, t)), ["120", "210"]);
  assert.notDeepEqual(coset(t), coset(compose(s, t)));
  assert.equal(guidedContent("mh2220-cosets").application.answer, 1);
});

test("the non-surjective map and cyclic quotient examples preserve their counts", () => {
  const image = [...new Set(Array.from({ length: 6 }, (_, n) => (2 * n) % 6))];
  assert.deepEqual(image, [0, 2, 4]);
  assert.deepEqual(
    Array.from({ length: 6 }, (_, n) => n).filter((n) => (2 * n) % 6 === 0),
    [0, 3],
  );
  const multiples = (n) =>
    Array.from({ length: 12 }, (_, i) => i).filter((i) => i % n === 0);
  const intersection = multiples(2).filter((i) => multiples(3).includes(i));
  assert.deepEqual(intersection, [0, 6]);
  assert.equal(multiples(2).length / intersection.length, 3);
});
