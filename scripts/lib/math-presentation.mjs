import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import katex from "katex";
import { z } from "zod";

export const publicFiles = [
  "lib/algebra/lessons.json",
  "lib/algebra/guided-lessons.json",
  "lib/algebra/units.json",
  "lib/algebra/capstone-assessments.json",
];

const assessmentRoles = Object.fromEntries(
  ["prerequisiteCheck", "boundaryCheck", "application", "transfer"].flatMap(
    (stage) => [
      [`*/${stage}/question`, "assessment-question"],
      [`*/${stage}/choices/*`, "assessment-choice"],
      [`*/${stage}/explanation`, "assessment-explanation"],
    ],
  ),
);
const lessonRoles = Object.fromEntries(
  [
    "title",
    "navTitle",
    "intuition",
    "explanation",
    "proof",
    "pitfall",
    "prompt",
    "objective",
    "conventions",
    "labScope",
    "subject",
    "family",
    "track",
    "section",
    "proofStatus",
    "exampleStatus",
    "level",
    "worked/title",
    "worked/steps/*",
    "practice/*/question",
    "practice/*/hint",
    "practice/*/answer",
    "reading/*/title",
    "reading/*/paragraphs/*",
  ].map((field) => [`*/${field}`, field]),
);

const sourceRoles = {
  "lib/algebra/lessons.json": {
    display: lessonRoles,
    math: { "*/definition": "definition", "*/theorem": "theorem" },
    exclude: {
      "*/id": "identifier",
      "*/machine": "laboratory-configuration",
      "*/connections/*": "identifier",
      "*/prerequisites/*": "identifier",
      "*/aliases/*": "search-alias",
      "*/source/**": "citation",
      "*/references/**": "citation",
      "*/reading/*/source/**": "citation",
      "*/parameters/**": "laboratory-configuration",
    },
  },
  "lib/algebra/guided-lessons.json": {
    display: {
      "*/hook": "hook",
      "*/objects": "objects",
      "*/examples/*/title": "example-title",
      "*/examples/*/steps/*": "example-step",
      "*/nonexample/title": "nonexample-title",
      "*/nonexample/explanation": "nonexample-explanation",
      "*/proofSteps/*": "proof-step",
      "*/connection": "connection",
      ...assessmentRoles,
    },
    math: {},
    exclude: Object.fromEntries(
      ["prerequisiteCheck", "boundaryCheck", "application", "transfer"].map(
        (stage) => [`*/${stage}/kind`, "assessment-kind"],
      ),
    ),
  },
  "lib/algebra/units.json": {
    display: Object.fromEntries(
      [
        "title",
        "description",
        "entryCompetencies/*",
        "outcomes/*",
        "capstone/question",
        "capstone/answer",
        "completionCriteria",
      ].map((field) => [`*/${field}`, field]),
    ),
    math: {},
    exclude: {
      "*/id": "identifier",
      "*/lessons/*": "identifier",
      "*/remediation/*": "identifier",
      "*/prerequisiteUnits/*": "identifier",
    },
  },
  "lib/algebra/capstone-assessments.json": {
    display: {
      "*/question": "assessment-question",
      "*/choices/*": "assessment-choice",
      "*/explanation": "assessment-explanation",
    },
    math: {},
    exclude: { "*/kind": "assessment-kind" },
  },
};

export const sourceSchema = z
  .object(
    Object.fromEntries(
      publicFiles.map((file) => [file, z.string().regex(/^[0-9a-f]{64}$/)]),
    ),
  )
  .strict();
const spanSchema = z
  .object({
    start: z.number().int().nonnegative().safe(),
    end: z.number().int().positive().safe(),
    raw: z.string().min(1),
    tex: z.string().min(1),
  })
  .strict();
export const manifestSchema = z
  .object({
    version: z.literal(1),
    sources: sourceSchema,
    annotations: z.array(
      z
        .object({
          source: z
            .object({
              file: z.enum(publicFiles),
              pointer: z.string().startsWith("/"),
            })
            .strict(),
          spans: z.array(spanSchema).min(1),
        })
        .strict(),
    ),
  })
  .strict();

export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const pointerKey = (key) =>
  String(key).replaceAll("~", "~0").replaceAll("/", "~1");
const pointer = (keys) => `/${keys.map(pointerKey).join("/")}`;
const matches = (pattern, keys) => {
  const parts = pattern.split("/");
  return (
    parts.every(
      (part, index) =>
        part === "**" ||
        (index < keys.length && (part === "*" || part === String(keys[index]))),
    ) &&
    (parts.at(-1) === "**" || parts.length === keys.length)
  );
};

function classify(file, keys) {
  for (const [kind, rules] of Object.entries(sourceRoles[file]))
    for (const [pattern, role] of Object.entries(rules))
      if (matches(pattern, keys)) return { kind, role };
  throw new Error(`Unclassified public string ${file}${pointer(keys)}`);
}

export function enumerateCatalogue(values) {
  const texts = new Map();
  const excluded = [];
  for (const file of publicFiles) {
    if (!(file in values)) throw new Error(`Missing public source ${file}`);
    const visit = (value, keys = [], ownerId = null) => {
      if (typeof value === "string") {
        const { kind, role } = classify(file, keys);
        const occurrence = { file, pointer: pointer(keys), ownerId, role };
        if (kind !== "display") {
          excluded.push({
            ...occurrence,
            reason: kind === "math" ? "direct-tex" : role,
          });
          return;
        }
        const entry = texts.get(value) ?? {
          text: value,
          source: { file, pointer: occurrence.pointer },
          occurrences: [],
        };
        entry.occurrences.push(occurrence);
        texts.set(value, entry);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) =>
          visit(
            item,
            [...keys, index],
            keys.length === 0 ? (item?.id ?? String(index)) : ownerId,
          ),
        );
      } else if (value && typeof value === "object") {
        for (const [key, item] of Object.entries(value))
          visit(item, [...keys, key], keys.length === 0 ? key : ownerId);
      }
    };
    visit(values[file]);
  }
  return { entries: [...texts.values()], excluded };
}

export async function readCatalogue(root) {
  const sources = Object.fromEntries(
    await Promise.all(
      publicFiles.map(async (file) => {
        const bytes = await readFile(path.resolve(root, file));
        return [
          file,
          {
            bytes,
            hash: sha256(bytes),
            value: JSON.parse(bytes.toString("utf8")),
          },
        ];
      }),
    ),
  );
  return {
    root,
    sources,
    ...enumerateCatalogue(
      Object.fromEntries(
        Object.entries(sources).map(([file, { value }]) => [file, value]),
      ),
    ),
  };
}

const delimiterPattern =
  /(\$\$[\s\S]*?\$\$|\$[^$]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
export function delimiterParts(text) {
  const parts = [];
  let start = 0;
  for (const match of text.matchAll(delimiterPattern)) {
    if (match.index > start)
      parts.push({
        kind: "text",
        start,
        end: match.index,
        text: text.slice(start, match.index),
      });
    const raw = match[0];
    const block = raw.startsWith("$$") || raw.startsWith("\\[");
    const width = raw.startsWith("$") && !block ? 1 : 2;
    parts.push({
      kind: block ? "block" : "inline",
      start: match.index,
      end: match.index + raw.length,
      text: raw.slice(width, -width),
    });
    start = match.index + raw.length;
  }
  if (start < text.length)
    parts.push({
      kind: "text",
      start,
      end: text.length,
      text: text.slice(start),
    });
  return parts;
}

export function validateTex(tex) {
  if (!tex.trim() || /\$|(?:^|[^\\])(?:\\\\)*\\[()[\]]/.test(tex))
    throw new Error("TeX must omit prose delimiters");
  if (
    /\\(?:html\w*|href|url|includegraphics|def|gdef|edef|xdef|let|futurelet|newcommand|renewcommand|providecommand|global|catcode)\b/.test(
      tex,
    )
  )
    throw new Error("Untrusted or stateful TeX command");
  const rendered = katex.renderToString(tex, {
    throwOnError: true,
    strict: "error",
    trust: false,
    output: "htmlAndMathml",
  });
  if (!rendered.includes("<math") || rendered.includes("katex-error"))
    throw new Error("TeX did not produce valid MathML");
  return rendered;
}

const scalarBoundary = (text, index) =>
  !(
    index > 0 &&
    index < text.length &&
    /[\uD800-\uDBFF]/.test(text[index - 1]) &&
    /[\uDC00-\uDFFF]/.test(text[index])
  );
const signatures = (parts) => parts.map(({ kind, text }) => ({ kind, text }));

export function presentSpans(text, spans) {
  const original = delimiterParts(text);
  let previous = 0;
  for (const span of spans) {
    if (
      span.start < previous ||
      span.end <= span.start ||
      span.end > text.length
    )
      throw new Error(
        "Spans must be sorted, nonoverlapping and within source text",
      );
    if (!scalarBoundary(text, span.start) || !scalarBoundary(text, span.end))
      throw new Error("Span splits a surrogate pair");
    if (text.slice(span.start, span.end) !== span.raw)
      throw new Error("Span raw text differs from exact source slice");
    if (
      !original.some(
        (part) =>
          part.kind === "text" &&
          span.start >= part.start &&
          span.end <= part.end,
      )
    )
      throw new Error("Span crosses an existing delimiter boundary");
    validateTex(span.tex);
    previous = span.end;
  }
  let presented = "";
  const untouched = [];
  previous = 0;
  for (const span of spans) {
    const slice = text.slice(previous, span.start);
    untouched.push({ start: previous, end: span.start, text: slice });
    presented += `${slice}$${span.tex}$`;
    previous = span.end;
  }
  untouched.push({
    start: previous,
    end: text.length,
    text: text.slice(previous),
  });
  presented += text.slice(previous);
  const expected = original.flatMap((part) => {
    if (part.kind !== "text") return [part];
    let cursor = part.start;
    const result = [];
    for (const span of spans.filter(
      (span) => span.start >= part.start && span.end <= part.end,
    )) {
      if (cursor < span.start)
        result.push({ kind: "text", text: text.slice(cursor, span.start) });
      result.push({ kind: "inline", text: span.tex });
      cursor = span.end;
    }
    if (cursor < part.end)
      result.push({ kind: "text", text: text.slice(cursor, part.end) });
    return result;
  });
  if (
    JSON.stringify(signatures(delimiterParts(presented))) !==
    JSON.stringify(signatures(expected))
  )
    throw new Error("Presentation introduces a delimiter collision");
  return { presented, untouched };
}

export function compileManifest(catalogue, input) {
  const manifest = manifestSchema.parse(input);
  for (const file of publicFiles)
    if (manifest.sources[file] !== catalogue.sources[file].hash)
      throw new Error(`Canonical source hash changed for ${file}`);
  const bySource = new Map(
    catalogue.entries.flatMap((entry) =>
      entry.occurrences.map(({ file, pointer }) => [
        `${file}:${pointer}`,
        entry,
      ]),
    ),
  );
  const byText = new Map();
  const records = [];
  for (const annotation of manifest.annotations) {
    const { file, pointer } = annotation.source;
    const entry = bySource.get(`${file}:${pointer}`);
    if (!entry)
      throw new Error(
        `Annotation is not an eligible public display source ${file}:${pointer}`,
      );
    const { presented, untouched } = presentSpans(entry.text, annotation.spans);
    const previous = byText.get(entry.text);
    if (previous && previous.presented !== presented)
      throw new Error(
        `Conflicting presentation for identical public text ${file}:${pointer}`,
      );
    const record = {
      ...annotation,
      text: entry.text,
      presented,
      untouched,
      occurrences: entry.occurrences,
    };
    records.push(record);
    if (!previous) byText.set(entry.text, record);
  }
  return {
    sources: manifest.sources,
    records,
    mappings: [...byText.values()],
    entries: catalogue.entries,
  };
}

export function catalogueQueue(catalogue, compiled) {
  const annotated = new Set(compiled?.mappings.map(({ text }) => text));
  return {
    version: 1,
    sources: Object.fromEntries(
      publicFiles.map((file) => [file, catalogue.sources[file].hash]),
    ),
    entries: catalogue.entries.map((entry) => {
      const bare = delimiterParts(entry.text)
        .filter(({ kind }) => kind === "text")
        .map(({ text }) => text)
        .join(" ");
      return {
        ...entry,
        candidate: {
          signature:
            /[=<>≤≥∈∉⊂⊆⊕⊗→↦ℤℚℝℂ∞∑∏]|\b[A-Z][0-9]+\b|[A-Za-z]_[A-Za-z0-9]|\b(?:Hom|ker|im|Aut|End)\b/.test(
              bare,
            ),
          identifiers: [...new Set(bare.match(/\b[A-Za-z]\b/g) ?? [])],
        },
        annotated: annotated.has(entry.text),
      };
    }),
    excluded: catalogue.excluded,
  };
}

export function generateModule(compiled) {
  const files = publicFiles.filter((file) =>
    compiled.mappings.some(({ source }) => source.file === file),
  );
  const imports = files
    .map(
      (file, index) =>
        `import source${index} from "./${path.basename(file)}" with { type: "json" };`,
    )
    .join("\n");
  const rows = compiled.mappings
    .map(({ source, spans }, index) => {
      const keys = source.pointer
        .slice(1)
        .split("/")
        .map((key) => key.replaceAll("~1", "/").replaceAll("~0", "~"));
      return `const text${index} = sourceText(source${files.indexOf(source.file)}, ${JSON.stringify(keys)});\nreplacements.set(text${index}, withSpans(text${index}, ${JSON.stringify(spans.map(({ start, end, tex }) => ({ start, end, tex })))}));`;
    })
    .join("\n");
  return `${imports}${imports ? "\n\n" : ""}const replacements = new Map<string, string>();\n${rows ? `\nfunction sourceText(source: unknown, keys: readonly string[]): string {\n  let value = source;\n  for (const key of keys) {\n    if (value === null || typeof value !== "object") throw new Error("Invalid compiled presentation source");\n    value = Reflect.get(value, key);\n  }\n  if (typeof value !== "string") throw new Error("Invalid compiled presentation text");\n  return value;\n}\n\nfunction withSpans(text: string, spans: readonly {start: number; end: number; tex: string}[]): string {\n  let result = "";\n  let previous = 0;\n  for (const span of spans) {\n    result += text.slice(previous, span.start) + "$" + span.tex + "$";\n    previous = span.end;\n  }\n  return result + text.slice(previous);\n}\n\n${rows}\n` : ""}\nexport function presentCatalogueText(text: string): string {\n  return replacements.get(text) ?? text;\n}\n`;
}
