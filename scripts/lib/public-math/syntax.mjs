import ts from "typescript";

export function parseCode(file, bytes) {
  const source = ts.createSourceFile(
    file,
    bytes.toString("utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  if (source.parseDiagnostics.length)
    throw new Error(
      `Source parse failure in ${file}: ${source.parseDiagnostics[0].messageText}`,
    );
  return source;
}
