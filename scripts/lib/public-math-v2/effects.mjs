import ts from "typescript";
import postcss from "postcss";
import { rendererIdentity } from "./outputs.mjs";
import { canonical } from "../public-math/identity.mjs";
import {
  sourceNode,
  effectiveObjectProperty,
  declarationOf,
  effectiveJsxProperty,
} from "./syntax.mjs";

const same = (actual, expected, label) => {
  if (canonical(actual) !== canonical(expected)) throw new Error(label);
};

export function validateEffect(effect, capture) {
  const call = (reference, suffix) => {
    const node = sourceNode(capture.parsed.get(reference.file), reference);
    const expression =
      node && ts.isCallExpression(node) ? node.expression.getText() : null;
    if (
      !expression ||
      !(suffix.startsWith(".")
        ? expression.endsWith(suffix)
        : expression === suffix)
    )
      throw new Error(`Effect lacks actual ${suffix} operation`);
    return node;
  };
  if (effect.kind === "svg-geometry") {
    const opening = (reference) => {
      const node = sourceNode(capture.parsed.get(reference.file), reference);
      return node && ts.isJsxElement(node)
        ? node.openingElement
        : node && ts.isJsxSelfClosingElement(node)
          ? node
          : null;
    };
    const figure = opening(effect.figure);
    if (
      !figure ||
      figure.attributes.properties.some(ts.isJsxSpreadAttribute) ||
      effectiveJsxProperty(figure, "viewBox") !== effect.expectedViewBox
    )
      throw new Error("SVG geometry requires the exact effective viewBox");
    const nativeFigure = opening(effect.nativeFigure);
    if (figure.tagName.getText() === "svg") {
      same(
        effect.figure,
        effect.nativeFigure,
        "Native SVG figure binding differs",
      );
    } else {
      const source = capture.parsed.get(effect.figure.file);
      if (
        rendererIdentity(
          capture,
          effect.figure.file,
          source,
          figure.tagName,
        ) !== "components/algebra/Diagram.tsx#Diagram" ||
        !nativeFigure ||
        nativeFigure.tagName.getText() !== "svg" ||
        effect.nativeFigure.file !== "components/algebra/Diagram.tsx"
      )
        throw new Error("Unknown SVG figure adapter");
      const properties = nativeFigure.attributes.properties;
      if (
        properties.length !== 1 ||
        !ts.isJsxSpreadAttribute(properties[0]) ||
        properties[0].expression.getText() !== "props"
      )
        throw new Error("Unsupported effective native SVG forwarding");
      const declaration = declarationOf(
        capture.parsed.get(effect.nativeFigure.file),
        properties[0].expression,
      );
      if (
        !declaration ||
        !ts.isBindingElement(declaration) ||
        !declaration.dotDotDotToken ||
        declaration.parent.parent.parent.name?.text !== "Diagram"
      )
        throw new Error("SVG forwarding lacks the exact Diagram rest binding");
    }
    const viewBox = sourceNode(
      capture.parsed.get(effect.viewBox.file),
      effect.viewBox,
    );
    if (
      !viewBox ||
      !ts.isJsxAttribute(viewBox) ||
      viewBox.name.getText() !== "viewBox" ||
      !figure.attributes.properties.includes(viewBox)
    )
      throw new Error("SVG viewBox node differs from owning figure");
    const writerIds = new Set();
    for (const writer of effect.writers) {
      if (writerIds.has(writer.id)) throw new Error("Duplicate SVG writer");
      writerIds.add(writer.id);
      const element = opening(writer.element);
      if (
        !element ||
        element.tagName.getText() !== writer.tag ||
        element.attributes.properties.some(ts.isJsxSpreadAttribute)
      )
        throw new Error("Unsupported SVG tag or effective spread");
      if (
        writer.element.file !== effect.component.file ||
        writer.element.start < effect.component.start ||
        writer.element.end > effect.component.end
      )
        throw new Error("SVG writer lies outside owning figure");
      same(
        writer.attributes.map(({ start, end }) => ({ start, end })),
        element.attributes.properties.map((attribute) => ({
          start: attribute.getStart(),
          end: attribute.end,
        })),
        "SVG attribute order differs from actual native writer",
      );
      same(
        writer.values.map(({ attribute }) => attribute).sort(),
        writer.tag === "line" ? ["x1", "x2", "y1", "y2"] : ["points"],
        "SVG writer requires every supported coordinate exactly once",
      );
      for (const value of writer.values) {
        const attributes = element.attributes.properties.filter(
          (attribute) =>
            ts.isJsxAttribute(attribute) &&
            attribute.name.getText() === value.attribute,
        );
        if (attributes.length !== 1)
          throw new Error("Ambiguous SVG coordinate attribute");
        const attribute = attributes[0];
        const expression =
          attribute.initializer && ts.isJsxExpression(attribute.initializer)
            ? attribute.initializer.expression
            : attribute.initializer;
        if (
          !expression ||
          value.source.file !== writer.element.file ||
          expression.getStart() !== value.source.start ||
          expression.end !== value.source.end
        )
          throw new Error(
            "SVG coordinate source differs from effective attribute writer",
          );
      }
    }
    for (const sample of effect.samples) {
      same(
        Object.keys(sample.expected).sort(),
        [...writerIds].sort(),
        "SVG sample omits or substitutes writer",
      );
      for (const writer of effect.writers) {
        const values = sample.expected[writer.id];
        if (writer.tag === "line") {
          same(
            Object.keys(values).sort(),
            ["x1", "x2", "y1", "y2"],
            "SVG line sample has wrong coordinates",
          );
          if (
            !Object.values(values).every(
              (value) => typeof value === "number" && Number.isFinite(value),
            )
          )
            throw new Error("Nonfinite SVG line sample");
        } else if (
          !Array.isArray(values) ||
          values.length < 3 ||
          values.some(
            (pair) =>
              !Array.isArray(pair) ||
              pair.length !== 2 ||
              pair.some(
                (value) => typeof value !== "number" || !Number.isFinite(value),
              ),
          )
        )
          throw new Error("SVG polygon needs ordered finite coordinate pairs");
      }
    }
  } else if (effect.kind === "geometry") {
    const writer = call(effect.writer, ".setProperty");
    if (
      !ts.isStringLiteral(writer.arguments[0]) ||
      writer.arguments[0].text !== effect.property
    )
      throw new Error("Geometry property differs from its actual writer");
    for (const consumer of effect.cssConsumers) {
      let consumes = false;
      if (consumer.file.endsWith(".css"))
        postcss
          .parse(capture.sourceMap.get(consumer.file).bytes, {
            from: consumer.file,
          })
          .walkDecls((declaration) => {
            const start = declaration.source.start.offset,
              end = declaration.source.end.offset + 1;
            if (
              start >= consumer.start &&
              end <= consumer.end &&
              /^var\(\s*(--[A-Za-z0-9_-]+)\s*\)$/.exec(
                declaration.value,
              )?.[1] === effect.property
            )
              consumes = true;
          });
      if (!consumes)
        throw new Error("Geometry lacks an exact CSS property consumer");
    }
  } else if (effect.kind === "file-reset") {
    const element = sourceNode(
      capture.parsed.get(effect.inputElement.file),
      effect.inputElement,
    );
    const opening =
      element && ts.isJsxElement(element)
        ? element.openingElement
        : element && ts.isJsxSelfClosingElement(element)
          ? element
          : null;
    if (!opening || opening.tagName.getText() !== "input")
      throw new Error("File reset lacks its actual input element");
    same(
      effect.attributeOrder.map(({ start, end }) => ({ start, end })),
      opening.attributes.properties.map((attribute) => ({
        start: attribute.getStart(),
        end: attribute.end,
      })),
      "File reset must bind every attribute and spread in exact order",
    );
    const attributes = [...opening.attributes.properties];
    const lastType = attributes.findLastIndex(
      (attribute) =>
        ts.isJsxAttribute(attribute) && attribute.name.getText() === "type",
    );
    const attribute = attributes[lastType];
    if (
      !attribute?.initializer ||
      !ts.isStringLiteral(attribute.initializer) ||
      attribute.initializer.text !== "file" ||
      attributes.slice(lastType + 1).some(ts.isJsxSpreadAttribute)
    )
      throw new Error("Final effective file input type is not established");
    const operation = sourceNode(
      capture.parsed.get(effect.operation.file),
      effect.operation,
    );
    if (
      !operation ||
      !ts.isBinaryExpression(operation) ||
      operation.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
      !ts.isStringLiteral(operation.right) ||
      operation.right.text !== ""
    )
      throw new Error("File reset must actually write the empty string");
  } else if (effect.kind === "private-download") {
    call(effect.serializer, "JSON.stringify");
    const source = capture.parsed.get(effect.blob.file);
    const blob = sourceNode(source, effect.blob);
    if (
      !blob ||
      !ts.isNewExpression(blob) ||
      blob.expression.getText() !== "Blob" ||
      declarationOf(source, blob.expression) ||
      effectiveObjectProperty(blob.arguments?.[1], "type").value !== effect.mime
    )
      throw new Error("Private download lacks the actual JSON Blob");
    const anchor = call(effect.anchor, "document.createElement");
    if (
      !ts.isStringLiteral(anchor.arguments[0]) ||
      anchor.arguments[0].text !== "a"
    )
      throw new Error("Private download lacks its owned anchor");
    call(effect.urlCreation, "URL.createObjectURL");
    call(effect.activation, ".click");
    call(effect.revocation, "URL.revokeObjectURL");
    call(effect.removal, ".remove");
  }
}
