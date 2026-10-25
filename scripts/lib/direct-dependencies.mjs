import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sections = ["dependencies", "devDependencies"];

export function directDependencies(root) {
  const manifestBytes = fs.readFileSync(path.join(root, "package.json"));
  const lockBytes = fs.readFileSync(path.join(root, "package-lock.json"));
  const manifest = JSON.parse(manifestBytes);
  const lock = JSON.parse(lockBytes);
  if (lock.lockfileVersion !== 3 || !lock.packages?.[""])
    throw new Error(
      "Direct dependency coherence requires lockfile v3 root declarations",
    );
  const rows = [],
    names = new Set();
  for (const section of sections) {
    const declarations = manifest[section] ?? {};
    const lockedDeclarations = lock.packages[""][section] ?? {};
    if (
      JSON.stringify(Object.entries(declarations).sort()) !==
      JSON.stringify(Object.entries(lockedDeclarations).sort())
    )
      throw new Error(
        `Direct dependency declarations differ from lock: ${section}`,
      );
    for (const [name, declared] of Object.entries(declarations).sort()) {
      if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(name) || names.has(name))
        throw new Error(`Ambiguous direct dependency: ${name}`);
      names.add(name);
      const locked = lock.packages[`node_modules/${name}`];
      if (!locked || typeof locked.version !== "string" || locked.link)
        throw new Error(`Missing direct locked metadata: ${name}`);
      const bytes = fs.readFileSync(
        path.join(root, "node_modules", name, "package.json"),
      );
      const installed = JSON.parse(bytes);
      if (installed.name !== name || installed.version !== locked.version)
        throw new Error(
          `Installed direct dependency mismatch: ${name}; locked ${locked.version}, installed ${installed.version}`,
        );
      rows.push({
        name,
        section,
        declared,
        version: locked.version,
        packageSha256: sha256(bytes),
        integrity: locked.integrity ?? null,
      });
    }
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  const snapshot = {
    version: 1,
    scope: "declared-direct-metadata-only",
    manifestSha256: sha256(manifestBytes),
    lockSha256: sha256(lockBytes),
    rows,
  };
  return {
    ...snapshot,
    digest: sha256(JSON.stringify(snapshot)),
    count: rows.length,
  };
}
