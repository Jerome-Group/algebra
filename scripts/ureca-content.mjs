import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { integrateProposals } from "./lib/ureca-proposals.mjs";
import {
  checkReviewReports,
  checkUrecaCoverage,
  ledgerDigest,
  topicDigest,
} from "./lib/ureca-coverage.mjs";

const files = {
  lessons: "lessons.json",
  guides: "guided-lessons.json",
  metadata: "learning-metadata.json",
  units: "units.json",
  capstones: "capstone-assessments.json",
};
const directory = path.resolve("lib/algebra");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const catalogue = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(async ([key, file]) => [
      key,
      await readJson(path.join(directory, file)),
    ]),
  ),
);
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    proposal: { type: "string", multiple: true },
    release: { type: "boolean", default: false },
    topic: { type: "string" },
  },
});
const [command = "check"] = positionals;

try {
  if (command === "import") {
    if (!values.proposal?.length) throw new Error("Provide --proposal paths");
    const proposals = await Promise.all(values.proposal.map(readJson));
    const result = integrateProposals(catalogue, proposals);
    for (const [key, file] of Object.entries(files))
      await writeFile(
        path.join(directory, file),
        `${JSON.stringify(result[key], null, 2)}\n`,
      );
    console.log(
      JSON.stringify({
        lessons: result.lessons.length,
        units: result.units.length,
      }),
    );
  } else if (command === "check" || command === "review-digest") {
    const ledger = await readJson(path.join(directory, "ureca-topics.json"));
    const result = checkUrecaCoverage(ledger, catalogue, {
      release: values.release,
    });
    if (command === "review-digest") {
      const topic = ledger.topics.find(({ id }) => id === values.topic);
      if (!topic) throw new Error("Provide a known --topic ID");
      console.log(topicDigest(topic, catalogue, ledger.exerciseMethods));
    } else {
      result.errors.push(...(await checkReviewReports(ledger)));
      console.log(
        JSON.stringify(
          { ...result, coverageDigest: ledgerDigest(ledger) },
          null,
          2,
        ),
      );
      if (result.errors.length) process.exitCode = 1;
    }
  } else {
    throw new Error("Use check, import, or review-digest");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
