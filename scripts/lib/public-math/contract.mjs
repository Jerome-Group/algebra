import { readFile, readdir, lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { readFileSync, realpathSync, statSync } from "node:fs";
import ts from "typescript";
import { sha256 } from "../math-presentation.mjs";
import { existing, hashValue, slash } from "./identity.mjs";
import {
  publicReviewFile,
  runtimeRoots,
  supplementalSources,
  configurationNames,
  contractFiles,
} from "./policy.mjs";
import { declarationOf } from "../public-math-v2/syntax.mjs";
import { parseCode } from "./syntax.mjs";
import { importMetaResource, memberName } from "./resources.mjs";
export async function snapshot(root) {
  const entries = [];
  const identities = new Set();
  const visit = async (file) => {
    const absolute = path.join(root, file);
    const info = await lstat(absolute);
    if (info.isSymbolicLink())
      throw new Error(`Source symlink is unsupported: ${file}`);
    if (info.isDirectory()) {
      for (const child of (await readdir(absolute)).sort())
        await visit(file ? `${file}/${child}` : child);
    } else if (info.isFile()) {
      if (file === publicReviewFile) return;
      const identity = `${info.dev}:${info.ino}`;
      if (identities.has(identity))
        throw new Error(`Aliased source file: ${file}`);
      identities.add(identity);
      const bytes = await readFile(absolute);
      entries.push({ file, sha256: sha256(bytes), bytes });
    } else throw new Error(`Unsupported source entry: ${file}`);
  };
  for (const name of runtimeRoots)
    if (await existing(path.join(root, name))) await visit(name);
  for (const file of supplementalSources)
    if (await existing(path.join(root, file))) await visit(file);
  return entries.sort((left, right) => left.file.localeCompare(right.file));
}

function contractPath(root, absolute) {
  const requested = path.resolve(absolute);
  const file = slash(path.relative(root, requested));
  if (file.startsWith("../") || path.isAbsolute(file))
    throw new Error(`Configuration outside project is unsupported: ${file}`);
  if (realpathSync(requested) !== requested)
    throw new Error(`Contract symlink is unsupported: ${file}`);
  if (!statSync(requested).isFile())
    throw new Error(`Configuration dependency is not a file: ${file}`);
  if (file === publicReviewFile)
    throw new Error("Configuration cannot depend on public review evidence");
  return file;
}

function typescriptConfiguration(root) {
  const inputs = new Map();
  const read = (absolute) => {
    if (!ts.sys.fileExists(absolute)) return undefined;
    const file = contractPath(root, absolute);
    const bytes = readFileSync(absolute);
    inputs.set(file, sha256(bytes));
    return bytes.toString("utf8");
  };
  const host = { ...ts.sys, readFile: read };
  const configFile = path.join(root, "tsconfig.json");
  const loaded = ts.readConfigFile(configFile, read);
  if (loaded.error) throw new Error("Cannot read TypeScript configuration");
  const config = ts.parseJsonConfigFileContent(
    loaded.config,
    host,
    root,
    undefined,
    configFile,
  );
  const errors = config.errors.filter(
    ({ code }) => ![18002, 18003].includes(code),
  );
  if (errors.length)
    throw new Error(
      `Unsupported TypeScript configuration: ${ts.flattenDiagnosticMessageText(errors[0].messageText, " ")}`,
    );
  if (config.projectReferences?.length)
    throw new Error(
      "TypeScript project references are unsupported configuration dependencies",
    );
  return { options: config.options, inputs };
}

async function localContractClosure(root, seeds, options) {
  const inputs = new Map();
  const pending = [...seeds];
  while (pending.length) {
    const file = pending.pop();
    if (inputs.has(file)) continue;
    const absolute = path.join(root, file);
    contractPath(root, absolute);
    const bytes = await readFile(absolute);
    inputs.set(file, sha256(bytes));
    if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
    const source = parseCode(file, bytes);
    const add = (name, resource = false) => {
      if (["node:module", "module"].includes(name))
        throw new Error(`Unsupported configuration loader: ${file}`);
      if (!name.startsWith(".")) {
        if (name.startsWith("/") || name.startsWith("@/"))
          throw new Error(`Unsupported configuration dependency: ${name}`);
        return;
      }
      if (resource && [".", ".."].includes(name.replace(/\/$/, ""))) return;
      const resolved = resource
        ? undefined
        : ts.resolveModuleName(name, absolute, options, ts.sys).resolvedModule;
      const location =
        resolved?.resolvedFileName ??
        path.resolve(path.dirname(absolute), name);
      if (resource && ts.sys.directoryExists(location)) return;
      const target = contractPath(root, location);
      pending.push(target);
    };
    const visit = (node) => {
      if (
        ts.isImportEqualsDeclaration(node) ||
        (ts.isCallExpression(node) &&
          ["glob", "globEager", "require"].includes(
            memberName(node.expression),
          )) ||
        (ts.isIdentifier(node) &&
          node.text === "require" &&
          !declarationOf(source, node) &&
          !(
            ts.isPropertyAssignment(node.parent) && node.parent.name === node
          ) &&
          !(
            ts.isPropertyAccessExpression(node.parent) &&
            node.parent.name === node
          ) &&
          (!ts.isCallExpression(node.parent) ||
            node.parent.expression !== node))
      )
        throw new Error(`Unsupported configuration import mechanism: ${file}`);
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier
      ) {
        if (!ts.isStringLiteral(node.moduleSpecifier))
          throw new Error(`Unsupported configuration import: ${file}`);
        add(node.moduleSpecifier.text);
      } else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require"))
      ) {
        if (
          node.arguments.length !== 1 ||
          !ts.isStringLiteral(node.arguments[0])
        )
          throw new Error(
            `Computed configuration import is unsupported: ${file}`,
          );
        add(node.arguments[0].text);
      }
      const resource = importMetaResource(node);
      if (resource) {
        if (resource.name === null)
          throw new Error(
            `Computed configuration resource is unsupported: ${file}`,
          );
        add(resource.name, true);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return [...inputs]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([file, sha256]) => ({ file, sha256 }));
}

export async function contractInputs(root) {
  root = await realpath(root);
  const names = (await readdir(root)).filter((name) =>
    configurationNames.test(name),
  );
  for (const name of [".openai/hosting.json", ...contractFiles])
    if (await existing(path.join(root, name))) names.push(name);
  const config = typescriptConfiguration(root);
  const closure = await localContractClosure(root, names, config.options);
  const inputs = new Map(closure.map(({ file, sha256 }) => [file, sha256]));
  for (const [file, sha256] of config.inputs) inputs.set(file, sha256);
  const ordered = [...inputs]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([file, sha256]) => ({ file, sha256 }));
  return {
    inputs: ordered,
    scannerInputs: [],
    options: config.options,
    digest: hashValue({
      version: 2,
      typescript: ts.version,
      inputs: ordered,
      scannerInputs: [],
    }),
  };
}
