import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { buildMap, validateMap, root } from "../scripts/algebra-map.mjs";
import {
  buildIdentity,
  observeIdentity,
  requireOwnerIdentity,
} from "../scripts/algebra-identity.mjs";
import { runCheck, readOwner } from "../scripts/algebra-runtime.mjs";
import { parseArguments } from "../scripts/algebra-contract.mjs";

const execute = (args, environment = {}) => {
  const child = spawnSync(process.execPath, ["scripts/algebra.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 15000,
    env: {
      ...process.env,
      ALGEBRA_LOCAL_OWNER: "",
      ALGEBRA_TEST_ORIGIN: "",
      ...environment,
    },
  });
  assert.equal(child.stderr, "");
  return { code: child.status, ...JSON.parse(child.stdout) };
};

test("static help remains available when catalogue and installed dependencies are absent", () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "algebra-help-"));
  try {
    const result = execute(["help"], { ALGEBRA_MAP_ROOT: fixture });
    assert.equal(result.code, 0);
    assert.equal(result.ok, true);
    assert.ok(
      result.result.commands.some((command) => command.name === "doctor"),
    );
    assert.ok(
      result.result.commands.some((command) => command.name === "launch"),
    );
    const focused = execute(["help", "--command", "inspect"], {
      ALGEBRA_MAP_ROOT: fixture,
    });
    assert.deepEqual(
      focused.result.commands.map((command) => command.name),
      ["inspect"],
    );
    assert.equal(
      focused.result.commands[0].inputSchema.properties.actions.type,
      "array",
    );
    assert.match(result.result.output, /verify --layer all --port PORT/);
    const verification = execute(["help", "--command", "verify"], {
      ALGEBRA_MAP_ROOT: fixture,
    });
    assert.match(
      verification.result.commands[0].inputSchema.properties.layer.description,
      /all builds, launches and stops its own production Worker/,
    );
    assert.deepEqual(fs.readdirSync(fixture), []);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("command parsing preserves supported actions and refuses invalid input before effects", () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "algebra-input-"));
  try {
    const editingKinds = [
      "combobox",
      "textbox",
      "searchbox",
      "spinbutton",
      "slider",
    ];
    for (const action of [
      ...editingKinds.flatMap((kind) =>
        ["", "x".repeat(200), "😀".repeat(200), 0].map((value) => ({
          kind,
          label: "Prediction",
          value,
        })),
      ),
      ...["button", "checkbox", "radio"].flatMap((kind) => [
        { kind, label: "Prediction" },
        { kind, label: "Prediction", value: "x".repeat(201) },
      ]),
    ])
      for (const flag of ["action", "actions"]) {
        const value = flag === "action" ? action : [action];
        const parsed = parseArguments([
          "inspect",
          "foundations-functions",
          `--${flag}`,
          JSON.stringify(value),
        ]);
        assert.deepEqual(parsed.values[flag], value);
      }
    const evidence = path.join(fixture, "must-not-exist.json");
    for (const args of [
      ["map", "--write", "--unexpected", "yes"],
      ["verify", "--layer", "all", "--layer", "map"],
      ["list", "--query"],
      ["verify", "--layer", "browser", "--feature", "unknown"],
      ["verify", "--layer", "all", "--feature", "discovery"],
      [
        "verify",
        "--layer",
        "browser",
        "--url",
        "https://example.org",
        "--built",
      ],
      ["verify", "--layer", "browser", "--shard", "3/2"],
      ["verify", "--layer", "browser", "--shard", "1/9007199254740992"],
      ["launch", "--port", "22"],
      ["lesson"],
      ...editingKinds.flatMap((kind) =>
        [undefined, "x".repeat(201), "😀".repeat(201)].flatMap((value) => {
          const action = { kind, label: "Prediction", value };
          return ["action", "actions"].map((flag) => [
            "inspect",
            "foundations-functions",
            `--${flag}`,
            JSON.stringify(flag === "action" ? action : [action]),
          ]);
        }),
      ),
      [
        "inspect",
        "foundations-functions",
        "--action",
        '{"kind":"button","label":"Reveal","extra":true}',
      ],
      [
        "inspect",
        "foundations-functions",
        "--url",
        "https://example.org/private",
      ],
    ]) {
      const result = execute([...args, "--evidence", evidence], {
        ALGEBRA_MAP_ROOT: fixture,
      });
      assert.equal(result.code, 1, JSON.stringify(args));
      assert.equal(
        result.errors[0].code,
        "INVALID_INPUT",
        JSON.stringify(args),
      );
      assert.deepEqual(result.checks, []);
      assert.deepEqual(result.evidence, []);
      assert.deepEqual(fs.readdirSync(fixture), []);
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

for (const [target, args, environment] of [
  ["--owner", ["--owner", "/unused-owner.json"], {}],
  ["--url", ["--url", "https://example.org"], {}],
  ["ALGEBRA_LOCAL_OWNER", [], { ALGEBRA_LOCAL_OWNER: "/unused-owner.json" }],
  ["ALGEBRA_TEST_ORIGIN", [], { ALGEBRA_TEST_ORIGIN: "https://example.org" }],
])
  test(`full verification rejects ${target} before effects`, () => {
    const fixture = fs.mkdtempSync(
      path.join(os.tmpdir(), "algebra-full-input-"),
    );
    try {
      const result = execute(
        [
          "verify",
          "--layer",
          "all",
          ...args,
          "--evidence",
          path.join(fixture, "must-not-exist.json"),
        ],
        { ALGEBRA_MAP_ROOT: fixture, ...environment },
      );
      assert.equal(result.code, 1);
      assert.equal(result.errors[0].code, "INVALID_INPUT");
      assert.match(result.errors[0].message, /all.*own.*Worker/);
      assert.deepEqual(result.checks, []);
      assert.deepEqual(result.evidence, []);
      assert.equal(result.provenance, undefined);
      assert.deepEqual(fs.readdirSync(fixture), []);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

test("verification accepts self-owned full runs and existing browser targets at the input boundary", () => {
  const fixture = fs.mkdtempSync(
    path.join(os.tmpdir(), "algebra-verify-input-"),
  );
  try {
    for (const [args, environment] of [
      [["--layer", "all"], {}],
      [["--layer", "all", "--built", "--port", "5183"], {}],
      [["--layer", "browser", "--owner", "/unused-owner.json"], {}],
      [["--layer", "browser", "--url", "https://example.org"], {}],
      [["--layer", "browser"], { ALGEBRA_LOCAL_OWNER: "/unused-owner.json" }],
      [["--layer", "browser"], { ALGEBRA_TEST_ORIGIN: "https://example.org" }],
    ]) {
      const result = execute(["verify", ...args], {
        ALGEBRA_MAP_ROOT: fixture,
        ...environment,
      });
      assert.equal(result.code, 1);
      assert.equal(result.errors[0].code, "ENOENT");
      assert.match(result.errors[0].message, /lib\/algebra\/lessons\.json/);
      assert.deepEqual(result.checks, []);
      assert.deepEqual(result.evidence, []);
      assert.deepEqual(fs.readdirSync(fixture), []);
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("doctor reports missing prerequisites without creating build or evidence files", () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "algebra-doctor-"));
  try {
    const result = execute(["doctor", "--built", "--port", "5182"], {
      ALGEBRA_MAP_ROOT: fixture,
    });
    assert.equal(result.code, 1);
    assert.equal(result.result.readOnly, true);
    for (const name of ["dependencies", "build"]) {
      const check = result.checks.find((check) => check.name === name);
      assert.equal(check.status, "failed");
      assert.ok(check.remedy);
    }
    assert.deepEqual(fs.readdirSync(fixture), []);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("verification map rejects omitted, extra, unlinked and non-executable feature coverage", () => {
  const baseline = buildMap();
  assert.deepEqual(validateMap(baseline), []);
  const mutate = (change, pattern) => {
    const map = structuredClone(baseline);
    change(map);
    assert.ok(validateMap(map).some((error) => pattern.test(error)));
  };
  mutate(
    (map) => map.verificationGroups[0].featureIds.pop(),
    /feature coverage/,
  );
  mutate(
    (map) => map.verificationGroups[0].featureIds.push("invented"),
    /Unknown feature reference/,
  );
  mutate(
    (map) =>
      map.verificationGroups[0].sources.push("components/algebra/Absent.tsx"),
    /Missing verification path/,
  );
  mutate(
    (map) =>
      map.verificationGroups[0].journeys.push("tests/browser/absent.spec.mjs"),
    /Missing verification path/,
  );
  mutate(
    (map) => map.verificationGroups[0].journeys.push("scripts/algebra.mjs"),
    /Invalid journey path/,
  );
  mutate((map) => {
    map.features[0].verification = [];
  }, /verification links differ/);
  mutate((map) => {
    map.sources = map.sources.filter(
      (source) => source.file !== "tests/browser/navigation.spec.mjs",
    );
  }, /Missing verification path/);
});

test("compiled identity comparison distinguishes matching, mismatched and unknown targets", async () => {
  const expected = buildIdentity(root);
  let body = expected;
  const server = http.createServer((request, response) => {
    assert.equal(request.url, "/api/build");
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(body));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(
      (await observeIdentity(origin, expected)).sourceMatch,
      "matched",
    );
    body = { ...expected, sourceDigest: "0".repeat(64) };
    const mismatch = await observeIdentity(origin, expected);
    assert.equal(mismatch.sourceMatch, "mismatched");
    assert.equal(mismatch.observed.sourceDigest, "0".repeat(64));
    body = { localArtifactHash: expected.sourceDigest };
    const unknown = await observeIdentity(origin, expected);
    assert.equal(unknown.sourceMatch, "unknown");
    assert.equal(unknown.observed, null);
    assert.ok(unknown.error);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("source identity changes for application, verification and dependency inputs", () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "algebra-identity-"));
  try {
    fs.mkdirSync(path.join(fixture, "app"));
    fs.mkdirSync(path.join(fixture, "scripts"));
    fs.writeFileSync(path.join(fixture, "app/page.tsx"), "one");
    fs.writeFileSync(path.join(fixture, "scripts/verify.mjs"), "one");
    fs.writeFileSync(path.join(fixture, "package-lock.json"), "one");
    let previous = buildIdentity(fixture).sourceDigest;
    for (const file of [
      "app/page.tsx",
      "scripts/verify.mjs",
      "package-lock.json",
    ]) {
      fs.writeFileSync(path.join(fixture, file), "two");
      const next = buildIdentity(fixture).sourceDigest;
      assert.notEqual(next, previous, file);
      previous = next;
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("Finder metadata does not change source identity", () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "algebra-identity-"));
  try {
    fs.mkdirSync(path.join(fixture, "components"));
    fs.mkdirSync(path.join(fixture, "lib"));
    fs.writeFileSync(path.join(fixture, "components/Reader.tsx"), "one");
    const expected = buildIdentity(fixture);
    for (const directory of ["components", "lib"]) {
      fs.writeFileSync(path.join(fixture, directory, ".DS_Store"), "Finder");
      assert.deepEqual(buildIdentity(fixture), expected);
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("unowned and stale markers cannot drive or stop local processes", () => {
  assert.throws(
    () =>
      requireOwnerIdentity(
        { localRunId: "different-run" },
        { runId: "expected-run" },
      ),
    { code: "UNOWNED_LOCAL_TARGET" },
  );
  assert.doesNotThrow(() =>
    requireOwnerIdentity(
      { localRunId: "expected-run" },
      { runId: "expected-run" },
    ),
  );
  assert.throws(() => readOwner(null, root), { code: "UNOWNED_LOCAL_TARGET" });
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "algebra-owner-"));
  try {
    const owner = path.join(fixture, "owner.json");
    fs.writeFileSync(
      owner,
      JSON.stringify({
        version: 1,
        pid: process.pid,
        root,
        ownerFile: owner,
        runDir: fixture,
        status: "running",
        processIdentity:
          "a reused PID cannot satisfy the recorded command identity",
      }),
    );
    assert.throws(() => readOwner(owner, root), { code: "INVALID_OWNER" });
    const result = execute([
      "inspect",
      "foundations-functions",
      "--url",
      "http://127.0.0.1:5182",
    ]);
    assert.equal(result.code, 1);
    assert.equal(result.errors[0].code, "UNOWNED_LOCAL_TARGET");
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("child failures and timeouts retain bounded output and full evidence", async () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "algebra-timeout-"));
  try {
    const failure = await runCheck(root, fixture, "failure", process.execPath, [
      "-e",
      "process.stdout.write('failed child output');process.exitCode=7",
    ]);
    assert.equal(failure.status, "failed");
    assert.equal(failure.exitCode, 7);
    assert.equal(failure.output, "failed child output");
    assert.equal(
      fs.readFileSync(failure.logPath, "utf8"),
      "failed child output",
    );
    const result = await runCheck(
      root,
      fixture,
      "timeout",
      process.execPath,
      ["-e", "setInterval(()=>{},1000)"],
      {},
      100,
    );
    assert.equal(result.status, "failed");
    assert.match(result.error, /exceeded/);
    assert.ok(fs.existsSync(result.logPath));
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
