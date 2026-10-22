import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fs.realpathSync(
  fileURLToPath(new URL("../", import.meta.url)),
);

function fail(message, exitCode) {
  throw Object.assign(new Error(message), { exitCode });
}

function duration(value) {
  const match = /^(\d+(?:\.\d+)?)([smhd]?)$/.exec(value);
  const milliseconds =
    Number(match?.[1]) *
    ({ "": 1000, s: 1000, m: 60000, h: 3600000, d: 86400000 }[match?.[2]] ?? 0);
  if (!(milliseconds > 0 && milliseconds <= 2147483647))
    fail(`Invalid install duration: ${value}`, 64);
  return milliseconds;
}

function inputHashes() {
  return ["package.json", "package-lock.json"].map((file) =>
    createHash("sha256")
      .update(fs.readFileSync(path.join(projectRoot, file)))
      .digest("hex"),
  );
}

async function runNpm(timeout, killAfter) {
  const env = { ...process.env };
  if (
    ![
      "SHARP_IGNORE_GLOBAL_LIBVIPS",
      "SHARP_FORCE_GLOBAL_LIBVIPS",
      "npm_config_build_from_source",
      "NPM_CONFIG_BUILD_FROM_SOURCE",
    ].some((name) => name in env)
  )
    env.SHARP_IGNORE_GLOBAL_LIBVIPS = "1";
  env.NPM_CONFIG_MAXSOCKETS = "1";
  env.NPM_CONFIG_FETCH_RETRIES = "0";
  env.NPM_CONFIG_FETCH_TIMEOUT = "30000";

  const child = spawn(
    process.execPath,
    [
      process.env.npm_execpath,
      "ci",
      "--prefix",
      projectRoot,
      "--workspaces=false",
      "--include=dev",
      "--include=optional",
      "--prefer-offline",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: projectRoot, env, stdio: "inherit", detached: true },
  );
  let stopped;
  let killTimer;
  function signalOwned(signal) {
    if (!child.pid) return;
    try {
      process.kill(-child.pid, signal);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
  function stop(result, signal) {
    if (stopped) return;
    stopped = result;
    signalOwned(signal);
    killTimer = setTimeout(() => signalOwned("SIGKILL"), killAfter);
  }
  const handlers = ["SIGINT", "SIGHUP", "SIGTERM"].map((signal) => {
    const handler = () => stop({ code: null, signal }, signal);
    process.on(signal, handler);
    return [signal, handler];
  });
  const timeoutTimer = setTimeout(() => {
    console.error("Dependency install timed out.");
    stop({ code: 124, signal: null }, "SIGTERM");
  }, timeout);
  try {
    const result = await new Promise((resolve) => {
      child.once("error", (error) => {
        console.error(error.message);
        resolve({ code: error.code === "ENOENT" ? 127 : 1, signal: null });
      });
      child.once("close", (code, signal) => resolve({ code, signal }));
    });
    return stopped ?? result;
  } finally {
    clearTimeout(timeoutTimer);
    clearTimeout(killTimer);
    for (const [signal, handler] of handlers)
      process.removeListener(signal, handler);
    // Lifecycle subprocesses must finish before another install may acquire the lock.
    signalOwned("SIGKILL");
  }
}

async function install() {
  if (!["darwin", "linux"].includes(process.platform))
    fail("The portable installer supports macOS and Linux.", 69);
  if (!process.env.npm_execpath)
    fail("Run this installer with npm run install:ci.", 64);
  const timeout = duration(process.env.SITES_INSTALL_TIMEOUT ?? "8m");
  const killAfter = duration(process.env.SITES_INSTALL_KILL_AFTER ?? "15s");
  const runtime = path.join(projectRoot, ".sites-runtime");
  fs.mkdirSync(runtime, { recursive: true });
  const lockFile = path.join(runtime, "install-portable.lock");
  let lock;
  try {
    lock = fs.openSync(lockFile, "wx", 0o600);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    fail(
      `Another dependency install owns ${lockFile}. Inspect its PID before removing a stale lock.`,
      75,
    );
  }
  try {
    fs.writeFileSync(lock, `${process.pid}\n`);
    const before = inputHashes();
    console.log("[sites] running exactly one bounded portable npm ci");
    const result = await runNpm(timeout, killAfter);
    if (inputHashes().some((hash, index) => hash !== before[index]))
      fail("Dependency inputs changed during npm ci.", 65);
    if (result.code !== 0 || result.signal) return result;
    try {
      fs.accessSync(
        path.join(projectRoot, "node_modules/.bin/vinext"),
        fs.constants.X_OK,
      );
    } catch {
      fail(
        "npm ci exited successfully but the local vinext executable is unavailable.",
        69,
      );
    }
    fs.writeFileSync(
      path.join(projectRoot, "node_modules/.sites-install.json"),
      `${JSON.stringify({ lockfile_sha256: before[1], node: process.version, platform: `${process.platform}-${process.arch}` }, null, 2)}\n`,
    );
    console.log("[sites] npm ci passed and vinext is available");
    return result;
  } finally {
    const owned = fs.fstatSync(lock);
    fs.closeSync(lock);
    const current = fs.lstatSync(lockFile);
    if (owned.dev !== current.dev || owned.ino !== current.ino)
      fail("The install lock changed while npm ci was running.", 75);
    fs.unlinkSync(lockFile);
  }
}

try {
  const result = await install();
  process.exitCode = result.code ?? 1;
  if (result.signal) process.kill(process.pid, result.signal);
} catch (error) {
  console.error(error.message);
  process.exitCode = error.exitCode ?? 1;
}
