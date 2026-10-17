import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";
import { buildIdentity } from "./scripts/algebra-identity.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  ...(process.env.ALGEBRA_VERIFY_RUN_ID
    ? { vars: { ALGEBRA_VERIFY_RUN_ID: process.env.ALGEBRA_VERIFY_RUN_ID } }
    : {}),
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  const identity = buildIdentity(process.cwd());
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    define: { __ALGEBRA_BUILD_IDENTITY__: JSON.stringify(identity) },
    cacheDir: ".wrangler/vite-cache",
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      watch: {
        ignored: ["**/outputs/**", "**/dist/**"],
        ...(isCodexSeatbeltSandbox
          ? { useFsEvents: false, usePolling: true }
          : {}),
      },
    },
    plugins: [
      {
        name: "algebra-build-identity",
        apply: "build",
        closeBundle() {
          mkdirSync("dist", { recursive: true });
          writeFileSync(
            "dist/build-identity.json",
            JSON.stringify(identity) + "\n",
          );
        },
      },
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
