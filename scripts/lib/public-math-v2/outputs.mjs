import path from "node:path";
import ts from "typescript";
import { canonical, slash } from "../public-math/identity.mjs";
import { validateTex, delimiterParts } from "../math-presentation.mjs";
import { parseCode } from "../public-math/syntax.mjs";
import {
  primitive,
  sourceNode,
  declarationOf,
  effectiveJsxProperty,
  unwrap,
} from "./syntax.mjs";

const same = (actual, expected, label) => {
  if (canonical(actual) !== canonical(expected)) throw new Error(label);
};

function validateExpected(expected, renderer, role, display) {
  for (const segment of expected.segments)
    if (segment.kind === "math") validateTex(segment.tex);
  const hasMath = expected.segments.some(({ kind }) => kind === "math");
  if (["raw", "native-option", "svg-text"].includes(renderer) && hasMath)
    throw new Error("Mathematics requires its own TeX consumer");
  if (role === "mathematics" && (!hasMath || expected.segments.length !== 1))
    throw new Error("Mathematical output must be one whole expression");
  if (
    role === "mixed" &&
    (!hasMath || !expected.segments.some(({ kind }) => kind === "prose"))
  )
    throw new Error("Mixed output requires prose and whole mathematics");
  if (!["mathematics", "mixed"].includes(role) && hasMath)
    throw new Error(
      "Nonmathematical role cannot contain mathematical segments",
    );
  let actual;
  if (renderer === "tex")
    actual = [
      {
        kind: "math",
        tex: expected.raw,
        display,
      },
    ];
  else if (renderer === "delimited")
    actual = delimiterParts(expected.raw).map(({ kind, text }) =>
      kind === "text"
        ? { kind: "prose", text }
        : { kind: "math", tex: text, display: kind === "block" },
    );
  else actual = [{ kind: "prose", text: expected.raw }];
  same(
    expected.segments,
    actual,
    "Raw output and ordered whole segments disagree",
  );
}

function inlineDelimitedProducer(port, capture) {
  if (
    port.kind !== "visible-content" ||
    port.renderer !== "delimited" ||
    port.producer.file !== port.consumer.file
  )
    return false;
  const source = capture.parsed.get(port.consumer.file);
  const consumer = sourceNode(source, port.consumer);
  const producer = sourceNode(source, port.producer);
  if (!consumer || !producer || !ts.isJsxElement(consumer)) return false;
  const opening = consumer.openingElement;
  const identity = rendererIdentity(
    capture,
    port.consumer.file,
    source,
    opening.tagName,
  );
  if (
    ![
      "components/algebra/Math.tsx#Prose",
      "components/algebra/Math.tsx#WrittenProse",
    ].includes(identity)
  )
    return false;
  if (
    opening.attributes.properties.some(
      (attribute) =>
        ts.isJsxSpreadAttribute(attribute) ||
        attribute.name.getText(source) === "children",
    )
  )
    return false;
  const children = consumer.children.filter(
    (child) => !(ts.isJsxText(child) && child.text.trim() === ""),
  );
  if (
    children.length !== 1 ||
    !ts.isJsxExpression(children[0]) ||
    children[0].expression !== producer
  )
    return false;
  const assembled = (node) => {
    node = unwrap(node);
    if (ts.isTemplateExpression(node)) return true;
    if (ts.isTaggedTemplateExpression(node)) {
      const tag = node.tag;
      return (
        ts.isPropertyAccessExpression(tag) &&
        ts.isIdentifier(tag.expression) &&
        tag.expression.text === "String" &&
        tag.name.text === "raw" &&
        !declarationOf(source, tag.expression)
      );
    }
    if (ts.isConditionalExpression(node))
      return [node.whenTrue, node.whenFalse].every(
        (branch) => assembled(branch) || ts.isStringLiteral(unwrap(branch)),
      );
    return (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken &&
      [node.left, node.right].some(
        (part) => ts.isStringLiteral(unwrap(part)) || assembled(part),
      )
    );
  };
  return assembled(producer);
}

function literalProducer(capture, reference) {
  const source = capture.parsed.get(reference.file);
  if (!source)
    throw new Error(
      "Static non-code scalar leaves are unsupported; use the strict core occurrence authority or a modeled output",
    );
  const node = sourceNode(source, reference);
  if (!node) throw new Error("Static producer is not an exact source leaf");
  if (ts.isJsxText(node)) {
    if (/[\r\n&]/.test(node.text))
      throw new Error("Unresolved JSX text normalization");
    return node.text;
  }
  const value = primitive(node);
  if (!["string", "number"].includes(typeof value))
    throw new Error("Static producer is not a supported renderable primitive");
  return String(value);
}

export function rendererIdentity(capture, file, source, tagNode) {
  const resolve = (name) => {
    const resolved = ts.resolveModuleName(
      name,
      path.join(capture.root, file),
      capture.options,
      ts.sys,
    ).resolvedModule;
    if (!resolved || resolved.isExternalLibraryImport) return null;
    const target = slash(
      path.relative(capture.root, resolved.resolvedFileName),
    );
    return capture.sourceMap.has(target) ? target : null;
  };
  const tag = tagNode.getText(source);
  let root = tagNode;
  while (ts.isPropertyAccessExpression(root)) root = root.expression;
  if (!ts.isIdentifier(root)) return null;
  const binding = declarationOf(source, root);
  if (
    binding &&
    ts.isImportSpecifier(binding) &&
    tagNode === root &&
    !binding.isTypeOnly &&
    !binding.parent.parent.isTypeOnly
  ) {
    const statement = binding.parent.parent.parent;
    return `${resolve(statement.moduleSpecifier.text)}#${binding.propertyName?.text ?? binding.name.text}`;
  }
  if (
    binding &&
    ts.isNamespaceImport(binding) &&
    ts.isPropertyAccessExpression(tagNode) &&
    tagNode.expression === root &&
    !binding.parent.isTypeOnly
  ) {
    const statement = binding.parent.parent;
    return `${resolve(statement.moduleSpecifier.text)}#${tagNode.name.text}`;
  }
  return binding && ts.isFunctionDeclaration(binding) ? `${file}#${tag}` : null;
}

export function validateOutput(port, capture) {
  const { output } = port;
  const renderer = port.kind === "accessible-speech" ? "raw" : port.renderer;
  const role = port.kind === "accessible-speech" ? "ordinary-prose" : port.role;
  let display = false;
  if (["tex", "delimited"].includes(renderer)) {
    const source = parseCode(
      port.consumer.file,
      capture.sourceMap.get(port.consumer.file).bytes,
    );
    let consumer;
    const visit = (node) => {
      if (
        node.getStart(source) === port.consumer.start &&
        node.end === port.consumer.end
      )
        consumer = node;
      ts.forEachChild(node, visit);
    };
    visit(source);
    const opening =
      consumer && ts.isJsxElement(consumer)
        ? consumer.openingElement
        : consumer && ts.isJsxSelfClosingElement(consumer)
          ? consumer
          : null;
    if (!opening || /^[a-z]/.test(opening.tagName.getText(source)))
      throw new Error(
        "A raw/native consumer cannot borrow TeX from another node or ancestor",
      );
    const identity = rendererIdentity(
      capture,
      port.consumer.file,
      source,
      opening.tagName,
    );
    const expected = {
      "components/algebra/Math.tsx#Math": "tex",
      "components/algebra/Math.tsx#Prose": "delimited",
      "components/algebra/Math.tsx#WrittenProse": "delimited",
      "components/algebra/SvgMath.tsx#SvgMath": "tex",
    };
    if (expected[identity] !== renderer)
      throw new Error("Unknown or mismatched exact renderer adapter");
    if (identity === "components/algebra/Math.tsx#Math")
      display = Boolean(effectiveJsxProperty(opening, "block"));
    if (
      identity === "components/algebra/SvgMath.tsx#SvgMath" &&
      effectiveJsxProperty(opening, "className") === "svg-caption"
    )
      throw new Error(
        "A raw SVG caption cannot claim the mathematical renderer branch",
      );
  }
  if (output.kind === "static") {
    validateExpected(output.expected, renderer, role, display);
    const literal = literalProducer(capture, port.producer);
    if (literal !== output.expected.raw)
      throw new Error(
        "Static expected output differs from actual literal producer",
      );
  } else {
    const states =
      output.domain.kind === "finite"
        ? output.domain.states
        : output.domain.boundaryStates;
    same(
      output.samples.map(({ state }) => state).sort(),
      states.map(({ name }) => name).sort(),
      "Samples must cover each exact named input state once",
    );
    for (const sample of output.samples) {
      if (
        sample.producerFixture === null &&
        !inlineDelimitedProducer(port, capture)
      )
        throw new Error(
          "Null producer fixture requires the exact sole inline assembled visible Prose consumer",
        );
      same(
        sample.inputs,
        states.find(({ name }) => name === sample.state).inputs,
        "Sample inputs differ from declared state",
      );
      validateExpected(sample.expected, renderer, role, display);
    }
  }
}
