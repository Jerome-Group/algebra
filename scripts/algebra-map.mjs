import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import ts from "typescript";

export const root =
  process.env.ALGEBRA_MAP_ROOT ??
  fileURLToPath(new URL("../", import.meta.url));
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(`lib/algebra/${file}.json`));
export const mapPath = path.join(root, "lib/algebra/feature-map.json");

function sourceHashes() {
  const excluded = (file) =>
    file === "lib/algebra/feature-map.json" ||
    file === "next-env.d.ts" ||
    /(^|\/)(node_modules|outputs|dist|private-notes|student-data|course-materials|\.wrangler|\.sites-runtime|\.git)(\/|$)/.test(
      file,
    ) ||
    /(^|\/)\.env[^/]*$/.test(file) ||
    /\.(pdf|pptx?|docx?|tsbuildinfo)$/i.test(file) ||
    /(^|\/)(secrets?|credentials?)(\.|\/|$)/i.test(file);
  const listed = spawnSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8" },
  );
  const files =
    listed.status === 0 ? listed.stdout.split("\0").filter(Boolean) : [];
  function visit(directory) {
    for (const entry of fs.readdirSync(path.join(root, directory), {
      withFileTypes: true,
    })) {
      const file = directory ? `${directory}/${entry.name}` : entry.name;
      if (excluded(file)) continue;
      if (entry.isDirectory()) visit(file);
      else files.push(file);
    }
  }
  if (listed.status !== 0) visit("");
  return [...new Set(files)]
    .filter((file) => !excluded(file) && fs.existsSync(path.join(root, file)))
    .sort()
    .map((file) => {
      const absolute = path.join(root, file);
      const content = fs.lstatSync(absolute).isSymbolicLink()
        ? fs.readlinkSync(absolute)
        : fs.readFileSync(absolute);
      return {
        file,
        sha256: createHash("sha256").update(content).digest("hex"),
      };
    });
}

function browserToolInventory() {
  const file = "components/algebra/WebMCP.tsx";
  const source = ts.createSourceFile(
    file,
    read(file),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const tools = [];
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(source) === "tools" &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    )
      for (const item of node.initializer.elements) {
        if (!ts.isObjectLiteralExpression(item)) continue;
        const properties = Object.fromEntries(
          item.properties
            .filter(ts.isPropertyAssignment)
            .map((property) => [
              property.name.getText(source),
              property.initializer,
            ]),
        );
        tools.push({
          name: properties.name.text,
          description: properties.description.text,
          inputSchemaExpression: properties.inputSchema.getText(source),
          readOnly:
            properties.annotations?.getText(source).includes("true") ?? false,
          executeExpression: properties.execute.getText(source),
          prerequisites: [
            "browser modelContext API",
            "mounted application",
            "current controls for control actions",
          ],
          evidence:
            "source-inspection; enum and control values resolved only in mounted runtime",
        });
      }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return tools;
}

function laboratoryDispatch() {
  const file = "components/algebra/Laboratory.tsx";
  const source = ts.createSourceFile(
    file,
    read(file),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const dispatch = {};
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(source) === "laboratories" &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    )
      for (const property of node.initializer.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const kind = property.name.getText(source).replace(/^"|"$/g, "");
        dispatch[kind] = {
          file,
          line:
            source.getLineAndCharacterOfPosition(property.getStart(source))
              .line + 1,
          implementationExpression: property.initializer.getText(source),
        };
      }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return dispatch;
}

function componentInventory() {
  return fs
    .readdirSync(path.join(root, "components/algebra"))
    .filter((file) => /\.tsx?$/.test(file))
    .sort()
    .map((file) => {
      const source = ts.createSourceFile(
        file,
        read(`components/algebra/${file}`),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const states = [],
        controls = [],
        dependencies = [];
      function visit(node) {
        if (ts.isImportDeclaration(node))
          dependencies.push(node.moduleSpecifier.text);
        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword &&
          ts.isStringLiteral(node.arguments[0])
        )
          dependencies.push(node.arguments[0].text);
        if (
          ts.isVariableDeclaration(node) &&
          node.initializer &&
          ts.isCallExpression(node.initializer) &&
          node.initializer.expression.getText(source) === "useState"
        )
          states.push({
            binding: node.name.getText(source),
            initialExpression: node.initializer.arguments
              .map((arg) => arg.getText(source))
              .join(", "),
          });
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const kind = node.tagName.getText(source);
          if (
            [
              "button",
              "input",
              "select",
              "textarea",
              "summary",
              "a",
              "Select",
              "Range",
              "Pick",
              "Toggle",
              "Checkpoint",
            ].includes(kind)
          )
            controls.push({
              kind,
              line:
                source.getLineAndCharacterOfPosition(node.getStart(source))
                  .line + 1,
              attributes: Object.fromEntries(
                node.attributes.properties
                  .filter(ts.isJsxAttribute)
                  .map((attribute) => [
                    attribute.name.getText(source),
                    attribute.initializer?.getText(source) ?? true,
                  ]),
              ),
            });
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
      return {
        file: `components/algebra/${file}`,
        dependencies,
        states,
        controls,
        evidence:
          "source-inspection; expressions are not observed runtime values",
      };
    });
}

export const verificationLayers = [
  "map",
  "math",
  "render",
  "browser",
  "types",
  "build",
  "engineering",
  "dependencies",
  "all",
];

export const actionKinds = [
  "button",
  "textbox",
  "searchbox",
  "combobox",
  "checkbox",
  "radio",
  "slider",
  "spinbutton",
];

const actionSchema = {
  type: "object",
  required: ["label", "kind"],
  properties: {
    label: { type: "string" },
    kind: { enum: actionKinds },
    value: { type: ["string", "number"] },
  },
};
export const commands = [
  {
    name: "help",
    arguments: [],
    prerequisites: [],
    reads: ["command contracts"],
    writes: [],
  },
  {
    name: "map",
    arguments: ["--write (regenerate tracked map)"],
    prerequisites: ["Node 24", "installed dependencies"],
    reads: ["catalogue", "component source"],
    writes: ["feature-map.json only with --write"],
  },
  {
    name: "list",
    arguments: ["--query text"],
    prerequisites: [],
    reads: ["lesson metadata"],
    writes: [],
  },
  {
    name: "lesson",
    arguments: ["lesson ID or alias"],
    prerequisites: ["known lesson"],
    reads: ["lesson content", "teaching metadata", "laboratory contract"],
    writes: [],
  },
  {
    name: "prerequisites",
    arguments: ["lesson ID or alias"],
    prerequisites: ["known lesson"],
    reads: ["transitive prerequisite graph"],
    writes: [],
  },
  {
    name: "verify",
    arguments: [
      `--layer ${verificationLayers.join("|")}`,
      "--evidence path",
      "--url origin (external browser verification server)",
      "--built (standalone browser uses production Worker); all always uses built Worker unless --url",
    ],
    prerequisites: [
      "installed dependencies",
      "production build for render",
      "Playwright Chromium for browser",
      "npm registry access for dependencies or all",
    ],
    reads: [
      "source",
      "built artifact",
      "isolated browser",
      "dependency advisories",
    ],
    writes: [
      "dist/ production artifacts and .wrangler/ build cache for build, engineering or all",
      "tsconfig.tsbuildinfo for types or all",
      "evidence file when requested",
      "ignored browser evidence",
      "isolated browser storage",
    ],
  },
  {
    name: "inspect",
    arguments: [
      "lesson ID",
      "--url origin",
      "--action JSON",
      "--actions JSON-array",
    ],
    prerequisites: ["running app", "Playwright Chromium", "known lesson"],
    reads: ["rendered controls", "mathematical output"],
    writes: [
      "navigation and optional action in fresh disposable browser context",
    ],
  },
].map((command) => ({
  ...command,
  prerequisites: [
    ...new Set(["Node 24", "installed dependencies", ...command.prerequisites]),
  ],
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Lesson ID or alias for lesson, prerequisites and inspect",
      },
      query: {
        type: "string",
        description: "Case-insensitive lesson search for list",
      },
      layer: {
        type: "string",
        enum: verificationLayers,
      },
      url: {
        type: "string",
        format: "uri",
        description:
          "Application origin for isolated inspect or external browser verification",
      },
      action: actionSchema,
      actions: {
        type: "array",
        items: actionSchema,
        description:
          "Replay exact labelled UI actions in one fresh isolated context",
      },
      write: { type: "boolean", description: "Explicitly regenerate map file" },
      built: {
        type: "boolean",
        description: "Standalone browser checks against already-built Worker",
      },
      evidence: {
        type: "string",
        description: "Optional output evidence path",
      },
    },
    additionalProperties: false,
  },
}));

export function buildMap() {
  const lessons = json("lessons"),
    metadata = json("learning-metadata"),
    guided = json("guided-lessons"),
    contracts = json("lab-contracts"),
    units = json("units");
  const components = componentInventory();
  const dispatch = laboratoryDispatch();
  const inspectionLedger = "docs/research/browser-inspection.json";
  const ledgerAvailable = fs.existsSync(path.join(root, inspectionLedger));
  const features = [
    [
      "home",
      "#home",
      "LearningHome",
      "resume, progress summary, reset confirmation",
    ],
    [
      "learn",
      "#learn",
      "LearningRoutes",
      "units, prerequisites, remediation, capstones",
    ],
    [
      "explore",
      "#explore",
      "LaboratoryGallery",
      "contract-backed workspace discovery",
    ],
    [
      "reference",
      "#reference",
      "ReferenceAtlas",
      "search; kind, tier, status, source, visualisation, time and readiness filters",
    ],
    [
      "sources",
      "#sources",
      "SourceCoverage",
      "source coverage and access-controlled external links",
    ],
    [
      "lesson",
      "#<lesson-id>",
      "LessonReader",
      "guided, overview, example, theorem, proof reading views",
    ],
    [
      "laboratory",
      "#lab:<lesson-id>",
      "Exploration",
      "prediction, experiment, debrief, minimise and enlarge",
    ],
    [
      "library",
      "all modes",
      "ConceptLibrary",
      "subject/family browsing, search and mobile menu",
    ],
    [
      "assessment",
      "guided lessons and units",
      "Checkpoint",
      "choice, submission, feedback and persisted competencies",
    ],
    [
      "representation-journey",
      "#route-ureca-representation-theory",
      "RepresentationJourney",
      "shared D8 element and route capstone",
    ],
    ["webmcp", "all modes", "WebMCP", "conditional browser tool registration"],
    [
      "navigation",
      "all modes",
      "Algebra",
      "aliases, history, previous/next, focus and resume",
    ],
    [
      "symmetry-desk",
      "#home",
      "SymmetryDesk",
      "square generators, left composition, inverse and reset with independent geometry",
    ],
    [
      "lesson-compass",
      "guided lessons",
      "GuidedReader",
      "stage navigation and proof recall visibility",
    ],
    [
      "progress-backup",
      "#home",
      "LearningHome",
      "export, reset confirmation and restore previous record",
    ],
    [
      "diagram-reading",
      "SVG laboratories",
      "Diagram",
      "bounded intrinsic fit, original-size labels and keyboard horizontal panning",
    ],
  ].map(([id, route, component, interactions]) => ({
    id,
    route,
    component: `components/algebra/${component}.tsx`,
    interactions,
    prerequisites: [],
    reads: ["catalogue", "current UI state"],
    writes: {
      home: [
        "history",
        "resume lesson",
        "progress reset/restore",
        "backup download",
      ],
      learn: ["history", "resume lesson", "capstone progress"],
      explore: ["history", "resume lesson"],
      reference: ["transient filters", "history", "resume lesson"],
      sources: ["external source navigation on link activation"],
      lesson: [
        "transient reading/proof state",
        "competency progress",
        "history",
        "resume lesson",
      ],
      laboratory: [
        "transient experimental state",
        "shared D8 selection where present",
        "history",
        "resume lesson",
      ],
      library: ["transient filters", "history", "resume lesson"],
      assessment: ["competency progress"],
      "representation-journey": [
        "shared D8 selection",
        "route capstone progress",
      ],
      webmcp: ["effects of explicitly invoked tool"],
      navigation: ["history", "resume lesson"],
      "symmetry-desk": [
        "transient square element",
        "history/resume on lesson opening",
      ],
      "lesson-compass": ["focus", "scroll", "transient proof visibility"],
      "progress-backup": [
        "backup download",
        "progress reset/restore",
        "previous-record backup",
      ],
      "diagram-reading": ["transient diagram size", "local horizontal scroll"],
    }[id],
    evidence: "source-inspection",
  }));
  return {
    version: 1,
    sources: sourceHashes(),
    evidencePolicy:
      "Inventory is source inspection. Coverage is established only by executed checks with results and evidence. No mathematical or interaction pass is inferred from map generation.",
    releaseEvidence: {
      browserInspection: {
        file: inspectionLedger,
        available: ledgerAvailable,
        evidenceKind: "executed-browser-inspection-ledger",
        eligibility:
          "Read the ledger results and match its inspected runtime revision plus lesson and UI source hashes to this snapshot. A path or available file does not establish a pass. Any changed lesson, UI, runtime dependency or configuration invalidates the corresponding release claim until rerun.",
      },
      reports: [
        "docs/research/verification-audit.md",
        "docs/research/independent-mathematics-review.md",
        "docs/research/independent-persistence-cli-review.md",
        "docs/research/visual-sizing-review.md",
      ].filter((file) => fs.existsSync(path.join(root, file))),
      automatedResults:
        "CLI verify JSON includes executed checks, exit status, artifact hashes and source snapshot digest. CI retains those results and Playwright evidence; inspect them alongside this inventory.",
    },
    features,
    commands,
    browserTools: browserToolInventory(),
    components,
    laboratoryDispatch: dispatch,
    persistence: [
      {
        key: "algebra-competency-progress-v1",
        owner: "LearningProgress",
        scope: "device",
        shape:
          "version 1; attempts keyed by assessment; revision, choice, submissions",
        effects: "submit/reset; storage-event sync",
      },
      {
        key: "algebra-resume-v1",
        owner: "Algebra",
        scope: "device",
        shape: "lesson ID",
        effects: "lesson navigation",
      },
      {
        key: "algebra-ureca-square-element-v1",
        owner: "RepresentationObject",
        scope: "device",
        shape: "D8 element index",
        effects: "shared representation selection; storage-event sync",
      },
      ...(fs.existsSync(path.join(root, "lib/algebra/progress-storage.ts"))
        ? [
            {
              key: "algebra-competency-progress-v1-backup",
              owner: "progress-storage",
              scope: "device",
              shape: "version 1; previous raw record",
              effects: "reversible progress writes; restore previous record",
            },
          ]
        : []),
    ],
    access: {
      application: "public single page",
      sourceLinks: "external access-controlled Drive links retained",
      authHelper: "app/chatgpt-auth.ts; no active consumers in baseline",
      laboratoryWork: "transient baseline, except shared D8 element",
    },
    lessons: lessons.map((lesson) => ({
      id: lesson.id,
      aliases: lesson.aliases ?? [],
      title: lesson.title,
      navTitle: lesson.navTitle,
      objective: lesson.objective,
      track: lesson.track,
      subject: lesson.subject,
      family: lesson.family,
      machine: lesson.machine,
      parameters: lesson.parameters,
      source: lesson.source,
      connections: lesson.connections,
      contentSource: "lib/algebra/lessons.json",
      metadata: metadata[lesson.id],
      guided: guided[lesson.id]
        ? {
            source: "lib/algebra/guided-lessons.json",
            assessments: [
              "prerequisiteCheck",
              "boundaryCheck",
              "application",
              "transfer",
            ],
          }
        : null,
      unitIds: units
        .filter((unit) => unit.lessons.includes(lesson.id))
        .map((unit) => unit.id),
      routes: [
        `#${lesson.id}`,
        `#lab:${lesson.id}`,
        ...(lesson.aliases ?? []).map((alias) => `#${alias}`),
      ],
      readingViews: ["guided", "understand", "example", "theorem", "proof"],
      laboratory: {
        kind: lesson.machine,
        dispatcher: "components/algebra/Laboratory.tsx",
        implementation: dispatch[lesson.machine],
        contract: contracts[lesson.id] ?? null,
      },
      verification: {
        gapIds: [
          `${lesson.id}:browser-release-source-match`,
          `${lesson.id}:semantic-claim-review`,
        ],
        executedEvidence: {
          file: inspectionLedger,
          lessonId: lesson.id,
          available: ledgerAvailable,
          status: "requires-ledger-result-and-source-match",
        },
        structural: "tests/feature-map.test.mjs",
        rendered: "tests/ui-components.test.mjs",
        browser: "tests/browser/catalogue.spec.mjs",
        responsiveGeometry: "tests/browser/visual-sizing.spec.mjs",
        semantic:
          "existing mathematical suites; scope and results must be inspected",
      },
    })),
    units,
    capstones: json("capstone-assessments"),
    sourceGaps: json("source-gaps"),
    tests: fs
      .readdirSync(path.join(root, "tests"))
      .filter((file) => file.endsWith(".test.mjs"))
      .sort()
      .map((file) => `tests/${file}`),
  };
}

export function validateMap(map) {
  const errors = [],
    ids = new Set(map.lessons.map((lesson) => lesson.id));
  const visit = (id, trail = []) => {
    if (!ids.has(id)) {
      errors.push(`Unknown prerequisite ${id}`);
      return;
    }
    if (trail.includes(id)) {
      errors.push(`Prerequisite cycle ${[...trail, id].join(" -> ")}`);
      return;
    }
    const lesson = map.lessons.find((lesson) => lesson.id === id);
    for (const prerequisite of lesson.metadata.prerequisites)
      visit(prerequisite, [...trail, id]);
  };
  if (ids.size !== map.lessons.length) errors.push("Duplicate lesson IDs");
  for (const lesson of map.lessons) {
    if (!lesson.metadata) {
      errors.push(`Missing metadata ${lesson.id}`);
      continue;
    }
    visit(lesson.id);
    if (lesson.metadata.teachingStatus === "guided" && !lesson.guided)
      errors.push(`Missing guided content ${lesson.id}`);
    if (!lesson.laboratory.implementation)
      errors.push(`Missing laboratory dispatch ${lesson.id}`);
    for (const target of lesson.connections ?? [])
      if (!ids.has(target))
        errors.push(`Unknown connection ${lesson.id} -> ${target}`);
  }
  for (const unit of map.units)
    for (const id of unit.lessons)
      if (!ids.has(id)) errors.push(`Unknown unit member ${unit.id} -> ${id}`);
  return errors;
}
