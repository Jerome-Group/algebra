import fs from "node:fs";
import { executionSnapshot } from "./lib/public-math-v2/execution.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { binary64Values } from "./lib/public-math-v2/numeric.mjs";
import { parseCode } from "./lib/public-math/syntax.mjs";
import { canonical } from "./lib/public-math/identity.mjs";
import { sha256 } from "./lib/math-presentation.mjs";
import { observationSchema } from "./lib/public-math-v2/execution-schema.mjs";

const prefix = "public-math-observation-v2 ";
export async function observeProducer(
  context,
  { id, producer, inputs, produce, effectKind },
) {
  const value = await produce();
  if (process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR)
    context.diagnostic(
      prefix +
        JSON.stringify({
          name: context.name,
          fullName: context.fullName,
          observation: {
            id,
            kind: effectKind ? "effect" : "producer",
            ...(effectKind
              ? { effectKind, binary64: binary64Values(value) }
              : {}),
            producer,
            inputs,
            value,
          },
        }),
    );
  return value;
}
export async function observeExportedProducer(
  context,
  { file, exportName, inputs },
  produce,
) {
  const value = await produce();
  if (!process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR) return value;
  const descriptor = JSON.parse(
    fs.readFileSync(process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR, "utf8"),
  );
  const bytes = fs.readFileSync(path.join(descriptor.root, file));
  const source = parseCode(file, bytes);
  const nodes = [];
  const visit = (node) => {
    if (
      (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) &&
      node.name?.getText() === exportName
    )
      nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (nodes.length !== 1)
    throw new Error(
      "Observed exported producer has no unique current declaration",
    );
  const node = nodes[0];
  const reference = {
    file,
    sha256: sha256(bytes),
    start: node.getStart(source),
    end: node.end,
    nodeSha256: sha256(node.getText(source)),
  };
  for (const requirement of descriptor.requirements)
    if (
      ["producer", "numeric-computation"].includes(requirement.kind) &&
      canonical(requirement.producer.source) === canonical(reference) &&
      canonical(requirement.inputs) === canonical(inputs)
    ) {
      context.diagnostic(
        prefix +
          JSON.stringify({
            name: context.name,
            fullName: context.fullName,
            observation: {
              id: requirement.id,
              kind: requirement.kind === "producer" ? "producer" : "effect",
              ...(requirement.kind === "numeric-computation"
                ? {
                    effectKind: "numeric-computation",
                    binary64: binary64Values(value),
                  }
                : {}),
              producer: {
                source: reference,
                formatter: requirement.producer.formatter ? reference : null,
              },
              inputs,
              value,
            },
          }),
      );
    }
  return value;
}
export function nodeEvents(root, invocation) {
  root = fs.realpathSync(root);
  const registrations = new Map(),
    attempts = [],
    observations = [],
    errors = [],
    completed = new Set(),
    started = new Set();
  const relative = (file) =>
    path
      .relative(
        root,
        file?.startsWith("file:") ? fileURLToPath(file) : (file ?? ""),
      )
      .split(path.sep)
      .join("/");
  const caseId = (data) =>
    `${invocation}:node:${relative(data.file)}:${data.testId}`;
  const wrapper = (data) => {
    if (data.line !== 1 || data.column !== 1) return false;
    if ([data.file, relative(data.file)].includes(data.name)) return true;
    try {
      return (
        fs.realpathSync(path.resolve(root, data.name)) ===
        fs.realpathSync(data.file)
      );
    } catch {
      return false;
    }
  };
  const event = (type, data) => {
    if (type === "test:interrupted") {
      errors.push("Node runner interrupted");
      return;
    }
    if (type === "test:diagnostic" && data.message?.startsWith(prefix)) {
      try {
        const value = JSON.parse(data.message.slice(prefix.length));
        observations.push({
          location: {
            file: relative(data.file),
            line: data.line,
            column: data.column,
          },
          ...value,
        });
      } catch {
        errors.push("Malformed actual producer observation");
      }
      return;
    }
    if (
      ![
        "test:enqueue",
        "test:dequeue",
        "test:complete",
        "test:pass",
        "test:fail",
      ].includes(type) ||
      wrapper(data)
    )
      return;
    if (
      !Number.isSafeInteger(data.testId) ||
      data.testId < 1 ||
      !Number.isSafeInteger(data.parentId) ||
      data.parentId < 0 ||
      typeof data.name !== "string" ||
      !Number.isSafeInteger(data.line) ||
      !Number.isSafeInteger(data.column) ||
      relative(data.file).startsWith("../")
    ) {
      errors.push("Unsupported Node24 testId/parentId/location event shape");
      return;
    }
    const id = caseId(data);
    if (type === "test:enqueue") {
      if (registrations.has(id)) {
        errors.push("Duplicate Node runtime registration ID");
        return;
      }
      registrations.set(id, {
        id,
        parentId: data.parentId
          ? `${invocation}:node:${relative(data.file)}:${data.parentId}`
          : null,
        file: relative(data.file),
        line: data.line,
        column: data.column,
        name: data.name,
        project: null,
        repeat: 0,
        sourceSha256: sha256(
          fs.readFileSync(path.join(root, relative(data.file))),
        ),
      });
    } else if (type === "test:dequeue") started.add(id);
    else if (type === "test:complete") {
      if (completed.has(id)) errors.push("Duplicate Node completion");
      completed.add(id);
    } else
      attempts.push({
        id,
        retry: 0,
        status: type === "test:pass" ? "passed" : "failed",
        expectedStatus: data.expectFailure ? "failed" : "passed",
        skip: Boolean(data.skip),
        todo: Boolean(data.todo),
        errors:
          type === "test:fail"
            ? [data.details?.error?.message ?? "Node case failed"]
            : [],
      });
  };
  const finish = () => {
    const titlePath = (id, seen = new Set()) => {
      if (seen.has(id) || !registrations.has(id))
        throw new Error("Missing/cyclic Node parentId registration");
      seen.add(id);
      const row = registrations.get(id);
      return row.parentId
        ? [...titlePath(row.parentId, seen), row.name]
        : [row.name];
    };
    const rows = [];
    for (const row of registrations.values()) {
      if (!started.has(row.id) || !completed.has(row.id))
        errors.push("Missing Node enqueue/dequeue/complete lifecycle");
      try {
        const rest = { ...row };
        delete rest.name;
        rows.push({
          ...rest,
          titlePath: titlePath(row.id),
          rawTitlePath: titlePath(row.id),
        });
      } catch (error) {
        errors.push(error.message);
      }
    }
    const bound = [];
    for (const item of observations) {
      const matches = rows.filter(
        (row) =>
          row.file === item.location.file &&
          row.line === item.location.line &&
          row.column === item.location.column &&
          row.titlePath.at(-1) === item.name &&
          row.titlePath.join(" > ") === item.fullName,
      );
      if (matches.length !== 1) {
        errors.push(
          "Producer observation has zero or ambiguous actual Node case",
        );
        continue;
      }
      try {
        bound.push(
          observationSchema.parse({
            ...item.observation,
            caseId: matches[0].id,
          }),
        );
      } catch (error) {
        errors.push(error.message);
      }
    }
    return {
      registrations: rows,
      attempts,
      observations: bound,
      recorderErrors: errors,
    };
  };
  return { event, finish };
}

export default async function* publicMathNodeReporter(events) {
  const file = process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR;
  if (!file)
    throw new Error(
      "Node public mathematics recorder requires an owned invocation descriptor",
    );
  const descriptor = JSON.parse(fs.readFileSync(file, "utf8"));
  const adapter = nodeEvents(descriptor.root, descriptor.invocation);
  let interrupted = false;
  for await (const { type, data } of events) {
    adapter.event(type, data);
    if (type === "test:interrupted") interrupted = true;
    if (type === "test:fail") yield `FAIL ${data.name}\n`;
  }
  const observed = adapter.finish();
  const snapshotAfter = await executionSnapshot(descriptor.root);
  const record = {
    version: "public-math-run-v2",
    ...descriptor.record,
    runner: "node:test",
    runtime: process.version,
    argv: [process.execPath, ...process.execArgv, ...process.argv.slice(1)],
    ...observed,
    snapshotAfter,
    resources: [],
    targetBefore: null,
    targetAfter: null,
    exitCode: observed.attempts.some(({ status }) => status !== "passed")
      ? 1
      : 0,
    interrupted,
  };
  fs.writeFileSync(descriptor.output, JSON.stringify(record, null, 2) + "\n", {
    flag: "wx",
  });
  yield `Recorded ${observed.registrations.length} actual Node registrations.\n`;
}
