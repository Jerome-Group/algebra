import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());
const { learningRoutes } = await vite.ssrLoadModule("/lib/algebra/routes.ts");
const { currentArgumentLesson, argumentSubjects } = await vite.ssrLoadModule(
  "/lib/algebra/argument-catalogue.ts",
);
const {
  parseDestination,
  productModes,
  capstoneTargetId,
  workTargetId,
  lessonUnit,
} = await vite.ssrLoadModule("/lib/algebra/navigation.ts");

test("short units retain the original routes, outcomes, capstones and remediation", () => {
  const ids = new Set(learningRoutes.map((unit) => unit.id));
  assert.equal(ids.size, learningRoutes.length);
  for (const id of [
    "functions",
    "operations",
    "generators",
    "cosets",
    "quotients",
    "actions",
    "counting",
    "sylow",
    "rings",
    "factorisation",
    "localisation",
    "modules",
    "representations",
    "characters",
    "tables",
    "tensor",
  ])
    assert.ok(ids.has(id), `Original unit disappeared: ${id}`);
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
    assert.deepEqual(
      parseDestination(`#${mode}`),
      mode === "start" ? { mode, move: "name", returnTo: null } : { mode },
    );
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

test("capstone fragments resolve catalog units and reject invalid targets safely", () => {
  for (const unit of learningRoutes) {
    const destination = parseDestination(`#${capstoneTargetId(unit)}`);
    assert.equal(destination.mode, "capstone");
    assert.equal(destination.unit, unit);
  }
  assert.equal(
    parseDestination("#capstone:%66unctions").unit,
    learningRoutes[0],
  );
  for (const target of [
    "",
    "unknown",
    "functions:extra",
    "%",
    "%E0%A4%A",
    "%3A",
  ])
    assert.deepEqual(parseDestination(`#capstone:${target}`), {
      mode: "learn",
    });
  assert.deepEqual(productModes, [
    "home",
    "start",
    "learn",
    "explore",
    "reference",
    "sources",
  ]);
});

test("encoded lesson aliases resolve the same reading and laboratory targets", () => {
  for (const subject of argumentSubjects)
    for (const family of subject.families)
      for (const lesson of family.lessons)
        for (const alias of [lesson.id, ...(lesson.aliases ?? [])])
          for (const prefix of ["", "lab:"]) {
            const destination = parseDestination(
              `#${prefix}${encodeURIComponent(alias)}`,
            );
            assert.equal(destination.mode, "lesson");
            assert.equal(
              currentArgumentLesson(destination.id)?.id,
              lesson.id,
              alias,
            );
            assert.equal(destination.laboratory, prefix === "lab:");
          }
  for (const hash of ["#%", "#lab:%E0%A4%A"])
    assert.equal(parseDestination(hash).mode, "reference");
});

test("argument detours retain only public lesson and unit context in durable fragments", () => {
  const targetId = "ureca-constructions-induction-adjunction";
  const unitId = "ureca-constructions-induction-adjunctions";
  const support = {
    lessonId: "ureca-constructions-tensor-coset-identification",
    lab: true,
  };
  const target = workTargetId(targetId, unitId, support);
  assert.deepEqual(parseDestination(`#${target}`), {
    mode: "work",
    targetId,
    unitId,
    support,
  });
  assert.deepEqual(parseDestination(`#${workTargetId(targetId)}`), {
    mode: "work",
    targetId,
    unitId: null,
    support: null,
  });
  assert.equal(lessonUnit(targetId, "functions"), null);
  assert.equal(
    parseDestination(`#work:${targetId}?unit=functions&support=unknown`).unitId,
    null,
  );
  assert.equal(
    parseDestination(`#work:${targetId}?support=unknown&lab=1`).support,
    null,
  );
  for (const id of ["", "%", "%E0%A4%A", "unknown"])
    assert.deepEqual(parseDestination(`#work:${id}`), { mode: "reference" });
});
