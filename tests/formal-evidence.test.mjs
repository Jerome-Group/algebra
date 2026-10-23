import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("a failed formal rerun replaces current success and retains old evidence", async (t) => {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "algebra-formal-evidence-")),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  const skill = join(root, ".agents/skills/argument-lifecycle");
  const output = join(root, "outputs/argument-lifecycle");
  const oldRun = join(output, "run-old");
  await mkdir(skill, { recursive: true });
  await mkdir(join(root, "scripts/formal"), { recursive: true });
  await mkdir(join(root, "lib/algebra"), { recursive: true });
  await mkdir(oldRun, { recursive: true });
  await copyFile(
    new URL("../scripts/formal/argument-lifecycle.mjs", import.meta.url),
    join(root, "scripts/formal/argument-lifecycle.mjs"),
  );
  const coveredFile = "lib/algebra/argument-store.ts";
  await writeFile(join(root, coveredFile), "export const covered = true;\n");
  function git(args) {
    const result = spawnSync("git", args, {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null" },
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return result.stdout.trim();
  }
  git(["init", "--quiet"]);
  git(["add", coveredFile]);
  git([
    "-c",
    "user.name=Formal Evidence Test",
    "-c",
    "user.email=formal-evidence@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "--quiet",
    "-m",
    "Cover the isolated source fixture",
  ]);
  const syncCommit = git(["rev-parse", "HEAD"]);
  await writeFile(
    join(skill, "coverage.json"),
    JSON.stringify({ syncCommit, coveredFiles: [coveredFile], bounds: {} }),
  );
  const oldSummary = JSON.stringify({
    status: "passed",
    runId: "run-old",
    runDir: oldRun,
    checkedAt: "2000-01-01T00:00:00.000Z",
    results: [{ label: "retained-old-pass" }],
  });
  await writeFile(join(output, "summary.json"), oldSummary);
  await writeFile(join(oldRun, "summary.json"), oldSummary);
  await writeFile(join(oldRun, "model-current.log"), "retained old evidence\n");
  const startedAt = Date.now();
  const result = spawnSync(
    process.execPath,
    ["scripts/formal/argument-lifecycle.mjs"],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
      env: { ...process.env, TLA2TOOLS_JAR: join(root, "missing-tool.jar") },
    },
  );
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /ENOENT.*missing-tool\.jar/);
  const summary = JSON.parse(
    await readFile(join(output, "summary.json"), "utf8"),
  );
  assert.equal(summary.status, "failed");
  assert.notEqual(summary.runId, "run-old");
  assert.equal(summary.runDir, join(output, summary.runId));
  assert(Date.parse(summary.startedAt) >= startedAt);
  assert(Date.parse(summary.completedAt) >= Date.parse(summary.startedAt));
  assert.equal(summary.updatedAt, summary.completedAt);
  assert.equal(summary.error.code, "ENOENT");
  assert.deepEqual(summary.results, []);
  assert.deepEqual(
    JSON.parse(await readFile(join(summary.runDir, "summary.json"), "utf8")),
    summary,
  );
  assert.match(
    await readFile(join(summary.runDir, "failure.log"), "utf8"),
    /ENOENT.*missing-tool\.jar/,
  );
  assert.equal(
    await readFile(join(oldRun, "summary.json"), "utf8"),
    oldSummary,
  );
  assert.equal(
    await readFile(join(oldRun, "model-current.log"), "utf8"),
    "retained old evidence\n",
  );
  t.diagnostic(
    `Runner exited ${result.status} with ENOENT; latest receipt is failed; old run retained.`,
  );
});
