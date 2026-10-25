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
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readCurrentArgumentEvidence } from "../scripts/formal/argument-evidence.mjs";

test("a failed formal rerun becomes current and retains legacy evidence", async (t) => {
  const directory = fileURLToPath(
    new URL("../outputs/formal-evidence-fixtures/", import.meta.url),
  );
  await mkdir(directory, { recursive: true });
  const root = await realpath(await mkdtemp(join(directory, "unit-")));
  t.after(() => rm(root, { recursive: true, force: true }));
  const skill = join(root, ".agents/skills/argument-lifecycle");
  const output = join(root, "outputs/argument-lifecycle");
  const oldRun = join(output, "run-old");
  await mkdir(skill, { recursive: true });
  await mkdir(join(root, "scripts/formal"), { recursive: true });
  await mkdir(join(root, "lib/algebra"), { recursive: true });
  await mkdir(oldRun, { recursive: true });
  for (const file of [
    "argument-lifecycle.mjs",
    "argument-lifecycle-replay.mjs",
    "argument-evidence.mjs",
  ]) {
    await copyFile(
      new URL(`../scripts/formal/${file}`, import.meta.url),
      join(root, "scripts/formal", file),
    );
  }
  for (const file of ["ArgumentLifecycle.tla", "ArgumentLifecycle.cfg"]) {
    await copyFile(
      new URL(`../.agents/skills/argument-lifecycle/${file}`, import.meta.url),
      join(skill, file),
    );
  }
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
  const current = await readCurrentArgumentEvidence({ root });
  assert.equal(current.status, "failed");
  assert.equal(current.invocation, "run-00000000000000000001");
  const summary = current.receipt;
  assert(Date.parse(summary.startedAt) >= startedAt);
  assert(Date.parse(summary.completedAt) >= Date.parse(summary.startedAt));
  assert.equal(summary.context.syncCommit, syncCommit);
  assert.equal(summary.error.code, "ENOENT");
  assert.match(summary.error.stack, /ENOENT.*missing-tool\.jar/);
  assert.deepEqual(summary.results, []);
  assert.match(
    await readFile(join(current.directory, "failure.log"), "utf8"),
    /ENOENT.*missing-tool\.jar/,
  );
  assert.equal(
    await readFile(join(output, "summary.json"), "utf8"),
    oldSummary,
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
    `Runner exited ${result.status} with ENOENT; derived current is failed; legacy bytes retained.`,
  );
  t.diagnostic(
    JSON.stringify({
      control: "missing-tool",
      error: summary.error,
      context: summary.context,
      results: summary.results,
    }),
  );
  await writeFile(join(root, coveredFile), "export const covered = false;\n");
  const drift = spawnSync(
    process.execPath,
    ["scripts/formal/argument-lifecycle.mjs"],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
      env: { ...process.env, TLA2TOOLS_JAR: join(root, "missing-tool.jar") },
    },
  );
  assert.equal(drift.status, 1);
  const changed = await readCurrentArgumentEvidence({ root });
  assert.equal(changed.status, "failed");
  assert.equal(changed.receipt.error.code, "ERR_ASSERTION");
  assert.match(
    changed.receipt.error.message,
    /Covered source changed since syncCommit/,
  );
  assert.match(
    await readFile(join(changed.directory, "source-diff.patch"), "utf8"),
    /covered = false/,
  );
  t.diagnostic(
    JSON.stringify({
      control: "ordinary-source-drift",
      error: changed.receipt.error,
      results: changed.receipt.results,
    }),
  );
  const wrongJar = join(root, "wrong-tool.jar");
  await writeFile(wrongJar, "wrong pinned bytes");
  const checksum = spawnSync(
    process.execPath,
    ["scripts/formal/argument-lifecycle.mjs", "--allow-drift"],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
      env: { ...process.env, TLA2TOOLS_JAR: wrongJar },
    },
  );
  assert.equal(checksum.status, 1);
  const pinned = await readCurrentArgumentEvidence({ root });
  assert.equal(pinned.status, "failed");
  assert.equal(pinned.receipt.context.sourceChangedSinceSync, true);
  assert.equal(pinned.receipt.error.code, "ERR_ASSERTION");
  assert.match(pinned.receipt.error.message, /TLA\+ checksum mismatch/);
  assert.deepEqual(pinned.receipt.results, []);
  t.diagnostic(
    JSON.stringify({
      control: "allow-drift-wrong-jar",
      error: pinned.receipt.error,
      context: pinned.receipt.context,
      results: pinned.receipt.results,
    }),
  );
  t.diagnostic(
    "Ordinary source drift refuses; --allow-drift still refuses wrong pinned jar bytes.",
  );
});
