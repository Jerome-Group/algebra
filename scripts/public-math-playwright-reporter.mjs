import fs from "node:fs";
import { executionSnapshot } from "./lib/public-math-v2/execution.mjs";
import path from "node:path";
import { sha256 } from "./lib/math-presentation.mjs";

export function playwrightRegistration(root, invocation, test) {
  const file = path
    .relative(root, test.location.file)
    .split(path.sep)
    .join("/");
  const groups = [];
  for (
    let suite = test.parent;
    suite && suite.type !== "file";
    suite = suite.parent
  )
    if (suite.type === "describe") groups.unshift(suite.title);
  return {
    id: `${invocation}:playwright:${test.id}`,
    parentId: null,
    file,
    line: test.location.line,
    column: test.location.column,
    titlePath: [...groups, test.title],
    rawTitlePath: test.titlePath(),
    project: test.parent.project().name,
    repeat: test.repeatEachIndex,
    sourceSha256: sha256(fs.readFileSync(test.location.file)),
  };
}

export default class PublicMathPlaywrightReporter {
  onBegin(config, suite) {
    this.descriptor = JSON.parse(
      fs.readFileSync(process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR, "utf8"),
    );
    this.registrations = suite
      .allTests()
      .map((test) =>
        playwrightRegistration(
          this.descriptor.root,
          this.descriptor.invocation,
          test,
        ),
      );
    this.attempts = [];
    this.observations = [];
    this.resources = [];
    this.errors = [];
    this.shard = config.shard
      ? { index: config.shard.current, total: config.shard.total }
      : null;
    const declared = this.descriptor.record.selection.shard;
    if (JSON.stringify(this.shard) !== JSON.stringify(declared))
      this.errors.push(
        "Actual Playwright shard differs from owned invocation descriptor",
      );
  }
  onError(error) {
    this.errors.push(error.message ?? "Playwright global error");
  }
  onTestEnd(test, result) {
    const id = `${this.descriptor.invocation}:playwright:${test.id}`;
    this.attempts.push({
      id,
      retry: result.retry,
      status: result.status,
      expectedStatus: test.expectedStatus,
      skip: test.annotations.some(({ type }) =>
        ["skip", "fixme"].includes(type),
      ),
      todo: test.annotations.some(({ type }) => type === "todo"),
      errors: result.errors.map(
        (error) => error.message ?? "Playwright case error",
      ),
    });
    for (const attachment of result.attachments) {
      if (
        !["public-math-observation-v2", "public-math-resources-v2"].includes(
          attachment.name,
        )
      )
        continue;
      try {
        const bytes = attachment.body ?? fs.readFileSync(attachment.path);
        if (bytes.length > 8 * 1024 * 1024)
          throw new Error("Oversized public math attachment");
        const value = JSON.parse(bytes.toString("utf8"));
        if (attachment.name === "public-math-observation-v2")
          this.observations.push({ ...value, caseId: id });
        else {
          this.resources.push(
            ...value.resources.map((resource) => ({ ...resource, caseId: id })),
          );
          this.errors.push(...value.errors);
        }
      } catch (error) {
        this.errors.push(error.message);
      }
    }
  }
  async onEnd(result) {
    const descriptor = this.descriptor;
    let targetBefore = null,
      targetAfter = null;
    try {
      targetBefore = JSON.parse(
        fs.readFileSync(descriptor.targetBefore, "utf8"),
      );
      targetAfter = JSON.parse(fs.readFileSync(descriptor.targetAfter, "utf8"));
    } catch (error) {
      this.errors.push(error.message);
    }
    const runtime = JSON.parse(
      fs.readFileSync(
        path.join(
          descriptor.root,
          "node_modules/@playwright/test/package.json",
        ),
        "utf8",
      ),
    ).version;
    const record = {
      version: "public-math-run-v2",
      ...descriptor.record,
      runner: "playwright",
      runtime,
      argv: process.argv,
      snapshotAfter: await executionSnapshot(descriptor.root),
      registrations: this.registrations,
      attempts: this.attempts,
      observations: this.observations,
      resources: this.resources,
      targetBefore,
      targetAfter,
      exitCode: result.status === "passed" ? 0 : 1,
      interrupted: result.status === "interrupted",
      recorderErrors: this.errors,
    };
    fs.writeFileSync(
      descriptor.output,
      JSON.stringify(record, null, 2) + "\n",
      { flag: "wx" },
    );
  }
}
