import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  rename,
  rm,
  symlink,
  utimes,
  writeFile,
  stat,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  ledgerDigest,
  stableJson,
  topicDigest,
} from "../scripts/lib/ureca-coverage.mjs";
import {
  sourceStateSchema,
  compareSourceState,
  readSourceState,
  scanSourceRoot,
  writePrivateState,
} from "../scripts/lib/ureca-source-scan.mjs";

async function fixture(context) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ureca-scan-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, "sources");
  await mkdir(root);
  await writeFile(path.join(root, "proof.tex"), "A retained proof");
  const scan = await scanSourceRoot(root);
  const state = {
    schemaVersion: 1,
    root: scan.root,
    reviewedBy: "Independent fixture reviewer",
    acceptedAt: "2026-10-22T00:00:00Z",
    entries: scan.entries.map((entry) => ({
      ...entry,
      disposition: { kind: "administrative", reason: "Fixture only" },
    })),
  };
  return { directory, root, scan, state };
}

test("missing, empty and uninitialized sources never return clean", async (context) => {
  const { directory, root, scan } = await fixture(context);
  await assert.rejects(
    scanSourceRoot(path.join(directory, "missing")),
    /ENOENT/,
  );
  assert.equal(compareSourceState(scan).clean, false);
  await rm(path.join(root, "proof.tex"));
  const empty = await scanSourceRoot(root);
  assert.deepEqual(empty.errors, [{ kind: "empty-source-root" }]);
  assert.equal(compareSourceState(empty).clean, false);
});

test("bytes decide source freshness even when timestamps are preserved", async (context) => {
  const { root, state } = await fixture(context);
  const file = path.join(root, "proof.tex");
  const before = await stat(file);
  await writeFile(file, "A modified proof");
  await utimes(file, before.atime, before.mtime);
  const changed = compareSourceState(await scanSourceRoot(root), state);
  assert.equal(changed.clean, false);
  assert.deepEqual(changed.changes, [{ kind: "changed", path: "proof.tex" }]);
});

test("timestamp changes without byte changes preserve accepted coverage", async (context) => {
  const { root, state } = await fixture(context);
  await utimes(
    path.join(root, "proof.tex"),
    new Date(),
    new Date("2030-01-01"),
  );
  assert.equal(
    compareSourceState(await scanSourceRoot(root), state).clean,
    true,
  );
});

test("addition, removal, exact duplicate and rename require reconciliation", async (context) => {
  const { root, state } = await fixture(context);
  await writeFile(path.join(root, "new.tex"), "New mathematics");
  assert.equal(
    compareSourceState(await scanSourceRoot(root), state).changes[0].kind,
    "added",
  );
  await rm(path.join(root, "new.tex"));
  await writeFile(
    path.join(root, "copy.tex"),
    await readFile(path.join(root, "proof.tex")),
  );
  assert.equal(
    compareSourceState(await scanSourceRoot(root), state).changes[0].kind,
    "duplicate",
  );
  await rm(path.join(root, "copy.tex"));
  await rename(path.join(root, "proof.tex"), path.join(root, "renamed.tex"));
  const moved = compareSourceState(await scanSourceRoot(root), state);
  assert.deepEqual(moved.changes, [
    { kind: "renamed", path: "renamed.tex", from: "proof.tex" },
    { kind: "removed", path: "proof.tex" },
  ]);
});

test("unsupported documents and symlink escapes fail explicitly", async (context) => {
  const { directory, root, state } = await fixture(context);
  await writeFile(path.join(root, "unknown.format"), "Unparsed source");
  await writeFile(path.join(directory, "outside.tex"), "PRIVATE_URECA_CANARY");
  await symlink(
    path.join(directory, "outside.tex"),
    path.join(root, "escape.tex"),
  );
  const scan = await scanSourceRoot(root);
  assert.deepEqual(scan.errors.map(({ kind }) => kind).sort(), [
    "escaped-symlink",
    "unsupported-file",
  ]);
  assert.equal(compareSourceState(scan, state).clean, false);
  assert.ok(!JSON.stringify(scan).includes("PRIVATE_URECA_CANARY"));
});

test("source snapshots remain private and malformed state does not become initialization", async (context) => {
  const { directory, root, state } = await fixture(context);
  const file = path.join(directory, "private", "state.json");
  await writePrivateState(file, state, root);
  assert.deepEqual(await readSourceState(file), { ...state, removals: [] });
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  await assert.rejects(
    writePrivateState(path.join(root, "state.json"), state, root),
    /outside the repository/,
  );
  await writeFile(file, "{invalid");
  await assert.rejects(readSourceState(file), SyntaxError);
  assert.equal(
    await readSourceState(path.join(directory, "absent.json")),
    undefined,
  );
});

test("an incomplete read cannot certify accepted bytes", async (context) => {
  const { root, state } = await fixture(context);
  const scan = await scanSourceRoot(root, {
    readBytes: async (file) => (await file.readFile()).subarray(0, 3),
  });
  assert.deepEqual(scan.errors, [
    { kind: "changed-during-read", path: "proof.tex" },
    { kind: "empty-source-root" },
  ]);
  assert.equal(compareSourceState(scan, state).clean, false);
});

test("a source added during traversal cannot leave a clean snapshot", async (context) => {
  const { root, state } = await fixture(context);
  const scan = await scanSourceRoot(root, {
    readBytes: async (file) => {
      const bytes = await file.readFile();
      await writeFile(
        path.join(root, "new-study.txt"),
        "New retained mathematics",
      );
      return bytes;
    },
  });
  assert.equal(compareSourceState(scan, state).clean, false);
  assert.ok(scan.errors.some(({ kind }) => kind === "changed-directory"));
  assert.equal(
    compareSourceState(await scanSourceRoot(root), state).clean,
    false,
  );
});

test("an unvisited directory swapped for an escaping symlink is never read", async (context) => {
  const { root, directory } = await fixture(context);
  const external = path.join(directory, "external");
  await mkdir(path.join(root, "z"));
  await mkdir(external);
  await writeFile(path.join(root, "z", "proof.txt"), "Same retained bytes");
  await writeFile(path.join(external, "proof.txt"), "Same retained bytes");
  const baseline = await scanSourceRoot(root);
  const state = {
    schemaVersion: 1,
    root: baseline.root,
    reviewedBy: "Independent fixture reviewer",
    acceptedAt: "2026-10-22T00:00:00Z",
    entries: baseline.entries.map((entry) => ({
      ...entry,
      disposition: { kind: "administrative", reason: "Fixture only" },
    })),
  };
  let reads = 0;
  const scan = await scanSourceRoot(root, {
    readBytes: async (file) => {
      reads += 1;
      const bytes = await file.readFile();
      if (reads === 1) {
        await rename(
          path.join(root, "z"),
          path.join(directory, "moved-original"),
        );
        await symlink(external, path.join(root, "z"));
      }
      return bytes;
    },
  });
  assert.equal(reads, 1);
  assert.equal(compareSourceState(scan, state).clean, false);
  assert.ok(scan.errors.some(({ kind }) => kind === "escaped-symlink"));
  assert.ok(!scan.entries.some(({ path }) => path === "z/proof.txt"));
  assert.deepEqual((await scanSourceRoot(root)).errors, [
    { kind: "escaped-symlink", path: "z" },
  ]);
});

test("a same-size mutation restoring mtime during a read cannot certify stale bytes", async (context) => {
  const { root, state } = await fixture(context);
  const file = path.join(root, "proof.tex");
  const exactTime = new Date("2026-01-01T00:00:00Z");
  await utimes(file, exactTime, exactTime);
  const before = await stat(file);
  const scan = await scanSourceRoot(root, {
    readBytes: async (opened) => {
      const bytes = await opened.readFile();
      await writeFile(file, "B retained proof");
      await utimes(file, before.atime, before.mtime);
      return bytes;
    },
  });
  assert.equal(await readFile(file, "utf8"), "B retained proof");
  assert.equal(compareSourceState(scan, state).clean, false);
  assert.ok(scan.errors.some(({ kind }) => kind === "changed-during-read"));
});

test("final consistency checks catch changes to files and completed directories", async (context) => {
  const { root, state } = await fixture(context);
  await mkdir(path.join(root, "a"));
  const earlier = path.join(root, "a", "earlier.txt");
  await writeFile(earlier, "Old math");
  const exactTime = new Date("2026-01-01T00:00:00Z");
  await utimes(earlier, exactTime, exactTime);
  state.entries = (await scanSourceRoot(root)).entries.map((entry) => ({
    ...entry,
    disposition: state.entries[0].disposition,
  }));
  let reads = 0;
  const scan = await scanSourceRoot(root, {
    readBytes: async (file) => {
      const bytes = await file.readFile();
      if (++reads === 2) {
        await writeFile(earlier, "New math");
        await utimes(earlier, exactTime, exactTime);
        await writeFile(path.join(root, "a", "new.txt"), "New retained source");
      }
      return bytes;
    },
  });
  assert.equal(compareSourceState(scan, state).clean, false);
  assert.ok(
    scan.errors.some(
      ({ kind, path }) =>
        kind === "changed-during-scan" && path === "a/earlier.txt",
    ),
  );
  assert.ok(
    scan.errors.some(
      ({ kind, path }) => kind === "changed-directory" && path === "a",
    ),
  );
});

test("only auxiliaries paired with a TeX source are excluded", async (context) => {
  const { root } = await fixture(context);
  await writeFile(path.join(root, "proof.log"), "Generated TeX log");
  await writeFile(path.join(root, "meeting.log"), "New retained discussion");
  const scan = await scanSourceRoot(root);
  assert.deepEqual(scan.entries.map(({ path }) => path).sort(), [
    "meeting.log",
    "proof.tex",
  ]);
});

test("a symlinked state directory cannot leak a snapshot into the repository", async (context) => {
  const { root, directory, state } = await fixture(context);
  const linked = path.join(directory, "linked-public");
  await symlink(root, linked);
  await assert.rejects(
    writePrivateState(path.join(linked, "state.json"), state, root),
    /outside the repository/,
  );
});

async function publicFixture(directory) {
  const repository = path.join(directory, "repository");
  await mkdir(path.join(repository, "lib/algebra"), { recursive: true });
  await mkdir(path.join(repository, "docs/research"), { recursive: true });
  const catalogue = {
    lessons: [{ id: "fixture", proof: "Fixture proof" }],
    guides: { fixture: { proofSteps: ["Fixture proof step"] } },
    metadata: { fixture: {} },
    units: [],
    capstones: {},
  };
  const ledger = {
    schemaVersion: 1,
    scope: "Structural fixture; no mathematical correctness claim",
    topics: Array.from({ length: 92 }, (_, i) => ({
      id: `${i < 86 ? "T" : "P"}${String(i < 86 ? i + 1 : i - 85).padStart(2, "0")}`,
      title: "Fixture obligation",
      section: "Fixture obligations",
      classification: i < 86 ? "required" : i < 90 ? "candidate" : "prepared",
      objectives: ["Check source acceptance behavior"],
      passages: ["statement", "proof", "example", "boundary"].map(
        (purpose) => ({
          lessonId: "fixture",
          source: "lesson",
          path: "/proof",
          excerpt: "Fixture proof",
          purpose,
        }),
      ),
      exerciseMethods: [],
      sources: [
        {
          title: "Fixture",
          url: "https://example.org/math",
          section: "Fixture",
        },
      ],
      review: { status: "pending" },
    })),
    exerciseMethods: [],
  };
  const report = [];
  for (const topic of ledger.topics) {
    topic.review = {
      status: "reviewed",
      id: "fixture-review",
      reviewer: "Independent fixture",
      reviewedAt: "2026-10-22T00:00:00Z",
      evidence: "docs/research/ureca-fixture.md",
      contentDigest: topicDigest(topic, catalogue),
      summary: "Fixture binding only",
    };
    report.push(`${topic.review.id} ${topic.id} ${topic.review.contentDigest}`);
  }
  for (const [file, value] of Object.entries({
    "lessons.json": catalogue.lessons,
    "guided-lessons.json": catalogue.guides,
    "learning-metadata.json": catalogue.metadata,
    "units.json": catalogue.units,
    "capstone-assessments.json": catalogue.capstones,
    "ureca-topics.json": ledger,
  }))
    await writeFile(
      path.join(repository, "lib/algebra", file),
      JSON.stringify(value),
    );
  await writeFile(
    path.join(repository, "docs/research/ureca-fixture.md"),
    report.join("\n"),
  );
  return {
    repository,
    ledger,
    coverageDigest: createHash("sha256")
      .update(stableJson(ledger))
      .digest("hex"),
  };
}

function sourceCli(repository, root, snapshot) {
  return (command, ...extra) =>
    spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL("../scripts/ureca-sources.mjs", import.meta.url)),
        command,
        "--root",
        root,
        "--state",
        snapshot,
        ...extra,
      ],
      { cwd: repository, encoding: "utf8" },
    );
}

test("source CLI covered mappings require reviewed required targets on accept and scan", async (context) => {
  const { directory, root, state } = await fixture(context);
  const { repository, ledger } = await publicFixture(directory);
  const candidate = ledger.topics.find(({ id }) => id === "P01");
  candidate.review = { status: "pending" };
  candidate.passages = [];
  await writeFile(
    path.join(repository, "lib/algebra/ureca-topics.json"),
    JSON.stringify(ledger),
  );
  const snapshot = path.join(directory, "private-state.json");
  const decisionFile = path.join(directory, "decisions.json");
  const cli = sourceCli(repository, root, snapshot);
  for (const topicIds of [
    ["P01"],
    ["P02"],
    ["P05"],
    ["T999"],
    ["T01", "P01"],
  ]) {
    const imported = {
      ...state,
      entries: state.entries.map((entry) => ({
        ...entry,
        disposition: {
          kind: "covered",
          topicIds,
          coverageDigest: ledgerDigest(ledger),
          reason: "Synthetic coverage mapping",
        },
      })),
    };
    for (const command of ["accept", "scan"]) {
      await context.test(
        `${command} rejects ${topicIds.join(",")}`,
        async () => {
          await rm(snapshot, { force: true });
          await writeFile(decisionFile, JSON.stringify(imported));
          if (command === "scan")
            await writeFile(snapshot, JSON.stringify(imported));
          const result = cli(
            command,
            ...(command === "accept"
              ? ["--decisions", decisionFile, "--initialize"]
              : []),
          );
          assert.equal(
            result.status,
            1,
            `${command} trusted ${topicIds.join(",")}: ${result.stdout}`,
          );
          if (command === "accept") {
            assert.match(result.stderr, /Unbound coverage disposition/);
            assert.equal(await readSourceState(snapshot), undefined);
          } else {
            const resultState = JSON.parse(result.stdout);
            assert.equal(resultState.clean, false);
            assert.ok(
              resultState.errors.some(
                ({ kind }) => kind === "unbound-coverage-disposition",
              ),
            );
          }
        },
      );
    }
  }
  for (const kind of ["candidate", "prepared"]) {
    const classified = {
      ...state,
      entries: state.entries.map((entry) => ({
        ...entry,
        disposition: { kind, reason: "Retained preparation boundary" },
      })),
    };
    await rm(snapshot, { force: true });
    await writeFile(decisionFile, JSON.stringify(classified));
    const accepted = cli("accept", "--decisions", decisionFile, "--initialize");
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.equal(cli("scan").status, 0);
  }
});

test("source CLI rejects state inside current and other Git checkouts through aliases", async (context) => {
  const { directory, root, state } = await fixture(context);
  const { repository } = await publicFixture(directory);
  const checkout = path.join(directory, "second-checkout");
  const linkedCheckout = path.join(directory, "linked-checkout");
  for (const args of [
    ["init", "--quiet", checkout],
    [
      "init",
      "--quiet",
      "--separate-git-dir",
      path.join(directory, "separate-git-data"),
      linkedCheckout,
    ],
  ]) {
    const initialized = spawnSync("git", args, { encoding: "utf8" });
    assert.equal(initialized.status, 0, initialized.stderr);
  }
  const inside = path.join(repository, "private-state.json");
  const other = path.join(checkout, "nested", "private-state.json");
  const gitFile = path.join(linkedCheckout, "private-state.json");
  const directoryAlias = path.join(directory, "checkout-alias");
  const fileAlias = path.join(directory, "state-alias.json");
  await mkdir(path.dirname(other));
  for (const file of [inside, other, gitFile])
    await writeFile(file, JSON.stringify(state));
  await symlink(checkout, directoryAlias);
  await symlink(inside, fileAlias);
  const decisionFile = path.join(directory, "decisions.json");
  await writeFile(decisionFile, JSON.stringify(state));
  for (const snapshot of [
    inside,
    other,
    gitFile,
    path.join(directoryAlias, "nested", "private-state.json"),
    fileAlias,
  ]) {
    for (const command of ["scan", "accept"]) {
      await context.test(
        `${command} refuses ${path.relative(directory, snapshot)}`,
        async () => {
          const before = await readFile(snapshot, "utf8");
          const result = sourceCli(
            repository,
            root,
            snapshot,
          )(
            command,
            ...(command === "accept" ? ["--decisions", decisionFile] : []),
          );
          assert.equal(
            result.status,
            1,
            `${command} trusted ${snapshot}: ${result.stdout}`,
          );
          assert.match(result.stderr, /Private source state/);
          assert.equal(await readFile(snapshot, "utf8"), before);
        },
      );
    }
  }
  await writeFile(inside, "{invalid state that must never be read");
  assert.match(
    sourceCli(repository, root, inside)("scan").stderr,
    /Private source state/,
  );
});

test("scanning an uninitialized private state never creates its parent", async (context) => {
  const { directory, root } = await fixture(context);
  const { repository } = await publicFixture(directory);
  const parent = path.join(directory, "new-private-directory", "nested");
  const result = sourceCli(
    repository,
    root,
    path.join(parent, "state.json"),
  )("scan");
  assert.equal(result.status, 1);
  assert.match(result.stdout, /uninitialized/);
  await assert.rejects(stat(path.dirname(parent)), { code: "ENOENT" });
});

test("imported snapshots reject duplicate cycles, missing originals and different bytes", async (context) => {
  const { root, directory, state } = await fixture(context);
  await writeFile(path.join(root, "copy.tex"), "A retained proof");
  state.entries = (await scanSourceRoot(root)).entries.map((entry) => ({
    ...entry,
    disposition: { kind: "administrative", reason: "Fixture only" },
  }));
  const scan = await scanSourceRoot(root);
  const file = path.join(directory, "imported.json");
  const duplicate = (of) => ({
    kind: "duplicate",
    of,
    reason: "Identical retained bytes",
  });
  for (const dispositions of [
    [duplicate("proof.tex"), duplicate("copy.tex")],
    [duplicate("copy.tex"), state.entries[1].disposition],
    [duplicate("missing.tex"), state.entries[1].disposition],
  ]) {
    const imported = {
      ...state,
      entries: state.entries.map((entry, index) => ({
        ...entry,
        disposition: dispositions[index],
      })),
    };
    await writeFile(file, JSON.stringify(imported));
    assert.throws(
      () => compareSourceState(scan, imported),
      /Invalid duplicate disposition/,
    );
    await assert.rejects(
      readSourceState(file),
      /Invalid duplicate disposition/,
    );
    await assert.rejects(
      writePrivateState(path.join(directory, "rejected.json"), imported, root),
      /Invalid duplicate disposition/,
    );
  }
  const differentBytes = structuredClone(state);
  differentBytes.entries[0].disposition = duplicate("proof.tex");
  differentBytes.entries[0].sha256 = "0".repeat(64);
  assert.throws(
    () => compareSourceState(scan, differentBytes),
    /Invalid duplicate disposition/,
  );
});

test("the CLI refuses cyclic duplicate decisions and forged cyclic state", async (context) => {
  const { directory, root, state } = await fixture(context);
  const { repository } = await publicFixture(directory);
  await writeFile(path.join(root, "copy.tex"), "A retained proof");
  const decisions = {
    reviewedBy: "Independent fixture",
    entries: (await scanSourceRoot(root)).entries.map((entry) => ({
      ...entry,
      disposition: {
        kind: "duplicate",
        of: entry.path === "proof.tex" ? "copy.tex" : "proof.tex",
        reason: "Identical retained bytes",
      },
    })),
  };
  const snapshot = path.join(directory, "private-state.json");
  const decisionFile = path.join(directory, "decisions.json");
  const cli = sourceCli(repository, root, snapshot);
  await writeFile(decisionFile, JSON.stringify(decisions));
  const accepted = cli("accept", "--decisions", decisionFile, "--initialize");
  assert.equal(accepted.status, 1);
  assert.match(accepted.stderr, /Invalid duplicate disposition/);
  assert.equal(await readSourceState(snapshot), undefined);
  await writeFile(
    snapshot,
    JSON.stringify({ ...state, entries: decisions.entries }),
  );
  await rm(path.join(repository, "docs/research/ureca-fixture.md"));
  const scanned = cli("scan");
  assert.equal(scanned.status, 1);
  assert.match(scanned.stderr, /Invalid duplicate disposition/);
});

test("duplicate chains inherit their covered original's public freshness", async (context) => {
  const { directory, root } = await fixture(context);
  const { repository, coverageDigest } = await publicFixture(directory);
  await writeFile(path.join(root, "a.txt"), "A retained proof");
  await writeFile(path.join(root, "b.txt"), "A retained proof");
  const decisions = {
    reviewedBy: "Independent fixture",
    entries: (await scanSourceRoot(root)).entries.map((entry) => ({
      ...entry,
      disposition:
        entry.path === "proof.tex"
          ? {
              kind: "covered",
              topicIds: ["T01"],
              coverageDigest,
              reason: "Reviewed fixture mapping",
            }
          : {
              kind: "duplicate",
              of: entry.path === "a.txt" ? "b.txt" : "proof.tex",
              reason: "Identical retained bytes",
            },
    })),
  };
  const snapshot = path.join(directory, "private-state.json");
  const decisionFile = path.join(directory, "decisions.json");
  const cli = sourceCli(repository, root, snapshot);
  await writeFile(decisionFile, JSON.stringify(decisions));
  const accepted = cli("accept", "--decisions", decisionFile, "--initialize");
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(cli("scan").status, 0);
  await rm(path.join(repository, "docs/research/ureca-fixture.md"));
  const scanned = cli("scan");
  assert.equal(scanned.status, 1);
  assert.match(scanned.stdout, /public-coverage-unverified/);
});

test("accepted removal history survives consecutive acceptances and rejects stale decisions", async (context) => {
  const { directory, root } = await fixture(context);
  const { repository, coverageDigest } = await publicFixture(directory);
  const disposition = {
    kind: "covered",
    topicIds: ["T01"],
    coverageDigest,
    reason: "Reviewed fixture mapping",
  };
  const decisions = {
    reviewedBy: "Independent fixture",
    entries: (await scanSourceRoot(root)).entries.map((entry) => ({
      ...entry,
      disposition,
    })),
    removed: [],
  };
  const snapshot = path.join(directory, "private-state.json");
  const decisionFile = path.join(directory, "decisions.json");
  const cli = sourceCli(repository, root, snapshot);
  await writeFile(decisionFile, JSON.stringify(decisions));
  const initialized = cli(
    "accept",
    "--decisions",
    decisionFile,
    "--initialize",
  );
  assert.equal(initialized.status, 0, initialized.stderr);
  for (const [oldPath, newPath] of [
    ["proof.tex", "first.tex"],
    ["first.tex", "second.tex"],
  ]) {
    const before = await readSourceState(snapshot);
    const removed = before.entries.find(({ path }) => path === oldPath);
    await rename(path.join(root, oldPath), path.join(root, newPath));
    decisions.entries = (await scanSourceRoot(root)).entries.map((entry) => ({
      ...entry,
      disposition,
    }));
    const reason = `Reviewed removal because ${oldPath} was renamed to ${newPath}`;
    decisions.removed = [{ path: oldPath, sha256: "0".repeat(64), reason }];
    await writeFile(decisionFile, JSON.stringify(decisions));
    const rejected = cli("accept", "--decisions", decisionFile);
    assert.equal(rejected.status, 1);
    assert.match(
      rejected.stderr,
      /removed source needs a reviewed disposition/,
    );
    assert.deepEqual(await readSourceState(snapshot), before);
    decisions.removed[0].sha256 = removed.sha256;
    await writeFile(decisionFile, JSON.stringify(decisions));
    const accepted = cli("accept", "--decisions", decisionFile);
    assert.equal(accepted.status, 0, accepted.stderr);
    const after = await readSourceState(snapshot);
    assert.deepEqual(after.removals.slice(0, -1), before.removals);
    assert.deepEqual(after.removals.at(-1), {
      path: oldPath,
      sha256: removed.sha256,
      reason,
      reviewedBy: decisions.reviewedBy,
      acceptedAt: after.acceptedAt,
    });
  }
  const history = (await readSourceState(snapshot)).removals;
  assert.equal(history.length, 2);
  const stale = cli("accept", "--decisions", decisionFile);
  assert.equal(stale.status, 1);
  assert.match(
    stale.stderr,
    /Removal decisions must match current removed sources/,
  );
  decisions.removed = [];
  await writeFile(decisionFile, JSON.stringify(decisions));
  const repeated = cli("accept", "--decisions", decisionFile);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.deepEqual((await readSourceState(snapshot)).removals, history);
});

test("legacy state defaults to empty history and persisted history cannot be rewritten", async (context) => {
  const { directory, root, state, scan } = await fixture(context);
  const file = path.join(directory, "private-state.json");
  await writeFile(file, JSON.stringify(state));
  assert.deepEqual((await readSourceState(file)).removals, []);
  assert.equal(compareSourceState(scan, state).clean, true);
  const removal = {
    path: "old.txt",
    sha256: "a".repeat(64),
    reason: "Reviewed historical removal",
    reviewedBy: state.reviewedBy,
    acceptedAt: state.acceptedAt,
  };
  await writePrivateState(file, { ...state, removals: [removal] }, root);
  const before = await readFile(file, "utf8");
  for (const removals of [[], [{ ...removal, reason: "Rewritten reason" }]]) {
    await assert.rejects(
      writePrivateState(file, { ...state, removals }, root),
      /append-only/,
    );
    assert.equal(await readFile(file, "utf8"), before);
  }
  await writeFile(`${file}.lock`, "Another acceptance owns this write", {
    flag: "wx",
  });
  await assert.rejects(
    writePrivateState(file, { ...state, removals: [removal] }, root),
    { code: "EEXIST" },
  );
  assert.equal(await readFile(file, "utf8"), before);
  await rm(`${file}.lock`);
  await writePrivateState(file, { ...state, removals: [removal] }, root);
  for (const invalid of [
    { ...removal, reason: " " },
    { ...removal, sha256: "stale" },
    { ...removal, acceptedAt: "yesterday" },
  ]) {
    await writeFile(file, JSON.stringify({ ...state, removals: [invalid] }));
    await assert.rejects(readSourceState(file));
  }
});

test("source CLI requires initialization, exact decisions, removed-source review and current public evidence", async (context) => {
  const { directory, root, state } = await fixture(context);
  const { repository, ledger, coverageDigest } = await publicFixture(directory);
  const snapshot = path.join(directory, "private-state.json");
  const decisionFile = path.join(directory, "decisions.json");
  const decisions = {
    reviewedBy: "Independent fixture",
    entries: state.entries.map((entry) => ({
      ...entry,
      disposition: {
        kind: "covered",
        topicIds: ["T01"],
        coverageDigest,
        reason: "Reviewed fixture mapping",
      },
    })),
    removed: [],
  };
  await writeFile(decisionFile, JSON.stringify(decisions));
  const cli = sourceCli(repository, root, snapshot);
  assert.equal(cli("scan").status, 1);
  assert.match(
    cli("accept", "--decisions", decisionFile).stderr,
    /requires --initialize/,
  );
  assert.equal(await readSourceState(snapshot), undefined);
  const accepted = cli("accept", "--decisions", decisionFile, "--initialize");
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(cli("scan").status, 0);
  const before = await readFile(snapshot, "utf8");
  await writeFile(path.join(root, "proof.tex"), "Changed fixture bytes");
  assert.equal(cli("scan").status, 1);
  assert.match(
    cli("accept", "--decisions", decisionFile).stderr,
    /exact current bytes/,
  );
  assert.equal(await readFile(snapshot, "utf8"), before);
  await rm(path.join(root, "proof.tex"));
  await writeFile(path.join(root, "replacement.tex"), "Replacement fixture");
  decisions.entries = (await scanSourceRoot(root)).entries.map((entry) => ({
    ...entry,
    disposition: decisions.entries[0].disposition,
  }));
  await writeFile(decisionFile, JSON.stringify(decisions));
  assert.match(
    cli("accept", "--decisions", decisionFile).stderr,
    /removed source needs a reviewed disposition/,
  );
  decisions.removed.push({
    ...state.entries[0],
    reason: "Replacement fixture was reviewed",
  });
  await writeFile(decisionFile, JSON.stringify(decisions));
  const replacement = cli("accept", "--decisions", decisionFile);
  assert.equal(replacement.status, 0, replacement.stderr);
  decisions.removed = [];
  await writeFile(decisionFile, JSON.stringify(decisions));
  ledger.topics[0].objectives.push("An unreviewed new public claim");
  await writeFile(
    path.join(repository, "lib/algebra/ureca-topics.json"),
    JSON.stringify(ledger),
  );
  const stale = cli("scan");
  assert.equal(stale.status, 1);
  assert.match(stale.stdout, /public-coverage-unverified/);
  assert.match(stale.stdout, /public-coverage-changed/);
  assert.match(
    cli("accept", "--decisions", decisionFile).stderr,
    /current independent review/,
  );
});

test("snapshot and removal UTC timestamps preserve minute and fractional bytes", () => {
  const state = {
    schemaVersion: 1,
    root: "Synthetic fixture",
    reviewedBy: "Fixture",
    acceptedAt: "2026-10-25T00:00Z",
    entries: [],
  };
  const removal = {
    path: "old.tex",
    sha256: "a".repeat(64),
    reason: "Fixture",
    reviewedBy: "Fixture",
    acceptedAt: state.acceptedAt,
  };
  assert.deepEqual(sourceStateSchema.parse(state).removals, []);
  for (const acceptedAt of [
    "0000-02-29T00:00Z",
    "2000-02-29T23:59:59Z",
    `2024-02-29T12:34:56.${"1".repeat(128)}Z`,
  ]) {
    const parsed = sourceStateSchema.parse({
      ...state,
      acceptedAt,
      removals: [{ ...removal, acceptedAt }],
    });
    assert.equal(parsed.acceptedAt, acceptedAt);
    assert.equal(parsed.removals[0].acceptedAt, acceptedAt);
  }
  for (const acceptedAt of [
    "1900-02-29T00:00Z",
    "2024-02-30T00:00Z",
    "2024-02-29T24:00Z",
    "2024-02-29T00:00+00:00",
    "2024-02-29T00:00Z\n",
  ]) {
    assert.equal(
      sourceStateSchema.safeParse({ ...state, acceptedAt }).success,
      false,
    );
    assert.equal(
      sourceStateSchema.safeParse({
        ...state,
        removals: [{ ...removal, acceptedAt }],
      }).success,
      false,
    );
  }
});
