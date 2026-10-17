import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { listening, processIdentity } from "./algebra-runtime.mjs";

const [ownerArgument, portArgument, kind, runId] = process.argv.slice(2);
const ownerFile = path.resolve(ownerArgument);
const root = fs.realpathSync(process.cwd());
const runDir = path.dirname(ownerFile);
const port = Number(portArgument);
const built = kind === "built";
if (
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535 ||
  !["built", "development"].includes(kind) ||
  !/^[a-f0-9-]{36}$/.test(runId ?? "")
)
  throw new Error("Invalid owned-server launch arguments");
if (await listening(port)) throw new Error(`Port ${port} is already in use`);
fs.mkdirSync(runDir, { recursive: true });
const persistDir = path.join(runDir, "persistence");
const args = built
  ? [
      "node_modules/wrangler/bin/wrangler.js",
      "dev",
      "--config",
      "dist/server/wrangler.json",
      "--port",
      String(port),
      "--local",
      "--ip",
      "127.0.0.1",
      "--inspector-port",
      "0",
      "--persist-to",
      persistDir,
      "--var",
      `ALGEBRA_VERIFY_RUN_ID:${runId}`,
    ]
  : [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ];
const marker = {
  version: 1,
  runId,
  root,
  ownerFile,
  runDir,
  origin: `http://127.0.0.1:${port}`,
  kind,
  pid: process.pid,
  processIdentity: processIdentity(process.pid),
  childPid: null,
  persistence: persistDir,
  status: "running",
};
if (fs.existsSync(ownerFile))
  throw new Error("Owned-server marker already exists");
const writeMarker = (value) => {
  const temporary = `${ownerFile}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n");
  fs.renameSync(temporary, ownerFile);
};
writeMarker(marker);
let child;
let stopping = false;
let stopReason;
const stop = (reason) => {
  if (stopping) return;
  stopping = true;
  if (typeof reason === "string") stopReason = reason;
  if (child) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
};
process.on("SIGTERM", () => stop());
process.on("SIGINT", () => stop());
child = spawn(process.execPath, args, {
  cwd: root,
  detached: true,
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    ALGEBRA_VERIFY_RUN_ID: runId,
  },
});
marker.childPid = child.pid;
marker.childLogPath = path.join(runDir, "server-child.log");
writeMarker(marker);
const childLog = fs.createWriteStream(marker.childLogPath, { flags: "wx" });
let outputBytes = 0;
const output = (chunk) => {
  outputBytes += chunk.length;
  if (outputBytes <= 64 * 1024 * 1024) childLog.write(chunk);
  else stop("Server exceeded 64 MiB output limit");
};
child.stdout.on("data", output);
child.stderr.on("data", output);
const lifetime = setTimeout(
  () => stop("Server exceeded two-hour lifetime"),
  2 * 60 * 60 * 1000,
);
lifetime.unref();
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("close", (code) => {
  clearTimeout(lifetime);
  childLog.end();
  writeMarker({
    ...marker,
    status: "stopped",
    stoppedAt: new Date().toISOString(),
    ...(stopReason ? { stopReason } : {}),
  });
  process.exitCode = stopReason ? 1 : stopping ? 0 : (code ?? 1);
});
