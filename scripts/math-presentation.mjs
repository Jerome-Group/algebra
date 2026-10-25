import {
  readFile,
  readdir,
  writeFile,
  mkdir,
  stat,
  lstat,
  realpath,
  mkdtemp,
  rename,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import prettier from "prettier";
import {
  publicFiles,
  readCatalogue,
  compileManifest,
  catalogueQueue,
  generateModule,
} from "./lib/math-presentation.mjs";
import {
  reviewFile,
  readReview,
  verifyCompleteReview,
} from "./lib/math-review.mjs";
import { planPublicMath, checkPublicMath } from "./lib/public-math-v2.mjs";
import { assertPlanOutputTarget } from "./lib/public-math-v2/source.mjs";
import { publicReviewFile } from "./lib/public-math/policy.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    ...Object.fromEntries(
      ["root", "manifest", "output", "report", "require"].map((name) => [
        name,
        { type: "string" },
      ]),
    ),
    complete: { type: "boolean", default: false },
    "all-ui": { type: "boolean", default: false },
  },
});
const root = path.resolve(
  values.root ?? fileURLToPath(new URL("../", import.meta.url)),
);
const acceptedManifestPath = path.resolve(
  root,
  "lib/algebra/math-presentation/annotations.json",
);
const manifestPath = path.resolve(
  root,
  values.manifest ?? acceptedManifestPath,
);
const generatedPath = path.resolve(
  root,
  "lib/algebra/math-presentation.generated.ts",
);
const command = positionals[0];
let review;
let report;
let catalogue;
let publicInventory;

async function existingPath(file) {
  try {
    return await realpath(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return path.join(
      await existingPath(path.dirname(file)),
      path.basename(file),
    );
  }
}

async function describeFile(file) {
  const requested = path.resolve(root, file);
  const identity = await stat(requested).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  return { requested, path: await existingPath(requested), identity };
}

const sameFile = (left, right) =>
  left.path === right.path ||
  (left.identity &&
    right.identity &&
    left.identity.dev === right.identity.dev &&
    left.identity.ino === right.identity.ino);

async function outputTarget(file, allowGenerated = false) {
  if (values["all-ui"]) await assertPlanOutputTarget(root, file);
  const target = await describeFile(file);
  const symbolic = await lstat(target.requested).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  if (symbolic?.isSymbolicLink())
    throw new Error("Refusing to overwrite an output symlink");
  const researchRoot = await existingPath(path.resolve(root, "docs/research"));
  if (
    target.path === researchRoot ||
    target.path.startsWith(researchRoot + path.sep)
  )
    throw new Error("Refusing to overwrite a reserved research report");
  const researchEntries = await readdir(researchRoot, {
    recursive: true,
  }).catch((error) => {
    if (error.code !== "ENOENT") throw error;
    return [];
  });
  const protectedFiles = [
    ...researchEntries.map((file) => path.join(researchRoot, file)),
    ...publicFiles,
    manifestPath,
    acceptedManifestPath,
    reviewFile,
    publicReviewFile,
    ...(review?.reports.map(({ path }) => path) ?? []),
    ...(allowGenerated ? [] : [generatedPath]),
  ];
  for (const file of protectedFiles)
    if (sameFile(target, await describeFile(file)))
      throw new Error(
        "Refusing to overwrite canonical source, accepted annotations, review attestation, review report or reserved generated output",
      );
  return target;
}

async function writeOutput(target, text) {
  if (values["all-ui"]) await assertPlanOutputTarget(root, target.requested);
  await mkdir(path.dirname(target.path), { recursive: true });
  const staging = await mkdtemp(
    path.join(path.dirname(target.path), ".math-presentation-"),
  );
  try {
    const file = path.join(staging, "output");
    await writeFile(file, text, { flag: "wx" });
    await rename(file, target.path);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

try {
  const output =
    command === "check"
      ? await describeFile(values.output ?? generatedPath)
      : command === "build" || values.output
        ? await outputTarget(
            values.output ?? generatedPath,
            command === "build",
          )
        : null;
  const reportTarget = values.report ? await outputTarget(values.report) : null;
  if (output && reportTarget && sameFile(output, reportTarget))
    throw new Error("Output and report destinations must be distinct");
  report = reportTarget;
  if (
    positionals.length !== 1 ||
    !["queue", "check", "build"].includes(command) ||
    (values.complete && command !== "check") ||
    (values.require &&
      (!values["all-ui"] ||
        command !== "check" ||
        !values.complete ||
        !["source-attestation", "executed-presentation"].includes(
          values.require,
        ))) ||
    (values["all-ui"] &&
      (command === "build" || (command === "check" && !values.complete)))
  )
    throw new Error(
      "Usage: node scripts/math-presentation.mjs queue|check|build [--root DIR] [--manifest FILE] [--output FILE] [--report FILE] [check --complete [--all-ui]] [queue --all-ui]",
    );
  review = await readReview(root);
  if (values["all-ui"] && command === "queue") {
    publicInventory = await planPublicMath({ root });
    const queue = publicInventory;
    const json = JSON.stringify(queue, null, 2) + "\n";
    if (output) await writeOutput(output, json);
    else process.stdout.write(json);
    if (report)
      await writeOutput(
        report,
        JSON.stringify(
          {
            command,
            status: "unresolved",
            sourceDigest: queue.sourceSetDigest,
            contractDigest: queue.contractDigest,
            syntacticCandidates: queue.units.length,
            unreviewedFiles: queue.pending.length,
            blockers: queue.structuralRefusals,
            semanticReview: queue.status,
            renderedProof: "unverified",
          },
          null,
          2,
        ) + "\n",
      );
    if (output)
      process.stdout.write(
        JSON.stringify({
          command,
          scope: "all-ui",
          semanticReview: queue.status,
          unresolvedCandidates: queue.units.length,
          unreviewedFiles: queue.pending.length,
          blockers: queue.structuralRefusals.length,
        }) + "\n",
      );
  } else {
    if (values.complete) {
      if (
        !sameFile(
          await describeFile(manifestPath),
          await describeFile(acceptedManifestPath),
        )
      )
        throw new Error(
          "Complete check requires the accepted annotations manifest",
        );
      if (!sameFile(output, await describeFile(generatedPath)))
        throw new Error(
          "Complete check requires the reserved generated module",
        );
    }
    catalogue = await readCatalogue(root);
    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch (error) {
      if (command !== "queue" || error.code !== "ENOENT") throw error;
    }
    const compiled = manifest && compileManifest(catalogue, manifest);
    const generatedSource =
      compiled &&
      (await prettier.format(generateModule(compiled), {
        parser: "typescript",
      }));
    const completeness = values.complete
      ? await verifyCompleteReview({
          root,
          catalogue,
          manifest,
          compiled,
          review,
        })
      : null;
    const publicCompleteness = values["all-ui"]
      ? await checkPublicMath({
          root,
          require: values.require ?? "source-attestation",
        })
      : null;
    if (publicCompleteness && !publicCompleteness.satisfiesRequirement)
      throw new Error(
        `Public mathematics requirement refused: ${JSON.stringify(publicCompleteness)}`,
      );
    const current = await readCatalogue(root);
    for (const file of publicFiles)
      if (current.sources[file].hash !== catalogue.sources[file].hash)
        throw new Error(`Concurrent source drift in ${file}`);
    if (command === "queue") {
      const json =
        JSON.stringify(catalogueQueue(catalogue, compiled), null, 2) + "\n";
      if (output) await writeOutput(output, json);
      else process.stdout.write(json);
    } else if (command === "build") {
      await writeOutput(output, generatedSource);
    } else {
      const actual = await readFile(output.path, "utf8");
      if (actual !== generatedSource)
        throw new Error(
          "Generated math presentation is stale. Run the build command.",
        );
    }
    if (report)
      await writeOutput(
        report,
        JSON.stringify(
          {
            command,
            status: "passed",
            sources: compiled?.sources ?? catalogueQueue(catalogue).sources,
            records: compiled?.records ?? [],
            eligibleStrings: catalogue.entries.length,
            mappedStrings: compiled?.mappings.length ?? 0,
            partial: !completeness,
            reviewedCompleteness: completeness,
            publicCompleteness,
          },
          null,
          2,
        ) + "\n",
      );
    if (command !== "queue" || values.output)
      process.stdout.write(
        JSON.stringify({
          command,
          eligibleStrings: catalogue.entries.length,
          mappedStrings: compiled?.mappings.length ?? 0,
          partial: !completeness,
          reviewedCompleteness: completeness,
          publicCompleteness,
        }) + "\n",
      );
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
  if (report)
    try {
      await writeOutput(
        report,
        JSON.stringify(
          {
            command,
            status: "failed",
            scope: values["all-ui"] ? "all-ui" : "core",
            sources: catalogue ? catalogueQueue(catalogue).sources : null,
            publicSourceDigest: publicInventory?.sourceSetDigest,
            publicSources: publicInventory?.files,
            partial: true,
            reviewedCompleteness: null,
            error: error.message,
          },
          null,
          2,
        ) + "\n",
      );
    } catch (reportError) {
      process.stderr.write(
        `Could not write failure report: ${reportError.message}\n`,
      );
    }
}
