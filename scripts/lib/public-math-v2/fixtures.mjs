import path from "node:path";
import { readFile, realpath, lstat } from "node:fs/promises";
import ts from "typescript";
import { parseCode } from "../public-math/syntax.mjs";
import { slash, canonical, hashValue } from "../public-math/identity.mjs";
import { sha256 } from "../math-presentation.mjs";
import { declarationOf, sourceNode, staticAccess } from "./syntax.mjs";

export const fixtureIdentity = ({
  runner,
  case: name,
  titlePath,
  source,
  parameters,
  project,
  repeat,
  closure,
}) => ({
  runner,
  case: name,
  titlePath,
  source,
  parameters,
  project,
  repeat,
  closure,
});
export const fixtureKey = (fixture) => hashValue(fixtureIdentity(fixture));

function title(node, parameters, used) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      const access = staticAccess(span.expression);
      const key =
        access && !access.unresolved
          ? [access.root, ...access.members].join(".")
          : null;
      if (!key || !Object.hasOwn(parameters, key))
        throw new Error("Unbound fixture title parameter");
      used.add(key);
      value += String(parameters[key]) + span.literal.text;
    }
    return value;
  }
  if (ts.isIdentifier(node) && typeof parameters[node.text] === "string") {
    used.add(node.text);
    return parameters[node.text];
  }
  throw new Error("Unsupported fixture title expression");
}

function registration(source, call, runner) {
  if (!ts.isCallExpression(call)) return null;
  let expression = call.expression;
  const members = [];
  while (ts.isPropertyAccessExpression(expression)) {
    members.unshift(expression.name.text);
    expression = expression.expression;
  }
  if (!ts.isIdentifier(expression)) return null;
  const binding = declarationOf(source, expression);
  const registrarModule =
    runner === "node:test" ? "node:test" : "@playwright/test";
  if (
    binding &&
    ((ts.isImportClause(binding) &&
      !binding.isTypeOnly &&
      binding.parent.moduleSpecifier.text === registrarModule &&
      runner === "node:test") ||
      (ts.isImportSpecifier(binding) &&
        !binding.isTypeOnly &&
        !binding.parent.parent.isTypeOnly &&
        binding.parent.parent.parent.moduleSpecifier.text === registrarModule &&
        ["test", "it", "describe"].includes(
          binding.propertyName?.text ?? binding.name.text,
        )))
  ) {
    if (
      (members.length && members[0] !== "describe") ||
      members.some(
        (member) => !["describe", "serial", "parallel"].includes(member),
      )
    )
      throw new Error("Unsupported skipped or modified fixture registrar");
    return {
      group:
        members.includes("describe") ||
        (ts.isImportSpecifier(binding) &&
          (binding.propertyName?.text ?? binding.name.text) === "describe"),
    };
  }
  if (
    runner === "node:test" &&
    members.length === 1 &&
    members[0] === "test" &&
    binding &&
    ts.isParameter(binding)
  ) {
    const callback = binding.parent;
    const enclosing = callback.parent;
    if (
      ts.isCallExpression(enclosing) &&
      registration(source, enclosing, runner)
    )
      return { group: false };
  }
  return null;
}

function validateRegistrarUses(source, runner) {
  const registrarModule =
    runner === "node:test" ? "node:test" : "@playwright/test";
  const visit = (node) => {
    if (ts.isIdentifier(node)) {
      const binding = declarationOf(source, node);
      const registrar =
        binding &&
        ((ts.isImportClause(binding) &&
          binding.parent.moduleSpecifier.text === registrarModule &&
          runner === "node:test") ||
          (ts.isImportSpecifier(binding) &&
            binding.parent.parent.parent.moduleSpecifier.text ===
              registrarModule &&
            ["test", "it", "describe"].includes(
              binding.propertyName?.text ?? binding.name.text,
            )));
      if (registrar && node.parent !== binding) {
        let expression = node;
        const members = [];
        while (
          ts.isPropertyAccessExpression(expression.parent) &&
          expression.parent.expression === expression
        ) {
          expression = expression.parent;
          members.push(expression.name.text);
        }
        if (
          !ts.isCallExpression(expression.parent) ||
          expression.parent.expression !== expression ||
          members.some(
            (member) =>
              ![
                "describe",
                "serial",
                "parallel",
                "configure",
                "skip",
                "only",
                "todo",
                "fixme",
                "before",
                "after",
                "beforeEach",
                "afterEach",
                "beforeAll",
                "afterAll",
                "use",
                "setTimeout",
                "slow",
              ].includes(member),
          )
        )
          throw new Error(
            "Fixture registrar escapes its supported direct registration or lifecycle calls",
          );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

export async function fixtureClosure(capture, fixture, dependencies, checked) {
  const pending = [fixture.source.file],
    visited = new Map();
  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    const absolute = path.join(capture.root, file);
    if (
      !absolute.startsWith(capture.root + path.sep) ||
      (await realpath(absolute)) !== absolute ||
      !(await lstat(absolute)).isFile()
    )
      throw new Error("Fixture closure escapes saved source");
    const bytes = await readFile(absolute);
    visited.set(file, sha256(bytes));
    const source = parseCode(file, bytes);
    const imports = [];
    const visit = (node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier
      ) {
        if (!ts.isStringLiteral(node.moduleSpecifier))
          throw new Error("Unresolved fixture import");
        if (["module", "node:module"].includes(node.moduleSpecifier.text))
          throw new Error("Unsupported fixture module loader");
        imports.push(node.moduleSpecifier.text);
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      )
        throw new Error(
          "Dynamic fixture imports require an explicit supported recorder",
        );
      if (
        ts.isImportEqualsDeclaration(node) ||
        (ts.isIdentifier(node) &&
          ["require", "eval", "Function"].includes(node.text) &&
          !declarationOf(source, node))
      )
        throw new Error("Unsupported dynamic fixture loader");
      ts.forEachChild(node, visit);
    };
    visit(source);
    for (const name of imports) {
      if (
        name.startsWith("node:") ||
        (fixture.runner === "playwright" && name === "@playwright/test")
      )
        continue;
      const resolved = ts.resolveModuleName(
        name,
        absolute,
        capture.options,
        ts.sys,
      ).resolvedModule;
      const target =
        resolved &&
        slash(path.relative(capture.root, resolved.resolvedFileName));
      if (
        !target ||
        target.startsWith("../") ||
        resolved.isExternalLibraryImport
      )
        throw new Error(
          "Fixture import is not a bound production source or saved helper",
        );
      if (capture.sourceMap.has(target)) {
        const unit = capture.plan.units.find(({ id }) => id === target);
        for (const row of unit.dependencyFloor)
          if (!dependencies.has(row.file))
            throw new Error(
              "Fixture import omits its bound production source/caller/resource closure",
            );
      } else if (
        [
          "scripts/public-math-node-reporter.mjs",
          "scripts/lib/math-presentation.mjs",
        ].includes(target) &&
        [...capture.checkerInputs, ...capture.contractInputs].some(
          ({ file }) => file === target,
        )
      )
        continue;
      else if (/^tests\//.test(target)) pending.push(target);
      else
        throw new Error(
          "Fixture import is not a bound production source or saved helper",
        );
    }
  }
  const closure = [...visited]
    .filter(([file]) => file !== fixture.source.file)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, sha256]) => ({ file, sha256 }));
  if (canonical(closure) !== canonical(fixture.closure))
    throw new Error("Fixture helper closure differs from current source");
  for (const row of closure) await checked(row);
}

export function validateRegistrationSource(fixture, text) {
  const source = parseCode(fixture.source.file, Buffer.from(text));
  validateRegistrarUses(source, fixture.runner);
  const call = sourceNode(source, fixture.source);
  const selected = call && registration(source, call, fixture.runner);
  if (!selected || selected.group || !call.arguments[0])
    throw new Error(
      "Fixture case does not name a real unshadowed registration",
    );
  const used = new Set();
  const path = [title(call.arguments[0], fixture.parameters, used)];
  let current = call.parent;
  while (current && current !== source) {
    if (ts.isCallExpression(current)) {
      const parent = registration(source, current, fixture.runner);
      if (parent && current.arguments[0])
        path.unshift(title(current.arguments[0], fixture.parameters, used));
    }
    if (
      (ts.isForStatement(current) ||
        ts.isForOfStatement(current) ||
        ts.isForInStatement(current)) &&
      Object.keys(fixture.parameters).length === 0
    )
      throw new Error("Parameterized fixture requires exact scalar parameters");
    current = current.parent;
  }
  if (Object.keys(fixture.parameters).some((key) => !used.has(key)))
    throw new Error("Unknown unused fixture scalar parameter");
  if (
    canonical(path) !== canonical(fixture.titlePath) ||
    path.at(-1) !== fixture.case
  )
    throw new Error(
      "Fixture title path differs from current registration and parameters",
    );
  const names = new Set();
  for (const statement of source.statements) {
    if (
      ts.isExpressionStatement(statement) &&
      ts.isCallExpression(statement.expression) &&
      registration(source, statement.expression, fixture.runner) &&
      ts.isStringLiteral(statement.expression.arguments[0])
    ) {
      const name = statement.expression.arguments[0].text;
      if (names.has(name))
        throw new Error("Ambiguous duplicate top-level fixture registration");
      names.add(name);
    }
  }
  const position = source.getLineAndCharacterOfPosition(call.getStart(source));
  return { line: position.line + 1, column: position.character + 1 };
}
