import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  compareSourceState,
  readSourceState,
  resolvePrivateStatePath,
  scanSourceRoot,
  sourceStateSchema,
  writePrivateState,
} from "./lib/ureca-source-scan.mjs";
import {
  checkReviewReports,
  checkUrecaCoverage,
  ledgerDigest,
} from "./lib/ureca-coverage.mjs";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    root: { type: "string" },
    state: { type: "string" },
    decisions: { type: "string" },
    initialize: { type: "boolean", default: false },
  },
});
const [command = "scan"] = positionals;
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

async function currentCoverage() {
  const ledger = await readJson("lib/algebra/ureca-topics.json");
  const catalogue = {
    lessons: await readJson("lib/algebra/lessons.json"),
    guides: await readJson("lib/algebra/guided-lessons.json"),
    metadata: await readJson("lib/algebra/learning-metadata.json"),
    units: await readJson("lib/algebra/units.json"),
    capstones: await readJson("lib/algebra/capstone-assessments.json"),
  };
  const coverage = checkUrecaCoverage(ledger, catalogue, { release: true });
  coverage.errors.push(...(await checkReviewReports(ledger)));
  return {
    ledger,
    errors: coverage.errors,
    digest: ledgerDigest(ledger),
  };
}

function unboundCoveredEntries(entries, coverage) {
  const reviewedRequiredTopics = new Set(
    coverage.ledger.topics
      .filter(
        ({ classification, review }) =>
          classification === "required" && review.status === "reviewed",
      )
      .map(({ id }) => id),
  );
  return entries.filter(
    ({ disposition }) =>
      disposition.kind === "covered" &&
      (coverage.errors.length > 0 ||
        disposition.coverageDigest !== coverage.digest ||
        disposition.topicIds.some((id) => !reviewedRequiredTopics.has(id))),
  );
}

try {
  if (!values.root || !values.state)
    throw new Error("Provide explicit --root and private --state paths");
  const stateFile = await resolvePrivateStatePath(
    values.state,
    path.resolve("."),
  );
  const scan = await scanSourceRoot(values.root);
  const previous = await readSourceState(stateFile);
  const result = compareSourceState(scan, previous);
  if (command === "scan") {
    if (
      previous?.entries.some(
        ({ disposition }) => disposition.kind === "covered",
      )
    ) {
      const coverage = await currentCoverage();
      if (coverage.errors.length)
        result.errors.push({ kind: "public-coverage-unverified" });
      for (const entry of unboundCoveredEntries(previous.entries, coverage))
        result.errors.push({
          kind: "unbound-coverage-disposition",
          path: entry.path,
        });
      if (
        previous.entries.some(
          ({ disposition }) =>
            disposition.kind === "covered" &&
            disposition.coverageDigest !== coverage.digest,
        )
      )
        result.changes.push({ kind: "public-coverage-changed" });
      result.clean = !result.changes.length && !result.errors.length;
    }
    console.log(
      JSON.stringify({ files: scan.entries.length, ...result }, null, 2),
    );
    if (!result.clean) process.exitCode = 1;
  } else if (command === "accept") {
    if (!values.decisions) throw new Error("Provide reviewed --decisions JSON");
    if (!previous && !values.initialize)
      throw new Error("A first acceptance requires --initialize");
    if (previous && values.initialize)
      throw new Error("Existing state cannot be reinitialized");
    if (scan.errors.length)
      throw new Error("Resolve all source scan errors first");
    const decisions = await readJson(values.decisions);
    const acceptedAt = new Date().toISOString();
    const removedDecisions = decisions.removed ?? [];
    if (!Array.isArray(removedDecisions))
      throw new Error("Removed decisions must be an array");
    const state = sourceStateSchema.parse({
      schemaVersion: 1,
      root: scan.root,
      reviewedBy: decisions.reviewedBy,
      acceptedAt,
      entries: decisions.entries,
      removals: [
        ...(previous?.removals ?? []),
        ...removedDecisions.map(({ path, sha256, reason }) => ({
          path,
          sha256,
          reason,
          reviewedBy: decisions.reviewedBy,
          acceptedAt,
        })),
      ],
    });
    const matches = compareSourceState(scan, state);
    if (!matches.clean)
      throw new Error(
        "Decisions must cover the exact current bytes and every source",
      );
    const removedChanges = result.changes.filter(
      ({ kind }) => kind === "removed",
    );
    for (const change of removedChanges) {
      const removed = previous.entries.find(({ path }) => path === change.path);
      if (
        !removedDecisions.some(
          (decision) =>
            decision.path === removed.path &&
            decision.sha256 === removed.sha256,
        )
      )
        throw new Error(
          `A removed source needs a reviewed disposition: ${change.path}`,
        );
    }
    if (
      removedDecisions.length !== removedChanges.length ||
      new Set(removedDecisions.map(({ path }) => path)).size !==
        removedDecisions.length
    )
      throw new Error("Removal decisions must match current removed sources");
    const coverage = await currentCoverage();
    if (coverage.errors.length)
      throw new Error(
        "Public coverage needs current independent review before source acceptance",
      );
    const coverageDigest = coverage.digest;
    const unbound = unboundCoveredEntries(state.entries, coverage);
    if (unbound.length)
      throw new Error(`Unbound coverage disposition: ${unbound[0].path}`);
    if (!compareSourceState(await scanSourceRoot(values.root), state).clean)
      throw new Error(
        "Sources changed during acceptance; review the current bytes again",
      );
    await writePrivateState(stateFile, state, path.resolve("."));
    console.log(
      JSON.stringify({ accepted: state.entries.length, coverageDigest }),
    );
  } else {
    throw new Error("Use scan or accept");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
