import { defineConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loopback, readOwner } from "./scripts/algebra-runtime.mjs";

const externalOrigin = process.env.ALGEBRA_TEST_ORIGIN;
const builtWorker = process.env.ALGEBRA_BUILT_WORKER === "1";
const port = Number(
  process.env.ALGEBRA_TEST_PORT ?? (builtWorker ? 5176 : 5173),
);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error(
    "ALGEBRA_TEST_PORT must be an integer between 1024 and 65535",
  );
const root = fileURLToPath(new URL("./", import.meta.url));
const localOrigin = `http://127.0.0.1:${port}`;
const runId = randomUUID();
const evidence =
  process.env.ALGEBRA_RUN_EVIDENCE ||
  path.resolve(
    process.env.ALGEBRA_EVIDENCE_DIR ?? "outputs/playwright",
    `run-${runId}`,
  );
const ownerFile =
  process.env.ALGEBRA_LOCAL_OWNER ||
  path.join(evidence, "server", "owner.json");
process.env.ALGEBRA_EVIDENCE_DIR = evidence;
process.env.ALGEBRA_RUN_EVIDENCE = evidence;
if (externalOrigin && loopback(externalOrigin))
  readOwner(ownerFile, root, externalOrigin);
if (!externalOrigin) process.env.ALGEBRA_LOCAL_OWNER = ownerFile;
const fixture = externalOrigin
  ? loopback(externalOrigin) &&
    Boolean(process.env.ALGEBRA_LOCAL_OWNER) &&
    readOwner(ownerFile, root, externalOrigin).accountFixture
  : builtWorker &&
    JSON.parse(fs.readFileSync(path.join(root, ".openai/hosting.json"), "utf8"))
      .d1 === "DB" &&
    fs.existsSync(path.join(root, "scripts/account-migrations.mjs"));
process.env.ALGEBRA_ACCOUNT_FIXTURE = fixture ? "1" : "0";
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.spec.mjs",
  globalSetup: "./scripts/algebra-playwright-setup.mjs",
  outputDir: path.join(evidence, "tests"),
  reporter: [
    ["list"],
    ...(process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR
      ? [["./scripts/public-math-playwright-reporter.mjs"] satisfies [string]]
      : []),
    [
      "json",
      {
        outputFile:
          process.env.ALGEBRA_REPORT_FILE ?? path.join(evidence, "report.json"),
      },
    ],
  ],
  metadata: {
    revision: process.env.ALGEBRA_AUDIT_REVISION ?? "working-tree",
    sourceMatch: process.env.ALGEBRA_AUDIT_SOURCE_MATCH ?? "unknown",
    observedSourceDigest: process.env.ALGEBRA_AUDIT_SOURCE_DIGEST ?? "unknown",
    accountCoverage: fixture
      ? "isolated local D1 fixture; hosted provider unverified"
      : "guest; account fixture cases unavailable",
    serverKind:
      process.env.ALGEBRA_AUDIT_KIND ??
      (externalOrigin
        ? "external application"
        : builtWorker
          ? "production Worker"
          : "development Vite"),
  },
  timeout: 60000,
  workers: 2,
  use: {
    baseURL: externalOrigin ?? localOrigin,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: externalOrigin
    ? undefined
    : {
        command: [
          process.execPath,
          path.join(root, "scripts/algebra-server.mjs"),
          ownerFile,
          String(port),
          builtWorker ? "built" : "development",
          runId,
        ]
          .map(quote)
          .join(" "),
        url: `${localOrigin}/api/build?owner=${runId}`,
        reuseExistingServer: false,
        gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
        timeout: 60000,
      },
});
