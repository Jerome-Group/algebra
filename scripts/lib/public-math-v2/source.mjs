import { readFile, realpath, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import postcss from "postcss";
import { snapshot, contractInputs } from "../public-math/contract.mjs";
import { hashValue, slash, canonical } from "../public-math/identity.mjs";
import { sha256 } from "../math-presentation.mjs";
import { parseCode } from "../public-math/syntax.mjs";
import { packageCapability } from "./packages.mjs";
import { staticAccess } from "./syntax.mjs";
import { resourceGraph, memberName } from "../public-math/resources.mjs";
import {
  packageImports,
  cssImports,
  codeExtensions,
  runtimeRoots,
  contractFiles,
  configurationNames,
} from "../public-math/policy.mjs";

export const savedEvidenceFile = "docs/research/public-math-v2/receipts.json";
const checkerRoot = fileURLToPath(new URL("../../../", import.meta.url));
const coreGenerated = "lib/algebra/math-presentation.generated.ts";
const evidencePath = (file) =>
  file === savedEvidenceFile ||
  file.startsWith("docs/research/") ||
  file === "lib/algebra/math-presentation/public-ui-review.json";
const identities = (rows) => rows.map(({ file, sha256 }) => ({ file, sha256 }));

async function checkerClosure() {
  const inputs = new Map();
  const pending = ["scripts/lib/public-math-v2.mjs"];
  while (pending.length) {
    const file = pending.pop();
    if (inputs.has(file)) continue;
    const absolute = path.join(checkerRoot, file);
    if ((await realpath(absolute)) !== absolute)
      throw new Error(`Checker symlink: ${file}`);
    const bytes = await readFile(absolute);
    inputs.set(file, sha256(bytes));
    const source = parseCode(file, bytes);
    const visit = (node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text.startsWith(".")
      ) {
        const target = slash(
          path.relative(
            checkerRoot,
            path.resolve(path.dirname(absolute), node.moduleSpecifier.text),
          ),
        );
        if (target.startsWith("../"))
          throw new Error("Checker import escapes its source tree");
        pending.push(target);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return [...inputs]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, sha256]) => ({ file, sha256 }));
}

function navigation(file, bytes, source) {
  const text = bytes.toString("utf8");
  const rows = [];
  const spans = new Set([`0:${text.length}`]);
  const add = (kind, start, end) =>
    rows.push({ kind, start, end, nodeSha256: sha256(text.slice(start, end)) });
  let ambient = false;
  if (source) {
    const visit = (node) => {
      const start = node.getStart(source);
      if (node.end > start) spans.add(`${start}:${node.end}`);
      if (ts.isCallExpression(node)) add("call", start, node.end);
      if (ts.isNewExpression(node)) add("construction", start, node.end);
      if (
        ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)
      )
        add("member-access", start, node.end);
      if (
        ts.isBinaryExpression(node) &&
        ts.isAssignmentOperator(node.operatorToken.kind)
      ) {
        add("write", start, node.end);
        if (!ts.isIdentifier(node.left)) ambient = true;
      }
      if (
        (ts.isPrefixUnaryExpression(node) ||
          ts.isPostfixUnaryExpression(node)) &&
        [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(
          node.operator,
        )
      )
        add("update", start, node.end);
      if (ts.isDeleteExpression(node)) {
        add("delete", start, node.end);
        ambient = true;
      }
      if (
        ts.isSpreadAssignment(node) ||
        ts.isSpreadElement(node) ||
        ts.isJsxSpreadAttribute(node)
      )
        add("spread", start, node.end);
      if (ts.isTaggedTemplateExpression(node))
        add("tagged-template", start, node.end);
      if (ts.isJsxExpression(node) && node.expression)
        add("jsx-expression", start, node.end);
      if (ts.isJsxAttribute(node) && node.initializer)
        add("jsx-attribute", start, node.end);
      if (ts.isJsxText(node) && node.text.trim())
        add("jsx-text", start, node.end);
      if (
        ts.isStringLiteral(node) ||
        ts.isNumericLiteral(node) ||
        ts.isTemplateExpression(node) ||
        ts.isNoSubstitutionTemplateLiteral(node)
      )
        add("scalar-producer-hint", start, node.end);
      if (
        ts.isIdentifier(node) &&
        [
          "window",
          "document",
          "globalThis",
          "global",
          "CSSStyleSheet",
        ].includes(node.text)
      )
        ambient = true;
      ts.forEachChild(node, visit);
    };
    visit(source);
  } else if (file.endsWith(".css")) {
    postcss.parse(text, { from: file }).walk((node) => {
      if (!node.source?.start || !node.source?.end) return;
      const start = node.source.start.offset;
      const end = node.source.end.offset + 1;
      spans.add(`${start}:${end}`);
      if (node.type === "decl") add("css-declaration", start, end);
      if (node.type === "atrule" && node.name === "import")
        add("resource-reference", start, end);
    });
  } else if (/\.(?:svg|json)$/.test(file))
    add("structured-or-asset-source", 0, text.length);
  return { rows, spans, ambient };
}

function completeGraph(sources, root, options) {
  const files = new Set(sources.map(({ file }) => file));
  const edges = [];
  const refusals = [];
  const reviewObligations = [];
  const packageCapabilities = [];
  const parsed = new Map();
  const refuse = (file, kind, detail) => refusals.push({ file, kind, detail });
  const resolve = (from, name, node) => {
    const resolved = ts.resolveModuleName(
      name,
      path.join(root, from),
      options,
      ts.sys,
    ).resolvedModule;
    const target =
      resolved && !resolved.isExternalLibraryImport
        ? slash(path.relative(root, resolved.resolvedFileName))
        : name.startsWith(".")
          ? slash(path.join(path.dirname(from), name))
          : name.startsWith("@/")
            ? name.slice(2)
            : null;
    if (target && evidencePath(target))
      refuse(from, "evidence-runtime-import", target);
    else if (target && !files.has(target))
      refuse(from, "unresolved-local-import", name);
    else if (!target && !packageImports.has(name) && !cssImports.has(name)) {
      const capability =
        node && (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
          ? packageCapability(root, from, node, options)
          : null;
      if (!capability) refuse(from, "unsupported-package-import", name);
      else
        packageCapabilities.push({
          file: from,
          start: node.getStart(),
          ...capability,
        });
    }
    return target ?? `package:${name}`;
  };
  for (const { file, bytes } of sources) {
    if (
      !codeExtensions.has(path.extname(file)) &&
      ![
        ".css",
        ".json",
        ".svg",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".gif",
        ".ico",
        ".woff",
        ".woff2",
      ].includes(path.extname(file))
    )
      refuse(file, "unsupported-source-type", path.extname(file));
    if (codeExtensions.has(path.extname(file))) {
      const source = parseCode(file, bytes);
      parsed.set(file, source);
      const visit = (node) => {
        const text = node.getText(source);
        if (
          (ts.isStringLiteral(node) ||
            ts.isNoSubstitutionTemplateLiteral(node)) &&
          /(?:^|\/)docs\/research\/public-math-v2\//.test(
            node.text.replaceAll("../", ""),
          )
        )
          refuse(file, "evidence-runtime-reference", text);
        const add = (name) =>
          edges.push({
            from: file,
            to: resolve(file, name, node),
            kind: "import",
            start: node.getStart(source),
            nodeSha256: sha256(text),
          });
        if (
          (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        )
          add(node.moduleSpecifier.text);
        if (ts.isImportEqualsDeclaration(node))
          refuse(file, "unsupported-module-loader", text);
        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
          if (
            node.arguments.length === 1 &&
            ts.isStringLiteral(node.arguments[0])
          )
            add(node.arguments[0].text);
          else refuse(file, "computed-import", text);
        }
        if (
          ts.isIdentifier(node) &&
          ["eval", "require", "Function", "CSSStyleSheet"].includes(node.text)
        )
          refuse(file, "unsupported-code-or-stylesheet-loader", text);
        if (
          ts.isPropertyAccessExpression(node) ||
          ts.isElementAccessExpression(node)
        ) {
          const access = staticAccess(node);
          if (
            access &&
            ["globalThis", "window", "self", "global", "document"].includes(
              access.root,
            )
          ) {
            if (access.unresolved)
              refuse(file, "unresolved-ambient-global-access", text);
            else if (
              access.members.some((member) =>
                [
                  "eval",
                  "require",
                  "Function",
                  "CSSStyleSheet",
                  "adoptedStyleSheets",
                  "importScripts",
                ].includes(member),
              )
            )
              refuse(file, "unsupported-code-or-stylesheet-loader", text);
          }
          if (access?.members.at(-1) === "adoptedStyleSheets")
            refuse(file, "unclosed-native-stylesheet", text);
        }
        if (
          ts.isCallExpression(node) &&
          ["glob", "globEager", "importScripts"].includes(
            memberName(node.expression) ?? node.expression.getText(source),
          )
        )
          refuse(file, "unsupported-module-loader", text);
        if (
          ts.isPropertyAccessExpression(node) &&
          node.name.text === "adoptedStyleSheets"
        )
          refuse(file, "unclosed-native-stylesheet", text);
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    const resources = resourceGraph({
      file,
      bytes,
      source: parsed.get(file),
      knownFiles: files,
    });
    edges.push(
      ...resources.edges.map(({ sha256: nodeSha256, ...edge }) => ({
        ...edge,
        nodeSha256,
      })),
    );
    for (const blocker of resources.blockers) {
      let matched = [];
      if (
        blocker.kind === "unsupported-asset-reference" &&
        !/\b(?:https?|data|file):|\/\//i.test(blocker.detail)
      ) {
        if (file.endsWith(".css") && /^\s*var\s*\(/.test(blocker.detail)) {
          postcss.parse(bytes, { from: file }).walkDecls((declaration) => {
            if (declaration.value === blocker.detail)
              matched.push({
                start: declaration.source.start.offset,
                end: declaration.source.end.offset + 1,
              });
          });
        } else if (parsed.has(file)) {
          const source = parsed.get(file);
          const visit = (node) => {
            if (
              node.getText(source) === blocker.detail &&
              (ts.isJsxAttribute(node) ||
                ts.isPropertyAssignment(node) ||
                ts.isShorthandPropertyAssignment(node))
            ) {
              const name = node.name.getText(source);
              if (
                ![
                  "src",
                  "srcSet",
                  "imageSrcSet",
                  "href",
                  "xlinkHref",
                  "xlink:href",
                  "srcDoc",
                  "poster",
                  "data",
                ].includes(name)
              )
                matched.push({ start: node.getStart(source), end: node.end });
            }
            ts.forEachChild(node, visit);
          };
          visit(source);
        }
      }
      if (matched.length)
        for (const { start, end } of matched)
          reviewObligations.push({
            file,
            kind: "bounded-paint-or-content-contract",
            detail: blocker.detail,
            node: {
              file,
              sha256: sha256(bytes),
              start,
              end,
              nodeSha256: sha256(bytes.toString("utf8").slice(start, end)),
            },
          });
      else refusals.push(blocker);
    }
    if (file.endsWith(".css"))
      postcss.parse(bytes, { from: file }).walkAtRules("import", (rule) => {
        const name = /^(?:url\(\s*)?["']([^"']+)["']\s*\)?(?:\s+.*)?$/.exec(
          rule.params,
        )?.[1];
        if (!name) {
          refuse(file, "unresolved-css-import", rule.params);
          return;
        }
        const target = cssImports.has(name)
          ? `package:${name}`
          : name.startsWith("/")
            ? `public/${name.slice(1)}`
            : slash(path.join(path.dirname(file), name));
        if (!target.startsWith("package:") && !files.has(target))
          refuse(file, "unresolved-css-import", name);
        edges.push({
          from: file,
          to: target,
          kind: "css-import",
          start: rule.source.start.offset,
          nodeSha256: sha256(rule.toString()),
        });
      });
  }
  edges.sort((a, b) => canonical(a).localeCompare(canonical(b)));
  const entrypoints = sources
    .filter(
      ({ file }) =>
        /^app\/(?:.*\/)?(?:page|layout|route|loading|error|not-found|global-error|template|default)\.[cm]?[jt]sx?$/.test(
          file,
        ) ||
        /^worker\/index\.[jt]s$/.test(file) ||
        file.startsWith("public/"),
    )
    .map(({ file }) => file);
  const reachable = new Set(entrypoints);
  const pending = [...reachable];
  while (pending.length) {
    const from = pending.pop();
    for (const edge of edges)
      if (edge.from === from && files.has(edge.to) && !reachable.has(edge.to)) {
        reachable.add(edge.to);
        pending.push(edge.to);
      }
  }
  const distinctObligations = [
    ...new Map(reviewObligations.map((row) => [hashValue(row), row])).values(),
  ];
  return {
    edges,
    packageCapabilities,
    refusals,
    reviewObligations: distinctObligations,
    parsed,
    reachable,
    entrypoints,
  };
}

export async function captureSource(root) {
  root = await realpath(root);
  const sources = await snapshot(root);
  const legacy = await contractInputs(root);
  const checkerInputs = await checkerClosure();
  const graph = completeGraph(sources, root, legacy.options);
  const contractDigest = hashValue({
    version: "public-math-foundation-v2",
    nodeMajor: process.versions.node.split(".")[0],
    typescript: ts.version,
    legacy: legacy.digest,
    checkerInputs,
    packageCapabilities: graph.packageCapabilities,
  });
  const navigationByFile = new Map(
    sources.map(({ file, bytes }) => [
      file,
      navigation(file, bytes, graph.parsed.get(file)),
    ]),
  );
  const globalStyles = sources
    .filter(({ file }) => file.endsWith(".css"))
    .map(({ file }) => file);
  const ambient = sources
    .filter(
      ({ file }) =>
        graph.reachable.has(file) && navigationByFile.get(file).ambient,
    )
    .map(({ file }) => file);
  const sourceMap = new Map(sources.map((row) => [row.file, row]));
  const units = sources.map(({ file, sha256 }) => {
    const reasons = new Map([[file, new Set(["owned-file"])]]);
    const add = (target, reason) => {
      if (!reasons.has(target)) reasons.set(target, new Set());
      reasons.get(target).add(reason);
    };
    const pending = [file];
    const component = new Set(pending);
    while (pending.length) {
      const current = pending.pop();
      for (const edge of graph.edges) {
        const other =
          edge.from === current
            ? edge.to
            : edge.to === current
              ? edge.from
              : null;
        if (sourceMap.has(other) && !component.has(other)) {
          component.add(other);
          pending.push(other);
        }
      }
    }
    for (const member of component) add(member, "import-caller-component");
    if (graph.reachable.has(file)) {
      for (const member of globalStyles) add(member, "shared-style");
      for (const member of ambient) add(member, "ambient-effect-floor");
    }
    const dependencyFloor = [...reasons]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, values]) => ({
        file,
        sha256: sourceMap.get(file).sha256,
        decision: { kind: "derived", reasons: [...values].sort() },
      }));
    const projection = graph.edges.filter(
      ({ from, to }) => reasons.has(from) || reasons.has(to),
    );
    const delegatedAuthority =
      file === coreGenerated ? "existing-strict-core-verifier" : null;
    const index = delegatedAuthority ? [] : navigationByFile.get(file).rows;
    const unit = {
      id: file,
      file: { file, sha256 },
      reachable: graph.reachable.has(file),
      dependencyFloor,
      graphProjectionDigest: hashValue(projection),
      navigationDigest: hashValue({ delegatedAuthority, index }),
      delegatedAuthority,
      index,
    };
    unit.fingerprint = hashValue({
      file: unit.file,
      reachable: unit.reachable,
      contractDigest,
      dependencyFloor,
      graphProjectionDigest: unit.graphProjectionDigest,
      navigationDigest: unit.navigationDigest,
    });
    return unit;
  });
  const publicPlan = {
    version: "public-math-plan-v2",
    status: "unreviewed",
    semanticApproval: false,
    sourceSetDigest: hashValue(identities(sources)),
    contractDigest,
    graphDigest: hashValue({
      edges: graph.edges,
      entrypoints: graph.entrypoints,
    }),
    files: identities(sources),
    packageCapabilities: graph.packageCapabilities,
    units,
    structuralRefusals: graph.refusals,
    reviewObligations: graph.reviewObligations,
    pending: units.map(({ id, reachable, delegatedAuthority }) => ({
      kind: "file-review",
      file: id,
      reachable,
      delegatedAuthority,
      reason:
        "Complete-file independent attestation required, including implicit effects",
    })),
  };
  return {
    root,
    checkerRoot,
    options: legacy.options,
    sources,
    sourceMap,
    parsed: graph.parsed,
    navigationByFile,
    contractInputs: legacy.inputs,
    legacyCheckerInputs: legacy.scannerInputs,
    checkerInputs,
    plan: publicPlan,
  };
}

export async function assertSourceCurrent(capture) {
  const current = await captureSource(capture.root);
  for (const key of ["sourceSetDigest", "contractDigest", "graphDigest"])
    if (current.plan[key] !== capture.plan[key])
      throw new Error(`Concurrent ${key} drift`);
}

export async function assertPlanOutputTarget(root, file) {
  const boundary = await realpath(root);
  const requested = path.resolve(root, file);
  let ancestor = requested;
  const info = async (file) => {
    try {
      return await lstat(file);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      return null;
    }
  };
  while (!(await info(ancestor))) ancestor = path.dirname(ancestor);
  const resolved = path.join(
    await realpath(ancestor),
    path.relative(ancestor, requested),
  );
  const relative = slash(path.relative(boundary, resolved));
  if (
    runtimeRoots.some(
      (name) => relative === name || relative.startsWith(name + "/"),
    ) ||
    relative === "docs/research" ||
    relative.startsWith("docs/research/") ||
    relative === savedEvidenceFile ||
    relative.startsWith("outputs/public-math-runs/") ||
    contractFiles.includes(relative) ||
    relative.startsWith("scripts/lib/public-math") ||
    configurationNames.test(relative) ||
    relative === ".openai/hosting.json"
  )
    throw new Error(
      "Refusing to overwrite public source, contract or independent review evidence",
    );
  const target = await info(requested);
  if (target?.isSymbolicLink())
    throw new Error("Refusing to overwrite an output symlink");
  if (target) {
    const protectedPaths = [
      ...[
        ...(await snapshot(root)),
        ...(await contractInputs(root)).inputs,
        { file: savedEvidenceFile },
      ].map(({ file }) => path.join(root, file)),
      ...(await checkerClosure()).map(({ file }) =>
        path.join(checkerRoot, file),
      ),
    ];
    for (const file of protectedPaths) {
      const other = await info(file);
      if (other && target.dev === other.dev && target.ino === other.ino)
        throw new Error(
          "Refusing to overwrite source, checker, contract or saved evidence alias",
        );
    }
  }
}
