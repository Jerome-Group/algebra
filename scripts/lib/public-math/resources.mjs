import path from "node:path";
import ts from "typescript";
import postcss from "postcss";
import { sha256 } from "../math-presentation.mjs";
import { slash } from "./identity.mjs";
import { publicReviewFile } from "./policy.mjs";

const resourceAttributes = {
  img: ["src", "srcSet"],
  source: ["src", "srcSet"],
  video: ["src", "poster"],
  audio: ["src"],
  track: ["src"],
  iframe: ["src", "srcDoc"],
  embed: ["src"],
  object: ["data"],
  input: ["src"],
  script: ["src"],
  link: ["href", "imageSrcSet"],
  image: ["href", "xlinkHref", "xlink:href", "src"],
  use: ["href", "xlinkHref", "xlink:href"],
  feImage: ["href", "xlinkHref", "xlink:href"],
  textPath: ["href", "xlinkHref", "xlink:href"],
  mpath: ["href", "xlinkHref", "xlink:href"],
  pattern: ["href", "xlinkHref", "xlink:href"],
  linearGradient: ["href", "xlinkHref", "xlink:href"],
  radialGradient: ["href", "xlinkHref", "xlink:href"],
};
const imageStyles = new Set([
  "background",
  "backgroundImage",
  "borderImage",
  "borderImageSource",
  "listStyle",
  "listStyleImage",
  "mask",
  "maskImage",
  "WebkitMask",
  "WebkitMaskImage",
  "content",
  "cursor",
  "filter",
  "clipPath",
  "fill",
  "stroke",
  "marker",
  "markerStart",
  "markerMid",
  "markerEnd",
]);

export const isResourceAttribute = (tag, property) =>
  resourceAttributes[tag]?.includes(property) ?? false;

export function literalText(node) {
  return node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : null;
}

export function memberName(node) {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node))
    return literalText(node.argumentExpression);
  return null;
}

function unwrapExpression(node) {
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

function isImportMetaUrl(node) {
  return (
    node &&
    memberName(node) === "url" &&
    ts.isMetaProperty(node.expression) &&
    node.expression.keywordToken === ts.SyntaxKind.ImportKeyword
  );
}

export function importMetaResource(node) {
  if (
    ts.isMetaProperty(node) &&
    node.keywordToken === ts.SyntaxKind.ImportKeyword &&
    !isImportMetaUrl(node.parent)
  )
    return { name: null };
  if (isImportMetaUrl(node)) {
    let base = node;
    while (base.parent && unwrapExpression(base.parent) === node)
      base = base.parent;
    return ts.isNewExpression(base.parent) &&
      base.parent.arguments?.[1] === base
      ? null
      : { name: null };
  }
  if (!ts.isNewExpression(node)) return null;
  const base = unwrapExpression(node.arguments?.[1]);
  if (!isImportMetaUrl(base)) return null;
  const constructor = unwrapExpression(node.expression);
  return {
    name:
      node.arguments.length === 2 &&
      ts.isIdentifier(constructor) &&
      constructor.text === "URL"
        ? literalText(unwrapExpression(node.arguments[0]))
        : null,
  };
}

export function resourceGraph({ file, bytes, source, knownFiles }) {
  const edges = [];
  const blockers = [];
  const unsupported = (detail) =>
    blockers.push({ file, kind: "unsupported-asset-reference", detail });
  const add = (name, { relative = false, start = 0, text = name } = {}) => {
    if (
      name === null ||
      !name ||
      /[\\\s]|^[a-z][a-z\d+.-]*:|^\/\//i.test(name)
    ) {
      unsupported(text ?? "computed resource");
      return;
    }
    if (name.startsWith("#")) return;
    let pathname;
    try {
      pathname = decodeURIComponent(name.split(/[?#]/)[0]);
    } catch {
      unsupported(text);
      return;
    }
    if (/[\\\s]/.test(pathname)) {
      unsupported(text);
      return;
    }
    const target = name.startsWith("/")
      ? slash(path.join("public", pathname.slice(1)))
      : relative
        ? slash(path.join(path.dirname(file), pathname))
        : null;
    if (target === publicReviewFile) {
      blockers.push({ file, kind: "evidence-runtime-resource", detail: name });
      return;
    }
    if (!target || target.startsWith("../") || !knownFiles.has(target)) {
      unsupported(text);
      return;
    }
    edges.push({
      from: file,
      to: target,
      kind: "resource",
      start,
      sha256: sha256(text),
    });
  };
  const css = (value, location, property) => {
    const key = property?.replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );
    if (imageStyles.has(key) && /var\s*\(/i.test(value)) unsupported(value);
    if (/\\|(?:image-set|cross-fade|image|paint|element)\s*\(/i.test(value))
      unsupported(value);
    const pattern = /url\s*\(/gi;
    while (pattern.exec(value)) {
      const tail = value.slice(pattern.lastIndex);
      const token = /^\s*(?:"([^"\\]*)"|'([^'\\]*)'|([^\s"'()\\]*))\s*\)/.exec(
        tail,
      );
      if (!token) {
        unsupported(value);
        return;
      }
      add(token[1] ?? token[2] ?? token[3], { ...location, text: value });
      pattern.lastIndex += token[0].length;
    }
  };
  const srcset = (value, location) => {
    if (value === null) {
      unsupported(location.text);
      return;
    }
    for (const entry of value.split(",")) {
      const match =
        /^\s*(\S+)(?:\s+(?:\d+w|(?:\d+(?:\.\d+)?|\.\d+)x))?\s*$/.exec(entry);
      if (!match) unsupported(value);
      else add(match[1], location);
    }
  };
  if (path.extname(file) === ".css") {
    postcss.parse(bytes, { from: file }).walkDecls((declaration) =>
      css(
        declaration.value,
        {
          relative: true,
          start: declaration.source.start.offset,
          text: declaration.toString(),
        },
        declaration.prop,
      ),
    );
  } else if (path.extname(file) === ".svg") {
    const text = bytes.toString("utf8");
    if (
      /<(?:script|style|foreignObject|animate|set)\b|<!DOCTYPE|<!ENTITY|<\/?\s*[\w.-]+:|\s(?:[\w.-]+:)?on[\w.-]*\s*=/i.test(
        text,
      )
    )
      unsupported("Unsupported embedded SVG mechanism");
    for (const match of text.matchAll(
      /<(image|use|feImage|textPath|mpath|pattern|linearGradient|radialGradient)\b[^>]*>/gi,
    )) {
      const tag = match[0];
      for (const attribute of tag.matchAll(
        /(?:^|\s)(?:href|xlink:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
      ))
        add(attribute[1] ?? attribute[2], {
          relative: true,
          start: match.index,
          text: tag,
        });
      if (
        /\b(?:href|xlink:href|src)\s*=/.test(tag) &&
        !/(?:href|xlink:href|src)\s*=\s*["']/.test(tag)
      )
        unsupported(tag);
    }
    css(text, { relative: true });
  } else if (source) {
    const visit = (node) => {
      const resource = importMetaResource(node);
      if (resource)
        add(resource.name, {
          relative: true,
          start: node.getStart(source),
          text: node.getText(source),
        });
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source);
        for (const attribute of node.attributes.properties) {
          if (!ts.isJsxAttribute(attribute) || !attribute.initializer) continue;
          const property = attribute.name.getText(source);
          const value = unwrapExpression(
            ts.isJsxExpression(attribute.initializer)
              ? attribute.initializer.expression
              : attribute.initializer,
          );
          const location = {
            start: attribute.getStart(source),
            text: attribute.getText(source),
          };
          if (isResourceAttribute(tag, property)) {
            if (property === "srcDoc") unsupported(location.text);
            else if (["srcSet", "imageSrcSet"].includes(property))
              srcset(literalText(value), location);
            else {
              const expression =
                value && memberName(value) === "href"
                  ? value.expression
                  : value;
              const url = expression && importMetaResource(expression);
              if (!url) add(literalText(value), location);
            }
          } else if (property === "style") {
            if (!value || !ts.isObjectLiteralExpression(value)) {
              unsupported(location.text);
              continue;
            }
            for (const item of value.properties) {
              if (
                !ts.isPropertyAssignment(item) ||
                !item.name ||
                ts.isComputedPropertyName(item.name)
              ) {
                unsupported(item.getText(source));
                continue;
              }
              const key = ts.isIdentifier(item.name)
                ? item.name.text
                : literalText(item.name);
              const literal = literalText(item.initializer);
              if (literal !== null) css(literal, location, key);
              else if (imageStyles.has(key)) unsupported(item.getText(source));
            }
          } else if (imageStyles.has(property)) {
            const literal = literalText(value);
            if (literal !== null) css(literal, location, property);
            else unsupported(location.text);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { edges, blockers };
}
