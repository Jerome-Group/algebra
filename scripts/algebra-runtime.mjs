import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const serverScript = fileURLToPath(
  new URL("algebra-server.mjs", import.meta.url),
);
export const loopback = (origin) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname);
export const newRun = (root, label = "verification") =>
  path.join(root, "outputs", `${label}-${Date.now()}-${randomUUID()}`);
export function processIdentity(pid) {
  const result = spawnSync(
    "ps",
    ["-p", String(pid), "-o", "lstart=", "-o", "command="],
    { encoding: "utf8", timeout: 2000, maxBuffer: 65536 },
  );
  return result.status === 0 ? result.stdout.trim() : null;
}
export function readOwner(file, root, origin) {
  if (!file)
    throw Object.assign(
      new Error(
        "Local target is unowned. Run launch and pass its --owner marker",
      ),
      { code: "UNOWNED_LOCAL_TARGET" },
    );
  const ownerFile = path.resolve(file);
  const marker = JSON.parse(fs.readFileSync(ownerFile, "utf8"));
  if (
    marker.version !== 1 ||
    !/^[a-f0-9-]{36}$/.test(marker.runId ?? "") ||
    marker.root !== fs.realpathSync(root) ||
    marker.ownerFile !== ownerFile ||
    marker.runDir !== path.dirname(ownerFile) ||
    !Number.isSafeInteger(marker.pid) ||
    marker.pid < 2 ||
    !marker.processIdentity?.includes(serverScript) ||
    !marker.processIdentity.includes(ownerFile) ||
    processIdentity(marker.pid) !== marker.processIdentity ||
    marker.status !== "running" ||
    (origin && new URL(origin).origin !== marker.origin)
  )
    throw Object.assign(
      new Error(
        "Owner marker is stale or does not identify this repository and target. Launch a fresh server",
      ),
      { code: "INVALID_OWNER" },
    );
  return marker;
}
export async function listening(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    const finish = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(1000, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}
export async function runCheck(
  root,
  runDir,
  name,
  executable,
  args,
  environment = {},
  timeout = 300000,
) {
  fs.mkdirSync(runDir, { recursive: true });
  const logPath = path.join(runDir, `${name}.log`);
  const log = fs.createWriteStream(logPath, { flags: "wx" });
  let output = "",
    bytes = 0,
    reason;
  return new Promise((resolve) => {
    const child = spawn(executable, args, {
      cwd: root,
      env: { ...process.env, ...environment },
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stop = (message) => {
      reason = message;
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {}
    };
    const timer = setTimeout(
      () => stop(`Command exceeded ${timeout}ms`),
      timeout,
    );
    const hardTimer = setTimeout(() => {
      if (reason) {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {}
      }
    }, timeout + 5000);
    const interrupted = () => stop("Command interrupted");
    process.once("SIGTERM", interrupted);
    process.once("SIGINT", interrupted);
    const collect = (chunk) => {
      bytes += chunk.length;
      if (bytes > 64 * 1024 * 1024) {
        stop("Command exceeded 64 MiB output limit");
        return;
      }
      log.write(chunk);
      output = (output + chunk.toString("utf8")).slice(-6000);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", (error) => {
      reason = error.message;
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      clearTimeout(hardTimer);
      process.off("SIGTERM", interrupted);
      process.off("SIGINT", interrupted);
      log.end(() =>
        resolve({
          name,
          status: code === 0 && !reason ? "passed" : "failed",
          exitCode: code,
          signal,
          output,
          outputBytes: bytes,
          outputTruncated: bytes > Buffer.byteLength(output),
          logPath,
          ...(reason ? { error: reason } : {}),
        }),
      );
    });
  });
}
export async function launchServer(
  root,
  {
    built = false,
    port = built ? 5176 : 5173,
    runDir = newRun(root, "server"),
  } = {},
) {
  if (await listening(port))
    throw Object.assign(
      new Error(
        `Port ${port} is already in use. Choose --port with an unused port`,
      ),
      { code: "PORT_IN_USE" },
    );
  fs.mkdirSync(runDir, { recursive: true });
  const ownerFile = path.resolve(runDir, "owner.json");
  const logPath = path.join(runDir, "server.log");
  const descriptor = fs.openSync(logPath, "wx");
  const child = spawn(
    process.execPath,
    [
      serverScript,
      ownerFile,
      String(port),
      built ? "built" : "development",
      randomUUID(),
    ],
    { cwd: root, detached: true, stdio: ["ignore", descriptor, descriptor] },
  );
  fs.closeSync(descriptor);
  child.unref();
  try {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      if (fs.existsSync(ownerFile)) {
        const marker = readOwner(ownerFile, root);
        try {
          const response = await fetch(
            new URL(`/api/build?owner=${marker.runId}`, marker.origin),
            {
              signal: AbortSignal.timeout(1000),
              redirect: "error",
            },
          );
          if (response.ok) return { ...marker, logPath };
        } catch {}
      } else if (!processIdentity(child.pid)) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw Object.assign(
      new Error(`Owned server did not become ready. Read ${logPath}`),
      { code: "SERVER_START_FAILED", logPath },
    );
  } catch (error) {
    if (fs.existsSync(ownerFile)) {
      try {
        await stopServer(ownerFile, root);
      } catch {}
    }
    throw Object.assign(
      new Error(
        `Owned server startup failed. ${error.message}. Read ${logPath}`,
      ),
      { code: "SERVER_START_FAILED", logPath },
    );
  }
}
export async function stopServer(file, root) {
  const marker = readOwner(file, root);
  process.kill(marker.pid, "SIGTERM");
  const deadline = Date.now() + 10000;
  while (
    Date.now() < deadline &&
    processIdentity(marker.pid) === marker.processIdentity
  )
    await new Promise((resolve) => setTimeout(resolve, 100));
  if (processIdentity(marker.pid) === marker.processIdentity)
    throw new Error(
      `Owned server did not stop. Evidence remains in ${marker.runDir}`,
    );
  return {
    ownerFile: marker.ownerFile,
    origin: marker.origin,
    stopped: true,
    evidenceRetained: marker.runDir,
  };
}
