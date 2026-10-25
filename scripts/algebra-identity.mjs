import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { directDependencies } from "./lib/direct-dependencies.mjs";

export function buildIdentity(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(path.join(root, directory), {
      withFileTypes: true,
    })) {
      const file = path.posix.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (
        entry.name !== ".DS_Store" &&
        !file.endsWith(".tsbuildinfo") &&
        file !== "lib/algebra/feature-map.json" &&
        !/(^|\/)\.env/.test(file)
      )
        files.push(file);
    }
  };
  for (const directory of [
    "app",
    "components",
    "lib",
    "hooks",
    "worker",
    "db",
    "drizzle",
    "build",
    "scripts",
    "tests",
    "public",
    ".agents",
  ]) {
    if (fs.existsSync(path.join(root, directory))) visit(directory);
  }
  for (const file of fs.readdirSync(root)) {
    if (
      /\.(json|mjs|ts|mts)$/.test(file) &&
      file !== "next-env.d.ts" &&
      fs.statSync(path.join(root, file)).isFile()
    )
      files.push(file);
  }
  if (fs.existsSync(path.join(root, ".openai/hosting.json")))
    files.push(".openai/hosting.json");
  const inputs = [...new Set(files)].sort().map((file) => ({
    file,
    sha256: createHash("sha256")
      .update(fs.readFileSync(path.join(root, file)))
      .digest("hex"),
  }));
  const dependencies = directDependencies(root);
  return {
    version: 2,
    algorithm: "sha256",
    sourceDigest: createHash("sha256")
      .update(JSON.stringify(inputs))
      .digest("hex"),
    inputCount: inputs.length,
    directDependencyDigest: dependencies.digest,
    directDependencyCount: dependencies.count,
  };
}

export async function observeIdentity(origin, expected, owner) {
  const result = {
    origin: new URL(origin).origin,
    endpoint: "/api/build",
    expected,
    observed: null,
    sourceMatch: "unknown",
    dependencyMatch: "unknown",
  };
  try {
    const endpoint = new URL("/api/build", origin);
    if (owner) endpoint.searchParams.set("owner", owner.runId);
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    if (!response.ok)
      throw new Error(`Build identity returned HTTP ${response.status}`);
    const reader = response.body.getReader();
    let bytes = 0,
      content = "";
    const decoder = new TextDecoder();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 8192) {
        await reader.cancel();
        throw new Error("Build identity exceeds 8192 bytes");
      }
      content += decoder.decode(value, { stream: true });
    }
    const observed = JSON.parse(content);
    if (
      observed.version !== 2 ||
      observed.algorithm !== "sha256" ||
      !/^[a-f0-9]{64}$/.test(observed.sourceDigest) ||
      !Number.isSafeInteger(observed.inputCount) ||
      observed.inputCount < 1 ||
      !/^[a-f0-9]{64}$/.test(observed.directDependencyDigest) ||
      !Number.isSafeInteger(observed.directDependencyCount) ||
      observed.directDependencyCount < 0
    )
      throw new Error(
        "Target does not expose a supported compiled build identity",
      );
    result.observed = {
      version: 2,
      algorithm: "sha256",
      sourceDigest: observed.sourceDigest,
      inputCount: observed.inputCount,
      directDependencyDigest: observed.directDependencyDigest,
      directDependencyCount: observed.directDependencyCount,
    };
    result.localRunId =
      typeof observed.localRunId === "string" ? observed.localRunId : null;
    result.dependencyMatch =
      observed.directDependencyDigest === expected.directDependencyDigest &&
      observed.directDependencyCount === expected.directDependencyCount
        ? "matched"
        : "mismatched";
    result.sourceMatch =
      observed.sourceDigest === expected.sourceDigest
        ? "matched"
        : "mismatched";
  } catch (error) {
    result.error = error.message;
  }
  return result;
}

export function requireOwnerIdentity(target, owner) {
  if (owner && target.localRunId !== owner.runId)
    throw Object.assign(
      new Error(
        "Target does not acknowledge this owned server run. Stop it and launch a fresh server",
      ),
      { code: "UNOWNED_LOCAL_TARGET" },
    );
  if (target.sourceMatch !== "matched" || target.dependencyMatch !== "matched")
    throw Object.assign(
      new Error("Target source or direct dependency identity differs"),
      { code: "UNMATCHED_BUILD_IDENTITY" },
    );
}
