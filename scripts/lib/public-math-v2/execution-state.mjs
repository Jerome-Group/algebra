import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { z } from "zod";
import { canonical, hashValue } from "../public-math/identity.mjs";
import { sha256 } from "../math-presentation.mjs";
import { referenceSchema } from "./schema.mjs";

const base = "outputs/public-math-runs/state-v3";
const planFile = "outputs/public-math-cohort.json";
const ordinalPattern = /^[1-9][0-9]*$/;
const selection = z
  .object({
    shard: z
      .object({
        index: z.number().int().positive(),
        total: z.number().int().positive(),
      })
      .strict()
      .nullable(),
    filtered: z.boolean(),
  })
  .strict();
const member = z
  .object({ runner: z.enum(["node:test", "playwright"]), selection })
  .strict();
const requestSchema = z
  .object({
    scope: z.enum(["full", "partial"]),
    members: z.array(member).min(1),
    checks: z.array(z.string().min(1)).min(1),
    target: z
      .discriminatedUnion("kind", [
        z.object({ kind: z.literal("created") }).strict(),
        z
          .object({
            kind: z.literal("borrowed"),
            owner: referenceSchema,
            origin: z.string().url(),
          })
          .strict(),
      ])
      .optional(),
  })
  .strict()
  .superRefine((request, context) => {
    const browser = request.members.some(
      ({ runner }) => runner === "playwright",
    );
    if (
      browser !== Boolean(request.target) ||
      (request.target?.kind === "borrowed" && request.scope !== "partial")
    )
      context.addIssue({
        code: "custom",
        message: "Browser target lifecycle differs from participant scope",
      });
  });
const contextSchema = z
  .object({
    repository: z.string().min(1),
    workflowRef: z.string().min(1),
    workflowSha: z.string().regex(/^[a-f0-9]{40}$/),
    checkoutSha: z.string().regex(/^[a-f0-9]{40}$/),
    runId: z.string().regex(/^[1-9][0-9]*$/),
    runAttempt: z.string().regex(/^[1-9][0-9]*$/),
  })
  .strict();
const planSchema = z
  .object({
    version: z.literal("public-math-cohort-v3"),
    id: z.string().uuid(),
    context: contextSchema,
    slots: z
      .array(
        z
          .object({
            id: z.string().regex(/^(engineering|browser-[1-9][0-9]*)$/),
            artifact: z.string().regex(/^public-math-[a-zA-Z0-9-]+$/),
            request: requestSchema,
          })
          .strict(),
      )
      .min(2),
  })
  .strict();
const admissionSchema = z
  .object({
    version: z.literal("public-math-admission-v3"),
    runId: z.string().uuid(),
    ordinal: z.string().regex(ordinalPattern),
    journal: z.string(),
    request: requestSchema,
    cohort: referenceSchema.nullable(),
    slot: z.string().nullable(),
  })
  .strict();
const json = (value) => Buffer.from(JSON.stringify(value, null, 2) + "\n");
const equal = (a, b, reason) => {
  if (canonical(a) !== canonical(b)) throw new Error(reason);
};
const relative = (file) => {
  if (!/^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9_.@/-]+$/.test(file))
    throw new Error("Invalid execution state path");
  return file;
};
async function syncDirectory(directory) {
  const handle = await fs.open(directory, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}
async function directory(absolute) {
  absolute = path.resolve(absolute);
  try {
    await fs.mkdir(absolute);
  } catch (error) {
    if (error.code === "ENOENT") {
      await directory(path.dirname(absolute));
      try {
        await fs.mkdir(absolute);
      } catch (collision) {
        if (collision.code !== "EEXIST") throw collision;
      }
    } else if (error.code !== "EEXIST") throw error;
  }
  if (
    (await fs.realpath(absolute)) !== absolute ||
    !(await fs.lstat(absolute)).isDirectory()
  )
    throw new Error("Execution state directory symlink");
  await syncDirectory(absolute);
  await syncDirectory(path.dirname(absolute));
}
async function bytesAt(root, file) {
  const absolute = path.resolve(root, relative(file));
  if (
    !absolute.startsWith(path.resolve(root) + path.sep) ||
    (await fs.realpath(absolute)) !== absolute ||
    !(await fs.lstat(absolute)).isFile()
  )
    throw new Error("Execution state boundary violation");
  return fs.readFile(absolute);
}
async function publish(root, file, bytes) {
  const absolute = path.join(root, relative(file));
  await directory(path.dirname(absolute));
  const temporary = `${absolute}.${randomUUID()}.tmp`;
  const handle = await fs.open(temporary, "wx");
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    try {
      await fs.link(temporary, absolute);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      if (!(await bytesAt(root, file)).equals(bytes))
        throw new Error(`Conflicting immutable publication: ${file}`);
    }
    await syncDirectory(path.dirname(absolute));
  } finally {
    await fs.rm(temporary, { force: true });
  }
  return { file, sha256: sha256(bytes) };
}
async function names(root, file) {
  try {
    const absolute = path.join(root, relative(file));
    if ((await fs.realpath(absolute)) !== path.resolve(absolute))
      throw new Error("Execution journal symlink");
    return (await fs.readdir(absolute)).sort();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
async function journalNames(root, file, directoryFacts) {
  const physical = await names(root, file);
  const projected = (directoryFacts ?? [])
    .filter((value) => path.posix.dirname(value) === file)
    .map((value) => path.posix.basename(value));
  return [...new Set([...physical, ...projected])].sort();
}
async function journalState(root, journal, directoryFacts) {
  const entries = await journalNames(root, journal, directoryFacts);
  if (entries.some((entry) => !ordinalPattern.test(entry)))
    throw new Error("Malformed execution admission journal");
  const ordinal = entries.reduce(
    (max, value) => (BigInt(value) > BigInt(max) ? value : max),
    "0",
  );
  if (ordinal === "0") throw new Error("Current execution admission is absent");
  const file = `${journal}/${ordinal}/admission.json`;
  const bytes = await bytesAt(root, file);
  const admission = admissionSchema.parse(JSON.parse(bytes));
  if (admission.ordinal !== ordinal || admission.journal !== journal)
    throw new Error("Execution admission binding differs");
  const failures = await journalNames(
    root,
    `${journal}/${ordinal}/failures`,
    directoryFacts,
  );
  return { ordinal, file, sha256: sha256(bytes), admission, failures };
}
function provider(root) {
  if (process.env.GITHUB_ACTIONS !== "true") {
    if (process.env.ALGEBRA_PUBLIC_MATH_COHORT)
      throw new Error("CI evidence requires current provider authority");
    return null;
  }
  const context = contextSchema.parse({
    repository: process.env.GITHUB_REPOSITORY,
    workflowRef: process.env.GITHUB_WORKFLOW_REF,
    workflowSha: process.env.GITHUB_WORKFLOW_SHA,
    checkoutSha: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
  });
  const checkout = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (checkout !== context.checkoutSha)
    throw new Error("Current CI checkout SHA differs from provider");
  return context;
}
async function currentPlan(root) {
  const context = provider(root);
  if (!context) return null;
  if (!process.env.ALGEBRA_PUBLIC_MATH_COHORT)
    throw new Error("Current CI cohort reference is absent");
  const reference = referenceSchema.parse(
    JSON.parse(process.env.ALGEBRA_PUBLIC_MATH_COHORT),
  );
  if (reference.file !== planFile) throw new Error("Unexpected CI cohort path");
  const bytes = await bytesAt(root, reference.file);
  if (sha256(bytes) !== reference.sha256)
    throw new Error("Selected CI cohort bytes changed");
  const plan = planSchema.parse(JSON.parse(bytes));
  equal(
    plan.context,
    context,
    "Selected CI cohort is not current provider context",
  );
  if (
    new Set(plan.slots.map((slot) => slot.id)).size !== plan.slots.length ||
    new Set(plan.slots.map((slot) => slot.artifact)).size !== plan.slots.length
  )
    throw new Error("Duplicate CI slot/artifact");
  const expected = slotRequests(plan.slots.length - 1);
  equal(
    plan.slots.map(({ id, request }) => ({ id, request })),
    expected,
    "CI cohort slot plan differs",
  );
  return { plan, reference };
}
export const engineeringChecks = [
  "production-build",
  "formatting",
  "lint",
  "dependency-high-severity-audit",
  "catalogue-integrity",
  "feature-map-current",
  "typescript-contracts",
  "built-artifact-and-component-rendering",
  "mathematical-and-content-suites",
];
export const browserChecks = ["target-source-identity", "browser-interactions"];
function slotRequests(shards) {
  return [
    {
      id: "engineering",
      request: {
        scope: "partial",
        members: [
          { runner: "node:test", selection: { shard: null, filtered: false } },
        ],
        checks: engineeringChecks,
      },
    },
    ...Array.from({ length: shards }, (_, i) => ({
      id: `browser-${i + 1}`,
      request: {
        scope: "partial",
        target: { kind: "created" },
        members: [
          {
            runner: "playwright",
            selection: {
              shard: { index: i + 1, total: shards },
              filtered: false,
            },
          },
        ],
        checks: browserChecks,
      },
    })),
  ];
}
export async function prepareCiCohort(root, shards) {
  const context = provider(root);
  if (!context || !Number.isInteger(shards) || shards < 1 || shards > 64)
    throw new Error("CI cohort requires current provider and bounded shards");
  const id = randomUUID(),
    prefix = `public-math-${context.runId}-${context.runAttempt}-${id}`;
  const slots = slotRequests(shards).map((slot) => ({
    ...slot,
    artifact: `${prefix}-${slot.id}`,
  }));
  const plan = planSchema.parse({
    version: "public-math-cohort-v3",
    id,
    context,
    slots,
  });
  const reference = await publish(root, planFile, json(plan));
  return {
    plan,
    reference,
    prefix,
    matrix: {
      include: slots.slice(1).map((slot) => ({
        slot: slot.id,
        artifact: slot.artifact,
        index: slot.request.members[0].selection.shard.index,
        total: shards,
      })),
    },
  };
}
export async function openRecording(root, request) {
  root = await fs.realpath(root);
  request = requestSchema.parse(request);
  const selected = await currentPlan(root);
  const slot = selected?.plan.slots.find(
    (slot) => slot.id === process.env.ALGEBRA_PUBLIC_MATH_SLOT,
  );
  if (selected && !slot)
    throw new Error("Current CI slot selection is absent or unexpected");
  if (slot) {
    equal(
      request.members,
      slot.request.members,
      "Actual CI invocation differs from planned slot",
    );
    equal(
      request.target,
      slot.request.target,
      "Actual CI target lifecycle differs from planned slot",
    );
    request = slot.request;
  }
  const journal = selected
    ? `${base}/cohorts/${selected.plan.id}/slots/${slot.id}`
    : `${base}/local`;
  await directory(path.join(root, journal));
  let ordinal;
  for (;;) {
    const entries = await names(root, journal);
    if (entries.some((entry) => !ordinalPattern.test(entry)))
      throw new Error("Malformed execution admission journal");
    ordinal = String(
      entries.reduce(
        (max, entry) => (BigInt(entry) > max ? BigInt(entry) : max),
        0n,
      ) + 1n,
    );
    try {
      await fs.mkdir(path.join(root, journal, ordinal));
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }
  await syncDirectory(path.join(root, journal));
  const runId = randomUUID(),
    attempt = `${journal}/${ordinal}`;
  const admission = {
    version: "public-math-admission-v3",
    runId,
    ordinal,
    journal,
    request,
    cohort: selected?.reference ?? null,
    slot: slot?.id ?? null,
  };
  const reference = await publish(
    root,
    `${attempt}/admission.json`,
    json(admission),
  );
  await directory(path.join(root, attempt, "failures"));
  const runDirectory = `outputs/public-math-runs/${runId}`;
  await directory(path.join(root, runDirectory));
  const fail = async (error) => {
    const detail = {
      kind: "failed-execution-recording",
      reason: error.message ?? String(error),
    };
    const failure = `${attempt}/failures/${hashValue(detail)}`;
    await directory(path.join(root, failure));
    await syncDirectory(path.join(root, attempt, "failures"));
    await publish(root, `${failure}/detail.json`, json(detail));
  };
  const retain = async (name, value) => {
    try {
      return await publish(
        root,
        `${runDirectory}/${relative(name)}`,
        Buffer.isBuffer(value) ? value : json(value),
      );
    } catch (error) {
      await fail(error);
      throw error;
    }
  };
  const binding = {
    version: "public-math-binding-v3",
    admission: reference,
    runId,
    cohort: selected?.reference ?? null,
    slot: slot?.id ?? null,
  };
  return {
    root,
    runId,
    directory: path.join(root, runDirectory),
    request,
    binding,
    retain,
    fail,
    async complete(index) {
      try {
        if ((await names(root, `${attempt}/failures`)).length)
          throw new Error("Admitted execution failure dominates success");
        await publish(
          root,
          `${attempt}/${request.scope === "full" ? "success" : "partial"}.json`,
          json({ index }),
        );
        if ((await names(root, `${attempt}/failures`)).length)
          throw new Error("Admitted execution failure dominates success");
      } catch (error) {
        await fail(error);
        throw error;
      }
    },
  };
}
async function selectedParticipant(
  root,
  journal,
  cohort,
  slot,
  directoryFacts,
) {
  const state = await journalState(root, journal, directoryFacts);
  equal(
    state.admission.cohort,
    cohort,
    "Admission belongs to different selected cohort",
  );
  if (state.admission.slot !== slot)
    throw new Error("Admission belongs to different selected slot");
  if (state.failures.length)
    throw new Error("Current execution has admitted failure");
  const terminal = `${journal}/${state.ordinal}/${state.admission.request.scope === "full" ? "success" : "partial"}.json`;
  const bytes = await bytesAt(root, terminal);
  const fact = z
    .object({ index: referenceSchema })
    .strict()
    .parse(JSON.parse(bytes));
  if (
    !fact.index.file.startsWith(
      `outputs/public-math-runs/${state.admission.runId}/`,
    )
  )
    throw new Error("Terminal index belongs to another admission");
  const initial = { ...state, terminalSha256: sha256(bytes) };
  return {
    root,
    admission: state.admission,
    admissionReference: { file: state.file, sha256: state.sha256 },
    index: fact.index,
    async guard() {
      const after = await journalState(root, journal, directoryFacts);
      equal(after, state, "Execution admission or failure changed during read");
      if (sha256(await bytesAt(root, terminal)) !== initial.terminalSha256)
        throw new Error("Execution terminal changed during read");
    },
  };
}
async function tree(root, start) {
  const rows = [];
  async function visit(file) {
    const absolute = path.join(root, relative(file));
    const info = await fs.lstat(absolute);
    if (info.isSymbolicLink()) throw new Error("Execution container symlink");
    if (info.isDirectory())
      for (const name of (await fs.readdir(absolute)).sort())
        await visit(`${file}/${name}`);
    else if (info.isFile()) {
      const bytes = await bytesAt(root, file);
      rows.push({ file, sha256: sha256(bytes), bytes: bytes.length });
    } else throw new Error("Unsupported execution container entry");
  }
  await visit(start);
  return rows;
}
async function directories(root, start) {
  const result = [];
  async function visit(file) {
    const absolute = path.join(root, relative(file));
    const info = await fs.lstat(absolute);
    if (info.isSymbolicLink()) throw new Error("Execution container symlink");
    if (!info.isDirectory()) return;
    result.push(file);
    for (const child of (await fs.readdir(absolute)).sort())
      await visit(`${file}/${child}`);
  }
  await visit(start);
  return result.sort();
}
export async function sealCiSlot(root) {
  root = await fs.realpath(root);
  const selected = await currentPlan(root);
  if (!selected) throw new Error("Sealing requires current CI cohort");
  const slot = selected.plan.slots.find(
    (slot) => slot.id === process.env.ALGEBRA_PUBLIC_MATH_SLOT,
  );
  if (!slot) throw new Error("Sealing requires exact CI slot");
  const journal = `${base}/cohorts/${selected.plan.id}/slots/${slot.id}`;
  await directory(path.join(root, journal));
  const roots = [journal];
  const rows = await tree(root, journal);
  const folders = await directories(root, journal);
  for (const ordinal of await names(root, journal)) {
    if (!ordinalPattern.test(ordinal)) throw new Error("Malformed CI journal");
    try {
      const admission = admissionSchema.parse(
        JSON.parse(await bytesAt(root, `${journal}/${ordinal}/admission.json`)),
      );
      roots.push(`outputs/public-math-runs/${admission.runId}`);
      rows.push(
        ...(await tree(root, `outputs/public-math-runs/${admission.runId}`)),
      );
      folders.push(
        ...(await directories(
          root,
          `outputs/public-math-runs/${admission.runId}`,
        )),
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  rows.push({
    file: selected.reference.file,
    sha256: selected.reference.sha256,
    bytes: (await bytesAt(root, selected.reference.file)).length,
  });
  rows.sort((a, b) => a.file.localeCompare(b.file));
  const container = path.join(
    root,
    "outputs/public-math-containers",
    slot.artifact,
  );
  try {
    for (const folder of folders) await directory(path.join(container, folder));
    for (const row of rows) {
      const bytes = await bytesAt(root, row.file);
      if (sha256(bytes) !== row.sha256)
        throw new Error("CI slot changed while sealing");
      await publish(container, row.file, bytes);
    }
    equal(
      await tree(root, journal),
      rows.filter((row) => row.file.startsWith(journal + "/")),
      "CI journal changed while sealing",
    );
    const projectedFolders = await directories(container, "outputs");
    const afterRows = [],
      afterFolders = [];
    for (const item of roots) {
      afterRows.push(...(await tree(root, item)));
      afterFolders.push(...(await directories(root, item)));
    }
    afterRows.push({
      file: selected.reference.file,
      sha256: sha256(await bytesAt(root, selected.reference.file)),
      bytes: (await bytesAt(root, selected.reference.file)).length,
    });
    equal(
      afterRows.sort((a, b) => a.file.localeCompare(b.file)),
      rows,
      "CI evidence changed while sealing",
    );
    equal(
      afterFolders.sort(),
      folders.sort(),
      "CI admission/failure changed while sealing",
    );
    const seal = {
      version: "public-math-container-v3",
      cohort: selected.reference,
      slot: slot.id,
      files: rows,
      directories: projectedFolders,
    };
    await publish(container, "seal.json", json(seal));
  } catch (error) {
    await directory(path.join(container, "conflict"));
    throw error;
  }
  return { directory: container, artifact: slot.artifact };
}
async function verifyContainer(root, selected, slot) {
  const bytes = await bytesAt(root, "seal.json");
  const seal = z
    .object({
      version: z.literal("public-math-container-v3"),
      cohort: referenceSchema,
      slot: z.string(),
      files: z.array(
        z
          .object({
            file: z.string(),
            sha256: z.string(),
            bytes: z.number().int().nonnegative(),
          })
          .strict(),
      ),
      directories: z.array(z.string()),
    })
    .strict()
    .parse(JSON.parse(bytes));
  equal(seal.cohort, selected.reference, "CI container cohort differs");
  if (seal.slot !== slot.id) throw new Error("CI container slot differs");
  if (
    !seal.files.some(
      (row) =>
        row.file === selected.reference.file &&
        row.sha256 === selected.reference.sha256,
    )
  )
    throw new Error("CI container omits exact selected plan bytes");
  const journal = `${base}/cohorts/${selected.plan.id}/slots/${slot.id}`;
  const evidenceRoots = [journal];
  for (const ordinal of await journalNames(root, journal, seal.directories)) {
    if (!ordinalPattern.test(ordinal))
      throw new Error("Malformed sealed CI journal");
    try {
      const admission = admissionSchema.parse(
        JSON.parse(await bytesAt(root, `${journal}/${ordinal}/admission.json`)),
      );
      if (
        admission.journal !== journal ||
        admission.ordinal !== ordinal ||
        admission.slot !== slot.id
      )
        throw new Error("Sealed admission belongs to another journal");
      equal(
        admission.cohort,
        selected.reference,
        "Sealed admission belongs to another cohort",
      );
      evidenceRoots.push(`outputs/public-math-runs/${admission.runId}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const permitted = [selected.reference.file, ...evidenceRoots];
  if (
    seal.files.some(
      (row) =>
        !permitted.some(
          (prefix) => row.file === prefix || row.file.startsWith(prefix + "/"),
        ),
    ) ||
    seal.directories.some(
      (file) =>
        !permitted.some(
          (prefix) =>
            file === prefix ||
            file.startsWith(prefix + "/") ||
            prefix.startsWith(file + "/"),
        ),
    )
  )
    throw new Error(
      "CI container includes evidence outside its complete slot journal",
    );
  const actual = (await tree(root, "outputs")).sort((a, b) =>
    a.file.localeCompare(b.file),
  );
  equal(actual, seal.files, "CI container missing, extra or conflicting files");
  if (new Set(seal.directories).size !== seal.directories.length)
    throw new Error("Duplicate CI directory facts");
  for (const file of [
    ...seal.directories,
    ...seal.files.map((row) => row.file),
  ]) {
    relative(file);
    if (
      file !== "outputs" &&
      !seal.directories.includes(path.posix.dirname(file))
    )
      throw new Error("Incomplete CI directory facts");
  }
  if (
    (await directories(root, "outputs")).some(
      (file) => !seal.directories.includes(file),
    )
  )
    throw new Error("CI container directory journal differs");
  equal(
    (await fs.readdir(root)).sort(),
    ["outputs", "seal.json"],
    "Unexpected CI container entries",
  );
  return { sha256: sha256(bytes), directories: seal.directories };
}
export async function readSelectedRecording(root) {
  root = await fs.realpath(root);
  const selected = await currentPlan(root);
  if (!selected) {
    const participant = await selectedParticipant(
      root,
      `${base}/local`,
      null,
      null,
    );
    if (participant.admission.request.scope !== "full")
      throw new Error("Current execution is partial");
    return {
      participants: [participant],
      async guard() {
        if (provider(root)) throw new Error("Execution authority changed");
        await participant.guard();
      },
    };
  }
  equal(
    JSON.parse(process.env.ALGEBRA_PUBLIC_MATH_JOB_RESULTS ?? "null"),
    { engineering: "success", browser: "success" },
    "Current CI producer jobs did not all pass",
  );
  const imports = path.join(root, "outputs/public-math-imports");
  equal(
    (await fs.readdir(imports)).sort(),
    selected.plan.slots.map((slot) => slot.artifact).sort(),
    "Missing, extra or duplicate CI containers",
  );
  const participants = [],
    guards = [];
  for (const slot of selected.plan.slots) {
    const container = path.join(imports, slot.artifact);
    const seal = await verifyContainer(container, selected, slot);
    const journal = `${base}/cohorts/${selected.plan.id}/slots/${slot.id}`;
    const participant = await selectedParticipant(
      container,
      journal,
      selected.reference,
      slot.id,
      seal.directories,
    );
    equal(
      participant.admission.request,
      slot.request,
      "CI participant request differs from plan",
    );
    participants.push(participant);
    guards.push(async () => {
      if (
        (await verifyContainer(container, selected, slot)).sha256 !==
        seal.sha256
      )
        throw new Error("CI container seal changed");
      await participant.guard();
    });
  }
  return {
    participants,
    async guard() {
      equal(await currentPlan(root), selected, "Current CI selection changed");
      equal(
        JSON.parse(process.env.ALGEBRA_PUBLIC_MATH_JOB_RESULTS ?? "null"),
        { engineering: "success", browser: "success" },
        "Current CI producer jobs changed",
      );
      equal(
        (await fs.readdir(imports)).sort(),
        selected.plan.slots.map((slot) => slot.artifact).sort(),
        "CI container set changed",
      );
      for (const guard of guards) await guard();
    },
  };
}
export async function stageCiContainers(root) {
  root = await fs.realpath(root);
  const selected = await currentPlan(root);
  if (!selected)
    throw new Error("Staging requires current CI provider authority");
  const imports = path.join(root, "outputs/public-math-imports");
  await directory(imports);
  for (const slot of selected.plan.slots) {
    const destination = path.join(imports, slot.artifact);
    const temporary = await fs.mkdtemp(
      path.join(root, "outputs/public-math-download-"),
    );
    try {
      execFileSync(
        "gh",
        [
          "run",
          "download",
          selected.plan.context.runId,
          "--repo",
          selected.plan.context.repository,
          "--name",
          slot.artifact,
          "--dir",
          temporary,
        ],
        { stdio: "inherit" },
      );
      await verifyContainer(temporary, selected, slot);
      const bytes = await bytesAt(temporary, "seal.json"),
        seal = JSON.parse(bytes);
      try {
        for (const folder of seal.directories)
          await directory(path.join(destination, relative(folder)));
        for (const row of seal.files)
          await publish(
            destination,
            row.file,
            await bytesAt(temporary, row.file),
          );
        await publish(destination, "seal.json", bytes);
        await verifyContainer(destination, selected, slot);
      } catch (error) {
        await directory(path.join(destination, "conflict"));
        throw error;
      }
    } catch (error) {
      await directory(path.join(destination, "conflict"));
      throw error;
    } finally {
      await fs.rm(temporary, { recursive: true, force: true });
    }
  }
  return { containers: selected.plan.slots.map((slot) => slot.artifact) };
}
