import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { axisRotation, planeRotation } from "../lib/algebra/rotations.ts";
import { rotationConfig } from "../lib/algebra/rotation-config.ts";
import { learningRoutes } from "../lib/algebra/routes.ts";
import { searchLessons } from "../lib/algebra/search.ts";
const lessons = JSON.parse(
  fs.readFileSync(new URL("../lib/algebra/lessons.json", import.meta.url)),
);
const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
const multiply = (a, b) =>
  a.map((row) =>
    b[0].map((_, j) => row.reduce((sum, value, k) => sum + value * b[k][j], 0)),
  );
const near = (a, b) =>
  a
    .flat()
    .forEach((value, index) =>
      assert.ok(Math.abs(value - b.flat()[index]) < 1e-10),
    );

test("the plane reflection fixes the x-axis at zero and obeys FRF = inverse rotation", () => {
  const reflection = planeRotation(0, true);
  near(reflection, [
    [1, 0],
    [0, -1],
  ]);
  near(planeRotation(0.7, true), multiply(planeRotation(0.7), reflection));
  near(
    multiply(multiply(reflection, planeRotation(0.7)), reflection),
    planeRotation(-0.7),
  );
});

test("body-diagonal rotations preserve the axis and select the correct cube symmetries", () => {
  for (const angle of [0, 37, 120, 180, 240, 360]) {
    const matrix = axisRotation([1, 1, 1], angle);
    near(
      multiply(
        matrix,
        matrix[0].map((_, i) => matrix.map((row) => row[i])),
      ),
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
    );
    matrix.forEach((row) =>
      assert.ok(Math.abs(row.reduce((a, b) => a + b) - 1) < 1e-10),
    );
    const preservesVertices = [-1, 1].every((x) =>
      [-1, 1].every((y) =>
        [-1, 1].every((z) =>
          matrix.every(
            (row) =>
              Math.abs(Math.abs(row[0] * x + row[1] * y + row[2] * z) - 1) <
              1e-10,
          ),
        ),
      ),
    );
    assert.equal(preservesVertices, angle % 120 === 0);
  }
});

test("C3 example has dimension two, correct order, trace and no real eigenvalue", () => {
  const lesson = byId.get("representations-real-complex");
  assert.equal(lesson.machine, "plane-representation");
  assert.deepEqual(rotationConfig(lesson.parameters), {
    kind: "plane-representation",
    order: 3,
    dimension: 2,
    field: "real",
  });
  const matrix = planeRotation((2 * Math.PI) / 3);
  near(multiply(multiply(matrix, matrix), matrix), [
    [1, 0],
    [0, 1],
  ]);
  assert.ok(Math.abs(matrix[0][0] + matrix[1][1] + 1) < 1e-10);
  assert.ok((matrix[0][0] + matrix[1][1]) ** 2 - 4 < 0);
  assert.throws(() => rotationConfig({ ...lesson.parameters, dimension: 3 }));
  assert.throws(() => rotationConfig({ ...lesson.parameters, order: 4 }));
  assert.throws(() =>
    rotationConfig({ kind: "axis-angle", axis: [0, 0, 0], angle: 120 }),
  );
});

test("corrected statements retain mathematical sides, qualifiers and boundary cases", () => {
  assert.match(
    byId.get("m3220-modules").pitfall,
    /nonunit may also act invertibly/,
  );
  assert.match(byId.get("tensor-products").definition, /\(ur\)/);
  assert.doesNotMatch(byId.get("tensor-products").definition, /\(ru\)/);
  assert.match(byId.get("actions-primitive").explanation, /\|X\|\\ge2/);
  assert.match(
    JSON.stringify(byId.get("odyssey-character-table").reading),
    /bijection between irreducible complex characters/,
  );
  assert.equal(byId.get("characters-burnside").machine, "diagram");
});

test("routes and prerequisite edges resolve without cycles", () => {
  for (const route of learningRoutes) {
    assert.equal(new Set(route.lessons).size, route.lessons.length);
    route.lessons.forEach((id) => assert.ok(byId.has(id), id));
  }
  const visit = (id, path = []) => {
    assert.ok(
      !path.includes(id),
      `prerequisite cycle: ${[...path, id].join(" -> ")}`,
    );
    assert.ok(byId.has(id), id);
    for (const prerequisite of byId.get(id).prerequisites || [])
      visit(prerequisite, [...path, id]);
  };
  lessons.forEach((lesson) => visit(lesson.id));
});

test("search covers navigation titles, aliases, deeper notes and accent variants", () => {
  const burnside = searchLessons(lessons, "Burnside").map(
    (result) => result.lesson.id,
  );
  assert.ok(burnside.includes("characters-burnside"));
  assert.ok(burnside.includes("mh2220-burnside"));
  assert.ok(
    searchLessons(lessons, "inflation").some(
      (result) => result.lesson.id === "odyssey-character-table",
    ),
  );
  assert.ok(
    searchLessons(lessons, "Bezout").some(
      (result) => result.lesson.id === "mh2220-generators",
    ),
  );
  assert.ok(
    searchLessons(lessons, "Real & complex").some(
      (result) => result.lesson.id === "representations-real-complex",
    ),
  );
});

test("foundation lessons contain genuine worked steps and explained feedback", () => {
  for (const lesson of lessons) {
    assert.ok(lesson.level && lesson.proofStatus && lesson.labScope, lesson.id);
    if (lesson.level === "Advanced reference") continue;
    assert.ok(lesson.worked?.steps.length >= 2, lesson.id);
    assert.ok(lesson.practice?.length, lesson.id);
    for (const problem of lesson.practice)
      assert.ok(problem.question && problem.hint && problem.answer, lesson.id);
  }
});

test("reviewed examples retain their field, map and product notation", () => {
  const projection = byId.get("linear-quotient");
  assert.ok(projection.worked.steps.join(" ").includes("T(x,y)=(x,0)"));
  assert.ok(projection.practice[0].answer.includes("(2,t):t\\in\\mathbb F_3"));
  const radical = byId.get("algebra-radical");
  assert.ok(radical.worked.steps.join(" ").includes("F\\times F"));
  assert.ok(!radical.worked.steps.join(" ").includes("F^\\times F"));
  const nilradical = byId.get("m3220-nilradical");
  assert.match(nilradical.definition, /commutative unital/);
  assert.match(nilradical.theorem, /commutative unital Artinian/);
});
