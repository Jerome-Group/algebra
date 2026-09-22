import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  learningMetadata,
  guidedLessons,
  prerequisitesMet,
  teachingStatuses,
  visualisationTypes,
} from "../lib/algebra/learning.ts";

const lessons = JSON.parse(
  fs.readFileSync(new URL("../lib/algebra/lessons.json", import.meta.url)),
);
const metadata = JSON.parse(
  fs.readFileSync(
    new URL("../lib/algebra/learning-metadata.json", import.meta.url),
  ),
);

test("every lesson has explicit valid learning metadata and resolved acyclic prerequisites", () => {
  const ids = new Set(lessons.map((lesson) => lesson.id));
  const competencies = new Set();
  for (const lesson of lessons) {
    assert.ok(metadata[lesson.id], lesson.id);
    const item = learningMetadata(lesson);
    assert.ok(teachingStatuses.includes(item.teachingStatus), lesson.id);
    assert.ok(visualisationTypes.includes(item.visualisationType), lesson.id);
    assert.ok(["foundation", "core", "advanced"].includes(item.courseTier));
    assert.ok(
      Number.isInteger(item.estimatedMinutes) && item.estimatedMinutes > 0,
    );
    assert.ok(item.sourceCollections.length > 0);
    if (item.teachingStatus === "guided")
      assert.ok(item.competencies.length > 0, lesson.id);
    for (const competency of item.competencies) {
      assert.ok(!competencies.has(competency.id), competency.id);
      competencies.add(competency.id);
      assert.ok(competency.statement);
      assert.ok(
        ["recognise", "compute", "explain", "prove", "transfer"].includes(
          competency.level,
        ),
      );
    }
    const visit = (id, path = []) => {
      assert.ok(ids.has(id), id);
      assert.ok(!path.includes(id), `cycle: ${[...path, id]}`);
      for (const prerequisite of metadata[id].prerequisites)
        visit(prerequisite, [...path, id]);
    };
    visit(lesson.id);
  }
});

test("reference entries cannot increase guided completion totals", () => {
  const reference = lessons.find(
    (lesson) => learningMetadata(lesson).teachingStatus === "reference-only",
  );
  assert.ok(reference);
  assert.equal(guidedLessons([reference]).length, 0);
  const unknown = { ...reference, id: "new-unreviewed-entry" };
  assert.equal(learningMetadata(unknown).teachingStatus, "reference-only");
  assert.equal(guidedLessons([unknown]).length, 0);
});

test("a prerequisite without demonstrated competencies is never implicitly mastered", () => {
  const lesson = lessons.find(
    (lesson) => learningMetadata(lesson).prerequisites.length > 0,
  );
  assert.equal(prerequisitesMet(lesson, new Set(), lessons), false);
  assert.equal(prerequisitesMet(lesson, new Set([lesson.id]), lessons), false);
});
