import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { constants } from "node:fs";
import * as fs from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const checkout = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const namespace = "evidence-v2";
const slotPattern = /^run-([0-9]{20})$/;
const digestPattern = /^[a-f0-9]{64}$/;
const formalPaths = [
  ".agents/skills/argument-lifecycle/coverage.json",
  ".agents/skills/argument-lifecycle/ArgumentLifecycle.tla",
  ".agents/skills/argument-lifecycle/ArgumentLifecycle.cfg",
  "scripts/formal/argument-lifecycle.mjs",
  "scripts/formal/argument-lifecycle-replay.mjs",
  "scripts/formal/argument-evidence.mjs",
];
const promises = {
  privacy: [
    "OwnerPrivacy",
    "OwnerPrivacy: B export contains A private captured writing",
  ],
  ack: [
    "CapturedAcknowledgement",
    "CapturedAcknowledgement: acknowledgement labels later typing as saved",
  ],
  retry: [
    "ImmutableRetry",
    "ImmutableRetry: retry changed the captured request bytes",
  ],
};
const expectedOutcomes = [
  ["model-current", "model", "none"],
  ["replay-current", "real-module-replay", null],
  ...Object.keys(promises).flatMap((mutation) => [
    [`model-mutant-${mutation}`, "model", mutation],
    [`replay-mutant-${mutation}`, "real-module-replay", mutation],
  ]),
  ["model-restored", "model", "none"],
  ["replay-restored", "real-module-replay", null],
];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
};
const encode = (value) =>
  Buffer.from(JSON.stringify(canonical(value), null, 2) + "\n");
const failure = (error) => ({
  name: error.name,
  code: error.code ?? null,
  message: error.message,
  stack: error.stack ?? String(error),
  ...(error.changes ? { changes: error.changes } : {}),
  ...(error.linkError ? { linkError: error.linkError } : {}),
  ...(error.observationError
    ? { observationError: error.observationError }
    : {}),
  ...(error.evidenceError ? { evidenceError: error.evidenceError } : {}),
});
const slot = (ordinal) => `run-${String(ordinal).padStart(20, "0")}`;
const optionsFor = (options = {}) => {
  const root = resolve(options.root ?? checkout);
  return {
    root,
    sourceRoot: resolve(options.sourceRoot ?? root),
    evidenceRoot: resolve(
      options.evidenceRoot ?? join(root, "outputs/argument-lifecycle"),
    ),
  };
};

function safeRelative(path) {
  assert(typeof path === "string" && path.length && !isAbsolute(path));
  assert(
    !path.split(/[\\/]/).some((part) => !part || part === "." || part === ".."),
  );
  return path;
}

async function existing(path) {
  try {
    return await fs.lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function directory(path, device) {
  const stat = await fs.lstat(path);
  assert(
    stat.isDirectory() && !stat.isSymbolicLink(),
    `Expected real directory: ${path}`,
  );
  if (device !== undefined)
    assert.equal(stat.dev, device, `Unexpected device: ${path}`);
  return stat;
}

async function ancestors(path) {
  const parent = dirname(path);
  if (parent !== path) await ancestors(parent);
  const stat = await existing(path);
  if (stat) await directory(path);
}

async function supported(path) {
  await ancestors(path);
  let present = path;
  while (!(await existing(present))) present = dirname(present);
  const type = (await fs.statfs(present)).type;
  assert(
    (process.platform === "darwin" && type === 26) ||
      (process.platform === "linux" && type === 0xef53),
    `Unsupported local evidence filesystem: ${process.platform}/${type}`,
  );
  return (await directory(present)).dev;
}

async function readRegular(path, device) {
  const before = await fs.lstat(path);
  assert(
    before.isFile() && !before.isSymbolicLink(),
    `Expected regular file: ${path}`,
  );
  if (device !== undefined)
    assert.equal(before.dev, device, `Unexpected device: ${path}`);
  const file = await fs.open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await file.stat();
    assert(
      opened.isFile() && opened.dev === before.dev && opened.ino === before.ino,
      `File changed: ${path}`,
    );
    return await file.readFile();
  } finally {
    await file.close();
  }
}

async function syncDirectory(path) {
  const handle = await fs.open(path, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function writeClosed(path, bytes) {
  const handle = await fs.open(path, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function tree(root, device, flush = false) {
  const rows = [];
  async function visit(path) {
    const actual = join(root, path);
    const stat = await fs.lstat(actual);
    assert.equal(stat.dev, device, `Unexpected device: ${actual}`);
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      rows.push({ path: path || ".", kind: "directory" });
      for (const member of (await fs.readdir(actual)).sort())
        await visit(path ? `${path}/${member}` : member);
      if (flush) await syncDirectory(actual);
    } else {
      const bytes = await readRegular(actual, device);
      if (flush) {
        const handle = await fs.open(
          actual,
          constants.O_RDONLY | constants.O_NOFOLLOW,
        );
        try {
          await handle.sync();
        } finally {
          await handle.close();
        }
      }
      rows.push({
        path,
        kind: "file",
        bytes: bytes.length,
        sha256: hash(bytes),
      });
    }
  }
  await visit("");
  return rows;
}

async function ledger(root, device) {
  const stat = await existing(root);
  if (!stat) return [];
  await directory(root, device);
  const names = (await fs.readdir(root)).sort();
  for (const [index, name] of names.entries()) {
    assert(
      slotPattern.test(name) && BigInt(name.slice(4)) === BigInt(index + 1),
      `Invalid admission ledger: ${name}`,
    );
    await directory(join(root, name), device);
  }
  return names;
}

async function admit(evidenceRoot) {
  const device = await supported(evidenceRoot);
  await fs.mkdir(evidenceRoot, { recursive: true });
  await directory(evidenceRoot, device);
  const root = join(evidenceRoot, namespace);
  try {
    await fs.mkdir(root);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  await syncDirectory(evidenceRoot);
  for (let retry = 0; retry < 128; retry++) {
    const names = await ledger(root, device);
    const ordinal = BigInt(names.length) + 1n;
    assert(ordinal < 10n ** 20n, "Argument invocation ordinals exhausted");
    const invocation = slot(ordinal);
    const run = join(root, invocation);
    try {
      await fs.mkdir(run, { mode: 0o700 });
    } catch (error) {
      if (error.code === "EEXIST") continue;
      throw error;
    }
    await syncDirectory(root);
    return { invocation, run, device, directory: join(run, "artifacts") };
  }
  throw new Error("Argument admission contention budget exceeded");
}

async function inputs(sourceRoot) {
  await ancestors(sourceRoot);
  const coverage = JSON.parse(
    await readRegular(join(sourceRoot, formalPaths[0])),
  );
  assert(Array.isArray(coverage.coveredFiles) && coverage.coveredFiles.length);
  const paths = [
    ...new Set([...formalPaths, ...coverage.coveredFiles.map(safeRelative)]),
  ].sort();
  return Object.fromEntries(
    await Promise.all(
      paths.map(async (path) => {
        await ancestors(dirname(join(sourceRoot, path)));
        return [path, hash(await readRegular(join(sourceRoot, path)))];
      }),
    ),
  );
}

async function compareInputs(sourceRoot, expected) {
  const changes = [];
  for (const [path, sha256] of Object.entries(expected)) {
    safeRelative(path);
    let observed;
    try {
      await ancestors(dirname(join(sourceRoot, path)));
      observed = hash(await readRegular(join(sourceRoot, path)));
    } catch (error) {
      observed = { error: failure(error) };
    }
    if (observed !== sha256) changes.push({ path, expected: sha256, observed });
  }
  return changes;
}

function validateContext(context) {
  assert(context && /^[a-f0-9]{40,64}$/.test(context.sourceCommit));
  assert(/^[a-f0-9]{40,64}$/.test(context.syncCommit));
  assert.equal(typeof context.sourceChangedSinceSync, "boolean");
  assert(context.bounds && typeof context.bounds === "object");
  assert(context.sources && Object.keys(context.sources).length);
  for (const [path, digest] of Object.entries(context.sources)) {
    safeRelative(path);
    assert(digestPattern.test(digest));
  }
}

function validateOutcome(item) {
  const expected = expectedOutcomes.find(([label]) => item?.label === label);
  assert(expected, `Unexpected argument outcome: ${item?.label}`);
  assert.equal(item.kind, expected[1]);
  assert.equal(item.mutation, expected[2]);
  const mutation = promises[item.mutation];
  assert(Number.isInteger(item.exitCode));
  if (mutation) assert.notEqual(item.exitCode, 0);
  else assert.equal(item.exitCode, 0);
  if (item.kind === "model") {
    assert.equal(item.expectedInvariant, mutation?.[0] ?? null);
    for (const key of ["generatedStates", "distinctStates", "queuedStates"])
      assert(Number.isSafeInteger(item[key]) && item[key] >= 0);
  } else assert.equal(item.expectedAssertion, mutation?.[1] ?? null);
}

function validateReceipt(receipt, invocation) {
  assert.equal(receipt.schema, 2);
  assert.equal(receipt.invocation, invocation);
  assert.equal(receipt.artifactPath, `${namespace}/${invocation}/artifacts`);
  assert(["passed", "failed"].includes(receipt.status));
  assert.equal(receipt.tool.version, "1.7.4");
  assert.equal(
    receipt.tool.sha256,
    "936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88",
  );
  assert(
    Number.isFinite(Date.parse(receipt.startedAt)) &&
      Number.isFinite(Date.parse(receipt.completedAt)),
  );
  assert(Array.isArray(receipt.results));
  receipt.results.forEach(validateOutcome);
  assert.equal(
    new Set(receipt.results.map((item) => item.label)).size,
    receipt.results.length,
  );
  if (receipt.status === "passed") {
    validateContext(receipt.context);
    assert.deepEqual(
      receipt.results.map((item) => item.label),
      expectedOutcomes.map(([label]) => label),
    );
    assert(!receipt.error);
    assert(
      receipt.formalInputs &&
        formalPaths.every((path) =>
          digestPattern.test(receipt.formalInputs[path]),
        ),
    );
    for (const [path, digest] of Object.entries(receipt.context.sources))
      assert.equal(receipt.formalInputs[path], digest);
    assert(Array.isArray(receipt.artifacts));
    for (const [label] of expectedOutcomes)
      assert(
        receipt.artifacts.some(
          (row) => row.path === `${label}.log` && row.kind === "file",
        ),
      );
    assert(
      receipt.artifacts.some(
        (row) => row.path === "source-diff.patch" && row.kind === "file",
      ),
    );
  } else
    assert(
      receipt.error &&
        typeof receipt.error.message === "string" &&
        typeof receipt.error.stack === "string",
    );
}

async function publishTerminal(owner, bytes) {
  const digest = hash(bytes);
  const terminal = join(owner.run, "terminal");
  try {
    await fs.mkdir(terminal);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  await directory(terminal, owner.device);
  const intent = join(terminal, digest);
  try {
    await fs.mkdir(intent);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  await directory(intent, owner.device);
  await syncDirectory(terminal);
  await syncDirectory(owner.run);
  const stage = join(owner.run, "staging", `${randomUUID()}.json`);
  await writeClosed(stage, bytes);
  assert((await readRegular(stage, owner.device)).equals(bytes));
  const target = join(intent, "summary.json");
  try {
    await fs.link(stage, target);
  } catch (linkError) {
    try {
      await directory(owner.run, owner.device);
      await directory(terminal, owner.device);
      await directory(intent, owner.device);
      assert.equal(await fs.realpath(target), target);
      const observed = await readRegular(target, owner.device);
      assert.equal(hash(observed), digest);
      assert(observed.equals(bytes), "Conflicting terminal bytes");
      validateReceipt(JSON.parse(observed), owner.invocation);
    } catch (observationError) {
      const error = new Error("Argument terminal publication uncertain", {
        cause: linkError,
      });
      error.name = "ArgumentPublicationUncertain";
      error.code = linkError.code ?? null;
      error.linkError = failure(linkError);
      error.observationError = failure(observationError);
      throw error;
    }
    return { digest, diagnostic: failure(linkError) };
  }
  return { digest };
}

export async function runArgumentEvidence(options, callback) {
  const { sourceRoot, evidenceRoot } = optionsFor(options);
  const owner = await admit(evidenceRoot);
  const startedAt = new Date().toISOString();
  const state = {
    phase: "collecting",
    results: [],
    context: null,
    formalInputs: null,
    fault: null,
  };
  const diagnostics = [];
  let queue = Promise.resolve();
  let revision = 0;
  const record = (kind, value) => {
    if (state.phase !== "collecting")
      return Promise.reject(new Error("Argument collection is closed"));
    let frozen;
    try {
      frozen = structuredClone(value);
    } catch (error) {
      state.fault ??= error;
      return Promise.reject(error);
    }
    const operation = queue.then(async () => {
      if (kind === "context") {
        validateContext(frozen);
        if (state.context)
          assert(
            encode(state.context).equals(encode(frozen)),
            "Conflicting argument context",
          );
        state.context = frozen;
      } else {
        validateOutcome(frozen);
        const previous = state.results.find(
          (item) => item.label === frozen.label,
        );
        if (previous)
          assert(
            encode(previous).equals(encode(frozen)),
            "Conflicting argument outcome",
          );
        else state.results.push(frozen);
      }
      await writeClosed(
        join(
          owner.run,
          "progress",
          `${String(++revision).padStart(6, "0")}.json`,
        ),
        encode({ context: state.context, results: state.results }),
      );
    });
    queue = operation.catch((error) => {
      state.fault ??= error;
    });
    return operation;
  };
  let primary;
  let artifacts = [];
  try {
    for (const name of ["artifacts", "progress", "staging"])
      await fs.mkdir(join(owner.run, name));
    await writeClosed(
      join(owner.run, "start.json"),
      encode({ schema: 2, invocation: owner.invocation, startedAt }),
    );
    state.formalInputs = await inputs(sourceRoot);
    await callback(
      Object.freeze({
        directory: owner.directory,
        recordContext: (value) => record("context", value),
        recordOutcome: (value) => record("outcome", value),
      }),
    );
  } catch (error) {
    primary = error;
  }
  state.phase = "finalizing";
  await queue;
  primary ??= state.fault;
  try {
    if (!primary) {
      validateContext(state.context);
      assert.deepEqual(
        state.results.map((item) => item.label),
        expectedOutcomes.map(([label]) => label),
      );
      const changes = await compareInputs(sourceRoot, state.formalInputs);
      if (changes.length) {
        const error = new Error(
          "Formal inputs changed during argument verification",
        );
        error.name = "FormalInputsChanged";
        error.changes = changes;
        throw error;
      }
    }
  } catch (error) {
    primary = error;
  }
  if (primary) {
    try {
      await writeClosed(
        join(owner.directory, "failure.log"),
        Buffer.from((primary.stack ?? String(primary)) + "\n"),
      );
    } catch (error) {
      diagnostics.push(failure(error));
    }
  }
  try {
    artifacts = await tree(owner.directory, owner.device, true);
  } catch (error) {
    primary ??= error;
    diagnostics.push(failure(error));
  }
  const completedAt = new Date().toISOString();
  const receipt = {
    schema: 2,
    invocation: owner.invocation,
    artifactPath: `${namespace}/${owner.invocation}/artifacts`,
    status: primary ? "failed" : "passed",
    startedAt,
    completedAt,
    tool: structuredClone(options.tool),
    context: state.context,
    formalInputs: state.formalInputs,
    results: state.results,
    artifacts,
    ...(primary ? { error: failure(primary) } : {}),
    diagnostics,
  };
  validateReceipt(receipt, owner.invocation);
  const bytes = encode(receipt);
  let publication;
  try {
    publication = await publishTerminal(owner, bytes);
  } catch (error) {
    if (!primary) throw error;
    if (Object.isExtensible(primary)) primary.evidenceError = failure(error);
    try {
      await writeClosed(
        join(owner.run, "publication-error.json"),
        encode({ primary: failure(primary), evidenceError: failure(error) }),
      );
    } catch {}
    throw primary;
  }
  state.phase = "complete";
  return {
    invocation: owner.invocation,
    status: receipt.status,
    receiptSha256: publication.digest,
    directory: owner.directory,
    ...(primary ? { error: receipt.error } : {}),
    ...(publication.diagnostic
      ? { publicationDiagnostic: publication.diagnostic }
      : {}),
  };
}

async function terminalSet(run, device) {
  const root = join(run, "terminal");
  if (!(await existing(root))) return [];
  await directory(root, device);
  const names = (await fs.readdir(root)).sort();
  for (const name of names) {
    assert(digestPattern.test(name), "Invalid terminal intent");
    await directory(join(root, name), device);
  }
  return names;
}

async function observe(
  { evidenceRoot, sourceRoot },
  invocation,
  device,
  current,
) {
  const run = join(evidenceRoot, namespace, invocation);
  await tree(run, device);
  const intents = await terminalSet(run, device);
  const result = {
    scope: current ? "current" : "historical",
    eligibleForCurrent: current,
    invocation,
    directory: join(run, "artifacts"),
    status: "incomplete",
  };
  if (intents.length > 1)
    return { result: { ...result, status: "conflicted" }, intents };
  if (!intents.length) return { result, intents };
  try {
    const bytes = await readRegular(
      join(run, "terminal", intents[0], "summary.json"),
      device,
    );
    assert.equal(hash(bytes), intents[0], "Argument terminal digest mismatch");
    const receipt = JSON.parse(bytes);
    assert(encode(receipt).equals(bytes), "Noncanonical argument terminal");
    validateReceipt(receipt, invocation);
    if (receipt.status === "passed") {
      assert.deepEqual(
        await tree(join(run, "artifacts"), device),
        receipt.artifacts,
        "Argument artifact bytes changed",
      );
      if (current) {
        const changes = await compareInputs(sourceRoot, receipt.formalInputs);
        if (changes.length)
          return {
            result: {
              ...result,
              status: "stale",
              receipt,
              receiptSha256: intents[0],
              changes,
            },
            intents,
          };
      }
    }
    return {
      result: {
        ...result,
        status: receipt.status,
        receipt,
        receiptSha256: intents[0],
      },
      intents,
    };
  } catch (error) {
    if (error.code === "ENOENT") return { result, intents };
    return {
      result: { ...result, status: "corrupt", reason: error.message },
      intents,
    };
  }
}

export async function readCurrentArgumentEvidence(options = {}) {
  const resolved = optionsFor(options);
  try {
    const device = await supported(resolved.evidenceRoot);
    const root = join(resolved.evidenceRoot, namespace);
    for (let retry = 0; retry < 128; retry++) {
      const names = await ledger(root, device);
      if (!names.length)
        return {
          scope: "current",
          eligibleForCurrent: true,
          status: "uninitialized",
        };
      const invocation = names.at(-1);
      const { result, intents } = await observe(
        resolved,
        invocation,
        device,
        true,
      );
      if (
        !encode(await terminalSet(join(root, invocation), device)).equals(
          encode(intents),
        )
      )
        continue;
      if (await existing(join(root, slot(BigInt(invocation.slice(4)) + 1n))))
        continue;
      return result;
    }
    return {
      scope: "current",
      eligibleForCurrent: true,
      status: "unavailable",
      reason: "Argument observation budget exceeded",
    };
  } catch (error) {
    return {
      scope: "current",
      eligibleForCurrent: true,
      status: "unavailable",
      reason: error.message,
      error: failure(error),
    };
  }
}

export async function inspectArgumentInvocation(options) {
  const resolved = optionsFor(options);
  const { invocation } = options;
  assert(
    slotPattern.test(invocation) && BigInt(invocation.slice(4)) > 0n,
    "Invalid argument invocation",
  );
  const device = await supported(resolved.evidenceRoot);
  assert(
    (await ledger(join(resolved.evidenceRoot, namespace), device)).includes(
      invocation,
    ),
    "Unknown argument invocation",
  );
  return (await observe(resolved, invocation, device, false)).result;
}

function command(args) {
  const result = spawnSync("/usr/bin/tar", args, {
    encoding: "utf8",
    timeout: 120000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
}

async function archiveEvidence(options, output) {
  const resolved = optionsFor(options);
  const destination = resolve(output);
  const rel = relative(resolved.evidenceRoot, destination);
  assert(
    rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel),
    "Archive output must be outside evidence root",
  );
  const device = await supported(resolved.evidenceRoot);
  assert(
    await existing(join(resolved.evidenceRoot, namespace)),
    "Uninitialized argument evidence namespace",
  );
  await ancestors(dirname(destination));
  await fs.mkdir(dirname(destination), { recursive: true });
  const stage = await fs.mkdtemp(
    join(dirname(destination), ".argument-archive-"),
  );
  const prepared = join(stage, "evidence.tar");
  const extracted = join(stage, "extracted");
  try {
    const before = await tree(resolved.evidenceRoot, device);
    const current = await readCurrentArgumentEvidence(resolved);
    assert(
      !["unavailable", "uninitialized"].includes(current.status),
      current.reason ?? current.status,
    );
    await writeClosed(join(stage, "manifest.json"), encode(before));
    command([
      "-cf",
      prepared,
      "-C",
      stage,
      "manifest.json",
      "-C",
      dirname(resolved.evidenceRoot),
      resolved.evidenceRoot.split(sep).at(-1),
    ]);
    await fs.mkdir(extracted);
    command(["-xf", prepared, "-C", extracted]);
    const retainedRoot = join(
      extracted,
      resolved.evidenceRoot.split(sep).at(-1),
    );
    assert.deepEqual(
      await tree(retainedRoot, (await directory(retainedRoot)).dev),
      before,
      "Archive extraction changed evidence tree",
    );
    assert.deepEqual(
      JSON.parse(await readRegular(join(extracted, "manifest.json"))),
      before,
    );
    assert.deepEqual(
      await tree(resolved.evidenceRoot, device),
      before,
      "Evidence changed during archival",
    );
    const retained = await readCurrentArgumentEvidence({
      ...resolved,
      evidenceRoot: retainedRoot,
    });
    assert.deepEqual(
      { ...retained, directory: current.directory },
      current,
      "Archive same-reader result changed",
    );
    assert.deepEqual(
      await readCurrentArgumentEvidence(resolved),
      current,
      "Current evidence changed during archival",
    );
    const handle = await fs.open(prepared, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    const sha256 = hash(await readRegular(prepared));
    await fs.rename(prepared, destination);
    return {
      retentionStatus: "verified",
      selectedStatus: current.status,
      invocation: current.invocation,
      receiptSha256: current.receiptSha256,
      archive: destination,
      sha256,
      manifest: join(stage, "manifest.json"),
      extractedEvidenceRoot: retainedRoot,
    };
  } catch (error) {
    error.retainedArchiveStage = stage;
    try {
      await writeClosed(join(stage, "failure.json"), encode(failure(error)));
    } catch (diagnosticError) {
      error.archiveDiagnosticError = failure(diagnosticError);
    }
    throw error;
  }
}

async function cli() {
  const [mode, ...args] = process.argv.slice(2);
  const options = {};
  const positional = [];
  const flags = {
    "--root": "root",
    "--evidence-root": "evidenceRoot",
    "--source-root": "sourceRoot",
    "--output": "output",
  };
  for (let index = 0; index < args.length; index++) {
    if (flags[args[index]]) {
      assert(args[index + 1], `Missing ${args[index]}`);
      options[flags[args[index]]] = args[++index];
    } else {
      assert(!args[index].startsWith("--"), `Unknown ${args[index]}`);
      positional.push(args[index]);
    }
  }
  let result;
  if (mode === "current") {
    assert(!positional.length);
    result = await readCurrentArgumentEvidence(options);
  } else if (mode === "inspect") {
    assert.equal(positional.length, 1);
    result = await inspectArgumentInvocation({
      ...options,
      invocation: positional[0],
    });
  } else if (mode === "inspect-legacy") {
    assert.equal(positional.length, 1);
    assert(
      /^run-[A-Za-z0-9_-]+$/.test(positional[0]) &&
        !slotPattern.test(positional[0]),
      "Invalid legacy invocation",
    );
    const { evidenceRoot } = optionsFor(options);
    const device = await supported(evidenceRoot);
    const run = join(evidenceRoot, positional[0]);
    await tree(run, device);
    result = {
      scope: "historical",
      eligibleForCurrent: false,
      legacy: true,
      invocation: positional[0],
      receipt: JSON.parse(await readRegular(join(run, "summary.json"), device)),
    };
  } else if (mode === "archive") {
    assert(options.output && !positional.length);
    result = await archiveEvidence(options, options.output);
  } else
    throw new Error(
      "Use current, inspect <invocation>, inspect-legacy <invocation>, or archive --output <archive.tar>",
    );
  console.log(JSON.stringify(result, null, 2));
  if (mode === "current" && result.status !== "passed") process.exitCode = 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await cli();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
