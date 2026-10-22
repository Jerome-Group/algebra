import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const ignoredNames = new Set([
  ".git",
  ".DS_Store",
  "Icon\r",
  "node_modules",
  ".obsidian",
]);
const generatedSuffixes = [
  ".aux",
  ".log",
  ".out",
  ".toc",
  ".fls",
  ".fdb_latexmk",
  ".synctex.gz",
];
const supportedExtensions = new Set([
  ".tex",
  ".bib",
  ".md",
  ".txt",
  ".pdf",
  ".json",
  ".jsonl",
  ".csv",
  ".tsv",
  ".yaml",
  ".yml",
  ".npz",
  ".html",
  ".docx",
  ".pptx",
  ".xlsx",
  ".ipynb",
  ".py",
  ".mjs",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
]);
const text = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0);
const sourcePath = text.refine(
  (value) => !path.isAbsolute(value) && !value.split(/[\\/]/).includes(".."),
);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const disposition = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("covered"),
      topicIds: z.array(text).min(1),
      coverageDigest: sha256,
      reason: text,
    })
    .strict(),
  z
    .object({ kind: z.literal("duplicate"), of: sourcePath, reason: text })
    .strict(),
  z
    .object({
      kind: z.enum(["administrative", "generated", "candidate", "prepared"]),
      reason: text,
    })
    .strict(),
]);
export const sourceStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    root: text,
    reviewedBy: text,
    acceptedAt: z.string().datetime(),
    entries: z.array(
      z
        .object({
          path: sourcePath,
          sha256,
          disposition,
        })
        .strict(),
    ),
    removals: z
      .array(
        z
          .object({
            path: sourcePath,
            sha256,
            reason: text,
            reviewedBy: text,
            acceptedAt: z.string().datetime(),
          })
          .strict(),
      )
      .default([]),
  })
  .strict()
  .superRefine((state, context) => {
    const entries = new Map(state.entries.map((entry) => [entry.path, entry]));
    if (entries.size !== state.entries.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries"],
        message: "Snapshot contains duplicate paths",
      });
      return;
    }
    const resolved = new Set();
    for (const [index, entry] of state.entries.entries()) {
      const chain = new Set();
      let current = entry;
      while (
        current.disposition.kind === "duplicate" &&
        !resolved.has(current.path)
      ) {
        const original = entries.get(current.disposition.of);
        if (
          chain.has(current.path) ||
          !original ||
          original.sha256 !== current.sha256
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["entries", index, "disposition"],
            message: `Invalid duplicate disposition: ${entry.path}`,
          });
          break;
        }
        chain.add(current.path);
        current = original;
      }
      if (
        current.disposition.kind !== "duplicate" ||
        resolved.has(current.path)
      )
        for (const name of chain) resolved.add(name);
    }
  });

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function sameMetadata(left, right) {
  return (
    sameIdentity(left, right) &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function directoryEntries(children) {
  return JSON.stringify(
    children
      .map((child) => [
        child.name,
        child.isDirectory()
          ? "directory"
          : child.isFile()
            ? "file"
            : child.isSymbolicLink()
              ? "symlink"
              : "other",
      ])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

export async function scanSourceRoot(
  root,
  { readBytes = (file) => file.readFile() } = {},
) {
  const resolved = await realpath(root);
  if (!(await lstat(resolved, { bigint: true })).isDirectory())
    throw new Error("Source root must be a directory");
  const entries = [];
  const errors = [];
  const reported = new Set();
  const directories = new Map();
  const files = new Map();
  const ancestors = new Map();
  const relativePath = (absolute) =>
    path.relative(resolved, absolute).split(path.sep).join("/") || ".";
  function report(kind, absolute) {
    const relative = relativePath(absolute);
    const key = `${kind}:${relative}`;
    if (!reported.has(key)) {
      reported.add(key);
      errors.push({ kind, path: relative });
    }
  }
  async function reportSymlink(absolute) {
    try {
      report(
        inside(resolved, await realpath(absolute))
          ? "symlink"
          : "escaped-symlink",
        absolute,
      );
    } catch {
      report("unreadable-symlink", absolute);
    }
  }
  for (
    let ancestor = path.dirname(resolved);
    ;
    ancestor = path.dirname(ancestor)
  ) {
    const metadata = await lstat(ancestor, { bigint: true });
    if (!metadata.isDirectory())
      throw new Error("Source root ancestry must contain only directories");
    ancestors.set(ancestor, metadata);
    if (ancestor === path.dirname(ancestor)) break;
  }
  async function directoryMetadata(directory) {
    try {
      const metadata = await lstat(directory, { bigint: true });
      if (metadata.isSymbolicLink()) {
        await reportSymlink(directory);
        return;
      }
      if (
        !metadata.isDirectory() ||
        !inside(resolved, directory) ||
        (await realpath(directory)) !== directory
      ) {
        report("changed-directory", directory);
        return;
      }
      return metadata;
    } catch {
      report("unreadable-directory", directory);
    }
  }
  async function stableAncestors(directory) {
    for (const [ancestor, expected] of ancestors) {
      try {
        const current = await lstat(ancestor, { bigint: true });
        if (current.isDirectory() && sameIdentity(current, expected)) continue;
      } catch {}
      report("changed-directory", resolved);
      return false;
    }
    for (
      let ancestor = directory;
      inside(resolved, ancestor);
      ancestor = path.dirname(ancestor)
    ) {
      const current = await directoryMetadata(ancestor);
      const expected = directories.get(ancestor)?.metadata;
      if (!current || (expected && !sameMetadata(current, expected))) {
        report("changed-directory", ancestor);
        return false;
      }
      if (ancestor === resolved) break;
    }
    return true;
  }
  async function verifyDirectory(directory) {
    const expected = directories.get(directory);
    const before = await directoryMetadata(directory);
    if (!before) return;
    try {
      const children = await readdir(directory, { withFileTypes: true });
      const after = await directoryMetadata(directory);
      if (
        !after ||
        !sameMetadata(expected.metadata, before) ||
        !sameMetadata(before, after) ||
        expected.children !== directoryEntries(children)
      )
        report("changed-directory", directory);
    } catch {
      report("unreadable-directory", directory);
    }
  }
  async function visit(directory) {
    const before = await directoryMetadata(directory);
    if (!before || !(await stableAncestors(directory))) return;
    let children;
    try {
      children = await readdir(directory, { withFileTypes: true });
    } catch {
      report("unreadable-directory", directory);
      return;
    }
    directories.set(directory, {
      metadata: before,
      children: directoryEntries(children),
    });
    const after = await directoryMetadata(directory);
    if (!after || !sameMetadata(before, after)) {
      report("changed-directory", directory);
      return;
    }
    const sourceNames = new Set(
      children.filter((child) => child.isFile()).map(({ name }) => name),
    );
    children.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of children) {
      if (ignoredNames.has(child.name)) continue;
      const absolute = path.join(directory, child.name);
      const relative = relativePath(absolute);
      let current;
      try {
        current = await lstat(absolute, { bigint: true });
      } catch {
        report("unreadable-entry", absolute);
        continue;
      }
      if (current.isSymbolicLink()) {
        await reportSymlink(absolute);
      } else if (current.isDirectory()) {
        await visit(absolute);
      } else if (!current.isFile()) {
        report("unsupported-entry", absolute);
      } else {
        const generatedSuffix = generatedSuffixes.find((suffix) =>
          child.name.endsWith(suffix),
        );
        if (
          generatedSuffix &&
          sourceNames.has(`${child.name.slice(0, -generatedSuffix.length)}.tex`)
        )
          continue;
        if (
          !generatedSuffix &&
          !supportedExtensions.has(path.extname(child.name).toLowerCase())
        ) {
          report("unsupported-file", absolute);
          continue;
        }
        if (!(await stableAncestors(directory))) continue;
        let file;
        try {
          file = await open(
            absolute,
            constants.O_RDONLY | constants.O_NOFOLLOW,
          );
          const before = await file.stat({ bigint: true });
          const openedPath = await lstat(absolute, { bigint: true });
          if (
            !before.isFile() ||
            !openedPath.isFile() ||
            !sameMetadata(before, current) ||
            !sameMetadata(before, openedPath) ||
            !(await stableAncestors(directory))
          ) {
            report("changed-during-read", absolute);
            continue;
          }
          const bytes = await readBytes(file);
          const after = await file.stat({ bigint: true });
          const currentPath = await lstat(absolute, { bigint: true });
          if (
            !sameMetadata(before, after) ||
            !sameMetadata(currentPath, after) ||
            !currentPath.isFile() ||
            BigInt(bytes.length) !== after.size
          ) {
            report("changed-during-read", absolute);
            continue;
          }
          files.set(absolute, after);
          entries.push({
            path: relative,
            sha256: createHash("sha256").update(bytes).digest("hex"),
          });
        } catch {
          report("unreadable-file", absolute);
        } finally {
          await file?.close();
        }
      }
    }
    await verifyDirectory(directory);
  }
  await visit(resolved);
  for (const [absolute, expected] of files) {
    try {
      const current = await lstat(absolute, { bigint: true });
      if (current.isFile() && sameMetadata(current, expected)) continue;
    } catch {}
    report("changed-during-scan", absolute);
  }
  for (const directory of directories.keys()) await verifyDirectory(directory);
  await stableAncestors(resolved);
  try {
    if ((await realpath(root)) !== resolved)
      report("changed-directory", resolved);
  } catch {
    report("changed-directory", resolved);
  }
  if (!entries.length) errors.push({ kind: "empty-source-root" });
  return { root: resolved, entries, errors };
}

export function compareSourceState(scan, input) {
  if (!input)
    return {
      clean: false,
      changes: [{ kind: "uninitialized" }],
      errors: scan.errors,
    };
  const state = sourceStateSchema.parse(input);
  if (state.root !== scan.root)
    throw new Error("Snapshot belongs to another root");
  const previous = new Map(state.entries.map((entry) => [entry.path, entry]));
  const current = new Map(scan.entries.map((entry) => [entry.path, entry]));
  const changes = [];
  for (const entry of scan.entries) {
    const old = previous.get(entry.path);
    if (old?.sha256 === entry.sha256) continue;
    const moved = state.entries.find(
      (old) => old.sha256 === entry.sha256 && !current.has(old.path),
    );
    const duplicate = scan.entries.find(
      (other) => other.path !== entry.path && other.sha256 === entry.sha256,
    );
    changes.push({
      kind: old
        ? "changed"
        : moved
          ? "renamed"
          : duplicate
            ? "duplicate"
            : "added",
      path: entry.path,
      ...(moved ? { from: moved.path } : {}),
      ...(duplicate ? { duplicateOf: duplicate.path } : {}),
    });
  }
  for (const entry of state.entries)
    if (!current.has(entry.path))
      changes.push({ kind: "removed", path: entry.path });
  return {
    clean: !changes.length && !scan.errors.length,
    changes,
    errors: scan.errors,
  };
}

export async function readSourceState(file) {
  try {
    return sourceStateSchema.parse(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

export async function resolvePrivateStatePath(file, repositoryRoot) {
  const requested = path.resolve(file);
  let existingParent = path.dirname(requested);
  const remaining = [];
  while (true) {
    try {
      existingParent = await realpath(existingParent);
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      remaining.unshift(path.basename(existingParent));
      const parent = path.dirname(existingParent);
      if (parent === existingParent) throw error;
      existingParent = parent;
    }
  }
  const target = path.join(existingParent, ...remaining, path.basename(file));
  if (
    inside(path.resolve(repositoryRoot), requested) ||
    inside(await realpath(repositoryRoot), target)
  )
    throw new Error("Private source state must remain outside the repository");
  try {
    if ((await lstat(target)).isSymbolicLink())
      throw new Error("Private source state cannot use a file symlink");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const parent of new Set([path.dirname(requested), existingParent])) {
    for (let ancestor = parent; ; ancestor = path.dirname(ancestor)) {
      try {
        await lstat(path.join(ancestor, ".git"));
        throw new Error(
          "Private source state must remain outside Git checkouts",
        );
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (ancestor === path.dirname(ancestor)) break;
    }
  }
  return target;
}

export async function writePrivateState(file, state, repositoryRoot) {
  const parsed = sourceStateSchema.parse(state);
  const target = await resolvePrivateStatePath(file, repositoryRoot);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temporary = `${target}.${randomUUID()}.tmp`;
  const lockPath = `${target}.lock`;
  let lock;
  try {
    lock = await open(
      lockPath,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
    await writeFile(temporary, `${JSON.stringify(parsed, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
    const previous = await readSourceState(target);
    if (
      previous &&
      (previous.root !== parsed.root ||
        JSON.stringify(previous.removals) !==
          JSON.stringify(parsed.removals.slice(0, previous.removals.length)))
    )
      throw new Error(
        "Private source history must remain append-only for the same root",
      );
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
    if (lock) {
      await lock.close();
      await rm(lockPath);
    }
  }
}
