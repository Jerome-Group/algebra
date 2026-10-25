import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { put, syntheticExecution } from "./helpers/public-math-execution.mjs";
import {
  recordVerification,
  aggregateExecutionRecordings,
} from "../scripts/lib/public-math-v2/session.mjs";
import {
  openRecording,
  readSelectedRecording,
  prepareCiCohort,
  sealCiSlot,
  stageCiContainers,
  engineeringChecks,
  browserChecks,
} from "../scripts/lib/public-math-v2/execution-state.mjs";
import { captureSource } from "../scripts/lib/public-math-v2/source.mjs";
import {
  checkExecution,
  validateExecution,
} from "../scripts/lib/public-math-v2/execution.mjs";
import { checkPublicMath } from "../scripts/lib/public-math-v2.mjs";
import { sha256 } from "../scripts/lib/math-presentation.mjs";

const execute = promisify(execFile);
const request = {
  scope: "full",
  members: [
    { runner: "node:test", selection: { shard: null, filtered: false } },
  ],
  checks: ["SYNTHETIC storage check"],
};
const reference = (owner) => ({
  file: `outputs/public-math-runs/${owner.runId}/index.json`,
  sha256: "1".repeat(64),
});
async function temporary(t) {
  const root = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "execution-state-SYNTHETIC-")),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
async function seedBuild(data) {
  await put(data.root, "dist/public-math-build.json", data.build);
  return sha256(
    await fs.readFile(path.join(data.root, "dist/public-math-build.json")),
  );
}
async function syntheticInvocation(recording, data, runner) {
  return recording.run(runner, async (descriptorPaths) => {
    const descriptor = JSON.parse(await fs.readFile(descriptorPaths.file));
    const report = {
      ...structuredClone(data.run),
      ...descriptor.record,
      snapshotAfter: descriptor.record.snapshot,
    };
    if (runner === "node:test") {
      report.runner = runner;
      report.runtime = process.version;
      report.targetBefore = null;
      report.targetAfter = null;
      report.observations = [];
      report.resources = [];
      report.registrations[0].project = null;
      report.registrations[0].titlePath = ["SYNTHETIC node registration"];
    } else {
      report.targetBefore.root = descriptor.root;
      report.targetAfter.root = descriptor.root;
      const marker = path.join(
        path.dirname(descriptorPaths.output),
        "SYNTHETIC-stopped-owner.json",
      );
      await fs.writeFile(
        marker,
        JSON.stringify({
          runId: report.targetBefore.runId,
          status: "stopped",
          root: descriptor.root,
          pid: report.targetBefore.pid,
          processIdentity: report.targetBefore.processIdentity,
          origin: report.targetBefore.origin,
        }),
      );
      await recording.cleanup(marker, { stopped: true }, true);
    }
    await fs.writeFile(descriptorPaths.output, JSON.stringify(report));
    return {
      name:
        runner === "node:test"
          ? "mathematical-and-content-suites"
          : "browser-interactions",
      status: "passed",
      detail: "SYNTHETIC report fixture. No application/runner execution.",
    };
  });
}
async function syntheticFull(data, work) {
  await seedBuild(data);
  return recordVerification(data.root, { layer: "all" }, async (recording) => {
    const nodeCheck = await syntheticInvocation(recording, data, "node:test");
    const browserCheck = await syntheticInvocation(
      recording,
      data,
      "playwright",
    );
    if (work) await work(recording);
    return {
      checks: [...engineeringChecks, ...browserChecks].map((name) =>
        name === nodeCheck.name
          ? nodeCheck
          : name === browserCheck.name
            ? browserCheck
            : {
                name,
                status: "passed",
                detail: "SYNTHETIC named check fixture",
              },
      ),
    };
  });
}
const check = (data) =>
  checkExecution(
    data.capture,
    data.accepted.sourceAcceptance,
    data.accepted.acceptanceDigest,
  );

test("SYNTHETIC filesystem admissions serialize actual competing processes without shared terminal writes", async (t) => {
  const root = await temporary(t),
    stateModule = pathToFileURL(
      path.resolve("scripts/lib/public-math-v2/execution-state.mjs"),
    ).href;
  const code = `import {openRecording} from ${JSON.stringify(stateModule)};const owner=await openRecording(process.argv[1],${JSON.stringify(request)});console.log(JSON.stringify(owner.binding));`;
  const results = await Promise.all(
    Array.from({ length: 12 }, () =>
      execute(process.execPath, ["--input-type=module", "-e", code, root], {
        env: process.env,
      }),
    ),
  );
  const ordinals = results
    .map((result) =>
      Number(JSON.parse(result.stdout).admission.file.split("/").at(-2)),
    )
    .sort((a, b) => a - b);
  assert.deepEqual(
    ordinals,
    Array.from({ length: 12 }, (_, i) => i + 1),
  );
  await assert.rejects(readSelectedRecording(root), /ENOENT/);
});

test("SYNTHETIC current admission and failure sets guard concurrent reads and old facts", async (t) => {
  const root = await temporary(t),
    older = await openRecording(root, request);
  await older.complete(reference(older));
  const selected = await readSelectedRecording(root);
  const newer = await openRecording(root, request);
  await newer.fail(new Error("SYNTHETIC newer failure"));
  await older.complete(reference(older));
  await older.fail(new Error("SYNTHETIC delayed older failure"));
  await assert.rejects(selected.guard(), /admission or failure changed/);
  await assert.rejects(readSelectedRecording(root), /admitted failure/);
  const latest = await openRecording(root, request);
  await latest.complete(reference(latest));
  const reading = await readSelectedRecording(root);
  await older.fail(new Error("SYNTHETIC further old failure"));
  await reading.guard();
  await latest.fail(new Error("SYNTHETIC late current failure"));
  await assert.rejects(reading.guard(), /admission or failure changed/);
  await assert.rejects(readSelectedRecording(root), /admitted failure/);
});

test("SYNTHETIC immutable publication retries converge and conflicts durably invalidate", async (t) => {
  const root = await temporary(t),
    owner = await openRecording(root, request);
  const first = await owner.retain("fact.json", { synthetic: true });
  assert.deepEqual(await owner.retain("fact.json", { synthetic: true }), first);
  await owner.complete(reference(owner));
  await owner.complete(reference(owner));
  await readSelectedRecording(root);
  await assert.rejects(
    owner.retain("fact.json", { synthetic: false }),
    /Conflicting immutable/,
  );
  await assert.rejects(readSelectedRecording(root), /admitted failure/);
  const next = await openRecording(root, request);
  await next.complete(reference(next));
  await assert.rejects(
    next.complete({ ...reference(next), sha256: "2".repeat(64) }),
    /Conflicting immutable/,
  );
  await assert.rejects(readSelectedRecording(root), /admitted failure/);
});

for (const seam of [
  "admission",
  "binding",
  "descriptor",
  "report",
  "checks",
  "index",
  "temporary-terminal",
  "failure-directory",
])
  test(`SYNTHETIC actual filesystem crash after ${seam} never falls back to old success`, async (t) => {
    const root = await temporary(t),
      old = await openRecording(root, request);
    await old.complete(reference(old));
    if (seam === "admission")
      await fs.mkdir(
        path.join(root, "outputs/public-math-runs/state-v3/local/2"),
      );
    else {
      const owner = await openRecording(root, request);
      for (const stage of [
        "binding",
        "descriptor",
        "report",
        "checks",
        "index",
      ]) {
        await owner.retain(stage + ".json", {
          kind: "SYNTHETIC crash-prefix",
          stage,
        });
        if (stage === seam) break;
      }
      if (seam === "temporary-terminal")
        await fs.writeFile(
          path.join(
            root,
            "outputs/public-math-runs/state-v3/local/2/success.json.abandoned.tmp",
          ),
          "partial bytes",
        );
      if (seam === "failure-directory")
        await fs.mkdir(
          path.join(
            root,
            "outputs/public-math-runs/state-v3/local/2/failures/SYNTHETIC-empty-failure",
          ),
        );
    }
    await assert.rejects(
      readSelectedRecording(root),
      seam === "failure-directory" ? /admitted failure/ : /ENOENT/,
    );
  });

test("SYNTHETIC integrated F1 aggregate cannot revive old full after failed or partial current", async (t) => {
  const data = await syntheticExecution(t);
  assert.equal((await syntheticFull(data)).satisfiesRequirement, true);
  const before = await fs.readdir(
    path.join(data.root, "outputs/public-math-runs/state-v3/local"),
  );
  await assert.rejects(
    recordVerification(data.root, { layer: "math" }, async () => {
      throw new Error("SYNTHETIC newer failed command");
    }),
    /newer failed command/,
  );
  assert.equal((await check(data)).ok, false);
  await assert.rejects(
    aggregateExecutionRecordings(data.root),
    /Current selected execution refused/,
  );
  assert.equal(
    (
      await fs.readdir(
        path.join(data.root, "outputs/public-math-runs/state-v3/local"),
      )
    ).length,
    before.length + 1,
  );
  await recordVerification(data.root, { layer: "math" }, async (recording) => ({
    checks: [await syntheticInvocation(recording, data, "node:test")],
  }));
  assert.match((await check(data)).pending[0].reason, /partial/);
  await assert.rejects(aggregateExecutionRecordings(data.root), /partial/);
});

test("SYNTHETIC integrated F2 delayed full completion cannot replace a newer failed current", async (t) => {
  const data = await syntheticExecution(t);
  await seedBuild(data);
  let release, ready;
  const wait = new Promise((resolve) => (release = resolve)),
    started = new Promise((resolve) => (ready = resolve));
  const older = syntheticFull(data, async () => {
    ready();
    await wait;
  });
  await started;
  await assert.rejects(
    recordVerification(data.root, { layer: "math" }, async () => {
      throw new Error("SYNTHETIC newer failure");
    }),
    /newer failure/,
  );
  release();
  await assert.rejects(older, /Final current execution refused/);
  assert.equal(
    (
      await fs.readdir(
        path.join(
          data.root,
          "outputs/public-math-runs/state-v3/local/1/failures",
        ),
      )
    ).length,
    1,
  );
  assert.equal(
    (
      await fs.readdir(
        path.join(
          data.root,
          "outputs/public-math-runs/state-v3/local/2/failures",
        ),
      )
    ).length,
    1,
  );
  assert.match((await check(data)).pending[0].reason, /admitted failure/);
});

test("SYNTHETIC integrated F3 ALL-registration duplicates refuse within and across actual invocation shapes", async (t) => {
  const data = await syntheticExecution(t),
    first = structuredClone(data.run);
  first.selection.shard = { index: 1, total: 2 };
  const extra = {
    ...structuredClone(first.registrations[0]),
    id: "SYNTHETIC-extra-1",
    titlePath: ["non-required extra"],
    rawTitlePath: ["non-required extra"],
  };
  first.registrations.push(extra);
  first.attempts.push({ ...structuredClone(first.attempts[0]), id: extra.id });
  const second = {
    ...structuredClone(first),
    invocation: randomUUID(),
    runId: randomUUID(),
    selection: { shard: { index: 2, total: 2 }, filtered: false },
    registrations: [{ ...extra, id: "SYNTHETIC-extra-2" }],
    attempts: [
      { ...structuredClone(first.attempts[0]), id: "SYNTHETIC-extra-2" },
    ],
    observations: [],
    resources: [],
  };
  await assert.rejects(
    validateExecution(
      data.capture,
      data.accepted.sourceAcceptance,
      data.accepted.acceptanceDigest,
      data.index,
      [first, second],
      data.build,
    ),
    /Duplicate logical registration/,
  );
  first.selection.shard = null;
  first.registrations.push({ ...extra, id: "SYNTHETIC-extra-3" });
  first.attempts.push({ ...first.attempts[0], id: "SYNTHETIC-extra-3" });
  await assert.rejects(
    validateExecution(
      data.capture,
      data.accepted.sourceAcceptance,
      data.accepted.acceptanceDigest,
      data.index,
      [first],
      data.build,
    ),
    /Duplicate logical registration/,
  );
});

test("SYNTHETIC durable named checks are mandatory and late source/build/check drift refuses", async (t) => {
  const data = await syntheticExecution(t);
  await seedBuild(data);
  await assert.rejects(
    recordVerification(data.root, { layer: "math" }, async (recording) => {
      await syntheticInvocation(recording, data, "node:test");
      return { checks: [] };
    }),
    /at least 1|Durable named/,
  );
  assert.equal((await check(data)).ok, false);
  assert.equal((await syntheticFull(data)).satisfiesRequirement, true);
  const selected = await readSelectedRecording(data.root),
    participant = selected.participants[0];
  const index = JSON.parse(
    await fs.readFile(path.join(data.root, participant.index.file)),
  );
  await fs.writeFile(
    path.join(data.root, index.checks.file),
    JSON.stringify({
      checks: [{ name: "SYNTHETIC replaced", status: "passed" }],
      envelopes: [],
    }),
  );
  assert.match((await check(data)).pending[0].reason, /bytes changed/);
});

async function ciEnvironment(t) {
  const names = [
    "GITHUB_ACTIONS",
    "GITHUB_REPOSITORY",
    "GITHUB_WORKFLOW_REF",
    "GITHUB_WORKFLOW_SHA",
    "GITHUB_SHA",
    "GITHUB_RUN_ID",
    "GITHUB_RUN_ATTEMPT",
    "ALGEBRA_PUBLIC_MATH_COHORT",
    "ALGEBRA_PUBLIC_MATH_SLOT",
    "ALGEBRA_PUBLIC_MATH_CHECKS",
    "ALGEBRA_PUBLIC_MATH_JOB_RESULTS",
  ];
  const previous = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  t.after(() => {
    for (const name of names)
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
  });
  const sha = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  Object.assign(process.env, {
    GITHUB_ACTIONS: "true",
    GITHUB_REPOSITORY: "SYNTHETIC/repo",
    GITHUB_WORKFLOW_REF:
      "SYNTHETIC/repo/.github/workflows/ci.yml@refs/heads/SYNTHETIC",
    GITHUB_WORKFLOW_SHA: sha,
    GITHUB_SHA: sha,
    GITHUB_RUN_ID: "711",
    GITHUB_RUN_ATTEMPT: "1",
    ALGEBRA_PUBLIC_MATH_JOB_RESULTS: JSON.stringify({
      engineering: "success",
      browser: "success",
    }),
  });
}
async function ciDirectory(t) {
  const prefix = path.resolve(
    "outputs/execution-freshness-corrections/SYNTHETIC-existing-ci-",
  );
  const root = await fs.mkdtemp(prefix);
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
async function completeCi(t) {
  const data = await syntheticExecution(t);
  await seedBuild(data);
  const aggregate = await ciDirectory(t);
  await fs.cp(data.root, aggregate, { recursive: true });
  await ciEnvironment(t);
  const cohort = await prepareCiCohort(aggregate, 1);
  process.env.ALGEBRA_PUBLIC_MATH_COHORT = JSON.stringify(cohort.reference);
  const producers = [];
  for (const slot of cohort.plan.slots) {
    const root = await ciDirectory(t);
    await fs.cp(aggregate, root, { recursive: true });
    process.env.ALGEBRA_PUBLIC_MATH_SLOT = slot.id;
    const local = { ...data, root, capture: await captureSource(root) };
    if (slot.id === "engineering") {
      await put(root, "outputs/SYNTHETIC-engineering.json", {
        ok: true,
        command: "verify",
        checks: engineeringChecks.slice(0, -1).map((name) => ({
          name,
          status: "passed",
          detail: "SYNTHETIC actual-envelope-shaped fixture",
        })),
      });
      process.env.ALGEBRA_PUBLIC_MATH_CHECKS = JSON.stringify([
        "outputs/SYNTHETIC-engineering.json",
      ]);
      await recordVerification(root, { layer: "math" }, async (recording) => ({
        checks: [await syntheticInvocation(recording, local, "node:test")],
      }));
    } else
      await recordVerification(
        root,
        { layer: "browser", built: true, shard: "1/1" },
        async (recording) => ({
          checks: [
            { name: "target-source-identity", status: "passed" },
            await syntheticInvocation(recording, local, "playwright"),
          ],
        }),
      );
    const sealed = await sealCiSlot(root);
    const container = path.join(
      aggregate,
      "outputs/public-math-imports",
      slot.artifact,
    );
    await fs.cp(sealed.directory, container, { recursive: true });
    producers.push({ root, slot, container, sealed });
  }
  delete process.env.ALGEBRA_PUBLIC_MATH_SLOT;
  return {
    data: { ...data, root: aggregate, capture: await captureSource(aggregate) },
    cohort,
    producers,
  };
}

test("SYNTHETIC current CI plan, exact separate containers and repeated read admit no aggregate history", async (t) => {
  const { data, cohort, producers } = await completeCi(t);
  assert.equal((await check(data)).ok, true, JSON.stringify(await check(data)));
  assert.equal(
    (await aggregateExecutionRecordings(data.root)).satisfiesRequirement,
    true,
  );
  assert.equal(
    (await aggregateExecutionRecordings(data.root)).satisfiesRequirement,
    true,
  );
  await fs.cp(producers[0].sealed.directory, producers[0].container, {
    recursive: true,
  });
  assert.equal((await check(data)).ok, true);
  process.env.GITHUB_RUN_ATTEMPT = "2";
  assert.match(
    (await check(data)).pending[0].reason,
    /not current provider context/,
  );
  process.env.GITHUB_RUN_ATTEMPT = "1";
  delete process.env.ALGEBRA_PUBLIC_MATH_COHORT;
  assert.match(
    (await check(data)).pending[0].reason,
    /cohort reference is absent/,
  );
  process.env.ALGEBRA_PUBLIC_MATH_COHORT = JSON.stringify(cohort.reference);
  process.env.GITHUB_ACTIONS = "false";
  assert.match(
    (await check(data)).pending[0].reason,
    /current provider authority/,
  );
});

for (const mutation of [
  "missing",
  "extra",
  "unsealed",
  "conflicting",
  "mixed",
  "failed-job",
])
  test(`SYNTHETIC explicit CI selection refuses ${mutation} artifact cohort`, async (t) => {
    const { data, producers } = await completeCi(t);
    const first = producers[0];
    if (mutation === "missing")
      await fs.rm(first.container, { recursive: true });
    if (mutation === "extra")
      await fs.mkdir(
        path.join(data.root, "outputs/public-math-imports/SYNTHETIC-extra"),
      );
    if (mutation === "unsealed")
      await fs.rm(path.join(first.container, "seal.json"));
    if (mutation === "conflicting")
      await put(first.container, "outputs/SYNTHETIC-extra.json", {
        changed: true,
      });
    if (mutation === "mixed") {
      const seal = JSON.parse(
        await fs.readFile(path.join(first.container, "seal.json")),
      );
      seal.cohort.sha256 = "f".repeat(64);
      await fs.writeFile(
        path.join(first.container, "seal.json"),
        JSON.stringify(seal),
      );
    }
    if (mutation === "failed-job")
      process.env.ALGEBRA_PUBLIC_MATH_JOB_RESULTS = JSON.stringify({
        engineering: "success",
        browser: "failure",
      });
    assert.equal((await check(data)).ok, false);
    await assert.rejects(
      aggregateExecutionRecordings(data.root),
      /Current selected execution refused/,
    );
  });

test("SYNTHETIC CI second same-slot command and empty admitted crashes remain sealed and current", async (t) => {
  const { data, producers } = await completeCi(t),
    producer = producers[0];
  process.env.ALGEBRA_PUBLIC_MATH_SLOT = producer.slot.id;
  await assert.rejects(
    recordVerification(producer.root, { layer: "math" }, async () => {
      throw new Error("SYNTHETIC second slot command failure");
    }),
    /second slot command failure/,
  );
  await fs.rm(producer.sealed.directory, { recursive: true });
  const sealed = await sealCiSlot(producer.root);
  await fs.rm(producer.container, { recursive: true });
  await fs.cp(sealed.directory, producer.container, { recursive: true });
  assert.match((await check(data)).pending[0].reason, /admitted failure/);
  const owner = await openRecording(producer.root, {
    scope: "partial",
    members: producer.slot.request.members,
    checks: ["mathematical-and-content-suites"],
  });
  const admissionFile = path.join(producer.root, owner.binding.admission.file);
  await fs.rm(admissionFile);
  await fs.rm(producer.sealed.directory, { recursive: true });
  await sealCiSlot(producer.root);
  await fs.rm(producer.container, { recursive: true });
  await fs.cp(producer.sealed.directory, producer.container, {
    recursive: true,
  });
  assert.equal((await check(data)).ok, false);
});

for (const seam of [
  "admission",
  "binding",
  "descriptor",
  "report",
  "checks",
  "index",
  "temporary-terminal",
  "failure-directory",
])
  test(`SYNTHETIC abrupt child exit at ${seam} leaves a blocking filesystem prefix`, async (t) => {
    const root = await temporary(t),
      old = await openRecording(root, request);
    await old.complete(reference(old));
    const stateModule = pathToFileURL(
      path.resolve("scripts/lib/public-math-v2/execution-state.mjs"),
    ).href;
    const code = `import fs from 'node:fs/promises';import {openRecording} from ${JSON.stringify(stateModule)};const root=process.argv[1],seam=process.argv[2];if(seam==='admission'){await fs.mkdir(root+'/outputs/public-math-runs/state-v3/local/2');process.exit(86);}const owner=await openRecording(root,${JSON.stringify(request)});for(const stage of ['binding','descriptor','report','checks','index']){await owner.retain(stage+'.json',{kind:'SYNTHETIC abrupt-exit prefix',stage});if(stage===seam)process.exit(86);}if(seam==='temporary-terminal')await fs.writeFile(root+'/outputs/public-math-runs/state-v3/local/2/success.json.crashed.tmp','incomplete');if(seam==='failure-directory')await fs.mkdir(root+'/outputs/public-math-runs/state-v3/local/2/failures/SYNTHETIC-empty');process.exit(86);`;
    await assert.rejects(
      execute(process.execPath, [
        "--input-type=module",
        "-e",
        code,
        root,
        seam,
      ]),
      (error) => error.code === 86,
    );
    await assert.rejects(readSelectedRecording(root));
  });

test("SYNTHETIC simultaneous identical and conflicting publication races preserve immutable bytes", async (t) => {
  const root = await temporary(t),
    owner = await openRecording(root, request);
  const facts = await Promise.all(
    Array.from({ length: 8 }, () =>
      owner.retain("raced.json", { SYNTHETIC: true }),
    ),
  );
  assert(facts.every((value) => value.sha256 === facts[0].sha256));
  const outcomes = await Promise.allSettled([
    owner.complete(reference(owner)),
    owner.complete({ ...reference(owner), sha256: "f".repeat(64) }),
  ]);
  assert(outcomes.some((value) => value.status === "rejected"));
  await assert.rejects(readSelectedRecording(root), /admitted failure/);
});

test("SYNTHETIC sealed directory facts survive archives omitting empty admission/failure directories", async (t) => {
  const { data, producers } = await completeCi(t),
    producer = producers[0];
  const seal = JSON.parse(
    await fs.readFile(path.join(producer.container, "seal.json")),
  );
  const empty = seal.directories.filter((file) => file.endsWith("/failures"));
  for (const file of empty)
    await fs.rm(path.join(producer.container, file), { recursive: true });
  assert.equal((await check(data)).ok, true);
  process.env.ALGEBRA_PUBLIC_MATH_SLOT = producer.slot.id;
  const owner = await openRecording(producer.root, {
    scope: "partial",
    members: producer.slot.request.members,
    checks: ["mathematical-and-content-suites"],
  });
  const attempt = path.posix.dirname(owner.binding.admission.file);
  await fs.mkdir(
    path.join(producer.root, attempt, "failures/SYNTHETIC-crashed"),
  );
  await fs.rm(producer.sealed.directory, { recursive: true });
  await sealCiSlot(producer.root);
  await fs.rm(producer.container, { recursive: true });
  await fs.cp(producer.sealed.directory, producer.container, {
    recursive: true,
  });
  await fs.rm(
    path.join(producer.container, attempt, "failures/SYNTHETIC-crashed"),
    { recursive: true },
  );
  assert.match((await check(data)).pending[0].reason, /admitted failure/);
});

for (const field of [
  "GITHUB_REPOSITORY",
  "GITHUB_WORKFLOW_REF",
  "GITHUB_WORKFLOW_SHA",
  "GITHUB_SHA",
  "GITHUB_RUN_ID",
])
  test(`SYNTHETIC copied CI metadata cannot replace current provider ${field}`, async (t) => {
    const { data } = await completeCi(t);
    process.env[field] = field.endsWith("SHA")
      ? "e".repeat(40)
      : field === "GITHUB_RUN_ID"
        ? "712"
        : "SYNTHETIC-other";
    assert.equal((await check(data)).ok, false);
  });

for (const defect of [
  null,
  "skip",
  "retry",
  "expected-failure",
  "wrong-shard",
  "bad-attachment",
])
  test(`SYNTHETIC actual Playwright reporter adapter ${defect ?? "positive"} preserves strict participant closure`, async (t) => {
    const data = await syntheticExecution(t);
    await seedBuild(data);
    const { default: Reporter } =
      await import("../scripts/public-math-playwright-reporter.mjs");
    const previous = process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR;
    t.after(() => {
      if (previous === undefined)
        delete process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR;
      else process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR = previous;
    });
    const work = recordVerification(
      data.root,
      { layer: "browser", built: true },
      async (recording) => {
        const result = await recording.run("playwright", async (paths) => {
          const descriptor = JSON.parse(await fs.readFile(paths.file));
          process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR = paths.file;
          await put(data.root, "node_modules/@playwright/test/package.json", {
            version: "1.63.0",
            description:
              "SYNTHETIC adapter metadata fixture. No package install or Playwright execution.",
          });
          const target = { ...data.run.targetBefore, root: descriptor.root };
          await fs.writeFile(descriptor.targetBefore, JSON.stringify(target));
          await fs.writeFile(descriptor.targetAfter, JSON.stringify(target));
          const file = path.join(descriptor.root, data.fixture.source.file);
          const testcase = {
            id: "SYNTHETIC-genuine-adapter-id",
            location: {
              file,
              line: data.run.registrations[0].line,
              column: data.run.registrations[0].column,
            },
            parent: { type: "file", project: () => ({ name: "synthetic" }) },
            title: data.fixture.case,
            titlePath: () => [data.fixture.case],
            repeatEachIndex: 0,
            expectedStatus: defect === "expected-failure" ? "failed" : "passed",
            annotations: defect === "skip" ? [{ type: "skip" }] : [],
          };
          const reporter = new Reporter();
          reporter.onBegin(
            {
              shard: defect === "wrong-shard" ? { current: 1, total: 2 } : null,
            },
            { allTests: () => [testcase] },
          );
          const attachments = [
            ...data.run.observations.map((observation) => ({
              name: "public-math-observation-v2",
              body: Buffer.from(
                defect === "bad-attachment"
                  ? "malformed"
                  : JSON.stringify(observation),
              ),
            })),
            {
              name: "public-math-resources-v2",
              body: Buffer.from(
                JSON.stringify({ resources: data.run.resources, errors: [] }),
              ),
            },
          ];
          reporter.onTestEnd(testcase, {
            retry: defect === "retry" ? 1 : 0,
            status: "passed",
            errors: [],
            attachments,
          });
          await reporter.onEnd({ status: "passed" });
          const marker = path.join(
            path.dirname(paths.output),
            "SYNTHETIC-adapter-owner.json",
          );
          await fs.writeFile(
            marker,
            JSON.stringify({
              runId: target.runId,
              status: "stopped",
              root: target.root,
              pid: target.pid,
              processIdentity: target.processIdentity,
              origin: target.origin,
            }),
          );
          await recording.cleanup(marker, { stopped: true }, true);
          return {
            name: "browser-interactions",
            status: "passed",
            detail:
              "SYNTHETIC callback using actual adapter and synthetic events",
          };
        });
        return {
          checks: [
            { name: "target-source-identity", status: "passed" },
            result,
          ],
        };
      },
    );
    if (defect) await assert.rejects(work);
    else assert.equal((await work).partial, true);
  });

test("SYNTHETIC exact-name staging executes isolated transport and refuses conflicting retries durably", async (t) => {
  const { data, cohort, producers } = await completeCi(t);
  const transport = await ciDirectory(t),
    bin = path.join(transport, "bin");
  await fs.mkdir(bin);
  const oldPath = process.env.PATH,
    oldSource = process.env.SYNTHETIC_GH_ARTIFACTS;
  t.after(() => {
    process.env.PATH = oldPath;
    if (oldSource === undefined) delete process.env.SYNTHETIC_GH_ARTIFACTS;
    else process.env.SYNTHETIC_GH_ARTIFACTS = oldSource;
  });
  for (const producer of producers)
    await fs.cp(
      producer.sealed.directory,
      path.join(transport, producer.slot.artifact),
      { recursive: true },
    );
  const script = `#!${process.execPath}\nimport fs from 'node:fs';import path from 'node:path';const args=process.argv.slice(2);if(args[0]!=='run'||args[1]!=='download'||args[2]!=='711')process.exit(91);const name=args[args.indexOf('--name')+1],destination=args[args.indexOf('--dir')+1];fs.appendFileSync(path.join(process.env.SYNTHETIC_GH_ARTIFACTS,'requests.jsonl'),JSON.stringify({name,destination})+'\\n');fs.cpSync(path.join(process.env.SYNTHETIC_GH_ARTIFACTS,name),destination,{recursive:true});\n`;
  await fs.writeFile(path.join(bin, "gh"), script, { mode: 0o755 });
  process.env.PATH = `${bin}:${oldPath}`;
  process.env.SYNTHETIC_GH_ARTIFACTS = transport;
  await fs.rm(path.join(data.root, "outputs/public-math-imports"), {
    recursive: true,
  });
  await stageCiContainers(data.root);
  await stageCiContainers(data.root);
  assert.equal((await check(data)).ok, true);
  const calls = (
    await fs.readFile(path.join(transport, "requests.jsonl"), "utf8")
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line).name);
  assert.deepEqual(
    calls,
    [...cohort.plan.slots, ...cohort.plan.slots].map((slot) => slot.artifact),
  );
  const artifact = path.join(transport, producers[0].slot.artifact),
    sealPath = path.join(artifact, "seal.json");
  const seal = JSON.parse(await fs.readFile(sealPath));
  const row = seal.files.find((row) => row.file.endsWith("/checks.json"));
  const changed = Buffer.concat([
    await fs.readFile(path.join(artifact, row.file)),
    Buffer.from("\n"),
  ]);
  await fs.writeFile(path.join(artifact, row.file), changed);
  row.sha256 = sha256(changed);
  row.bytes = changed.length;
  await fs.writeFile(sealPath, JSON.stringify(seal));
  await assert.rejects(
    stageCiContainers(data.root),
    /Conflicting immutable publication/,
  );
  assert.equal((await check(data)).ok, false);
});

test("SYNTHETIC old callback failure after newer failure remains confined to its admission", async (t) => {
  const data = await syntheticExecution(t);
  await seedBuild(data);
  let release, ready;
  const wait = new Promise((resolve) => (release = resolve)),
    started = new Promise((resolve) => (ready = resolve));
  const older = recordVerification(
    data.root,
    { layer: "math" },
    async (recording) => {
      await syntheticInvocation(recording, data, "node:test");
      ready();
      await wait;
      throw new Error("SYNTHETIC delayed old callback failure");
    },
  );
  await started;
  await assert.rejects(
    recordVerification(data.root, { layer: "math" }, async () => {
      throw new Error("SYNTHETIC newer callback failure");
    }),
    /newer callback failure/,
  );
  const journal = path.join(
    data.root,
    "outputs/public-math-runs/state-v3/local",
  );
  const before = await fs.readFile(path.join(journal, "2/admission.json"));
  release();
  await assert.rejects(older, /delayed old callback failure/);
  assert.deepEqual(
    await fs.readFile(path.join(journal, "2/admission.json")),
    before,
  );
  assert.equal((await fs.readdir(path.join(journal, "1/failures"))).length, 1);
  assert.equal((await fs.readdir(path.join(journal, "2/failures"))).length, 1);
  assert.match((await check(data)).pending[0].reason, /admitted failure/);
});

test("SYNTHETIC local full terminal requires complete global obligations before success publication", async (t) => {
  const data = await syntheticExecution(t);
  data.run.registrations[0].titlePath = ["SYNTHETIC non-required case"];
  data.run.observations = [];
  data.run.resources = [];
  await assert.rejects(syntheticFull(data), /Required fixture has zero/);
  const journal = path.join(
    data.root,
    "outputs/public-math-runs/state-v3/local/1",
  );
  await assert.rejects(fs.access(path.join(journal, "success.json")), {
    code: "ENOENT",
  });
  assert.match((await check(data)).pending[0].reason, /admitted failure/);
});

async function duringReportRead(data, mutate, work) {
  const selected = await readSelectedRecording(data.root);
  const index = JSON.parse(
    await fs.readFile(
      path.join(data.root, selected.participants[0].index.file),
    ),
  );
  const report = path.join(data.root, index.runs[0].file),
    read = fs.readFile;
  let injected = false;
  fs.readFile = async (...args) => {
    const bytes = await read(...args);
    if (!injected && String(args[0]) === report) {
      injected = true;
      await mutate();
    }
    return bytes;
  };
  try {
    return await work();
  } finally {
    fs.readFile = read;
    assert(injected, "Actual retained report read seam must execute");
  }
}

for (const defect of [
  "asset-bytes",
  "added-file",
  "removed-file",
  "added-directory",
  "removed-directory",
  "symlink",
  "special-entry",
  "identity-special-entry",
  "identity-symlink",
  "directory-symlink",
  "identity",
  "compiler-manifest",
  "build-evidence",
])
  test(`SYNTHETIC final execution reader refuses in-flight dist ${defect}`, async (t) => {
    const data = await syntheticExecution(t);
    const empty = path.join(data.root, "dist/SYNTHETIC-empty");
    await fs.mkdir(empty);
    assert.equal((await syntheticFull(data)).satisfiesRequirement, true);
    const result = await duringReportRead(
      data,
      async () => {
        const asset = path.join(data.root, "dist/client/assets/synthetic.js");
        if (defect === "asset-bytes")
          await fs.writeFile(asset, "SYNTHETIC changed actual bytes");
        if (defect === "added-file")
          await put(data.root, "dist/SYNTHETIC-extra", "extra");
        if (defect === "removed-file") await fs.rm(asset);
        if (defect === "added-directory")
          await fs.mkdir(path.join(data.root, "dist/SYNTHETIC-added"));
        if (defect === "removed-directory") await fs.rmdir(empty);
        if (defect === "symlink")
          await fs.symlink(asset, path.join(data.root, "dist/SYNTHETIC-link"));
        if (defect === "special-entry")
          await execute("mkfifo", [
            path.join(data.root, "dist/SYNTHETIC-fifo"),
          ]);
        if (defect === "identity-special-entry") {
          const identity = path.join(data.root, "dist/build-identity.json");
          await fs.rm(identity);
          await execute("mkfifo", [identity]);
        }
        if (defect === "identity-symlink") {
          const identity = path.join(data.root, "dist/build-identity.json");
          await fs.rename(identity, path.join(data.root, "SYNTHETIC-identity"));
          await fs.symlink(
            path.join(data.root, "SYNTHETIC-identity"),
            identity,
          );
        }
        if (defect === "directory-symlink") {
          await fs.rmdir(empty);
          await fs.mkdir(path.join(data.root, "SYNTHETIC-directory"));
          await fs.symlink(path.join(data.root, "SYNTHETIC-directory"), empty);
        }
        if (defect === "identity")
          await put(data.root, "dist/build-identity.json", {
            ...data.build.identity,
            sourceDigest: "0".repeat(64),
          });
        if (defect === "compiler-manifest")
          await put(data.root, "dist/client/.vite/manifest.json", {});
        if (defect === "build-evidence")
          await fs.appendFile(
            path.join(data.root, "dist/public-math-build.json"),
            " ",
          );
      },
      () =>
        checkPublicMath({ root: data.root, require: "executed-presentation" }),
    );
    assert.equal(result.satisfiesRequirement, false, JSON.stringify(result));
    assert.match(
      result.pending[0].reason,
      /manifest|membership|directory|symlink|boundary|Unsupported|identity|changed/i,
    );
  });

test("SYNTHETIC final full refusal remains dominant after byte restoration", async (t) => {
  const data = await syntheticExecution(t);
  const asset = path.join(data.root, "dist/client/assets/synthetic.js");
  const original = await fs.readFile(asset),
    link = fs.link;
  let injected = false;
  fs.link = async (...args) => {
    const value = await link(...args);
    if (
      String(args[1]).startsWith(data.root + path.sep) &&
      String(args[1]).endsWith("/success.json")
    ) {
      injected = true;
      await fs.writeFile(asset, "SYNTHETIC post-terminal asset change");
    }
    return value;
  };
  try {
    await assert.rejects(
      syntheticFull(data),
      /Final current execution refused/,
    );
  } finally {
    fs.link = link;
  }
  assert(injected);
  await fs.writeFile(asset, original);
  assert.equal(
    (
      await fs.readdir(
        path.join(
          data.root,
          "outputs/public-math-runs/state-v3/local/1/failures",
        ),
      )
    ).length,
    1,
  );
  const result = await checkPublicMath({
    root: data.root,
    require: "executed-presentation",
  });
  assert.equal(result.satisfiesRequirement, false);
  assert.match(result.pending[0].reason, /admitted failure/);
  assert.equal((await syntheticFull(data)).satisfiesRequirement, true);
});

async function borrowedFixture(t) {
  const data = await syntheticExecution(t);
  await seedBuild(data);
  const target = data.run.targetBefore,
    owner = path.join(data.root, target.ownerFile);
  await put(data.root, target.ownerFile, {
    version: 1,
    runId: target.runId,
    root: data.root,
    ownerFile: owner,
    runDir: path.dirname(owner),
    origin: target.origin,
    kind: "built",
    pid: target.pid,
    processIdentity: target.processIdentity,
    status: "running",
    description: "SYNTHETIC exclusive target. No server or process launched.",
  });
  data.run.targetBefore.ownerSha256 = sha256(await fs.readFile(owner));
  data.run.targetAfter.ownerSha256 = data.run.targetBefore.ownerSha256;
  return { data, owner };
}
async function borrowedRun(data, owner, mutate = async () => {}) {
  return recordVerification(
    data.root,
    {
      layer: "browser",
      built: true,
      feature: "SYNTHETIC-feature",
      owner,
      url: data.run.targetBefore.origin,
    },
    async (recording) => {
      const result = await recording.run("playwright", async (paths) => {
        const descriptor = JSON.parse(await fs.readFile(paths.file));
        const report = {
          ...structuredClone(data.run),
          ...descriptor.record,
          snapshotAfter: descriptor.record.snapshot,
        };
        await mutate(report, paths, recording);
        await fs.writeFile(paths.output, JSON.stringify(report));
        return {
          name: "browser-interactions",
          status: "passed",
          detail: "SYNTHETIC borrowed target report, no browser.",
        };
      });
      return {
        checks: [{ name: "target-source-identity", status: "passed" }, result],
      };
    },
  );
}

test("SYNTHETIC explicitly borrowed target retains exact running owner across partial feature commands", async (t) => {
  const { data, owner } = await borrowedFixture(t),
    original = await fs.readFile(owner);
  for (let i = 0; i < 2; i++) {
    const result = await borrowedRun(data, owner);
    assert.equal(result.partial, true);
    assert.equal(result.satisfiesRequirement, false);
    assert.deepEqual(await fs.readFile(owner), original);
  }
  const admission = JSON.parse(
    await fs.readFile(
      path.join(
        data.root,
        "outputs/public-math-runs/state-v3/local/2/admission.json",
      ),
    ),
  );
  assert.equal(admission.request.target.kind, "borrowed");
  assert.equal(admission.request.target.owner.sha256, sha256(original));
  assert.match((await check(data)).pending[0].reason, /partial/);
});

for (const defect of [
  "owner-hash",
  "owner-identity",
  "owner-changed",
  "resource",
  "whole-output",
  "native-control",
  "build-identity",
])
  test(`SYNTHETIC borrowed partial preserves strict ${defect} refusal`, async (t) => {
    const { data, owner } = await borrowedFixture(t);
    await assert.rejects(
      borrowedRun(data, owner, async (report) => {
        if (defect === "owner-hash")
          report.targetBefore.ownerSha256 = report.targetAfter.ownerSha256 =
            "0".repeat(64);
        if (defect === "owner-identity")
          report.targetBefore.processIdentity =
            report.targetAfter.processIdentity = "SYNTHETIC other process";
        if (defect === "owner-changed") await fs.appendFile(owner, " ");
        if (defect === "resource") report.resources[0].sha256 = "0".repeat(64);
        if (defect === "whole-output")
          report.observations[0].segments = [{ kind: "prose", text: "wrong" }];
        if (defect === "native-control")
          report.observations[0].controls = [
            { path: "unknown", selector: "input", read: "value", value: "1" },
          ];
        if (defect === "build-identity")
          report.targetBefore.identity.sourceDigest =
            report.targetAfter.identity.sourceDigest = "0".repeat(64);
      }),
    );
    assert.equal(
      (
        await fs.readdir(
          path.join(
            data.root,
            "outputs/public-math-runs/state-v3/local/1/failures",
          ),
        )
      ).length,
      1,
    );
    assert.match((await check(data)).pending[0].reason, /admitted failure/);
  });

test("SYNTHETIC created partial still requires stopped owner and closed exclusive port", async (t) => {
  const { data, owner } = await borrowedFixture(t);
  await assert.rejects(
    recordVerification(
      data.root,
      { layer: "browser", built: true, feature: "SYNTHETIC" },
      async (recording) => {
        const result = await recording.run("playwright", async (paths) => {
          const descriptor = JSON.parse(await fs.readFile(paths.file));
          await fs.writeFile(
            paths.output,
            JSON.stringify({
              ...data.run,
              ...descriptor.record,
              snapshotAfter: descriptor.record.snapshot,
            }),
          );
          return { name: "browser-interactions", status: "passed" };
        });
        return {
          checks: [
            { name: "target-source-identity", status: "passed" },
            result,
          ],
        };
      },
    ),
    /Missing owned run cleanup and closed port/,
  );
  assert.equal(JSON.parse(await fs.readFile(owner)).status, "running");
});

test("SYNTHETIC full union cannot borrow cleanup exemption from a partial participant", async (t) => {
  const { data, owner } = await borrowedFixture(t);
  await borrowedRun(data, owner);
  const admission = JSON.parse(
    await fs.readFile(
      path.join(
        data.root,
        "outputs/public-math-runs/state-v3/local/1/admission.json",
      ),
    ),
  );
  const partial = JSON.parse(
    await fs.readFile(
      path.join(
        data.root,
        "outputs/public-math-runs/state-v3/local/1/partial.json",
      ),
    ),
  );
  const index = JSON.parse(
    await fs.readFile(path.join(data.root, partial.index.file)),
  );
  const run = JSON.parse(
    await fs.readFile(path.join(data.root, index.runs[0].file)),
  );
  assert.equal(admission.request.target.kind, "borrowed");
  run.selection.filtered = false;
  await assert.rejects(
    validateExecution(
      data.capture,
      data.accepted.sourceAcceptance,
      data.accepted.acceptanceDigest,
      index,
      [run],
      data.build,
    ),
    /Missing owned run cleanup and closed port/,
  );
});

test("SYNTHETIC missing final build fact durably fails admission after restoration", async (t) => {
  const data = await syntheticExecution(t);
  await seedBuild(data);
  const file = path.join(data.root, "dist/public-math-build.json"),
    original = await fs.readFile(file),
    link = fs.link;
  let injected = false;
  fs.link = async (...args) => {
    const value = await link(...args);
    if (
      String(args[1]).startsWith(data.root + path.sep) &&
      String(args[1]).endsWith("/success.json")
    ) {
      injected = true;
      await fs.rm(file);
    }
    return value;
  };
  try {
    await assert.rejects(
      syntheticFull(data),
      /Final current execution refused/,
    );
  } finally {
    fs.link = link;
  }
  assert(injected);
  await fs.writeFile(file, original);
  const result = await checkPublicMath({
    root: data.root,
    require: "executed-presentation",
  });
  assert.equal(result.satisfiesRequirement, false);
  assert.match(result.pending[0].reason, /admitted failure/);
});

for (const defect of ["still-running", "open-port"])
  test(`SYNTHETIC created target cleanup refuses ${defect}`, async (t) => {
    const { data, owner } = await borrowedFixture(t);
    await assert.rejects(
      recordVerification(
        data.root,
        { layer: "browser", built: true },
        async (recording) => {
          const result = await recording.run("playwright", async () => {
            await recording.cleanup(
              owner,
              { stopped: defect !== "still-running" },
              defect !== "open-port",
            );
            return { name: "browser-interactions", status: "passed" };
          });
          return {
            checks: [
              { name: "target-source-identity", status: "passed" },
              result,
            ],
          };
        },
      ),
      /did not stop and close its exclusive port/,
    );
    assert.match((await check(data)).pending[0].reason, /admitted failure/);
  });
