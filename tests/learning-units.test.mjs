import test from "node:test";
import assert from "node:assert/strict";
import { learningRoutes } from "../lib/algebra/routes.ts";
import { parseDestination, productModes } from "../lib/algebra/navigation.ts";

test("sixteen short units carry outcomes, a concrete capstone and remediation", () => {
  assert.equal(learningRoutes.length, 16);
  const ids = new Set(learningRoutes.map((unit) => unit.id));
  assert.equal(ids.size, 16);
  for (const unit of learningRoutes) {
    assert.ok(unit.lessons.length >= 3 && unit.lessons.length <= 7, unit.id);
    assert.ok(unit.entryCompetencies.length && unit.outcomes.length, unit.id);
    assert.ok(unit.capstone.question && unit.capstone.answer, unit.id);
    assert.ok(unit.completionCriteria && unit.remediation.length, unit.id);
    for (const target of unit.remediation)
      assert.ok(unit.lessons.includes(target));
    const visit = (id, path = []) => {
      assert.ok(ids.has(id), id);
      assert.ok(!path.includes(id), `unit dependency cycle ${[...path, id]}`);
      learningRoutes
        .find((item) => item.id === id)
        .prerequisiteUnits.forEach((dependency) =>
          visit(dependency, [...path, id]),
        );
    };
    visit(unit.id);
  }
});

test("home, mode, legacy lesson and laboratory fragments retain distinct destinations", () => {
  assert.deepEqual(parseDestination(""), { mode: "home" });
  for (const mode of productModes)
    assert.deepEqual(parseDestination(`#${mode}`), { mode });
  assert.deepEqual(parseDestination("#mh2220-quotient"), {
    mode: "lesson",
    id: "mh2220-quotient",
    laboratory: false,
  });
  assert.deepEqual(parseDestination("#lab:m3220-modules"), {
    mode: "lesson",
    id: "m3220-modules",
    laboratory: true,
  });
});
