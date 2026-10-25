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
export const featureGroups = [
  "beginner-language",
  "discovery",
  "guided-learning",
  "laboratories",
  "accounts-progress",
  "agent-access",
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
const text = (description) => ({ type: "string", minLength: 1, description });
const actionSchema = {
  type: "object",
  required: ["label", "kind"],
  additionalProperties: false,
  properties: {
    label: text("Exact accessible label"),
    kind: { enum: actionKinds },
    value: { type: ["string", "number"] },
  },
  allOf: [
    {
      if: {
        properties: {
          kind: {
            enum: ["combobox", "textbox", "searchbox", "spinbutton", "slider"],
          },
        },
      },
      then: {
        required: ["value"],
        properties: { value: { maxLength: 200 } },
      },
    },
  ],
};
const targetFlags = {
  url: { ...text("Application origin"), format: "origin" },
  owner: text("Owned local server marker returned by launch"),
};
const launchFlags = {
  built: {
    type: "boolean",
    description: "Use the existing production Worker build",
  },
  port: {
    type: "integer",
    minimum: 1024,
    maximum: 65535,
    description:
      "Exclusive local port. Defaults to 5176 for Worker or 5173 for Vite",
  },
};
const definitions = [
  {
    name: "help",
    flags: { command: text("One command full schema and effects") },
    reads: ["static contracts"],
    writes: [],
  },
  {
    name: "map",
    flags: {
      write: {
        type: "boolean",
        description: "Regenerate tracked feature-map.json",
      },
    },
    reads: ["catalogue", "component source"],
    writes: ["feature-map.json with --write"],
  },
  {
    name: "list",
    flags: {
      query: { type: "string", description: "Case-insensitive lesson search" },
    },
    reads: ["lesson metadata"],
    writes: [],
  },
  {
    name: "lesson",
    positional: "id",
    flags: {},
    reads: ["lesson content", "teaching metadata", "laboratory contract"],
    writes: [],
  },
  {
    name: "prerequisites",
    positional: "id",
    flags: {},
    reads: ["transitive prerequisite graph"],
    writes: [],
  },
  {
    name: "inspect",
    positional: "id",
    flags: {
      ...targetFlags,
      action: actionSchema,
      actions: { type: "array", items: actionSchema },
    },
    reads: ["rendered controls", "mathematical output"],
    writes: ["actions in a disposable browser context"],
  },
  {
    name: "doctor",
    flags: { ...targetFlags, ...launchFlags },
    reads: [
      "runtime",
      "dependency files",
      "browser executable",
      "build",
      "target source and direct dependency identity",
    ],
    writes: [],
  },
  {
    name: "launch",
    flags: launchFlags,
    reads: ["build or development source"],
    writes: ["owned local server", "isolated persistence", "run evidence"],
  },
  {
    name: "stop",
    flags: { owner: targetFlags.owner },
    required: ["owner"],
    reads: ["owned server marker"],
    writes: ["stops only its owned server; retains evidence"],
  },
  {
    name: "verify",
    flags: {
      layer: {
        type: "string",
        enum: verificationLayers,
        default: "map",
        description:
          "all builds, launches and stops its own production Worker. It rejects --owner, --url, ALGEBRA_LOCAL_OWNER and ALGEBRA_TEST_ORIGIN. Use --port for an unused local port. Existing targets require browser.",
      },
      feature: {
        type: "string",
        enum: featureGroups,
        description:
          "Named browser journey group; partial application coverage",
      },
      shard: {
        type: "string",
        pattern: "^[1-9][0-9]*/[1-9][0-9]*$",
        description: "Browser-only positive safe integers i/n with i <= n",
      },
      ...targetFlags,
      ...launchFlags,
    },
    reads: [
      "source",
      "independent whole-file reports",
      "build and output manifest",
      "isolated browser",
      "dependency advisories",
    ],
    writes: [
      "build for build, engineering or all",
      "TypeScript cache for types or all",
      "unique evidence and isolated browser persistence",
    ],
  },
];
export const commands = definitions.map(
  ({ flags, positional, required = [], ...command }) => ({
    ...command,
    arguments: [
      ...(positional ? ["lesson ID or alias"] : []),
      ...Object.keys(flags).map((flag) => `--${flag}`),
      "--json",
      "--evidence path",
    ],
    prerequisites:
      command.name === "help"
        ? ["Node 24+"]
        : ["Node 24+", "installed dependencies where required"],
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: [...(positional ? [positional] : []), ...required],
      properties: {
        ...(positional ? { [positional]: text("Lesson ID or alias") } : {}),
        ...Object.fromEntries(
          Object.entries(flags).map(([flag, schema]) => [
            flag,
            flag === "command"
              ? { ...schema, enum: definitions.map((command) => command.name) }
              : schema,
          ]),
        ),
        json: { type: "boolean", description: "JSON is always emitted" },
        evidence: text("Optional result file; written only after valid input"),
      },
    },
  }),
);

export function inputError(message) {
  return Object.assign(new Error(message), { code: "INVALID_INPUT" });
}
function validate(value, schema, name) {
  if (schema.enum && !schema.enum.includes(value))
    throw inputError(`${name} must be one of ${schema.enum.join(", ")}`);
  if (schema.type) {
    const types = [].concat(schema.type);
    const type = Array.isArray(value) ? "array" : typeof value;
    if (
      !types.includes(type) &&
      !(types.includes("integer") && Number.isInteger(value))
    )
      throw inputError(`${name} requires ${types.join(" or ")}`);
  }
  if (typeof value === "string") {
    if (schema.minLength && value.length < schema.minLength)
      throw inputError(`${name} requires a nonempty value`);
    if (schema.maxLength !== undefined && [...value].length > schema.maxLength)
      throw inputError(`${name} exceeds ${schema.maxLength} characters`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value))
      throw inputError(`${name} has an invalid format`);
    if (schema.format === "origin") {
      let url;
      try {
        url = new URL(value);
      } catch {
        throw inputError(`${name} requires an HTTP or HTTPS origin`);
      }
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash
      )
        throw inputError(
          `${name} requires an HTTP or HTTPS origin without credentials, path, query or fragment`,
        );
    }
  }
  if (
    typeof value === "number" &&
    (!Number.isFinite(value) ||
      value < schema.minimum ||
      value > schema.maximum)
  )
    throw inputError(`${name} is outside its allowed range`);
  if (schema.type === "object" && (!value || Array.isArray(value)))
    throw inputError(`${name} requires an object`);
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of Object.keys(value)) {
      if (Object.hasOwn(schema.properties ?? {}, key))
        validate(value[key], schema.properties[key], `${name}.${key}`);
      else if (schema.additionalProperties === false)
        throw inputError(`${name} has unknown property ${key}`);
    }
    for (const key of schema.required ?? [])
      if (!(key in value)) throw inputError(`${name} requires ${key}`);
  }
  if (schema.type === "array")
    value.forEach((item, index) =>
      validate(item, schema.items, `${name}[${index}]`),
    );
  for (const constraint of schema.allOf ?? [])
    validate(value, constraint, name);
  if (schema.if) {
    let matches = true;
    try {
      validate(value, schema.if, name);
    } catch (error) {
      if (error.code !== "INVALID_INPUT") throw error;
      matches = false;
    }
    if (matches && schema.then) validate(value, schema.then, name);
  }
}
export function parseArguments(argv) {
  const [name = "help", ...args] = argv;
  const definition = commands.find((command) => command.name === name);
  if (!definition)
    throw inputError(
      `Unknown command ${name}. Run help for supported commands`,
    );
  const properties = definition.inputSchema.properties;
  const values = {},
    positionals = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2),
      schema = properties[key];
    if (!schema || key === "id")
      throw inputError(`Unsupported flag ${arg} for ${name}. Run help`);
    if (key in values) throw inputError(`Repeated flag ${arg}`);
    let value = true;
    if (schema.type !== "boolean") {
      value = args[++index];
      if (value === undefined || value.startsWith("--"))
        throw inputError(`Missing value for ${arg}`);
      if (["object", "array"].includes(schema.type)) {
        try {
          value = JSON.parse(value);
        } catch {
          throw inputError(`${arg} requires valid JSON`);
        }
      } else if (schema.type === "integer") value = Number(value);
    }
    validate(value, schema, arg);
    values[key] = value;
  }
  if (properties.id && positionals.length === 1)
    values.id = positionals.shift();
  if (positionals.length)
    throw inputError(`Unexpected argument ${positionals[0]} for ${name}`);
  for (const [key, schema] of Object.entries(properties))
    if (!(key in values) && "default" in schema) values[key] = schema.default;
  for (const key of definition.inputSchema.required)
    if (!(key in values)) throw inputError(`${name} requires ${key}`);
  if (values.action && values.actions)
    throw inputError("Use --action or --actions, not both");
  if (values.url && (values.built || values.port))
    throw inputError("--url cannot combine with --built or --port");
  if (values.owner && (values.built || values.port))
    throw inputError("--owner cannot combine with --built or --port");
  if (name === "verify") {
    if (
      values.layer === "all" &&
      (values.owner ||
        values.url ||
        process.env.ALGEBRA_LOCAL_OWNER ||
        process.env.ALGEBRA_TEST_ORIGIN)
    )
      throw inputError(
        "verify --layer all builds and owns its Worker. Remove --owner, --url, ALGEBRA_LOCAL_OWNER and ALGEBRA_TEST_ORIGIN. Choose an unused --port if needed",
      );
    if (values.shard || values.feature) {
      if (values.layer !== "browser")
        throw inputError("--shard and --feature require --layer browser");
    }
    if (values.shard) {
      const [index, count] = values.shard.split("/").map(Number);
      if (![index, count].every(Number.isSafeInteger) || index > count)
        throw inputError(
          "Shard must be positive safe integers i/n with i <= n",
        );
    }
    if (
      !["browser", "all"].includes(values.layer) &&
      ["url", "owner", "built", "port"].some((key) => key in values)
    )
      throw inputError("Target flags require --layer browser or all");
  }
  return { command: name, values };
}
