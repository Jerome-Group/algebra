import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const variant = process.argv[2];
if (!["baseline", "candidate"].includes(variant))
  throw new Error("Choose baseline or candidate");
const repo = process.cwd();
const scratchParent = path.resolve(repo, "work/esbuild-observation");
fs.mkdirSync(scratchParent, { recursive: true });
const scratch = fs.mkdtempSync(path.join(scratchParent, variant + "-"));
const evidence = path.resolve(
  repo,
  "docs/prototypes/scoped-esbuild/evidence",
  variant,
);
fs.mkdirSync(scratch, { recursive: true });
if (fs.existsSync(evidence)) {
  const archive = path.resolve(
    repo,
    "docs/prototypes/scoped-esbuild/evidence/previous-runs",
  );
  fs.mkdirSync(archive, { recursive: true });
  fs.renameSync(evidence, path.join(archive, variant + "-" + Date.now()));
}
fs.mkdirSync(evidence, { recursive: true });
const manifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (variant === "candidate")
  manifest.overrides["@esbuild-kit/core-utils"] = { esbuild: "0.25.12" };
fs.writeFileSync(
  path.join(scratch, "package.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
fs.copyFileSync("package-lock.json", path.join(scratch, "package-lock.json"));
fs.mkdirSync(path.join(scratch, "db"), { recursive: true });
fs.copyFileSync("db/schema.ts", path.join(scratch, "db/schema.ts"));
fs.copyFileSync("drizzle.config.ts", path.join(scratch, "drizzle.config.ts"));
fs.mkdirSync(path.join(scratch, "fixtures/mapped"), { recursive: true });
const fixtures = {
  "fixtures/tsconfig.json": JSON.stringify({
    compilerOptions: {
      baseUrl: ".",
      paths: { "@fixture/*": ["mapped/*"] },
      target: "ES2022",
    },
  }),
  "fixtures/mapped/value.ts": "export const total: number = 42;\n",
  "fixtures/esm.ts":
    'import { total } from "@fixture/value"; const value: number = total + 1; console.log(JSON.stringify({case:"esm-path",value}));\n',
  "fixtures/dynamic.ts": "export const total: number = 44;\n",
  "fixtures/dynamic.mjs":
    'const {total} = await import("./dynamic.ts"); console.log(JSON.stringify({case:"dynamic",value:total}));\n',
  "fixtures/cjs.cts":
    'const value: number = 45; module.exports = {case:"cjs",value}; console.log(JSON.stringify(module.exports));\n',
  "fixtures/core.cjs":
    'const fs = require("node:fs"); const vm = require("node:vm"); const core = require("@esbuild-kit/core-utils"); const source = fs.readFileSync("fixtures/cjs.cts", "utf8"); const result = core.transformSync(source, require("node:path").resolve("fixtures/cjs.cts")); vm.runInThisContext("(function(require,module,exports){"+result.code+"})")(require,{exports:{}},{}); console.log(JSON.stringify({case:"core-sync-map",map:typeof result.map}));\n',
  "fixtures/sqlite.mjs":
    'import fs from "node:fs"; import {DatabaseSync} from "node:sqlite"; const db = new DatabaseSync("observed.sqlite"); for (const file of fs.readdirSync("drizzle").filter(f=>f.endsWith(".sql")).sort()) db.exec(fs.readFileSync("drizzle/"+file,"utf8")); console.log(JSON.stringify(db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE \'sqlite_%\' ORDER BY type,name").all())); db.prepare("INSERT INTO account_progress(owner,revision,document) VALUES(?,?,?)").run("fixture-owner",7,JSON.stringify({lesson:"groups"})); console.log(JSON.stringify(db.prepare("SELECT * FROM account_progress").all())); try { db.prepare("INSERT INTO account_progress(owner,revision,document) VALUES(?,?,?)").run("fixture-owner",8,"{}"); } catch(e) { console.log(JSON.stringify({duplicate:e.code,message:e.message})); } db.close();\n',
};
for (const [file, content] of Object.entries(fixtures))
  fs.writeFileSync(path.join(scratch, file), content);
const commands = [
  ...(variant === "candidate"
    ? [
        [
          "lock",
          "npm",
          [
            "install",
            "--package-lock-only",
            "--ignore-scripts",
            "--no-audit",
            "--no-fund",
          ],
        ],
      ]
    : []),
  ["install", "npm", ["ci", "--no-audit", "--no-fund"]],
  [
    "versions",
    "npm",
    [
      "ls",
      "esbuild",
      "@esbuild-kit/core-utils",
      "@esbuild-kit/esm-loader",
      "drizzle-kit",
      "--all",
    ],
  ],
  ["audit", "npm", ["audit", "--json"]],
  ["audit-production", "npm", ["audit", "--omit=dev", "--json"]],
  [
    "esm-path",
    process.execPath,
    [
      "--no-experimental-strip-types",
      "--loader",
      "@esbuild-kit/esm-loader",
      "fixtures/esm.ts",
    ],
  ],
  [
    "dynamic",
    process.execPath,
    [
      "--no-experimental-strip-types",
      "--loader",
      "@esbuild-kit/esm-loader",
      "fixtures/dynamic.mjs",
    ],
  ],
  [
    "cjs-loader",
    process.execPath,
    [
      "--no-experimental-strip-types",
      "--loader",
      "@esbuild-kit/esm-loader",
      "fixtures/cjs.cts",
    ],
  ],
  [
    "cjs-core",
    process.execPath,
    ["--no-experimental-strip-types", "fixtures/core.cjs"],
  ],
  [
    "generate",
    process.execPath,
    [
      "node_modules/drizzle-kit/bin.cjs",
      "generate",
      "--config=drizzle.config.ts",
    ],
  ],
  ["sqlite", process.execPath, ["fixtures/sqlite.mjs"]],
  [
    "generate-repeat",
    process.execPath,
    [
      "node_modules/drizzle-kit/bin.cjs",
      "generate",
      "--config=drizzle.config.ts",
    ],
  ],
];
const observations = [];
for (const [name, command, args] of commands) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: scratch,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 16 * 1024 * 1024,
    env: {
      ...process.env,
      ESBK_DISABLE_CACHE: "1",
      ESBK_TSCONFIG_PATH: path.join(scratch, "fixtures/tsconfig.json"),
    },
  });
  const observation = {
    variant,
    name,
    command,
    args,
    status: result.status,
    signal: result.signal,
    error: result.error?.message,
    elapsedMs: Date.now() - started,
    stdout: result.stdout,
    stderr: result.stderr,
  };
  fs.writeFileSync(
    path.join(evidence, name + ".json"),
    JSON.stringify(observation, null, 2) + "\n",
  );
  observations.push({
    name,
    status: result.status,
    signal: result.signal,
    elapsedMs: observation.elapsedMs,
  });
  console.log(JSON.stringify({ variant, ...observations.at(-1) }));
}
fs.copyFileSync(
  path.join(scratch, "package.json"),
  path.join(evidence, "package.json"),
);
fs.copyFileSync(
  path.join(scratch, "package-lock.json"),
  path.join(evidence, "package-lock.json"),
);
if (fs.existsSync(path.join(scratch, "drizzle")))
  fs.cpSync(path.join(scratch, "drizzle"), path.join(evidence, "drizzle"), {
    recursive: true,
  });
fs.writeFileSync(
  path.join(evidence, "observations.json"),
  JSON.stringify(
    {
      variant,
      node: process.version,
      source: "1f404fb8d482dc2e06e28bfc5df686af881b044d",
      observations,
    },
    null,
    2,
  ) + "\n",
);
