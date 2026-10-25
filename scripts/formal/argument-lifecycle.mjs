import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runArgumentEvidence } from "./argument-evidence.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const skill = join(root, ".agents/skills/argument-lifecycle");
const evidenceRoot = join(root, "outputs/argument-lifecycle");
const toolVersion = "1.7.4";
const toolHash =
  "936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function command(executable, args) {
  const result = spawnSync(executable, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return { exitCode: result.status, output: result.stdout + result.stderr };
}

async function verify(attempt) {
  const output = attempt.directory;
  const coverage = JSON.parse(
    await readFile(join(skill, "coverage.json"), "utf8"),
  );
  const revision = command("git", ["rev-parse", "HEAD"]);
  assert.equal(revision.exitCode, 0, revision.output);
  const sourceDiff = command("git", [
    "diff",
    coverage.syncCommit,
    "--",
    ...coverage.coveredFiles,
  ]);
  assert.equal(sourceDiff.exitCode, 0, sourceDiff.output);
  await writeFile(join(output, "source-diff.patch"), sourceDiff.output);
  assert(
    !sourceDiff.output || process.argv.includes("--allow-drift"),
    "Covered source changed since syncCommit. Read the diff, follow maintenance, then use --allow-drift to check the updated description.",
  );
  const sources = Object.fromEntries(
    await Promise.all(
      coverage.coveredFiles.map(async (path) => [
        path,
        hash(await readFile(join(root, path))),
      ]),
    ),
  );
  await attempt.recordContext({
    sourceCommit: revision.output.trim(),
    syncCommit: coverage.syncCommit,
    sourceChangedSinceSync: Boolean(sourceDiff.output),
    sources,
    bounds: coverage.bounds,
  });

  async function toolJar() {
    const path =
      process.env.TLA2TOOLS_JAR ||
      join(evidenceRoot, `tla2tools-${toolVersion}.jar`);
    let bytes;
    try {
      bytes = await readFile(path);
    } catch (error) {
      if (error.code !== "ENOENT" || process.env.TLA2TOOLS_JAR) throw error;
      const response = await fetch(
        `https://github.com/tlaplus/tlaplus/releases/download/v${toolVersion}/tla2tools.jar`,
        { signal: AbortSignal.timeout(60000) },
      );
      assert(response.ok, `TLA+ download returned HTTP ${response.status}`);
      bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(hash(bytes), toolHash, "Downloaded TLA+ checksum mismatch");
      await writeFile(path, bytes);
    }
    assert.equal(hash(bytes), toolHash, "TLA+ checksum mismatch");
    return path;
  }

  const jar = await toolJar();
  const model = await readFile(join(skill, "ArgumentLifecycle.tla"), "utf8");
  const config = await readFile(join(skill, "ArgumentLifecycle.cfg"), "utf8");

  async function checkModel(mutation, label, expectedInvariant) {
    const folder = join(output, label);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, "ArgumentLifecycle.tla"), model);
    await writeFile(
      join(folder, "ArgumentLifecycle.cfg"),
      config.replace('Mutation = "none"', `Mutation = "${mutation}"`),
    );
    const result = command("java", [
      "-XX:+UseParallelGC",
      "-Xmx512m",
      "-cp",
      jar,
      "tlc2.TLC",
      "-workers",
      "1",
      "-seed",
      "1",
      "-fp",
      "0",
      "-cleanup",
      "-metadir",
      join(folder, "states"),
      "-config",
      join(folder, "ArgumentLifecycle.cfg"),
      join(folder, "ArgumentLifecycle.tla"),
    ]);
    await writeFile(join(output, `${label}.log`), result.output);
    if (expectedInvariant) {
      assert.notEqual(result.exitCode, 0, `${label} unexpectedly passed`);
      assert(
        result.output.includes(`Invariant ${expectedInvariant} is violated`),
        `${label} failed without the expected invariant\n${result.output}`,
      );
    } else {
      assert.equal(result.exitCode, 0, result.output);
      assert.match(
        result.output,
        /Model checking completed. No error has been found/,
      );
    }
    const counts = result.output.match(
      /([\d,]+) states generated, ([\d,]+) distinct states found, ([\d,]+) states left/,
    );
    assert(counts, `Missing TLC state counts in ${label}`);
    const item = {
      kind: "model",
      label,
      mutation,
      exitCode: result.exitCode,
      expectedInvariant: expectedInvariant ?? null,
      generatedStates: Number(counts[1].replaceAll(",", "")),
      distinctStates: Number(counts[2].replaceAll(",", "")),
      queuedStates: Number(counts[3].replaceAll(",", "")),
    };
    await attempt.recordOutcome(item);
    console.log(JSON.stringify(item));
  }

  const mutations = {
    privacy: {
      before:
        "          if (!current(capture) || pending !== sent) return;\n          const operation = sent.request.operation;",
      after: "          const operation = sent.request.operation;",
      assertion: "OwnerPrivacy: B export contains A private captured writing",
      invariant: "OwnerPrivacy",
    },
    ack: {
      before:
        "            sheet: operation.sheet,\n            revision: receipt.revision,",
      after:
        "            sheet: snapshot.active,\n            revision: receipt.revision,",
      assertion:
        "CapturedAcknowledgement: acknowledgement labels later typing as saved",
      invariant: "CapturedAcknowledgement",
    },
    retry: {
      before: "        body: sent.body,",
      after:
        "        body: JSON.stringify({ ...sent.request, operation: { ...sent.request.operation, sheet: snapshot.active } }),",
      assertion: "ImmutableRetry: retry changed the captured request bytes",
      invariant: "ImmutableRetry",
    },
  };

  async function replay(mutation, label) {
    const scratch = await mkdtemp(
      join(tmpdir(), "algebra-argument-lifecycle-"),
    );
    try {
      await cp(join(root, "lib"), join(scratch, "lib"), { recursive: true });
      await symlink(
        join(root, "node_modules"),
        join(scratch, "node_modules"),
        "dir",
      );
      if (mutation) {
        const file = join(scratch, "lib/algebra/argument-store.ts");
        const source = await readFile(file, "utf8");
        const edit = mutations[mutation];
        assert.equal(
          source.split(edit.before).length,
          2,
          `${mutation} anchor drifted`,
        );
        await writeFile(file, source.replace(edit.before, edit.after));
      }
      const result = command(process.execPath, [
        join(root, "scripts/formal/argument-lifecycle-replay.mjs"),
        scratch,
        mutation || "all",
      ]);
      await writeFile(join(output, `${label}.log`), result.output);
      if (mutation) {
        assert.notEqual(result.exitCode, 0, `${label} unexpectedly passed`);
        assert.match(result.output, /ERR_ASSERTION/);
        assert(
          result.output.includes(mutations[mutation].assertion),
          result.output,
        );
      } else {
        assert.equal(result.exitCode, 0, result.output);
      }
      const item = {
        kind: "real-module-replay",
        label,
        mutation,
        exitCode: result.exitCode,
        expectedAssertion: mutation ? mutations[mutation].assertion : null,
      };
      await attempt.recordOutcome(item);
      console.log(JSON.stringify(item));
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  }

  await checkModel("none", "model-current");
  await replay(null, "replay-current");
  for (const [mutation, { invariant }] of Object.entries(mutations)) {
    await checkModel(mutation, `model-mutant-${mutation}`, invariant);
    await replay(mutation, `replay-mutant-${mutation}`);
  }
  await checkModel("none", "model-restored");
  await replay(null, "replay-restored");
}

let outcome;
try {
  outcome = await runArgumentEvidence(
    { root, tool: { version: toolVersion, sha256: toolHash } },
    verify,
  );
  process.exitCode = outcome.status === "passed" ? 0 : 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
if (outcome) {
  try {
    if (outcome.error) console.error(outcome.error.stack);
    console.log(JSON.stringify(outcome));
  } catch (error) {
    try {
      await writeFile(
        join(dirname(outcome.directory), "optional-output-error.json"),
        JSON.stringify({ name: error.name, message: error.message }) + "\n",
        { flag: "wx" },
      );
    } catch {}
  }
}
