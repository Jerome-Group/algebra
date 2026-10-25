import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import prettier from "prettier";
import { checkPublicMath } from "../../scripts/lib/public-math-v2.mjs";
import {
  captureSource,
  savedEvidenceFile,
} from "../../scripts/lib/public-math-v2/source.mjs";
import { validateRegistrationSource } from "../../scripts/lib/public-math-v2/fixtures.mjs";
import {
  executionSnapshot,
  outputManifest,
  validateExecution,
} from "../../scripts/lib/public-math-v2/execution.mjs";
import {
  publicFiles,
  readCatalogue,
  compileManifest,
  generateModule,
  sha256,
} from "../../scripts/lib/math-presentation.mjs";
import { reviewFile, reviewBindings } from "../../scripts/lib/math-review.mjs";
import {
  hashValue,
  canonical,
} from "../../scripts/lib/public-math/identity.mjs";

export const put = async (root, file, value) => {
  await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await fs.writeFile(
    path.join(root, file),
    typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
  );
};
export async function sourceRef(root, file, predicate) {
  const bytes = await fs.readFile(path.join(root, file));
  const text = bytes.toString();
  let start = 0,
    end = text.length;
  if (predicate) {
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    let found;
    const visit = (node) => {
      if (!found && predicate(node)) found = node;
      ts.forEachChild(node, visit);
    };
    visit(source);
    assert(found);
    start = found.getStart(source);
    end = found.end;
  }
  return {
    file,
    sha256: sha256(bytes),
    start,
    end,
    nodeSha256: sha256(text.slice(start, end)),
  };
}
export async function syntheticSource(t) {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "math-v2-execution-SYNTHETIC-"),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await put(root, "package.json", {
    type: "module",
    dependencies: {},
    devDependencies: {},
  });
  await put(root, "package-lock.json", {
    lockfileVersion: 3,
    packages: { "": { dependencies: {}, devDependencies: {} } },
  });
  await put(root, "tsconfig.json", {
    compilerOptions: {
      jsx: "react-jsx",
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
    },
  });
  for (const file of publicFiles)
    await put(
      root,
      file,
      file === publicFiles[0] ? [{ title: "A group" }] : {},
    );
  const catalogue = await readCatalogue(root),
    manifest = {
      version: 1,
      sources: Object.fromEntries(
        publicFiles.map((file) => [file, catalogue.sources[file].hash]),
      ),
      annotations: [],
    };
  await put(root, "lib/algebra/math-presentation/annotations.json", manifest);
  const coreReport =
    "SYNTHETIC NON-APPLICATION CORE REPORT. No real review, execution or release.\n";
  await put(root, "docs/research/synthetic-core.md", coreReport);
  await put(root, reviewFile, {
    version: 1,
    status: "reviewed",
    ...reviewBindings(catalogue, manifest),
    reports: [
      { path: "docs/research/synthetic-core.md", sha256: sha256(coreReport) },
    ],
  });
  await put(
    root,
    "lib/algebra/math-presentation.generated.ts",
    await prettier.format(
      generateModule(compileManifest(catalogue, manifest)),
      { parser: "typescript" },
    ),
  );
  await put(
    root,
    "app/page.tsx",
    'import data from "../lib/algebra/lessons.json";export default()=> <p data-synthetic-region>{"Twelve."}</p>;',
  );
  await put(
    root,
    "tests/browser/synthetic.spec.mjs",
    'import {test} from "@playwright/test";test("observes",async()=>{});',
  );
  const fixture = {
    runner: "playwright",
    case: "observes",
    titlePath: ["observes"],
    source: await sourceRef(root, "tests/browser/synthetic.spec.mjs", (node) =>
      ts.isCallExpression(node),
    ),
    parameters: {},
    project: "synthetic",
    repeat: 0,
    closure: [],
  };
  const capture = await captureSource(root),
    receipts = [];
  const producer = await sourceRef(
    root,
    "app/page.tsx",
    (node) => ts.isStringLiteral(node) && node.text === "Twelve.",
  );
  const consumer = await sourceRef(root, "app/page.tsx", ts.isJsxElement);
  for (const unit of capture.plan.units) {
    const ports =
      unit.id === "app/page.tsx"
        ? [
            {
              id: "synthetic-prose",
              kind: "visible-content",
              producer,
              consumer,
              transforms: [],
              renderer: "raw",
              role: "ordinary-prose",
              presentation: {
                region: "[data-synthetic-region]",
                inputs: [],
                resources: ["app/page.tsx"],
              },
              output: {
                kind: "static",
                expected: {
                  raw: "Twelve.",
                  segments: [{ kind: "prose", text: "Twelve." }],
                },
                fixture,
              },
            },
          ]
        : [];
    const intent = {
      version: "public-math-local-v2",
      file: unit.file,
      reachable: unit.reachable,
      contractDigest: capture.plan.contractDigest,
      navigationDigest: unit.navigationDigest,
      graphProjectionDigest: unit.graphProjectionDigest,
      dependencies: unit.dependencyFloor,
      coverage:
        "complete-file-all-public-branches-producers-consumers-and-implicit-effects",
      ordinaryProse: "independently-reviewed",
      authority: "independent-semantic-attestation",
      ports,
      effects: [],
    };
    const intentDigest = hashValue(intent),
      reviewer = "SYNTHETIC fixture only",
      file = `docs/research/public-math-v2/${unit.id.replaceAll("/", "-")}.md`;
    const body = `public-math-report-v2\n${canonical({ intentDigest, reviewer, coverage: intent.coverage, ownedFile: intent.file, dependencyDigest: hashValue(intent.dependencies), authority: intent.authority })}\n\nSYNTHETIC NON-APPLICATION ATTESTATION. This boundary fixture does not review or approve any real application.\n`;
    await put(root, file, body);
    receipts.push({
      intent,
      intentDigest,
      report: { file, sha256: sha256(body), reviewer },
    });
  }
  await put(root, savedEvidenceFile, {
    version: "public-math-local-evidence-v2",
    receipts,
  });
  const accepted = await checkPublicMath({
    root,
    require: "source-attestation",
  });
  assert.equal(accepted.kind, "source-reviewed", JSON.stringify(accepted));
  return { root, capture, accepted, fixture, receipts };
}
export async function syntheticExecution(t) {
  const data = await syntheticSource(t),
    { root, accepted, fixture } = data;
  const snapshot = await executionSnapshot(root);
  await put(root, "dist/build-identity.json", snapshot.identity);
  await put(
    root,
    "dist/client/assets/synthetic.js",
    "SYNTHETIC PUBLIC STATIC BYTES",
  );
  await put(root, "dist/client/assets/synthetic.css", "p{color:#123}");
  await put(root, "dist/client/assets/synthetic.woff2", "SYNTHETIC FONT BYTES");
  const clientManifest = {
    "app/page.tsx": {
      file: "assets/synthetic.js",
      src: "app/page.tsx",
      isEntry: true,
      css: ["assets/synthetic.css"],
      assets: ["assets/synthetic.woff2"],
    },
  };
  await put(root, "dist/client/.vite/manifest.json", clientManifest);
  const manifest = await outputManifest(root);
  const build = {
    version: "public-math-build-v2",
    sourceAcceptanceDigest: accepted.acceptanceDigest,
    before: snapshot,
    after: snapshot,
    identity: snapshot.identity,
    command: [
      process.execPath,
      path.join(root, "node_modules/vinext/dist/cli.js"),
      "build",
    ],
    runtime: process.version,
    exitCode: 0,
    manifest,
    manifestDigest: hashValue(manifest),
    clientManifest,
    excluded: "public-math-build.json",
  };
  const runId = randomUUID(),
    invocation = randomUUID(),
    ownerRun = randomUUID(),
    id = `${invocation}:playwright:synthetic-actual-id`,
    position = validateRegistrationSource(
      fixture,
      await fs.readFile(path.join(root, fixture.source.file), "utf8"),
    );
  const target = {
    root,
    origin: "http://127.0.0.1:5888",
    ownerFile: `outputs/public-math-runs/${runId}/server/owner.json`,
    ownerSha256: "1".repeat(64),
    runId: ownerRun,
    pid: 1234,
    processIdentity: "SYNTHETIC recorder process",
    kind: "built",
    acknowledgedRunId: ownerRun,
    identity: snapshot.identity,
    sourceMatch: "matched",
    dependencyMatch: "matched",
  };
  const requirement = accepted.sourceAcceptance.observations[0];
  const resource = manifest.find(
    ({ file }) => file === "client/assets/synthetic.js",
  );
  const run = {
    version: "public-math-run-v2",
    runId,
    invocation,
    runner: "playwright",
    runtime: "1.63.0",
    argv: ["SYNTHETIC boundary fixture"],
    sourceAcceptanceDigest: accepted.acceptanceDigest,
    buildEvidenceDigest: "2".repeat(64),
    snapshot,
    snapshotAfter: snapshot,
    selection: { shard: null, filtered: false },
    registrations: [
      {
        id,
        parentId: null,
        file: fixture.source.file,
        ...position,
        titlePath: fixture.titlePath,
        rawTitlePath: ["", "synthetic", "synthetic.spec.mjs", "observes"],
        project: fixture.project,
        repeat: 0,
        sourceSha256: fixture.source.sha256,
      },
    ],
    attempts: [
      {
        id,
        retry: 0,
        status: "passed",
        expectedStatus: "passed",
        skip: false,
        todo: false,
        errors: [],
      },
    ],
    observations: [
      {
        id: requirement.id,
        caseId: id,
        kind: "content",
        inputs: {},
        producer: requirement.producer,
        region: {
          selector: requirement.presentation.region,
          count: 1,
          visible: true,
          mode: "rendered",
          route: "#synthetic",
          viewport: { width: 800, height: 600 },
        },
        controls: [],
        segments: requirement.expected.segments,
      },
    ],
    resources: [
      {
        caseId: id,
        file: resource.file,
        url: "http://127.0.0.1:5888/assets/synthetic.js",
        status: 200,
        sha256: resource.sha256,
        bytes: resource.bytes,
      },
    ],
    targetBefore: target,
    targetAfter: structuredClone(target),
    exitCode: 0,
    interrupted: false,
    recorderErrors: [],
  };
  const index = {
    version: "public-math-execution-v2",
    runId,
    sourceAcceptanceDigest: accepted.acceptanceDigest,
    build: { file: "dist/public-math-build.json", sha256: "2".repeat(64) },
    runs: [
      {
        file: `outputs/public-math-runs/${runId}/run.json`,
        sha256: "3".repeat(64),
      },
    ],
    cleanup: [
      {
        runId: ownerRun,
        owner: {
          file: `outputs/public-math-runs/${runId}/cleanup.json`,
          sha256: "4".repeat(64),
        },
        stopped: true,
        portClosed: true,
      },
    ],
  };
  return { ...data, build, run, index };
}
export const validate = (data, run = data.run, index = data.index) =>
  validateExecution(
    data.capture,
    data.accepted.sourceAcceptance,
    data.accepted.acceptanceDigest,
    index,
    [run],
    data.build,
  );
