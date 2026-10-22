import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.platform === "linux") {
  const result = spawnSync(
    "bash",
    [fileURLToPath(new URL("./install-ci.sh", import.meta.url))],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
  if (result.signal) process.kill(process.pid, result.signal);
} else {
  await import("./install-portable.mjs");
}
