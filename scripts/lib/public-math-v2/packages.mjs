import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { sha256 } from "../math-presentation.mjs";
import { parseCode } from "../public-math/syntax.mjs";
import { slash, canonical } from "../public-math/identity.mjs";

const imports = new Map([
  [
    "drizzle-orm/d1",
    {
      exports: ["drizzle"],
      target: "./d1/index.js",
      declaration: "./d1/index.d.ts",
      role: "D1-storage-and-query-serialization",
    },
  ],
  [
    "drizzle-orm/sqlite-core",
    {
      exports: ["index", "integer", "primaryKey", "sqliteTable", "text"],
      target: "./sqlite-core/index.js",
      declaration: "./sqlite-core/index.d.ts",
      role: "SQLite-schema-construction",
    },
  ],
]);
const named = (node) =>
  node.importClause &&
  !node.importClause.name &&
  node.importClause.namedBindings &&
  ts.isNamedImports(node.importClause.namedBindings)
    ? node.importClause.namedBindings.elements
    : null;

export function packageCapability(root, from, node, options) {
  const name = node.moduleSpecifier.text;
  const elements = ts.isImportDeclaration(node) && named(node);
  const erased = Boolean(
    elements?.length &&
    (node.importClause.isTypeOnly || elements.every((item) => item.isTypeOnly)),
  );
  if (erased) {
    if (
      name !== "next" ||
      canonical(
        elements
          .map((item) => item.propertyName?.text ?? item.name.text)
          .sort(),
      ) !== canonical(["Metadata"])
    )
      return null;
    const emitted = ts.transpileModule(node.getText(), {
      compilerOptions: options,
    }).outputText;
    const source = parseCode("erased.js", Buffer.from(emitted));
    if (
      source.statements.some(
        (item) =>
          ts.isImportDeclaration(item) && item.moduleSpecifier.text === name,
      )
    )
      throw new Error(
        "Type-only package import remains in actual compiler emit",
      );
  } else if (
    !elements?.length ||
    elements.some((item) => item.isTypeOnly) ||
    !imports.has(name) ||
    canonical(
      elements.map((item) => item.propertyName?.text ?? item.name.text).sort(),
    ) !== canonical(imports.get(name).exports)
  )
    return null;
  const packageName = erased ? "next" : "drizzle-orm";
  const packageRoot = path.join(root, "node_modules", packageName);
  const bytes = fs.readFileSync(path.join(packageRoot, "package.json"));
  const manifest = JSON.parse(bytes);
  const locked = JSON.parse(
    fs.readFileSync(path.join(root, "package-lock.json")),
  ).packages?.[`node_modules/${packageName}`];
  if (
    !locked ||
    manifest.name !== packageName ||
    manifest.version !== locked.version ||
    manifest.version !== (erased ? "16.4.2" : "0.45.2")
  )
    throw new Error("Narrow package capability installed metadata mismatch");
  const resolution = ts.resolveModuleName(
    name,
    path.join(root, from),
    options,
    ts.sys,
  ).resolvedModule;
  const expected = erased ? "./index.d.ts" : imports.get(name).declaration;
  if (
    !resolution ||
    path.resolve(resolution.resolvedFileName) !==
      path.resolve(packageRoot, expected)
  )
    throw new Error("Narrow package capability compiler resolution differs");
  const rows = [
    { file: `node_modules/${packageName}/package.json`, sha256: sha256(bytes) },
  ];
  const exportTables = new Map();
  const add = (file) => {
    const absolute = path.resolve(packageRoot, file);
    if (
      !absolute.startsWith(packageRoot + path.sep) ||
      fs.realpathSync(absolute) !== absolute
    )
      throw new Error("Package resource escapes selected installed package");
    const key = slash(path.relative(root, absolute));
    if (rows.some((row) => row.file === key)) return;
    const content = fs.readFileSync(absolute);
    rows.push({ file: key, sha256: sha256(content) });
    if (!file.endsWith(".js")) return;
    const source = parseCode(file, content);
    const table = {
      names: new Set(),
      locals: new Set(),
      forwards: [],
      stars: [],
    };
    exportTables.set(absolute, table);
    for (const statement of source.statements) {
      if (statement.name && ts.isIdentifier(statement.name))
        table.locals.add(statement.name.text);
      if (ts.isVariableStatement(statement))
        for (const declaration of statement.declarationList.declarations)
          if (ts.isIdentifier(declaration.name))
            table.locals.add(declaration.name.text);
    }
    for (const statement of source.statements) {
      if (ts.isExportDeclaration(statement)) {
        if (statement.exportClause && ts.isNamedExports(statement.exportClause))
          for (const element of statement.exportClause.elements) {
            const imported = element.propertyName?.text ?? element.name.text;
            if (statement.moduleSpecifier)
              table.forwards.push({
                name: element.name.text,
                imported,
                target: path.resolve(
                  path.dirname(absolute),
                  statement.moduleSpecifier.text,
                ),
              });
            else if (table.locals.has(imported))
              table.names.add(element.name.text);
          }
        else if (statement.moduleSpecifier && !statement.exportClause)
          table.stars.push(
            path.resolve(
              path.dirname(absolute),
              statement.moduleSpecifier.text,
            ),
          );
        else if (
          statement.exportClause &&
          ts.isNamespaceExport(statement.exportClause)
        )
          table.names.add(statement.exportClause.name.text);
      }
      if (
        statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
        )
      ) {
        if (statement.name && ts.isIdentifier(statement.name))
          table.names.add(statement.name.text);
        if (ts.isVariableStatement(statement))
          for (const declaration of statement.declarationList.declarations)
            if (ts.isIdentifier(declaration.name))
              table.names.add(declaration.name.text);
      }
    }
    const visit = (item) => {
      if (
        (ts.isImportDeclaration(item) || ts.isExportDeclaration(item)) &&
        item.moduleSpecifier
      ) {
        if (
          !ts.isStringLiteral(item.moduleSpecifier) ||
          !item.moduleSpecifier.text.startsWith(".")
        )
          throw new Error("Unsupported external package capability resource");
        add(
          slash(
            path.relative(
              packageRoot,
              path.resolve(path.dirname(absolute), item.moduleSpecifier.text),
            ),
          ),
        );
      }
      if (
        ts.isCallExpression(item) &&
        item.expression.kind === ts.SyntaxKind.ImportKeyword
      )
        throw new Error("Unsupported dynamic package capability resource");
      ts.forEachChild(item, visit);
    };
    visit(source);
  };
  add(expected);
  if (erased) {
    for (const [from, request, target, selectedName] of [
      ["./index.d.ts", "./types", "./types.d.ts", null],
      ["./types.d.ts", "./dist/types", "./dist/types.d.ts", null],
      [
        "./dist/types.d.ts",
        "./lib/metadata/types/metadata-interface",
        "./dist/lib/metadata/types/metadata-interface.d.ts",
        "Metadata",
      ],
    ]) {
      const absolute = path.resolve(packageRoot, from);
      const source = parseCode(from, fs.readFileSync(absolute));
      const selected = source.statements.filter(
        (statement) =>
          ts.isExportDeclaration(statement) &&
          statement.moduleSpecifier?.text === request &&
          (selectedName
            ? statement.exportClause &&
              ts.isNamedExports(statement.exportClause) &&
              statement.exportClause.elements.some(
                (element) =>
                  element.name.text === selectedName &&
                  (element.propertyName?.text ?? element.name.text) ===
                    selectedName,
              )
            : !statement.exportClause),
      );
      const resolved = ts.resolveModuleName(
        request,
        absolute,
        options,
        ts.sys,
      ).resolvedModule;
      if (
        selected.length !== 1 ||
        !resolved ||
        path.resolve(resolved.resolvedFileName) !==
          path.resolve(packageRoot, target)
      )
        throw new Error("Selected Metadata type export resolution changed");
      add(target);
    }
    const metadata = parseCode(
      "metadata-interface.d.ts",
      fs.readFileSync(
        path.join(
          packageRoot,
          "dist/lib/metadata/types/metadata-interface.d.ts",
        ),
      ),
    );
    if (
      !metadata.statements.some(
        (statement) =>
          ts.isInterfaceDeclaration(statement) &&
          statement.name.text === "Metadata",
      ) ||
      !metadata.statements.some(
        (statement) =>
          ts.isExportDeclaration(statement) &&
          !statement.moduleSpecifier &&
          statement.exportClause &&
          ts.isNamedExports(statement.exportClause) &&
          statement.exportClause.elements.some(
            (element) => element.name.text === "Metadata",
          ),
      )
    )
      throw new Error("Selected Metadata interface/export is absent");
  } else {
    const capability = imports.get(name);
    const target =
      manifest.exports?.[`./${name.split("/").slice(1).join("/")}`]?.import
        ?.default;
    if (target !== capability.target)
      throw new Error("Selected package export resolution changed");
    add(target);
    let changed = true;
    while (changed) {
      changed = false;
      for (const table of exportTables.values()) {
        for (const forwarded of table.forwards) {
          const exported = exportTables.get(forwarded.target);
          if (!exported)
            throw new Error("Unresolved selected named package export");
          if (
            exported.names.has(forwarded.imported) &&
            !table.names.has(forwarded.name)
          ) {
            table.names.add(forwarded.name);
            changed = true;
          }
        }
        for (const star of table.stars) {
          const exported = exportTables.get(star);
          if (!exported)
            throw new Error("Unresolved selected package barrel export");
          for (const name of exported.names)
            if (!table.names.has(name)) {
              table.names.add(name);
              changed = true;
            }
        }
      }
    }
    const selected = exportTables.get(path.resolve(packageRoot, target));
    if (capability.exports.some((name) => !selected.names.has(name)))
      throw new Error(
        "Selected package does not expose actual imported export",
      );
  }
  return {
    name,
    exports: elements
      .map((item) => item.propertyName?.text ?? item.name.text)
      .sort(),
    kind: erased ? "erased-type-dependency" : "runtime-capability",
    role: erased ? "Next-Metadata-type-only" : imports.get(name).role,
    version: manifest.version,
    compilerTarget: slash(path.relative(root, resolution.resolvedFileName)),
    rows: rows.sort((a, b) => a.file.localeCompare(b.file)),
  };
}
