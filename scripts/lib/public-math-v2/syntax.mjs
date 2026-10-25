import ts from "typescript";

const checkers = new WeakMap();

export function unwrap(node) {
  while (
    node &&
    (ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isNonNullExpression(node) ||
      ts.isSatisfiesExpression(node))
  )
    node = node.expression;
  return node;
}

export function sourceNode(source, reference) {
  if (!source) return null;
  let found;
  const visit = (node) => {
    if (node.getStart(source) === reference.start && node.end === reference.end)
      found = node;
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

export function primitive(expression) {
  const node = unwrap(expression);
  if (!node) throw new Error("Unestablished primitive value");
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    if (node.parent && ts.isTaggedTemplateExpression(node.parent))
      throw new Error("Tagged template requires an actual formatter contract");
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    const value = Number(node.text);
    if (Number.isFinite(value)) return value;
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (
    ts.isPrefixUnaryExpression(node) &&
    [ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken].includes(
      node.operator,
    ) &&
    ts.isNumericLiteral(unwrap(node.operand))
  ) {
    const value = primitive(node.operand);
    return node.operator === ts.SyntaxKind.MinusToken ? -value : value;
  }
  throw new Error("Unestablished primitive value");
}

export function propertyName(node) {
  if (
    ts.isIdentifier(node) ||
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node)
  )
    return node.text;
  if (ts.isComputedPropertyName(node)) {
    try {
      return String(primitive(node.expression));
    } catch {
      return null;
    }
  }
  return null;
}

export function effectiveObjectProperty(expression, key) {
  const object = unwrap(expression);
  if (!object || !ts.isObjectLiteralExpression(object))
    throw new Error(`Unresolved effective property ${key}`);
  let result = { established: true, value: undefined };
  for (const item of object.properties) {
    if (ts.isSpreadAssignment(item)) {
      try {
        const spread = effectiveObjectProperty(item.expression, key);
        if (spread.present) result = spread;
      } catch {
        result = { established: false, present: true };
      }
      continue;
    }
    const name = propertyName(item.name);
    if (name === null) {
      result = { established: false, present: true };
      continue;
    }
    if (name !== key) continue;
    try {
      if (!ts.isPropertyAssignment(item))
        throw new Error("Unknown property source");
      result = {
        established: true,
        present: true,
        value: primitive(item.initializer),
      };
    } catch {
      result = { established: false, present: true };
    }
  }
  if (!result.established)
    throw new Error(`Unresolved effective property ${key}`);
  return result;
}

export function effectiveJsxProperty(opening, key) {
  let result = { established: true, value: undefined };
  for (const attribute of opening.attributes.properties) {
    if (ts.isJsxSpreadAttribute(attribute)) {
      try {
        const spread = effectiveObjectProperty(attribute.expression, key);
        if (spread.present) result = spread;
      } catch {
        result = { established: false };
      }
    } else if (attribute.name.getText() === key) {
      try {
        const initializer = attribute.initializer;
        if (
          initializer &&
          ts.isStringLiteral(initializer) &&
          /[\r\n&]/.test(initializer.text)
        )
          throw new Error("Unsupported quoted JSX attribute normalization");
        result = {
          established: true,
          value: !initializer
            ? true
            : primitive(
                ts.isJsxExpression(initializer)
                  ? initializer.expression
                  : initializer,
              ),
        };
      } catch {
        result = { established: false };
      }
    }
  }
  if (!result.established)
    throw new Error(`Unresolved effective JSX property ${key}`);
  return result.value;
}

export function declarationOf(source, identifier) {
  if (!checkers.has(source)) {
    const options = {
      noLib: true,
      noResolve: true,
      allowJs: true,
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.Latest,
    };
    const host = ts.createCompilerHost(options);
    host.getSourceFile = (file) =>
      file.endsWith(source.fileName) ? source : undefined;
    host.fileExists = (file) => file.endsWith(source.fileName);
    const program = ts.createProgram([source.fileName], options, host);
    checkers.set(source, program.getTypeChecker());
  }
  const declarations =
    checkers.get(source).getSymbolAtLocation(identifier)?.declarations ?? [];
  return declarations.length === 1 ? declarations[0] : null;
}

export function staticAccess(expression) {
  const node = unwrap(expression);
  if (ts.isIdentifier(node))
    return { root: node.text, members: [], unresolved: false };
  if (
    ts.isPropertyAccessExpression(node) ||
    ts.isElementAccessExpression(node)
  ) {
    const parent = staticAccess(node.expression);
    if (!parent) return null;
    let member;
    try {
      member = ts.isPropertyAccessExpression(node)
        ? node.name.text
        : String(primitive(node.argumentExpression));
    } catch {
      return { ...parent, unresolved: true };
    }
    return { ...parent, members: [...parent.members, member] };
  }
  return null;
}
