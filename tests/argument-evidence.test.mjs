import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  inspectArgumentInvocation,
  readCurrentArgumentEvidence,
  runArgumentEvidence,
} from "../scripts/formal/argument-evidence.mjs";

const moduleUrl = new URL(
  "../scripts/formal/argument-evidence.mjs",
  import.meta.url,
);
const tool = {
  version: "1.7.4",
  sha256: "936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88",
};
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const slot = (number) => `run-${String(number).padStart(20, "0")}`;
const deferred = () => {
  let resolve;
  const promise = new Promise((yes) => {
    resolve = yes;
  });
  return { resolve, promise };
};

async function fixture(t) {
  const root = await fs.realpath(
    await fs.mkdtemp(join(tmpdir(), "argument-evidence-unit-")),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const paths = [
    ".agents/skills/argument-lifecycle/ArgumentLifecycle.tla",
    ".agents/skills/argument-lifecycle/ArgumentLifecycle.cfg",
    "scripts/formal/argument-lifecycle.mjs",
    "scripts/formal/argument-lifecycle-replay.mjs",
    "scripts/formal/argument-evidence.mjs",
  ];
  for (const path of paths) {
    await fs.mkdir(dirname(join(root, path)), { recursive: true });
    await fs.copyFile(new URL(`../${path}`, import.meta.url), join(root, path));
  }
  await fs.mkdir(join(root, "lib"));
  await fs.writeFile(
    join(root, "lib/store.ts"),
    "synthetic bounded wrapper fixture\n",
  );
  const coverage = {
    coveredFiles: ["lib/store.ts"],
    syncCommit: "a".repeat(40),
    bounds: { synthetic: true },
  };
  await fs.writeFile(
    join(root, ".agents/skills/argument-lifecycle/coverage.json"),
    JSON.stringify(coverage),
  );
  return { root, evidenceRoot: join(root, "outputs/argument-lifecycle"), tool };
}

async function context(options) {
  return {
    sourceCommit: "a".repeat(40),
    syncCommit: "a".repeat(40),
    sourceChangedSinceSync: false,
    bounds: { synthetic: true },
    sources: {
      "lib/store.ts": sha(
        await fs.readFile(join(options.root, "lib/store.ts")),
      ),
    },
  };
}

const outcomes = [
  {
    kind: "model",
    label: "model-current",
    mutation: "none",
    exitCode: 0,
    expectedInvariant: null,
  },
  {
    kind: "real-module-replay",
    label: "replay-current",
    mutation: null,
    exitCode: 0,
    expectedAssertion: null,
  },
  ...[
    [
      "privacy",
      "OwnerPrivacy",
      "OwnerPrivacy: B export contains A private captured writing",
    ],
    [
      "ack",
      "CapturedAcknowledgement",
      "CapturedAcknowledgement: acknowledgement labels later typing as saved",
    ],
    [
      "retry",
      "ImmutableRetry",
      "ImmutableRetry: retry changed the captured request bytes",
    ],
  ].flatMap(([mutation, invariant, assertion]) => [
    {
      kind: "model",
      label: `model-mutant-${mutation}`,
      mutation,
      exitCode: 12,
      expectedInvariant: invariant,
    },
    {
      kind: "real-module-replay",
      label: `replay-mutant-${mutation}`,
      mutation,
      exitCode: 1,
      expectedAssertion: assertion,
    },
  ]),
  {
    kind: "model",
    label: "model-restored",
    mutation: "none",
    exitCode: 0,
    expectedInvariant: null,
  },
  {
    kind: "real-module-replay",
    label: "replay-restored",
    mutation: null,
    exitCode: 0,
    expectedAssertion: null,
  },
].map((item) =>
  item.kind === "model"
    ? { ...item, generatedStates: 1, distinctStates: 1, queuedStates: 0 }
    : item,
);

async function checked(options, attempt) {
  await attempt.recordContext(await context(options));
  await fs.writeFile(join(attempt.directory, "source-diff.patch"), "");
  const recorded = [];
  for (const item of outcomes) {
    await fs.writeFile(
      join(attempt.directory, `${item.label}.log`),
      "synthetic wrapper control, not formal proof\n",
    );
    recorded.push(attempt.recordOutcome(item));
  }
  await Promise.all(recorded);
}

async function injected(overrides) {
  const key = `argumentFs${randomUUID().replaceAll("-", "")}`;
  globalThis[key] = { ...fs, ...overrides };
  const source = (await fs.readFile(moduleUrl, "utf8"))
    .replace(
      'import * as fs from "node:fs/promises";',
      `const fs = globalThis.${key};`,
    )
    .replaceAll("import.meta.url", JSON.stringify(moduleUrl.href));
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${key}`
  );
}

test("newer failed admission survives older success and exact history stays historical", async (t) => {
  const options = await fixture(t);
  const admitted = deferred(),
    release = deferred();
  const old = runArgumentEvidence(options, async (attempt) => {
    admitted.resolve();
    await release.promise;
    await checked(options, attempt);
  });
  await admitted.promise;
  const expected = new Error("newer missing-tool.jar");
  expected.code = "ENOENT";
  const newer = await runArgumentEvidence(options, async () => {
    throw expected;
  });
  release.resolve();
  assert.equal((await old).status, "passed");
  const current = await readCurrentArgumentEvidence(options);
  assert.equal(current.invocation, newer.invocation);
  assert.equal(current.status, "failed");
  assert.deepEqual(current.receipt.error, {
    name: expected.name,
    code: expected.code,
    message: expected.message,
    stack: expected.stack,
  });
  const historical = await inspectArgumentInvocation({
    ...options,
    invocation: slot(1),
  });
  assert.equal(historical.status, "passed");
  assert.equal(historical.scope, "historical");
  assert.equal(historical.eligibleForCurrent, false);
});

test("older failure cannot replace newer pass; empty highest and legacy-only refuse success", async (t) => {
  const options = await fixture(t);
  assert.equal(
    (await readCurrentArgumentEvidence(options)).status,
    "uninitialized",
  );
  const admitted = deferred(),
    release = deferred();
  const old = runArgumentEvidence(options, async () => {
    admitted.resolve();
    await release.promise;
    throw new Error("old failure");
  });
  await admitted.promise;
  const newer = await runArgumentEvidence(options, (attempt) =>
    checked(options, attempt),
  );
  release.resolve();
  await old;
  assert.equal(
    (await readCurrentArgumentEvidence(options)).invocation,
    newer.invocation,
  );
  assert.equal((await readCurrentArgumentEvidence(options)).status, "passed");
  await fs.mkdir(join(options.evidenceRoot, "evidence-v2", slot(3)));
  assert.equal(
    (await readCurrentArgumentEvidence(options)).status,
    "incomplete",
  );
});

test("captured covered/formal inputs fail finalization and current freshness without promotion", async (t) => {
  const options = await fixture(t);
  const changed = await runArgumentEvidence(options, async (attempt) => {
    await checked(options, attempt);
    await fs.appendFile(join(options.root, "lib/store.ts"), "changed\n");
  });
  assert.equal(changed.status, "failed");
  let current = await readCurrentArgumentEvidence(options);
  assert.equal(current.receipt.error.name, "FormalInputsChanged");
  assert.equal(current.receipt.results.length, 10);
  assert.equal(current.receipt.error.changes[0].path, "lib/store.ts");
  await runArgumentEvidence(options, (attempt) => checked(options, attempt));
  await fs.appendFile(
    join(options.root, "scripts/formal/argument-lifecycle-replay.mjs"),
    "\n",
  );
  current = await readCurrentArgumentEvidence(options);
  assert.equal(current.status, "stale");
  assert.equal(
    current.changes[0].path,
    "scripts/formal/argument-lifecycle-replay.mjs",
  );
});

test("caught record EIO stays failed with in-memory outcomes; primary check error wins", async (t) => {
  const options = await fixture(t);
  const storage = Object.assign(new Error("injected progress EIO"), {
    code: "EIO",
  });
  const api = await injected({
    open: async (path, ...args) => {
      if (String(path).includes("/progress/000002")) throw storage;
      return fs.open(path, ...args);
    },
  });
  const own = await api.runArgumentEvidence(options, async (attempt) => {
    await attempt.recordContext(await context(options));
    await assert.rejects(attempt.recordOutcome(outcomes[0]), { code: "EIO" });
  });
  assert.equal(own.status, "failed");
  let current = await readCurrentArgumentEvidence(options);
  assert.equal(current.receipt.results.length, 1);
  assert.equal(current.receipt.error.code, "EIO");
  const primary = Object.assign(new Error("primary named proof failure"), {
    code: "PROOF",
  });
  await api.runArgumentEvidence(options, async (attempt) => {
    await attempt.recordContext(await context(options));
    await assert.rejects(attempt.recordOutcome(outcomes[0]));
    throw primary;
  });
  current = await readCurrentArgumentEvidence(options);
  assert.equal(current.receipt.error.code, "PROOF");
  assert.equal(current.receipt.error.stack, primary.stack);
});

test("uncloneable record faults survive catches and diagnostic storage errors retain primary error", async (t) => {
  const options = await fixture(t);
  const own = await runArgumentEvidence(options, async (attempt) => {
    await assert.rejects(attempt.recordOutcome({ invalid: () => {} }));
    await checked(options, attempt);
  });
  assert.equal(own.status, "failed");
  let current = await readCurrentArgumentEvidence(options);
  assert.equal(current.receipt.error.name, "DataCloneError");
  assert.equal(current.receipt.results.length, 10);
  const primary = Object.assign(new Error("original missing jar"), {
    code: "ENOENT",
  });
  const api = await injected({
    open: async (path, ...args) => {
      if (String(path).endsWith("/failure.log"))
        throw Object.assign(new Error("diagnostic EIO"), { code: "EIO" });
      return fs.open(path, ...args);
    },
  });
  await api.runArgumentEvidence(options, async () => {
    throw primary;
  });
  current = await readCurrentArgumentEvidence(options);
  assert.equal(current.receipt.error.stack, primary.stack);
  assert.equal(current.receipt.error.code, "ENOENT");
  assert.equal(current.receipt.diagnostics[0].code, "EIO");
});

test("required admission and candidate-file flush failures leave incomplete evidence", async (t) => {
  for (const boundary of ["admission", "candidate"]) {
    const options = await fixture(t);
    const api = await injected({
      open: async (path, ...args) => {
        const handle = await fs.open(path, ...args);
        const fail =
          boundary === "admission"
            ? String(path).endsWith("/evidence-v2")
            : String(path).includes("/staging/");
        return new Proxy(handle, {
          get(target, key) {
            if (key === "sync" && fail)
              return async () => {
                throw Object.assign(
                  new Error(`required ${boundary} flush EIO`),
                  { code: "EIO" },
                );
              };
            const value = Reflect.get(target, key);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
      },
    });
    await assert.rejects(
      api.runArgumentEvidence(options, (attempt) => checked(options, attempt)),
      { code: "EIO" },
    );
    assert.equal(
      (await readCurrentArgumentEvidence(options)).status,
      "incomplete",
    );
  }
});

test("ambiguous link EIO resolves exact committed bytes or reports publication uncertainty", async (t) => {
  for (const unreadable of [false, true]) {
    const options = await fixture(t);
    let linked = false;
    const api = await injected({
      link: async (...args) => {
        await fs.link(...args);
        linked = true;
        throw Object.assign(
          new Error("injected EIO after successful hardlink"),
          { code: "EIO" },
        );
      },
      open: async (path, ...args) => {
        if (unreadable && linked && String(path).endsWith("/summary.json"))
          throw Object.assign(new Error("injected temporary readback EIO"), {
            code: "EIO",
          });
        return fs.open(path, ...args);
      },
    });
    if (unreadable) {
      await assert.rejects(
        api.runArgumentEvidence(options, (attempt) =>
          checked(options, attempt),
        ),
        (error) => {
          assert.equal(error.name, "ArgumentPublicationUncertain");
          assert.equal(error.code, "EIO");
          assert.equal(error.observationError.code, "EIO");
          t.diagnostic(
            JSON.stringify({
              control: "unreadable-after-successful-link",
              name: error.name,
              code: error.code,
              linkError: error.linkError,
              observationError: error.observationError,
            }),
          );
          return true;
        },
      );
    } else {
      const own = await api.runArgumentEvidence(options, (attempt) =>
        checked(options, attempt),
      );
      assert.equal(own.status, "passed");
      assert.equal(own.publicationDiagnostic.code, "EIO");
    }
    assert.equal((await readCurrentArgumentEvidence(options)).status, "passed");
  }
});

test("terminal publication storage error never replaces the captured primary tool error", async (t) => {
  const options = await fixture(t);
  const primary = Object.assign(new Error("original missing pinned jar"), {
    code: "ENOENT",
  });
  const api = await injected({
    link: async () => {
      throw Object.assign(new Error("injected link EIO before commitment"), {
        code: "EIO",
      });
    },
  });
  await assert.rejects(
    api.runArgumentEvidence(options, async () => {
      throw primary;
    }),
    (error) => {
      assert.equal(error, primary);
      assert.equal(error.evidenceError.name, "ArgumentPublicationUncertain");
      assert.equal(error.evidenceError.code, "EIO");
      return true;
    },
  );
  const current = await readCurrentArgumentEvidence(options);
  assert.equal(current.status, "incomplete");
  assert.equal(
    await fs.readFile(join(current.directory, "failure.log"), "utf8"),
    primary.stack + "\n",
  );
  const run = dirname(current.directory);
  const stage = (await fs.readdir(join(run, "staging")))[0];
  assert.equal(
    JSON.parse(await fs.readFile(join(run, "staging", stage))).error.stack,
    primary.stack,
  );
  assert.equal(
    JSON.parse(await fs.readFile(join(run, "publication-error.json")))
      .evidenceError.name,
    "ArgumentPublicationUncertain",
  );
});

test("frozen-byte publication retry converges; a second intent before failed payload is conflict", async (t) => {
  const options = await fixture(t);
  const api = await injected({
    link: async (source, target) => {
      await fs.link(source, target);
      throw Object.assign(new Error("ambiguous complete link EEXIST"), {
        code: "EEXIST",
      });
    },
  });
  assert.equal(
    (
      await api.runArgumentEvidence(options, (attempt) =>
        checked(options, attempt),
      )
    ).status,
    "passed",
  );
  assert.equal((await readCurrentArgumentEvidence(options)).status, "passed");
  const conflicting = await injected({
    mkdir: async (path, ...args) => {
      const result = await fs.mkdir(path, ...args);
      if (/\/terminal\/[a-f0-9]{64}$/.test(String(path)))
        await fs.mkdir(join(dirname(path), "b".repeat(64)));
      return result;
    },
    open: async (path, ...args) => {
      if (String(path).includes("/staging/"))
        throw Object.assign(new Error("payload EIO after second intent"), {
          code: "EIO",
        });
      return fs.open(path, ...args);
    },
  });
  await assert.rejects(
    conflicting.runArgumentEvidence(options, (attempt) =>
      checked(options, attempt),
    ),
    { code: "EIO" },
  );
  assert.equal(
    (await readCurrentArgumentEvidence(options)).status,
    "conflicted",
  );
});

test("symlink, corrupt terminal, deleted admission and unknown filesystem refuse current", async (t) => {
  const options = await fixture(t);
  const own = await runArgumentEvidence(options, (attempt) =>
    checked(options, attempt),
  );
  const terminal = join(
    options.evidenceRoot,
    "evidence-v2",
    own.invocation,
    "terminal",
    own.receiptSha256,
    "summary.json",
  );
  const bytes = await fs.readFile(terminal);
  await fs.writeFile(terminal, "{");
  assert.equal((await readCurrentArgumentEvidence(options)).status, "corrupt");
  await fs.writeFile(terminal, bytes);
  const log = join(own.directory, "model-current.log");
  await fs.unlink(log);
  await fs.symlink(join(options.root, "lib/store.ts"), log);
  assert.equal(
    (await readCurrentArgumentEvidence(options)).status,
    "unavailable",
  );
  const unknown = await injected({ statfs: async () => ({ type: -1 }) });
  assert.equal(
    (await unknown.readCurrentArgumentEvidence(options)).status,
    "unavailable",
  );
  await assert.rejects(
    unknown.runArgumentEvidence(options, () =>
      assert.fail("unsupported callback ran"),
    ),
    /Unsupported local evidence filesystem/,
  );
  await fs.mkdir(join(options.evidenceRoot, "evidence-v2", slot(2)));
  await fs.rm(join(options.evidenceRoot, "evidence-v2", slot(1)), {
    recursive: true,
  });
  assert.equal(
    (await readCurrentArgumentEvidence(options)).status,
    "unavailable",
  );
});

test("reader reobserves terminal conflicts and successors added during reads", async (t) => {
  const options = await fixture(t);
  const own = await runArgumentEvidence(options, (attempt) =>
    checked(options, attempt),
  );
  let injectConflict = true;
  const racing = await injected({
    readFile: fs.readFile,
    open: async (path, ...args) => {
      const handle = await fs.open(path, ...args);
      if (String(path).endsWith("/summary.json") && injectConflict) {
        injectConflict = false;
        await fs.mkdir(join(dirname(dirname(path)), "c".repeat(64)));
      }
      return handle;
    },
  });
  assert.equal(
    (await racing.readCurrentArgumentEvidence(options)).status,
    "conflicted",
  );
  await fs.rm(
    join(
      options.evidenceRoot,
      "evidence-v2",
      own.invocation,
      "terminal",
      "c".repeat(64),
    ),
    { recursive: true },
  );
  let injectAdmission = true;
  const successor = await injected({
    lstat: async (path, ...args) => {
      if (String(path).endsWith(`/${slot(2)}`) && injectAdmission) {
        injectAdmission = false;
        await fs.mkdir(path);
      }
      return fs.lstat(path, ...args);
    },
  });
  const current = await successor.readCurrentArgumentEvidence(options);
  assert.equal(current.invocation, slot(2));
  assert.equal(current.status, "incomplete");
});

test("continuous admission churn exhausts observation without returning a previous pass", async (t) => {
  const options = await fixture(t);
  await runArgumentEvidence(options, (attempt) => checked(options, attempt));
  const racing = await injected({
    lstat: async (path, ...args) => {
      if (/\/run-[0-9]{20}$/.test(String(path))) {
        try {
          await fs.mkdir(path);
        } catch (error) {
          if (error.code !== "EEXIST") throw error;
        }
      }
      return fs.lstat(path, ...args);
    },
  });
  const current = await racing.readCurrentArgumentEvidence(options);
  assert.equal(current.status, "unavailable");
  assert.match(current.reason, /observation budget exceeded/);
});

async function child(code) {
  return new Promise((resolve, reject) => {
    const process = spawn(
      globalThis.process.execPath,
      ["--input-type=module", "-e", code],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "",
      stderr = "";
    process.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    process.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    process.once("error", reject);
    process.once("exit", (code, signal) =>
      resolve({ code, signal, stdout, stderr }),
    );
  });
}

test("sixteen operating-system processes reserve unique contiguous admissions", async (t) => {
  const options = await fixture(t);
  const code = `import {runArgumentEvidence} from ${JSON.stringify(moduleUrl.href)}; const result=await runArgumentEvidence(${JSON.stringify(options)},async()=>{throw new Error("synthetic child failure")}); console.log(result.invocation);`;
  const children = await Promise.all(
    Array.from({ length: 16 }, () => child(code)),
  );
  for (const result of children) assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(
    children.map((result) => result.stdout.trim()).sort(),
    Array.from({ length: 16 }, (_, index) => slot(index + 1)),
  );
  const current = await readCurrentArgumentEvidence(options);
  assert.equal(current.invocation, slot(16));
  assert.equal(current.status, "failed");
});

test("directory archive preserves empty newest admission and conflict; file-only projection loses them", async (t) => {
  for (const kind of ["incomplete", "conflicted"]) {
    const options = await fixture(t);
    const own = await runArgumentEvidence(options, (attempt) =>
      checked(options, attempt),
    );
    if (kind === "incomplete")
      await fs.mkdir(join(options.evidenceRoot, "evidence-v2", slot(2)));
    else
      await fs.mkdir(
        join(
          options.evidenceRoot,
          "evidence-v2",
          own.invocation,
          "terminal",
          "d".repeat(64),
        ),
      );
    const output = join(options.root, "archive.tar");
    const result = await child(
      `import {spawnSync} from "node:child_process";const result=spawnSync(process.execPath,${JSON.stringify([fileURLToPath(moduleUrl), "archive", "--root", options.root, "--output", output])},{encoding:"utf8"});process.stdout.write(result.stdout);process.stderr.write(result.stderr);process.exitCode=result.status;`,
    );
    assert.equal(result.code, 0, result.stderr);
    const retained = JSON.parse(result.stdout);
    assert.equal(retained.retentionStatus, "verified");
    assert.equal(retained.selectedStatus, kind);
    assert.equal(
      (
        await readCurrentArgumentEvidence({
          ...options,
          evidenceRoot: retained.extractedEvidenceRoot,
        })
      ).status,
      kind,
    );
    const projection = join(options.root, "file-only");
    async function files(source, destination) {
      for (const entry of await fs.readdir(source, { withFileTypes: true })) {
        const from = join(source, entry.name),
          to = join(destination, entry.name);
        if (entry.isDirectory()) await files(from, to);
        else {
          await fs.mkdir(dirname(to), { recursive: true });
          await fs.copyFile(from, to);
        }
      }
    }
    await files(options.evidenceRoot, projection);
    assert.equal(
      (
        await readCurrentArgumentEvidence({
          ...options,
          evidenceRoot: projection,
        })
      ).status,
      "passed",
    );
  }
});

test("SIGKILL at admission, header, intent and staging refuses pass; committed bytes survive", async (t) => {
  for (const boundary of [
    "admission",
    "header",
    "intent",
    "staging",
    "commit",
  ]) {
    const options = await fixture(t);
    const code = `
      import * as actual from "node:fs/promises";
      import {createHash} from "node:crypto";
      import {join} from "node:path";
      const boundary=${JSON.stringify(boundary)}, options=${JSON.stringify(options)}, outcomes=${JSON.stringify(outcomes)};
      const stop=()=>process.kill(process.pid,"SIGKILL");
      globalThis.crashFs={...actual,
        mkdir:async(path,...args)=>{const value=await actual.mkdir(path,...args);if(boundary==="admission"&&/\\/run-[0-9]{20}$/.test(String(path)))stop();if(boundary==="intent"&&/\\/terminal\\/[a-f0-9]{64}$/.test(String(path)))stop();return value;},
        open:async(path,...args)=>{const value=await actual.open(path,...args);if(boundary==="header"&&String(path).endsWith("/start.json"))stop();if(boundary==="staging"&&String(path).includes("/staging/")){await value.writeFile('{"partial":');stop();}return value;},
        link:async(...args)=>{const value=await actual.link(...args);if(boundary==="commit")stop();return value;}
      };
      const url=${JSON.stringify(moduleUrl.href)};
      const source=(await actual.readFile(new URL(url),"utf8")).replace('import * as fs from "node:fs/promises";','const fs=globalThis.crashFs;').replaceAll("import.meta.url",JSON.stringify(url));
      const {runArgumentEvidence}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
      await runArgumentEvidence(options,async(attempt)=>{
        await attempt.recordContext({sourceCommit:"a".repeat(40),syncCommit:"a".repeat(40),sourceChangedSinceSync:false,bounds:{synthetic:true},sources:{"lib/store.ts":createHash("sha256").update(await actual.readFile(join(options.root,"lib/store.ts"))).digest("hex")}});
        await actual.writeFile(join(attempt.directory,"source-diff.patch"),"");
        for(const item of outcomes){await actual.writeFile(join(attempt.directory,item.label+".log"),"synthetic crash control, not formal proof");await attempt.recordOutcome(item);}
      });
    `;
    const result = await child(code);
    assert.equal(result.signal, "SIGKILL", result.stderr);
    const current = await readCurrentArgumentEvidence(options);
    assert.equal(current.invocation, slot(1));
    assert.equal(
      current.status,
      boundary === "commit" ? "passed" : "incomplete",
    );
    t.diagnostic(`${boundary}: SIGKILL, selected ${current.status}`);
  }
});
