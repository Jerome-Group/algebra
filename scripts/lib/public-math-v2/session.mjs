import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { checkPublicMath } from "../public-math-v2.mjs";
import { captureSource } from "./source.mjs";
import { sha256 } from "../math-presentation.mjs";
import {
  executionSnapshot,
  validateBuild,
  validateExecution,
  readParticipantEvidence,
  buildEvidenceFile,
} from "./execution.mjs";
import {
  openRecording,
  prepareCiCohort,
  sealCiSlot,
  stageCiContainers,
  engineeringChecks,
  browserChecks,
} from "./execution-state.mjs";

async function requestFor(root, options) {
  const browserTarget = async () => {
    const file = options.owner ?? process.env.ALGEBRA_LOCAL_OWNER;
    if (!file) return { target: { kind: "created" } };
    const absolute = path.resolve(file);
    if (
      !absolute.startsWith(path.join(root, "outputs") + path.sep) ||
      (await fs.realpath(absolute)) !== absolute ||
      !(await fs.lstat(absolute)).isFile()
    )
      throw new Error("Borrowed owner lies outside real owned outputs");
    const bytes = await fs.readFile(absolute);
    return {
      target: {
        kind: "borrowed",
        owner: { file: path.relative(root, absolute), sha256: sha256(bytes) },
        origin: options.url ?? JSON.parse(bytes).origin,
      },
      borrowedOwner: bytes,
    };
  };
  const selection = {
    shard: options.shard
      ? (() => {
          const [index, total] = options.shard.split("/").map(Number);
          return { index, total };
        })()
      : null,
    filtered: Boolean(options.feature),
  };
  if (options.layer === "all")
    return {
      ...(await browserTarget()),
      scope: options.feature || options.shard ? "partial" : "full",
      members: [
        { runner: "node:test", selection: { shard: null, filtered: false } },
        { runner: "playwright", selection },
      ],
      checks: [
        ...engineeringChecks.slice(0, -1),
        "mathematical-and-content-suites",
        ...browserChecks,
      ],
    };
  if (options.layer === "math")
    return {
      scope: "partial",
      members: [
        { runner: "node:test", selection: { shard: null, filtered: false } },
      ],
      checks: ["mathematical-and-content-suites"],
    };
  if (options.layer === "browser" && options.built)
    return {
      ...(await browserTarget()),
      scope: "partial",
      members: [{ runner: "playwright", selection }],
      checks: browserChecks,
    };
  return null;
}
async function bind(owner) {
  const source = await checkPublicMath({
    root: owner.root,
    require: "source-attestation",
  });
  if (!source.satisfiesRequirement)
    throw new Error(
      `Source acceptance missing: ${JSON.stringify(source.pending)}`,
    );
  const bytes = await fs.readFile(path.join(owner.root, buildEvidenceFile));
  const buildReference = { file: buildEvidenceFile, sha256: sha256(bytes) };
  const build = await validateBuild(
    await captureSource(owner.root),
    source.acceptanceDigest,
    JSON.parse(bytes),
  );
  const reference = await owner.retain("binding.json", {
    ownership: owner.binding,
    sourceAcceptanceDigest: source.acceptanceDigest,
    build: buildReference,
  });
  return { source, build, buildReference, reference };
}
export async function recordVerification(root, options, work) {
  root = await fs.realpath(root);
  const planned = await requestFor(root, options);
  const { borrowedOwner, ...request } = planned ?? {};
  if (!planned)
    return work({
      run: (_runner, invoke) => invoke(null),
      cleanup: async () => {},
      serverDirectory: null,
    });
  const owner = await openRecording(root, request);
  let accepted;
  const descriptors = [],
    runs = [],
    cleanup = [],
    invocationChecks = [];
  try {
    const targetOwner = borrowedOwner
      ? await owner.retain("borrowed-owner.json", borrowedOwner)
      : undefined;
    const recording = {
      serverDirectory: path.join(owner.directory, "server"),
      async run(runner, invoke) {
        const expected = owner.request.members[descriptors.length];
        if (!expected || expected.runner !== runner)
          throw new Error("Actual runner differs from planned invocation");
        accepted ??= await bind(owner);
        const invocation = randomUUID();
        const output = path.join(
          owner.directory,
          `runner-output-${invocation}.json`,
        );
        const retainedOutput = `outputs/public-math-runs/${owner.runId}/record-${invocation}.json`;
        const descriptor = {
          root: owner.root,
          invocation,
          output,
          retainedOutput,
          targetBefore: path.join(
            owner.directory,
            `target-before-${invocation}.json`,
          ),
          targetAfter: path.join(
            owner.directory,
            `target-after-${invocation}.json`,
          ),
          cases: accepted.source.sourceAcceptance.requiredCases,
          requirements: accepted.source.sourceAcceptance.observations,
          manifest: accepted.build.manifest,
          record: {
            runId: owner.runId,
            binding: owner.binding,
            invocation,
            argv: [],
            sourceAcceptanceDigest: accepted.source.acceptanceDigest,
            buildEvidenceDigest: accepted.buildReference.sha256,
            snapshot: await executionSnapshot(owner.root),
            selection: expected.selection,
          },
        };
        const reference = await owner.retain(
          `descriptor-${invocation}.json`,
          descriptor,
        );
        descriptors.push(reference);
        const result = await invoke({
          file: path.join(owner.root, reference.file),
          output,
        });
        if (
          result?.name !==
          (runner === "node:test"
            ? "mathematical-and-content-suites"
            : "browser-interactions")
        )
          throw new Error(
            "Actual named runner check differs from planned invocation",
          );
        invocationChecks.push(
          await owner.retain(`invocation-check-${invocation}.json`, result),
        );
        runs.push(
          await owner.retain(
            `record-${invocation}.json`,
            await fs.readFile(output),
          ),
        );
        if (result?.status !== "passed")
          await owner.fail(
            new Error(`Actual ${runner} verification check failed`),
          );
        return result;
      },
      async cleanup(marker, result, portClosed) {
        if (!result.stopped || !portClosed)
          throw new Error(
            "Owned execution did not stop and close its exclusive port",
          );
        const bytes = await fs.readFile(marker),
          stopped = JSON.parse(bytes);
        cleanup.push({
          runId: stopped.runId,
          owner: await owner.retain(`cleanup-${stopped.runId}.json`, bytes),
          stopped: true,
          portClosed: true,
        });
      },
    };
    const result = await work(recording);
    const checks = [],
      envelopes = [];
    if (
      process.env.GITHUB_ACTIONS === "true" &&
      process.env.ALGEBRA_PUBLIC_MATH_SLOT === "engineering"
    ) {
      const files = JSON.parse(process.env.ALGEBRA_PUBLIC_MATH_CHECKS ?? "[]");
      if (!Array.isArray(files))
        throw new Error("Actual engineering check envelopes missing");
      for (const [i, file] of files.entries()) {
        if (
          typeof file !== "string" ||
          !/^outputs\/[A-Za-z0-9_-]+\.json$/.test(file)
        )
          throw new Error("Unexpected actual check envelope path");
        const bytes = await fs.readFile(path.join(root, file));
        const envelope = JSON.parse(bytes);
        if (envelope.ok !== true || envelope.command !== "verify")
          throw new Error("Actual engineering check command did not pass");
        checks.push(...envelope.checks);
        envelopes.push(await owner.retain(`checks-envelope-${i}.json`, bytes));
      }
    }
    checks.push(...result.checks);
    const checkReference = await owner.retain("checks.json", {
      checks,
      envelopes,
    });
    if (!accepted || descriptors.length !== owner.request.members.length)
      throw new Error("Planned actual invocation did not complete");
    const index = {
      version: "public-math-execution-v3",
      runId: owner.runId,
      sourceAcceptanceDigest: accepted.source.acceptanceDigest,
      build: accepted.buildReference,
      binding: accepted.reference,
      checks: checkReference,
      descriptors,
      invocationChecks,
      runs,
      cleanup,
      ...(targetOwner ? { targetOwner } : {}),
    };
    const indexReference = await owner.retain("index.json", index);
    const currentSource = await checkPublicMath({
      root,
      require: "source-attestation",
    });
    if (
      !currentSource.satisfiesRequirement ||
      currentSource.acceptanceDigest !== accepted.source.acceptanceDigest
    )
      throw new Error("Source acceptance changed before participant closure");
    const candidate = await readParticipantEvidence(
      await captureSource(root),
      accepted.source.sourceAcceptance,
      accepted.source.acceptanceDigest,
      {
        root,
        admission: {
          runId: owner.runId,
          request: owner.request,
          cohort: owner.binding.cohort,
          slot: owner.binding.slot,
        },
        admissionReference: owner.binding.admission,
        index: indexReference,
      },
    );
    if (owner.request.scope === "full")
      await validateExecution(
        await captureSource(root),
        accepted.source.sourceAcceptance,
        accepted.source.acceptanceDigest,
        candidate.index,
        candidate.runs,
        candidate.build,
      );
    await owner.complete(indexReference);
    if (owner.request.scope === "partial")
      return {
        partial: true,
        satisfiesRequirement: false,
        directory: owner.directory,
      };
    const execution = await checkPublicMath({
      root,
      require: "executed-presentation",
    });
    if (!execution.satisfiesRequirement)
      throw new Error(
        `Final current execution refused: ${JSON.stringify(execution.pending)}`,
      );
    return { ...execution, directory: owner.directory };
  } catch (error) {
    await owner.fail(error);
    throw error;
  }
}
export async function aggregateExecutionRecordings(root) {
  const result = await checkPublicMath({
    root,
    require: "executed-presentation",
  });
  if (!result.satisfiesRequirement)
    throw new Error(
      `Current selected execution refused: ${JSON.stringify(result.pending)}`,
    );
  return result;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  try {
    let result;
    if (
      process.argv[2] === "cohort" &&
      process.argv[3] === "--browser-shards" &&
      process.argv.length === 5
    ) {
      result = await prepareCiCohort(root, Number(process.argv[4]));
      const reference = JSON.stringify(result.reference);
      if (process.env.GITHUB_ENV)
        await fs.appendFile(
          process.env.GITHUB_ENV,
          `ALGEBRA_PUBLIC_MATH_COHORT=${reference}\nALGEBRA_PUBLIC_MATH_SLOT=engineering\n`,
        );
      if (process.env.GITHUB_OUTPUT)
        await fs.appendFile(
          process.env.GITHUB_OUTPUT,
          `reference=${reference}\nprefix=${result.prefix}\nmatrix=${JSON.stringify(result.matrix)}\nengineering-artifact=${result.plan.slots[0].artifact}\n`,
        );
    } else if (process.argv.length !== 3)
      throw new Error(
        "Usage: session.mjs cohort --browser-shards N | seal-ci | stage-ci | aggregate",
      );
    else if (process.argv[2] === "seal-ci") result = await sealCiSlot(root);
    else if (process.argv[2] === "stage-ci")
      result = await stageCiContainers(root);
    else if (process.argv[2] === "aggregate")
      result = await aggregateExecutionRecordings(root);
    else throw new Error("Unknown execution recording command");
    process.stdout.write(JSON.stringify(result) + "\n");
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
