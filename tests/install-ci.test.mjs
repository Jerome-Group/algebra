import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL("package.json", root)));
const npmCli =
  process.env.npm_execpath ??
  fs.realpathSync(
    process.env.PATH.split(path.delimiter)
      .map((directory) => path.join(directory, "npm"))
      .find((file) => fs.existsSync(file)),
  );

function fixture(t, mode = "success") {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "algebra-install-test-"),
  );
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, "scripts"));
  for (const file of [
    "install-ci.sh",
    "sites-env.sh",
    "install-ci.mjs",
    "install-portable.mjs",
  ]) {
    const source = new URL(`scripts/${file}`, root);
    if (fs.existsSync(source))
      fs.copyFileSync(source, path.join(directory, "scripts", file));
  }
  fs.writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify({
      name: "install-fixture",
      version: "1.0.0",
      type: "module",
      scripts: {
        "install:ci": manifest.scripts["install:ci"],
        postinstall: "node fixture.mjs",
      },
    }),
  );
  fs.writeFileSync(
    path.join(directory, "package-lock.json"),
    JSON.stringify({
      name: "install-fixture",
      version: "1.0.0",
      lockfileVersion: 3,
      packages: {
        "": {
          name: "install-fixture",
          version: "1.0.0",
          hasInstallScript: true,
        },
      },
    }),
  );
  fs.writeFileSync(
    path.join(directory, "fixture.mjs"),
    `import fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";
if (${JSON.stringify(mode)} === "failure") process.exit(42);
if (["hang", "held-zombie"].includes(${JSON.stringify(mode)})) {
  const group = Number(spawnSync("ps", ["-o", "pgid=", "-p", String(process.pid)], { encoding: "utf8" }).stdout.trim());
  if (!Number.isSafeInteger(group) || group <= 1) throw new Error("Cannot identify owned installation group");
  console.log("owned-install-group:" + group);
  if (${JSON.stringify(mode)} === "held-zombie") {
    const held = spawnSync(process.env.INSTALL_FIXTURE_ZOMBIE_HELPER, [String(group)], { stdio: "inherit" });
    if (held.status !== 0) throw new Error("Zombie control failed " + held.status);
  }
  spawn(process.execPath, ["-e", 'process.on("SIGTERM", () => {}); require("fs").writeFileSync("descendant.pid", String(process.pid)); setInterval(() => {}, 1000);'], { stdio: "inherit" });
  process.on("SIGTERM", () => {});
  setInterval(() => {}, 1000);
} else if (${JSON.stringify(mode)} !== "missing-bin") {
  fs.mkdirSync("node_modules/.bin", { recursive: true });
  fs.writeFileSync("node_modules/.bin/vinext", "#!/usr/bin/env node\\n", { mode: 0o755 });
}
`,
  );
  return directory;
}

function start(directory, environment = {}, declared = false) {
  const child = spawn(
    process.execPath,
    declared ? [npmCli, "run", "install:ci"] : ["scripts/install-portable.mjs"],
    {
      cwd: directory,
      env: {
        ...process.env,
        npm_execpath: npmCli,
        SITES_INSTALL_TIMEOUT: "10s",
        SITES_INSTALL_KILL_AFTER: "0.1s",
        ...environment,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  const finished = new Promise((resolve) =>
    child.once("close", (code, signal) => resolve({ code, signal, output })),
  );
  return {
    child,
    finished,
    async stop() {
      if (child.exitCode === null && child.signalCode === null)
        child.kill("SIGTERM");
      await Promise.race([finished, delay(500)]);
      const group = Number(/owned-install-group:(\d+)/.exec(output)?.[1]);
      if (group) {
        try {
          process.kill(-group, "SIGKILL");
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
      }
      if (child.exitCode === null && child.signalCode === null)
        child.kill("SIGKILL");
      const stopped = await Promise.race([
        finished.then(() => true),
        delay(1000).then(() => false),
      ]);
      assert.ok(stopped, "Owned installation did not finish teardown");
    },
  };
}

async function waitFor(file) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
    await delay(25);
  }
  assert.fail(`Installer did not reach ${file}`);
}

async function assertStopped(pid) {
  for (let attempt = 0; attempt < 200; attempt++) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      assert.equal(error.code, "ESRCH");
      return;
    }
    await delay(25);
  }
  assert.fail(`Owned descendant ${pid} survived installer cleanup`);
}

test("portable installer preserves locked inputs and verifies vinext", async (t) => {
  const directory = fixture(t);
  const inputs = ["package.json", "package-lock.json"].map((file) =>
    fs.readFileSync(path.join(directory, file)),
  );
  const result = await start(directory, {}, process.platform === "darwin")
    .finished;
  assert.equal(result.code, 0, result.output);
  assert.equal(result.signal, null, result.output);
  for (const [index, file] of ["package.json", "package-lock.json"].entries())
    assert.deepEqual(
      fs.readFileSync(path.join(directory, file)),
      inputs[index],
    );
  assert.equal(
    JSON.parse(
      fs.readFileSync(path.join(directory, "node_modules/.sites-install.json")),
    ).node,
    process.version,
  );
  assert.equal(
    fs.existsSync(path.join(directory, ".sites-runtime/install-portable.lock")),
    false,
  );
});

test("portable install rejects a corrupt locked tarball", async (t) => {
  const directory = fixture(t);
  const dependency = path.join(directory, "dependency");
  fs.mkdirSync(dependency);
  fs.writeFileSync(
    path.join(dependency, "package.json"),
    JSON.stringify({ name: "integrity-fixture", version: "1.0.0" }),
  );
  const packed = spawnSync(
    process.execPath,
    [
      npmCli,
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      directory,
    ],
    { cwd: dependency, encoding: "utf8", timeout: 5000 },
  );
  assert.equal(packed.status, 0, packed.stderr);
  const dependencies = {
    "integrity-fixture": "file:integrity-fixture-1.0.0.tgz",
  };
  const packageFile = path.join(directory, "package.json");
  fs.writeFileSync(
    packageFile,
    JSON.stringify({
      ...JSON.parse(fs.readFileSync(packageFile)),
      dependencies,
    }),
  );
  const lockFile = path.join(directory, "package-lock.json");
  const lock = JSON.parse(fs.readFileSync(lockFile));
  lock.packages[""].dependencies = dependencies;
  lock.packages["node_modules/integrity-fixture"] = {
    version: "1.0.0",
    resolved: dependencies["integrity-fixture"],
    integrity: `sha512-${Buffer.alloc(64).toString("base64")}`,
  };
  fs.writeFileSync(lockFile, JSON.stringify(lock));
  const result = await start(directory).finished;
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /EINTEGRITY/);
  t.diagnostic(
    result.output
      .split("\n")
      .filter((line) => /EINTEGRITY|integrity checksum failed/.test(line))
      .join("\n"),
  );
  assert.equal(
    fs.existsSync(path.join(directory, "node_modules/.sites-install.json")),
    false,
  );
});

test("portable install preserves npm failure and verifies the executable", async (t) => {
  const failed = await start(fixture(t, "failure")).finished;
  assert.equal(failed.code, 42, failed.output);
  const missing = await start(fixture(t, "missing-bin")).finished;
  assert.equal(missing.code, 69, missing.output);
  assert.match(missing.output, /vinext.*unavailable/);
  t.diagnostic(
    `npm lifecycle exit ${failed.code}; missing vinext exit ${missing.code}`,
  );
});

for (const [mode, name] of [
  [
    "hang",
    "portable install refuses overlap and cancels only its owned descendants",
  ],
  [
    "held-zombie",
    "portable install preserves cancellation after force-kill leaves only a zombie",
  ],
])
  test(name, async (t) => {
    let first;
    let controlFile;
    t.after(async () => {
      if (controlFile && fs.existsSync(controlFile)) {
        const controls = fs
          .readFileSync(controlFile, "utf8")
          .trim()
          .split("\n")
          .filter(Boolean)
          .map(JSON.parse);
        for (const { reaper, zombie, pgid } of controls) {
          process.kill(reaper, "SIGKILL");
          await assertStopped(zombie);
          await assertStopped(reaper);
          t.diagnostic(
            `Owned zombie ${zombie} and external reaper ${reaper} absent before group ${pgid} teardown.`,
          );
        }
      }
      await first?.stop();
    });
    const directory = fixture(t, mode);
    const environment = {};
    controlFile = path.join(directory, "zombie-control.jsonl");
    if (mode === "held-zombie") {
      const compiler = spawnSync("cc", ["--version"], { encoding: "utf8" });
      assert.equal(
        compiler.status,
        0,
        `The zombie regression requires a POSIX C compiler (cc): ${compiler.error?.message ?? compiler.stderr}`,
      );
      const helper = path.join(directory, "held-zombie");
      const compiled = spawnSync(
        "cc",
        [
          "-std=c11",
          "-D_POSIX_C_SOURCE=200809L",
          "-Wall",
          "-Wextra",
          "-Werror",
          fileURLToPath(
            new URL("fixtures/install-held-zombie.c", import.meta.url),
          ),
          "-o",
          helper,
        ],
        { encoding: "utf8" },
      );
      assert.equal(
        compiled.status,
        0,
        compiled.error?.message ?? compiled.stderr,
      );
      environment.INSTALL_FIXTURE_ZOMBIE_HELPER = helper;
      environment.INSTALL_FIXTURE_CONTROL_PIDS = controlFile;
    }
    const inputs = ["package.json", "package-lock.json"].map((file) =>
      fs.readFileSync(path.join(directory, file)),
    );
    const unrelated = spawn(process.execPath, [
      "-e",
      "setInterval(() => {}, 1000)",
    ]);
    t.after(() => unrelated.kill("SIGKILL"));
    first = start(directory, environment);
    const descendant = Number(
      await waitFor(path.join(directory, "descendant.pid")),
    );
    const overlap = await start(directory).finished;
    assert.equal(overlap.code, 75, overlap.output);
    assert.match(overlap.output, /Another dependency install/);
    first.child.kill("SIGTERM");
    const cancelled = await first.finished;
    assert.equal(cancelled.signal, "SIGTERM", cancelled.output);
    await assertStopped(descendant);
    assert.doesNotThrow(() => process.kill(unrelated.pid, 0));
    for (const [index, file] of ["package.json", "package-lock.json"].entries())
      assert.deepEqual(
        fs.readFileSync(path.join(directory, file)),
        inputs[index],
      );
    assert.equal(
      fs.existsSync(path.join(directory, "node_modules/.sites-install.json")),
      false,
    );
    assert.equal(
      fs.existsSync(
        path.join(directory, ".sites-runtime/install-portable.lock"),
      ),
      false,
    );
    t.diagnostic(
      `Overlap exit ${overlap.code}; cancellation ${cancelled.signal}; owned descendant ${descendant} absent; unrelated PID ${unrelated.pid} alive; lock removed.`,
    );
  });

test("portable install times out and removes signal-resistant descendants", async (t) => {
  const directory = fixture(t, "hang");
  const install = start(directory, { SITES_INSTALL_TIMEOUT: "1s" });
  t.after(() => install.stop());
  const descendant = Number(
    await waitFor(path.join(directory, "descendant.pid")),
  );
  const result = await install.finished;
  assert.equal(result.code, 124, result.output);
  assert.match(result.output, /timed out/);
  await assertStopped(descendant);
  assert.equal(
    fs.existsSync(path.join(directory, ".sites-runtime/install-portable.lock")),
    false,
  );
  t.diagnostic(
    `Timeout exit ${result.code}; owned descendant ${descendant} absent; lock removed.`,
  );
});
