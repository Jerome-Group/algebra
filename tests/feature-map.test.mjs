import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { runCheck } from "../scripts/algebra-runtime.mjs";
import {
  buildMap,
  validateMap,
  mapPath,
  commands,
  root,
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
    "hooks/use-navigation-focus.ts",
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

test("workflow pin changes preserve the map while product and driver changes invalidate it", () => {
  const fixture = fs.mkdtempSync(
    path.join(os.tmpdir(), "algebra-map-boundary-"),
  );
  const run = (...args) =>
    spawnSync(process.execPath, ["scripts/algebra.mjs", ...args], {
      encoding: "utf8",
      env: { ...process.env, ALGEBRA_MAP_ROOT: fixture },
      maxBuffer: 8 * 1024 * 1024,
    });
  try {
    for (const { file } of buildMap().sources) {
      fs.mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true });
      fs.cpSync(path.join(root, file), path.join(fixture, file), {
        verbatimSymlinks: true,
      });
    }
    const workflow = path.join(fixture, ".github/workflows/ci.yml");
    fs.mkdirSync(path.dirname(workflow), { recursive: true });
    fs.copyFileSync(path.join(root, ".github/workflows/ci.yml"), workflow);
    assert.equal(run("map", "--write").status, 0);
    const original = fs.readFileSync(workflow, "utf8");
    fs.writeFileSync(
      workflow,
      original.replace(/@[a-f0-9]{40}/, `@${"a".repeat(40)}`),
    );
    assert.equal(run("verify", "--layer", "map").status, 0);
    for (const file of [
      "components/algebra/Algebra.tsx",
      "scripts/algebra.mjs",
    ]) {
      const target = path.join(fixture, file);
      const content = fs.readFileSync(target);
      fs.appendFileSync(target, "\n");
      const result = run("verify", "--layer", "map");
      assert.equal(result.status, 1, file);
      assert.equal(
        JSON.parse(result.stdout).checks.find(
          (check) => check.name === "feature-map-current",
        ).status,
        "failed",
        file,
      );
      fs.writeFileSync(target, content);
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("concurrent check processes preserve separate complete logs", async () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "algebra-parallel-"));
  try {
    const results = await Promise.all(
      ["one", "two"].map((value) =>
        runCheck(root, path.join(fixture, value), "child", process.execPath, [
          "-e",
          `process.stdout.write(${JSON.stringify(value)}.repeat(20000))`,
        ]),
      ),
    );
    for (const [index, result] of results.entries()) {
      assert.equal(result.status, "passed");
      assert.equal(result.outputTruncated, true);
      assert.ok(result.output.length <= 6000);
      assert.equal(
        fs.readFileSync(result.logPath, "utf8"),
        ["one", "two"][index].repeat(20000),
      );
    }
    assert.notEqual(results[0].logPath, results[1].logPath);
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

test("CLI rejects malformed or misplaced browser shards before launching checks", () => {
  const help = spawnSync(
    process.execPath,
    ["scripts/algebra.mjs", "help", "--command", "verify"],
    {
      encoding: "utf8",
    },
  );
  assert.equal(help.status, 0);
  const schema = JSON.parse(help.stdout).result.commands.find(
    (command) => command.name === "verify",
  ).inputSchema.properties.shard;
  const pattern = new RegExp(schema.pattern);
  for (const shard of ["1/2", "2/2", "100/200"])
    assert.equal(pattern.test(shard), true, shard);
  for (const shard of ["0/2", "1/0", "1.5/2", "1/2x", "01/2", "1/2;echo bad"])
    assert.equal(pattern.test(shard), false, shard);
  const run = (...args) =>
    spawnSync(process.execPath, ["scripts/algebra.mjs", "verify", ...args], {
      encoding: "utf8",
    });
  for (const shard of [
    "0/2",
    "1/0",
    "3/2",
    "1.5/2",
    "1/2x",
    "01/2",
    "1/9007199254740992",
    "1/2;echo bad",
  ]) {
    const execution = run("--layer", "browser", "--built", "--shard", shard);
    assert.equal(execution.status, 1, shard);
    const result = JSON.parse(execution.stdout);
    assert.deepEqual(result.checks, []);
    assert.equal(result.errors[0].code, "INVALID_INPUT");
  }
  for (const args of [
    ["--layer", "browser", "--shard"],
    ["--layer", "all", "--shard", "1/2"],
  ]) {
    const execution = run(...args);
    assert.equal(execution.status, 1);
    const result = JSON.parse(execution.stdout);
    assert.deepEqual(result.checks, []);
    assert.equal(result.errors[0].code, "INVALID_INPUT");
  }
});
