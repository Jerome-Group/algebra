import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";
const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
});
after(() => vite.close());
const {
  assessmentRegistry,
  readProgress,
  emptyProgress,
  submitAttempt,
  demonstrated,
  lessonCompletion,
  unitCompletion,
  capstoneAssessment,
} = await vite.ssrLoadModule("/lib/algebra/progress.ts");
const { prerequisitesMet } = await vite.ssrLoadModule(
  "/lib/algebra/learning.ts",
);
const lessons = JSON.parse(
  readFileSync(new URL("../lib/algebra/lessons.json", import.meta.url)),
);
const units = JSON.parse(
  readFileSync(new URL("../lib/algebra/units.json", import.meta.url)),
);
const registry = assessmentRegistry(lessons);
const id = "foundations-functions:boundaryCheck";

test("only submitted current correct answers demonstrate competencies", () => {
  assert.equal(demonstrated(emptyProgress(), registry).size, 0);
  let progress = submitAttempt(
    emptyProgress(),
    registry,
    id,
    registry[id].answer,
  );
  assert.ok(demonstrated(progress, registry).has(id));
  progress = readProgress(JSON.stringify(progress), registry);
  assert.ok(demonstrated(progress, registry).has(id));
  progress = submitAttempt(
    progress,
    registry,
    id,
    (registry[id].answer + 1) % registry[id].choices.length,
  );
  assert.equal(demonstrated(progress, registry).has(id), false);
  assert.equal(progress.attempts[id].submissions, 2);
  const revised = {
    ...registry,
    [id]: { ...registry[id], question: "New assessment" },
  };
  assert.equal(
    readProgress(JSON.stringify(progress), revised).attempts[id],
    undefined,
  );
});
test("malformed, future, unknown and invalid progress cannot grant credit", () => {
  for (const text of [
    null,
    "invalid",
    "null",
    "[]",
    '{"version":2,"attempts":{}}',
  ])
    assert.deepEqual(readProgress(text, registry), emptyProgress());
  const valid = submitAttempt(
    emptyProgress(),
    registry,
    id,
    registry[id].answer,
  );
  for (const bad of [
    { choice: -1 },
    { choice: 99 },
    { choice: 0.5 },
    { submissions: 0 },
    { submissions: "1" },
    { revision: "stale" },
  ]) {
    const data = {
      version: 1,
      attempts: {
        [id]: { ...valid.attempts[id], ...bad },
        unknown: valid.attempts[id],
      },
    };
    assert.deepEqual(
      readProgress(JSON.stringify(data), registry),
      emptyProgress(),
    );
  }
  for (const choice of [-1, NaN, Infinity, 99])
    assert.deepEqual(
      submitAttempt(emptyProgress(), registry, id, choice),
      emptyProgress(),
    );
  assert.deepEqual(
    submitAttempt(emptyProgress(), registry, "unknown", 0),
    emptyProgress(),
  );
});
test("unit completion needs all guided lesson evidence plus the unit transfer checkpoint", () => {
  const unit = units.find((item) => item.id === "functions");
  let progress = emptyProgress();
  for (const [key, assessment] of Object.entries(registry))
    if (unit.lessons.some((lesson) => key.startsWith(`${lesson}:`)))
      progress = submitAttempt(progress, registry, key, assessment.answer);
  assert.equal(
    unitCompletion(unit, lessons, demonstrated(progress, registry)).complete,
    false,
  );
  progress = submitAttempt(
    progress,
    registry,
    "unit:functions",
    registry["unit:functions"].answer,
  );
  assert.equal(
    unitCompletion(unit, lessons, demonstrated(progress, registry)).complete,
    true,
  );
  const all = new Set(Object.keys(registry));
  assert.equal(
    unitCompletion(
      units.find((item) => item.id === "tensor"),
      lessons,
      all,
    ).complete,
    false,
  );
  const reference = lessons.find(
    (lesson) =>
      !Object.keys(registry).some((key) => key.startsWith(`${lesson.id}:`)),
  );
  assert.equal(lessonCompletion(reference, all).complete, false);
  const fibers = lessons.find((lesson) => lesson.id === "foundations-fibers");
  assert.equal(prerequisitesMet(fibers, new Set(), lessons), false);
  assert.equal(
    prerequisitesMet(fibers, demonstrated(progress, registry), lessons),
    true,
  );
});
test("all unit capstones offer distinct diagnosed reasoning and retain their worked solution", () => {
  assert.equal(units.length, 16);
  for (const unit of units) {
    const assessment = capstoneAssessment(unit.id);
    assert.ok(assessment.question.startsWith(unit.capstone.question), unit.id);
    assert.equal(assessment.explanation, unit.capstone.answer, unit.id);
    assert.equal(new Set(assessment.choices).size, assessment.choices.length);
    assert.ok(
      assessment.answer >= 0 && assessment.answer < assessment.choices.length,
    );
  }
});

test("promoted units have authored evidence for completion", () => {
  const all = new Set(Object.keys(registry));
  for (const id of [
    "operations",
    "actions",
    "sylow",
    "rings",
    "factorisation",
    "localisation",
    "modules",
  ]) {
    const unit = units.find((item) => item.id === id);
    assert.equal(unitCompletion(unit, lessons, all).complete, true, id);
  }
});
