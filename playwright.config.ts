import { defineConfig } from "@playwright/test";

const externalOrigin = process.env.ALGEBRA_TEST_ORIGIN;
const builtWorker = process.env.ALGEBRA_BUILT_WORKER === "1";
const localOrigin = builtWorker
  ? "http://127.0.0.1:5176"
  : "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: process.env.ALGEBRA_EVIDENCE_DIR ?? "./outputs/playwright",
  metadata: {
    revision: process.env.ALGEBRA_AUDIT_REVISION ?? "working-tree",
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
        command: builtWorker
          ? "node node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --port 5176 --local --ip 127.0.0.1 --inspector-port 0"
          : "npx vite --host 127.0.0.1 --port 5173 --strictPort",
        url: localOrigin,
        reuseExistingServer: !builtWorker && !process.env.CI,
        timeout: 60000,
      },
});
