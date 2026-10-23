import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  link,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  publicFiles,
  readCatalogue,
  sha256,
} from "../scripts/lib/math-presentation.mjs";
import { reviewFile } from "../scripts/lib/math-review.mjs";

const run = promisify(execFile);
const cli = fileURLToPath(
  new URL("../scripts/math-presentation.mjs", import.meta.url),
);
const annotationsFile = "lib/algebra/math-presentation/annotations.json";
const generatedFile = "lib/algebra/math-presentation.generated.ts";
const reportFile = "docs/research/fixture-review.md";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "algebra-math-review-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const write = async (file, contents) => {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), contents);
  };
  const json = (file, value) =>
    write(file, JSON.stringify(value, null, 2) + "\n");
  const sources = {
    [publicFiles[0]]: [
      {
        id: "a",
        title: "G1",
        definition: String.raw`\begin{aligned}a&=b\\[2pt]c&=d\end{aligned}`,
        intuition: "Use $x^2$ and \\(y\\).",
      },
      { id: "b", title: "G1" },
    ],
    [publicFiles[1]]: { a: { objects: "A group G" } },
    [publicFiles[2]]: [
      { id: "unit", title: "Read this", description: "Display \\[x+1\\]." },
    ],
    [publicFiles[3]]: {
      a: {
        kind: "choice",
        question: "Choose $x$.",
        choices: ["yes", "no"],
        explanation: "Because $$x=x$$.",
      },
    },
  };
  for (const file of publicFiles) await json(file, sources[file]);
  const command = (action, ...args) =>
    run(process.execPath, [cli, action, "--root", root, ...args]);
  const manifest = {
    version: 1,
    sources: {},
    annotations: [
      {
        source: { file: publicFiles[0], pointer: "/0/title" },
        spans: [{ start: 0, end: 2, raw: "G1", tex: "G_1" }],
      },
    ],
  };
  await write(
    reportFile,
    "Independent fixture review covers all source strings and occurrences.\n",
  );
  let catalogue;
  let review;
  const refresh = async () => {
    for (const file of publicFiles) await json(file, sources[file]);
    catalogue = await readCatalogue(root);
    manifest.sources = Object.fromEntries(
      publicFiles.map((file) => [file, catalogue.sources[file].hash]),
    );
    await json(annotationsFile, manifest);
    await command("build");
    review = {
      version: 1,
      status: "reviewed",
      sources: { ...manifest.sources },
      annotationDigest: sha256(JSON.stringify(manifest)),
      queueDigest: sha256(JSON.stringify(catalogue.entries)),
      reviewedStrings: catalogue.entries.length,
      reviewedOccurrences: catalogue.entries.reduce(
        (sum, entry) => sum + entry.occurrences.length,
        0,
      ),
      reports: [
        {
          path: reportFile,
          sha256: sha256(await readFile(path.join(root, reportFile))),
        },
      ],
    };
    return review;
  };
  await refresh();
  return {
    root,
    write,
    json,
    command,
    manifest,
    sources,
    refresh,
    get catalogue() {
      return catalogue;
    },
    get review() {
      return review;
    },
  };
}

async function fails(command, pattern) {
  await assert.rejects(command, (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, pattern);
    return true;
  });
}

test("complete check requires reviewed attestation while structural authoring remains partial", async (t) => {
  const f = await fixture(t);
  const structural = JSON.parse((await f.command("check")).stdout);
  assert.equal(structural.partial, true);
  await fails(
    f.command("check", "--complete"),
    /Missing reviewed-completeness attestation/,
  );
  await f.json(reviewFile, f.review);
  const result = JSON.parse(
    (await f.command("check", "--complete", "--report", "receipt.json")).stdout,
  );
  assert.equal(result.partial, false);
  assert.equal(result.mappedStrings, 1);
  assert.equal(
    result.reviewedCompleteness.reviewedStrings,
    f.catalogue.entries.length,
  );
  assert.ok(result.reviewedCompleteness.reviewedStrings > result.mappedStrings);
  assert.equal(
    result.reviewedCompleteness.reviewedOccurrences,
    f.catalogue.entries.length + 1,
  );
  const receipt = JSON.parse(
    await readFile(path.join(f.root, "receipt.json"), "utf8"),
  );
  assert.equal(receipt.status, "passed");
  assert.deepEqual(receipt.reviewedCompleteness, result.reviewedCompleteness);
});

test("complete check rejects every stale binding and exact review count drift", async (t) => {
  const f = await fixture(t);
  const cases = [
    [
      "source",
      (review) => {
        review.sources[publicFiles[0]] = "0".repeat(64);
      },
      /Review source hash changed/,
    ],
    [
      "annotations",
      (review) => {
        review.annotationDigest = "0".repeat(64);
      },
      /Review annotationDigest/,
    ],
    [
      "queue",
      (review) => {
        review.queueDigest = "0".repeat(64);
      },
      /Review queueDigest/,
    ],
    [
      "undercounted strings",
      (review) => {
        review.reviewedStrings--;
      },
      /Review reviewedStrings/,
    ],
    [
      "overcounted strings",
      (review) => {
        review.reviewedStrings++;
      },
      /Review reviewedStrings/,
    ],
    [
      "occurrences",
      (review) => {
        review.reviewedOccurrences--;
      },
      /Review reviewedOccurrences/,
    ],
    [
      "report digest",
      (review) => {
        review.reports[0].sha256 = "0".repeat(64);
      },
      /Review report bytes changed/,
    ],
  ];
  for (const [name, change, pattern] of cases)
    await t.test(name, async () => {
      const review = structuredClone(f.review);
      change(review);
      await f.json(reviewFile, review);
      await fails(f.command("check", "--complete"), pattern);
    });
  await f.json(reviewFile, f.review);
  await f.write(reportFile, "Changed review bytes.\n");
  await fails(f.command("check", "--complete"), /Review report bytes changed/);
});

test("attestation schema rejects parse errors, unknown keys and unsafe or unbounded reports", async (t) => {
  const f = await fixture(t);
  const invalid = [
    { ...f.review, status: "pending" },
    { ...f.review, version: 2 },
    { ...f.review, approved: true },
    {
      ...f.review,
      sources: { ...f.review.sources, "private.json": "0".repeat(64) },
    },
    { ...f.review, reports: [] },
    {
      ...f.review,
      reports: Array.from({ length: 33 }, (_, index) => ({
        path: `docs/research/${index}.md`,
        sha256: "0".repeat(64),
      })),
    },
    { ...f.review, reports: [f.review.reports[0], f.review.reports[0]] },
    ...[
      "docs/research/../private.md",
      "docs/research/a/../../private.md",
      "docs/private/review.md",
      "/tmp/review.md",
      "https://example.com/review.md",
      "docs/research/review.json",
      "docs\\research\\review.md",
    ].map((file) => ({
      ...f.review,
      reports: [{ ...f.review.reports[0], path: file }],
    })),
  ];
  for (const value of invalid) {
    await f.json(reviewFile, value);
    await fails(
      f.command("check", "--complete"),
      /invalid|unrecognized|too_big|too_small|custom/i,
    );
  }
  await f.write(reviewFile, "{invalid json");
  await fails(f.command("check", "--complete"), /JSON/);
  await f.json(reviewFile, {
    ...f.review,
    reports: [{ ...f.review.reports[0], path: "docs/research/missing.md" }],
  });
  await fails(f.command("check", "--complete"), /ENOENT/);
  const outside = await mkdtemp(
    path.join(os.tmpdir(), "algebra-math-external-"),
  );
  t.after(() => rm(outside, { recursive: true, force: true }));
  await writeFile(path.join(outside, "review.md"), "External report.\n");
  await symlink(
    path.join(outside, "review.md"),
    path.join(f.root, "docs/research/external.md"),
  );
  await f.json(reviewFile, {
    ...f.review,
    reports: [
      {
        path: "docs/research/external.md",
        sha256: sha256("External report.\n"),
      },
    ],
  });
  await fails(f.command("check", "--complete"), /outside docs\/research/);
});

test("complete check validates existing delimiters and direct TeX while retaining row spacing", async (t) => {
  const f = await fixture(t);
  await f.json(reviewFile, f.review);
  await f.command("check", "--complete");
  for (const [field, value] of [
    ["intuition", "Malformed $\\unknowncommand$."],
    ["definition", "\\frac{"],
  ]) {
    const original = f.sources[publicFiles[0]][0][field];
    f.sources[publicFiles[0]][0][field] = value;
    await f.refresh();
    await f.json(reviewFile, f.review);
    await fails(
      f.command("check", "--complete"),
      new RegExp(`Invalid TeX at .*${field}`),
    );
    f.sources[publicFiles[0]][0][field] = original;
  }
  await f.refresh();
  await f.json(reviewFile, f.review);
  await f.command("check", "--complete");
});

test("complete check rejects stale generated output and replaces a previous passing receipt on failure", async (t) => {
  const f = await fixture(t);
  await f.json(reviewFile, f.review);
  await f.command("check", "--complete", "--report", "receipt.json");
  const generated = await readFile(path.join(f.root, generatedFile), "utf8");
  await f.write("alternate.ts", generated);
  await f.write(generatedFile, generated + " ");
  await fails(
    f.command("check", "--complete", "--report", "receipt.json"),
    /Generated math presentation is stale/,
  );
  const receipt = JSON.parse(
    await readFile(path.join(f.root, "receipt.json"), "utf8"),
  );
  assert.equal(receipt.status, "failed");
  assert.equal(receipt.partial, true);
  assert.equal(receipt.reviewedCompleteness, null);
  assert.deepEqual(receipt.sources, f.review.sources);
  await fails(
    f.command("check", "--complete", "--output", "alternate.ts"),
    /reserved generated module/,
  );
  await f.json("alternate-manifest.json", f.manifest);
  await fails(
    f.command("check", "--complete", "--manifest", "alternate-manifest.json"),
    /accepted annotations manifest/,
  );
});

test("CLI cannot overwrite attestation, accepted annotations or bound reports through aliases", async (t) => {
  const f = await fixture(t);
  await f.json(reviewFile, f.review);
  await f.json("custom-manifest.json", f.manifest);
  await symlink(
    path.join(f.root, reviewFile),
    path.join(f.root, "review-symlink.json"),
  );
  await link(
    path.join(f.root, reviewFile),
    path.join(f.root, "review-hardlink.json"),
  );
  await symlink(
    path.join(f.root, "lib/algebra/math-presentation"),
    path.join(f.root, "review-directory"),
  );
  await link(
    path.join(f.root, reportFile),
    path.join(f.root, "report-hardlink.md"),
  );
  const protectedFiles = [reviewFile, annotationsFile, reportFile];
  const bytes = await Promise.all(
    protectedFiles.map((file) => readFile(path.join(f.root, file), "utf8")),
  );
  for (const alias of [
    reviewFile,
    "review-symlink.json",
    "review-hardlink.json",
    "review-directory/review.json",
    annotationsFile,
    reportFile,
    "report-hardlink.md",
  ])
    for (const [action, option] of [
      ["build", "--output"],
      ["queue", "--output"],
      ["check", "--report"],
    ])
      await fails(
        f.command(action, "--manifest", "custom-manifest.json", option, alias),
        /Refusing to overwrite/,
      );
  for (const [index, file] of protectedFiles.entries())
    assert.equal(await readFile(path.join(f.root, file), "utf8"), bytes[index]);
});
