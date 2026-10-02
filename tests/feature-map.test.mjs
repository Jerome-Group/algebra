import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildMap,
  validateMap,
  mapPath,
  commands,
} from "../scripts/algebra-map.mjs";

test("feature map is current and covers every lesson, unit, component and source contract", () => {
  const map = buildMap();
  assert.deepEqual(JSON.parse(fs.readFileSync(mapPath, "utf8")), map);
  assert.deepEqual(validateMap(map), []);
  assert.equal(map.lessons.length, 150);
  assert.equal(map.units.length, 16);
  assert.ok(map.lessons.filter((lesson) => lesson.guided).length >= 79);
  for (const lesson of map.lessons) {
    assert.ok(lesson.routes.includes(`#lab:${lesson.id}`));
    assert.equal(lesson.laboratory.kind, lesson.machine);
    assert.ok(lesson.source.url);
  }
  assert.ok(map.components.some((component) => component.controls.length));
  for (const file of [
    "hooks/use-mobile.ts",
    "components/ui/select.tsx",
    "public/logo.png",
    "package-lock.json",
  ])
    assert.ok(
      map.sources.some((source) => source.file === file),
      file,
    );
  assert.ok(
    !map.sources.some(
      (source) => source.file.includes(".env") || source.file.endsWith(".pdf"),
    ),
  );
  assert.match(map.evidencePolicy, /only by executed checks/);
});

test("CLI input and evidence IO failures remain structured without corrupting the repository", () => {
  const fixture = fs.mkdtempSync(
    path.join(os.tmpdir(), "algebra-cli-fixture-"),
  );
  try {
    const run = (args, environment = {}) =>
      spawnSync(process.execPath, ["scripts/algebra.mjs", ...args], {
        encoding: "utf8",
        env: { ...process.env, ...environment },
      });
    const missing = run(["map"], { ALGEBRA_MAP_ROOT: fixture });
    assert.equal(missing.status, 1);
    assert.equal(JSON.parse(missing.stdout).ok, false);
    assert.equal(missing.stderr, "");
    fs.mkdirSync(path.join(fixture, "lib/algebra"), { recursive: true });
    fs.writeFileSync(path.join(fixture, "lib/algebra/lessons.json"), "{broken");
    const malformed = run(["map"], { ALGEBRA_MAP_ROOT: fixture });
    assert.equal(malformed.status, 1);
    assert.equal(JSON.parse(malformed.stdout).ok, false);
    assert.equal(malformed.stderr, "");
    const failedEvidence = run(["help", "--evidence", fixture]);
    assert.equal(failedEvidence.status, 1);
    const result = JSON.parse(failedEvidence.stdout);
    assert.ok(result.errors.some((error) => error.code === "EISDIR"));
    assert.ok(!result.evidence.some((item) => item.kind === "result-file"));
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("map integrity rejects unresolved edges and cycles without inferring coverage", () => {
  const map = buildMap();
  map.lessons[0].metadata.prerequisites = ["missing"];
  assert.ok(
    validateMap(map).some((error) => error.includes("Unknown prerequisite")),
  );
  map.lessons[0].metadata.prerequisites = [map.lessons[0].id];
  assert.ok(validateMap(map).some((error) => error.includes("cycle")));
});

test("agent CLI provides structured results, effects and actionable failure codes", () => {
  for (const command of commands) {
    assert.ok(Array.isArray(command.prerequisites));
    assert.ok(Array.isArray(command.reads));
    assert.ok(Array.isArray(command.writes));
  }
  const run = (...args) =>
    spawnSync(process.execPath, ["scripts/algebra.mjs", ...args], {
      encoding: "utf8",
    });
  const success = run("lesson", "ureca-cube-symmetry");
  assert.equal(success.status, 0);
  const result = JSON.parse(success.stdout);
  assert.equal(result.ok, true);
  assert.ok(result.result.aliases.includes("ureca-cube-symmetry"));
  const failure = run("lesson", "missing-lesson");
  assert.equal(failure.status, 1);
  assert.match(JSON.parse(failure.stdout).errors[0].message, /Unknown lesson/);
});
