import { readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

const flags = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (
    !["--config", "--persist-to"].includes(key) ||
    !value ||
    value.startsWith("--") ||
    flags.has(key)
  )
    throw new Error(
      "Use --config <built Wrangler JSON> --persist-to <isolated local directory>.",
    );
  flags.set(key, value);
}
if (!flags.has("--config") || !flags.has("--persist-to"))
  throw new Error("Both --config and --persist-to are required.");
const root = fileURLToPath(new URL("../", import.meta.url));
const configPath = resolve(flags.get("--config"));
const persistTo = resolve(flags.get("--persist-to"));
const config = JSON.parse(await readFile(configPath, "utf8"));
if (!config.d1_databases?.some((binding) => binding.binding === "DB"))
  throw new Error(
    "Built Worker has no DB binding. Build with .openai/hosting.json d1 set to DB.",
  );
const temporaryConfig = resolve(
  dirname(configPath),
  `.account-migrations-${randomUUID()}.json`,
);
try {
  await writeFile(
    temporaryConfig,
    JSON.stringify({
      ...config,
      d1_databases: config.d1_databases.map((binding) => ({
        ...binding,
        migrations_dir: resolve(root, "drizzle"),
        migrations_table: "algebra_local_migrations",
      })),
    }),
  );
  const result = spawnSync(
    process.execPath,
    [
      resolve(root, "node_modules/wrangler/bin/wrangler.js"),
      "d1",
      "migrations",
      "apply",
      "DB",
      "--local",
      "--config",
      temporaryConfig,
      "--persist-to",
      persistTo,
    ],
    {
      cwd: root,
      env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" },
      stdio: "inherit",
    },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await unlink(temporaryConfig);
}
