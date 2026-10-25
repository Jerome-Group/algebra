import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkPublicMath } from "./lib/public-math-v2.mjs";
import {
  executionSnapshot,
  outputManifest,
  buildEvidenceFile,
} from "./lib/public-math-v2/execution.mjs";
import { canonical, hashValue } from "./lib/public-math/identity.mjs";

export async function buildPublicMath(root) {
  await fs.rm(path.join(root, buildEvidenceFile), { force: true });
  if (process.version !== "v24.19.0")
    throw new Error("Public mathematics build evidence requires Node24.19.0");
  const source = await checkPublicMath({ root, require: "source-attestation" });
  if (!source.satisfiesRequirement)
    throw new Error(
      `Public source attestation refused: ${JSON.stringify(source.pending)}`,
    );
  const before = await executionSnapshot(root);
  const command = [
    process.execPath,
    path.join(root, "node_modules/vinext/dist/cli.js"),
    "build",
  ];
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      signal
        ? reject(new Error(`Build interrupted by ${signal}`))
        : resolve(code),
    );
  });
  if (exitCode !== 0)
    throw new Error(`Outer Vinext build failed with ${exitCode}`);
  const after = await executionSnapshot(root);
  if (canonical(before) !== canonical(after))
    throw new Error(
      "Source/configuration/direct dependencies changed during outer build",
    );
  const current = await checkPublicMath({
    root,
    require: "source-attestation",
  });
  if (
    !current.satisfiesRequirement ||
    current.acceptanceDigest !== source.acceptanceDigest
  )
    throw new Error("Source attestation changed during outer build");
  const clientManifest = JSON.parse(
    await fs.readFile(
      path.join(root, "dist/client/.vite/manifest.json"),
      "utf8",
    ),
  );
  const manifest = await outputManifest(root);
  const evidence = {
    version: "public-math-build-v2",
    sourceAcceptanceDigest: source.acceptanceDigest,
    before,
    after,
    identity: after.identity,
    command,
    runtime: process.version,
    exitCode: 0,
    manifest,
    manifestDigest: hashValue(manifest),
    clientManifest,
    excluded: "public-math-build.json",
  };
  await fs.writeFile(
    path.join(root, buildEvidenceFile),
    JSON.stringify(evidence, null, 2) + "\n",
    { flag: "wx" },
  );
  return evidence;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    fileURLToPath(new URL("./public-math-build.mjs", import.meta.url))
) {
  try {
    await buildPublicMath(fileURLToPath(new URL("../", import.meta.url)));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
