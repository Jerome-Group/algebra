#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { directDependencies } from "./lib/direct-dependencies.mjs";

import { commands, actionKinds, parseArguments } from "./algebra-contract.mjs";
import {
  buildIdentity,
  observeIdentity,
  requireOwnerIdentity,
} from "./algebra-identity.mjs";
import {
  launchServer,
  stopServer,
  readOwner,
  loopback,
  newRun,
  listening,
  runCheck,
} from "./algebra-runtime.mjs";

const root = path.resolve(
  process.env.ALGEBRA_MAP_ROOT ??
    fileURLToPath(new URL("../", import.meta.url)),
);
const started = Date.now();
const envelope = {
  version: 1,
  command: process.argv[2] ?? "help",
  ok: true,
  result: null,
  checks: [],
  evidence: [],
  errors: [],
};
let options;
let runDir;
const check = async (name, executable, args, environment, timeout) => {
  runDir ??= newRun(root);
  const result = await runCheck(
    root,
    runDir,
    name,
    executable,
    args,
    environment,
    timeout,
  );
  if (result.status === "passed") {
    result.output = "";
    result.outputTruncated = result.outputBytes > 0;
    result.inlineOutput = "omitted-on-success; read logPath";
  }
  envelope.checks.push(result);
  return result;
};
const resolveLesson = (map, id) => {
  const lesson = map.lessons.find(
    (lesson) => lesson.id === id || lesson.aliases?.includes(id),
  );
  if (!lesson)
    throw Object.assign(
      new Error(`Unknown lesson: ${id}. Use list to find lesson IDs`),
      { code: "UNKNOWN_LESSON" },
    );
  return lesson;
};
function targetOptions(values) {
  const ownerFile = values.owner ?? process.env.ALGEBRA_LOCAL_OWNER;
  const owner = ownerFile ? readOwner(ownerFile, root, values.url) : null;
  const origin = values.url ?? owner?.origin ?? process.env.ALGEBRA_TEST_ORIGIN;
  return { owner, origin };
}
async function doctor(values) {
  const checks = [];
  const record = (name, usable, detail, remedy) =>
    checks.push({
      name,
      status: usable ? "passed" : "failed",
      detail,
      ...(usable ? {} : { remedy }),
    });
  record(
    "runtime",
    Number(process.versions.node.split(".")[0]) >= 24,
    process.version,
    "Install Node.js 24 or newer",
  );
  try {
    const coherence = directDependencies(root);
    record("direct-dependency-coherence", true, {
      digest: coherence.digest,
      count: coherence.count,
      scope: coherence.scope,
    });
  } catch (error) {
    record(
      "direct-dependency-coherence",
      false,
      error.message,
      "Install coherent locked dependencies in this checkout",
    );
  }
  const dependencies = [
    "typescript/lib/typescript.js",
    "@playwright/test/cli.js",
    "vinext/dist/cli.js",
    "wrangler/bin/wrangler.js",
  ];
  const missing = dependencies.filter(
    (file) => !fs.existsSync(path.join(root, "node_modules", file)),
  );
  record(
    "dependencies",
    missing.length === 0,
    missing.length ? missing : "Required dependency entry points exist",
    "Run npm ci in this checkout",
  );
  try {
    const { chromium } = await import("@playwright/test");
    record(
      "browser",
      fs.existsSync(chromium.executablePath()),
      chromium.executablePath(),
      "Run npx playwright install chromium",
    );
  } catch (error) {
    record(
      "browser",
      false,
      error.message,
      "Run npm ci and npx playwright install chromium",
    );
  }
  let expected;
  try {
    expected = buildIdentity(root);
  } catch (error) {
    record(
      "source-inputs",
      false,
      error.message,
      "Restore the application and dependency input files",
    );
  }
  const artifact = path.join(root, "dist/server/index.js");
  const identityFile = path.join(root, "dist/build-identity.json");
  let builtIdentity;
  try {
    builtIdentity = JSON.parse(fs.readFileSync(identityFile, "utf8"));
  } catch {}
  const buildUsable =
    fs.existsSync(artifact) &&
    builtIdentity?.version === 2 &&
    builtIdentity?.sourceDigest === expected?.sourceDigest &&
    builtIdentity?.directDependencyDigest ===
      expected?.directDependencyDigest &&
    builtIdentity?.directDependencyCount === expected?.directDependencyCount;
  const target = targetOptions(values);
  const requiresBuild = values.built || target.owner?.kind === "built";
  if (requiresBuild)
    record(
      "build",
      buildUsable,
      {
        artifact: fs.existsSync(artifact),
        sourceMatch: buildUsable
          ? "matched"
          : builtIdentity
            ? "mismatched"
            : "unknown",
      },
      "Run verify --layer build, then launch --built",
    );
  else
    checks.push({
      name: "build",
      status: "not-required",
      available: fs.existsSync(artifact),
      sourceMatch: buildUsable
        ? "matched"
        : builtIdentity
          ? "mismatched"
          : "unknown",
    });
  let identity;
  if (target.origin) {
    identity = expected
      ? await observeIdentity(target.origin, expected, target.owner)
      : null;
    record(
      "target",
      Boolean(identity?.observed),
      identity,
      "Launch the expected application and use its origin",
    );
    if (loopback(target.origin))
      record(
        "target-ownership",
        Boolean(target.owner),
        target.owner?.ownerFile ?? "Local target has no ownership marker",
        "Run launch and pass --owner",
      );
    if (target.owner)
      record(
        "target-run-identity",
        identity?.localRunId === target.owner.runId,
        identity?.localRunId ?? "unknown",
        "Stop and launch a fresh owned target",
      );
    if (identity)
      record(
        "target-dependency-match",
        identity.dependencyMatch === "matched",
        identity.dependencyMatch,
        "Rebuild and restart coherent direct dependencies",
      );
    if (identity)
      record(
        "target-source-match",
        identity.sourceMatch === "matched",
        identity.sourceMatch,
        "Rebuild and restart the expected source before claiming a source match",
      );
  } else {
    const port = values.port ?? (values.built ? 5176 : 5173);
    record(
      "target-port",
      !(await listening(port)),
      { port },
      "Choose an unused --port",
    );
  }
  envelope.checks.push(...checks);
  envelope.ok = checks.every((check) =>
    ["passed", "not-required"].includes(check.status),
  );
  return {
    readOnly: true,
    target: identity ?? target.owner ?? null,
  };
}
async function inspect(lesson, { origin, actions = [] }) {
  const url = new URL(origin);
  if (!["http:", "https:"].includes(url.protocol))
    throw Error("URL must use HTTP or HTTPS");
  const { chromium, expect } = await import("@playwright/test");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(30000);
    await page.goto(new URL(`/#lab:${lesson.id}`, url).href);
    await page.locator('.algebra-app[data-ready="true"]').waitFor();
    const start = page.getByRole("button", {
      name: "Test my prediction",
      exact: true,
    });
    if (await start.count()) {
      await page
        .getByRole("textbox", {
          name: "Your mathematical prediction",
          exact: true,
        })
        .fill(
          "I predict the displayed invariant holds under its stated hypotheses.",
        );
      await start.click();
    }
    await page.locator(".laboratory-loading").waitFor({ state: "hidden" });
    if (await page.locator(".laboratory-load-error").count())
      throw Error("Laboratory failed to load");
    for (const action of actions) {
      const { label, kind, value } = action;
      const target = page.getByRole(kind, { name: label, exact: true });
      if ((await target.count()) !== 1)
        throw Error(
          `No unique ${kind} control with exact label: ${label}. Refresh inspect output before replaying actions.`,
        );
      if (!(await target.isEnabled()))
        throw Error(`Control disabled: ${label}`);
      if (kind === "combobox") {
        if (await target.evaluate((element) => element.tagName === "SELECT"))
          await target.selectOption(String(value));
        else {
          const triggerId = await target.getAttribute("id");
          if (!triggerId)
            throw Error("Custom choice requires a stable trigger id");
          const trigger = page.locator(`[id=${JSON.stringify(triggerId)}]`);
          await target.click();
          const options = page.getByRole("option");
          if (
            Number.isInteger(value) &&
            (value < 0 || value >= (await options.count()))
          )
            throw Error("Custom option index outside listed range");
          const choice = Number.isInteger(value)
            ? options.nth(value)
            : page.getByRole("option", { name: String(value), exact: true });
          if ((await choice.count()) !== 1)
            throw Error(
              "Custom choice requires a listed option label or zero-based option index; refresh inspect output.",
            );
          if (!(await choice.isEnabled()))
            throw Error("Chosen option disabled");
          await choice.click();
          await expect(trigger).toHaveAttribute("aria-expanded", "false");
          await expect(page.getByRole("listbox")).toBeHidden();
          await expect(trigger).toBeFocused();
        }
      } else if (["textbox", "searchbox", "spinbutton"].includes(kind))
        await target.fill(String(value));
      else if (kind === "slider") {
        const requested =
          typeof value === "string" && value.trim() === ""
            ? NaN
            : Number(value);
        const details = await target.evaluate((element) => ({
          native: element.tagName === "INPUT" && element.type === "range",
          min: Number(element.getAttribute("aria-valuemin") ?? element.min),
          max: Number(element.getAttribute("aria-valuemax") ?? element.max),
        }));
        if (
          !Number.isFinite(requested) ||
          !Number.isFinite(details.min) ||
          !Number.isFinite(details.max) ||
          requested < details.min ||
          requested > details.max
        )
          throw Error(
            "Slider value must be finite and within its displayed bounds",
          );
        const current = async () =>
          Number(
            await target.evaluate(
              (element) =>
                element.getAttribute("aria-valuenow") ?? element.value,
            ),
          );
        const equal = (left, right) =>
          Math.abs(left - right) <=
          1e-8 * Math.max(1, Math.abs(left), Math.abs(right));
        if (details.native) await target.fill(String(requested));
        else {
          await target.focus();
          await target.press(requested === details.max ? "End" : "Home");
          const minimum = await current();
          if (requested !== details.max && !equal(minimum, requested)) {
            await target.press("ArrowUp");
            const step = (await current()) - minimum;
            const steps = (requested - minimum) / step;
            if (!(step > 0) || !equal(steps, Math.round(steps)) || steps > 1000)
              throw Error(
                "Slider value is not reachable by its keyboard step within the 1000-step action limit",
              );
            for (let index = 1; index < Math.round(steps); index++)
              await target.press("ArrowUp");
          }
        }
        if (!equal(await current(), requested))
          throw Error(
            "Slider did not accept the exact requested value; inspect its bounds and keyboard step",
          );
      } else await target.click();
    }
    const customChoices = [];
    const choices = page.getByRole("combobox");
    for (let index = 0; index < (await choices.count()); index++) {
      const control = choices.nth(index);
      if (await control.evaluate((element) => element.tagName === "SELECT"))
        continue;
      const label = await control.getAttribute("aria-label");
      await control.click();
      const options = await page.getByRole("option").evaluateAll((items) =>
        items.map((item, index) => ({
          index,
          label: item.getAttribute("aria-label"),
          disabled: item.getAttribute("aria-disabled") === "true",
        })),
      );
      for (const option of options) {
        if (!option.label?.trim())
          throw Error("Custom option requires a plain accessible label");
        await expect(
          page.getByRole("option").nth(option.index),
        ).toHaveAccessibleName(option.label);
      }
      customChoices.push({
        label,
        options,
        actionValue:
          "exact accessible option label or zero-based numeric index",
      });
      await page.keyboard.press("Escape");
      await expect(control).toHaveAttribute("aria-expanded", "false");
      await expect(page.getByRole("listbox")).toBeHidden();
      await expect(control).toBeFocused();
    }
    const result = {
      ...(await page.locator(".algebra-app").evaluate((app) => ({
        route: location.hash,
        heading: app.querySelector("h1")?.textContent,
        controls: [
          ...app.querySelectorAll(
            "button,input,select,textarea,summary,a,[role=slider]",
          ),
        ]
          .filter((element) => element.getClientRects().length)
          .map((element, index) => ({
            id: `snapshot-${index}`,
            kind: element.tagName.toLowerCase(),
            role: element.getAttribute("role"),
            label:
              element.getAttribute("aria-label") ||
              element.labels?.[0]?.textContent?.replace(/\s+/g, " ").trim() ||
              element.textContent?.trim(),
            value: element.getAttribute("aria-valuenow") ?? element.value,
            min: element.getAttribute("aria-valuemin") ?? element.min,
            max: element.getAttribute("aria-valuemax") ?? element.max,
            disabled: element.disabled,
            options: element.options
              ? [...element.options].map((option) => ({
                  value: option.value,
                  label: option.text,
                }))
              : undefined,
          })),
        mathematicalOutput:
          app.querySelector(".live-mathematics")?.textContent ??
          app.querySelector(".visual-panel")?.textContent,
        mathematicalExpressions: [
          ...(
            app.querySelector(".live-mathematics") ??
            app.querySelector(".visual-panel") ??
            app
          ).querySelectorAll('annotation[encoding="application/x-tex"]'),
        ].map((annotation) => annotation.textContent),
        mathErrors: app.querySelectorAll(".katex-error").length,
      }))),
      customChoices,
    };
    const evidence = {
      kind: "browser-observation",
      isolatedContext: true,
      actions,
      effects:
        "Fresh browser state discarded on exit; no personal storage loaded",
    };
    return { result, evidence };
  } finally {
    await browser.close();
  }
}

try {
  const parsed = parseArguments(process.argv.slice(2));
  const command = parsed.command;
  options = parsed.values;
  if (command === "help")
    envelope.result = {
      commands: options.command
        ? commands.filter((item) => item.name === options.command)
        : commands.map(({ name, arguments: args, reads, writes }) => ({
            name,
            arguments: args,
            reads,
            writes,
          })),
      actionKinds,
      output:
        "Use help --command NAME for exact schemas. One JSON envelope on stdout. Failure exits 1. Input errors have code INVALID_INPUT and cause no effects. Doctor is read-only. Local browser targets require a live owner marker. Launch returns --owner; stop retains evidence. For a full release, verify --layer all --port PORT builds, launches and stops its own production Worker. Full verification rejects --owner, --url, ALGEBRA_LOCAL_OWNER and ALGEBRA_TEST_ORIGIN. Existing targets require --layer browser. Feature and shard selection are partial coverage. Unknown runtime identity never establishes a source match.",
      errors: [
        "INVALID_INPUT",
        "UNKNOWN_LESSON",
        "UNOWNED_LOCAL_TARGET",
        "INVALID_OWNER",
        "PORT_IN_USE",
        "SERVER_START_FAILED",
        "INVALID_MAP",
        "COMMAND_FAILED",
        "EVIDENCE_IO",
      ],
    };
  else if (command === "doctor") envelope.result = await doctor(options);
  else if (command === "stop")
    envelope.result = await stopServer(options.owner, root);
  else if (command === "launch") {
    if (
      options.built &&
      !fs.existsSync(path.join(root, "dist/server/index.js"))
    )
      throw new Error(
        "Production build missing. Run verify --layer build first",
      );
    envelope.result = await launchServer(root, options);
    envelope.evidence.push({
      kind: "owned-server",
      ownerFile: envelope.result.ownerFile,
      path: envelope.result.runDir,
    });
  } else {
    const { buildMap, validateMap, mapPath } =
      await import("./algebra-map.mjs");
    const map = buildMap();
    envelope.provenance = {
      sourceDigest: createHash("sha256")
        .update(JSON.stringify(map.sources))
        .digest("hex"),
      sourceFiles: map.sources.length,
      sourceManifest: "lib/algebra/feature-map.json",
      claims: "Local source inventory only",
    };
    if (command === "map") {
      if (options.write) {
        const { format } = await import("prettier");
        fs.writeFileSync(
          mapPath,
          await format(JSON.stringify(map), { parser: "json" }),
        );
        envelope.result = {
          path: path.relative(root, mapPath),
          lessons: map.lessons.length,
          features: map.features.length,
        };
      } else envelope.result = map;
      envelope.evidence.push({
        kind: "source-inspection",
        claims: "inventory only",
      });
    } else if (command === "list") {
      const query = (options.query ?? "").toLocaleLowerCase();
      envelope.result = map.lessons
        .filter((lesson) =>
          JSON.stringify([
            lesson.id,
            lesson.title,
            lesson.navTitle,
            lesson.subject,
            lesson.aliases,
          ])
            .toLocaleLowerCase()
            .includes(query),
        )
        .map(({ id, title, subject, metadata, routes }) => ({
          id,
          title,
          subject,
          status: metadata.teachingStatus,
          routes,
        }));
    } else if (command === "lesson") {
      const lesson = resolveLesson(map, options.id);
      const content = JSON.parse(
        fs.readFileSync(path.join(root, "lib/algebra/lessons.json"), "utf8"),
      ).find((item) => item.id === lesson.id);
      const guided =
        JSON.parse(
          fs.readFileSync(
            path.join(root, "lib/algebra/guided-lessons.json"),
            "utf8",
          ),
        )[lesson.id] ?? null;
      envelope.result = { ...lesson, content, guided };
    } else if (command === "prerequisites") {
      const lesson = resolveLesson(map, options.id),
        found = new Map();
      const visit = (id) => {
        if (found.has(id)) return;
        const item = resolveLesson(map, id);
        found.set(id, {
          id,
          title: item.title,
          teachingStatus: item.metadata.teachingStatus,
          competencies: item.metadata.competencies,
          prerequisites: item.metadata.prerequisites,
        });
        item.metadata.prerequisites.forEach(visit);
      };
      lesson.metadata.prerequisites.forEach(visit);
      envelope.result = {
        lesson: lesson.id,
        prerequisites: [...found.values()],
        effects: "read only; does not award mastery",
      };
    } else if (command === "inspect") {
      const lesson = resolveLesson(map, options.id);
      const target = targetOptions(options);
      const origin = target.origin ?? "http://127.0.0.1:5173";
      if (loopback(origin) && !target.owner) readOwner(null, root);
      envelope.target = {
        ...(await observeIdentity(origin, buildIdentity(root), target.owner)),
        auth: "guest",
        backend:
          target.owner?.kind === "built"
            ? "isolated local Worker"
            : "unverified target backend",
        ownership: target.owner?.ownerFile ?? "external",
      };
      requireOwnerIdentity(envelope.target, target.owner);
      const inspection = await inspect(lesson, {
        origin,
        actions: options.actions ?? (options.action ? [options.action] : []),
      });
      envelope.result = {
        ...inspection.result,
        coverage: "observational; selected controls and output only",
      };
      envelope.evidence.push(inspection.evidence);
    } else if (command === "verify") {
      const { recordVerification } =
        await import("./lib/public-math-v2/session.mjs");
      const layer = options.layer;
      const execution = await recordVerification(
        root,
        {
          ...options,
          built:
            options.built || targetOptions(options).owner?.kind === "built",
        },
        async (recording) => {
          if (["build", "engineering", "all"].includes(layer))
            await check("production-build", process.execPath, [
              "scripts/public-math-build.mjs",
            ]);
          if (["engineering", "all"].includes(layer)) {
            await check("formatting", "npm", ["run", "format:check"]);
            await check("lint", "npm", ["run", "lint"]);
          }
          if (["dependencies", "all"].includes(layer))
            await check(
              "dependency-high-severity-audit",
              "npm",
              ["audit", "--audit-level=high", "--json"],
              {},
              60000,
            );
          if (["map", "all"].includes(layer)) {
            const errors = validateMap(map);
            const current =
              fs.existsSync(mapPath) &&
              JSON.stringify(JSON.parse(fs.readFileSync(mapPath, "utf8"))) ===
                JSON.stringify(map);
            envelope.checks.push(
              {
                name: "catalogue-integrity",
                status: errors.length ? "failed" : "passed",
                errors,
              },
              {
                name: "feature-map-current",
                status: current ? "passed" : "failed",
                ...(current
                  ? {}
                  : {
                      remedy:
                        "Regenerate with map --write after source integration",
                    }),
              },
            );
          }
          if (["types", "all"].includes(layer))
            await check("typescript-contracts", process.execPath, [
              "node_modules/typescript/bin/tsc",
              "--noEmit",
            ]);
          if (["math", "all"].includes(layer)) {
            await recording.run("node:test", (descriptor) =>
              check(
                "mathematical-and-content-suites",
                process.execPath,
                [
                  "--test",
                  ...(descriptor
                    ? [
                        "--test-reporter=./scripts/public-math-node-reporter.mjs",
                      ]
                    : []),
                  ...map.tests.filter(
                    (file) => !file.endsWith("ui-components.test.mjs"),
                  ),
                ],
                descriptor
                  ? { ALGEBRA_PUBLIC_MATH_DESCRIPTOR: descriptor.file }
                  : {},
              ),
            );
          }
          if (["render", "all"].includes(layer))
            await check(
              "built-artifact-and-component-rendering",
              process.execPath,
              ["--test", "tests/ui-components.test.mjs"],
            );
          if (["browser", "all"].includes(layer)) {
            const errors = validateMap(map, { group: options.feature });
            if (errors.length)
              throw Object.assign(
                new Error(
                  `Verification map has unresolved links: ${errors.join("; ")}`,
                ),
                { code: "INVALID_MAP" },
              );
            const group = options.feature
              ? map.verificationGroups.find(
                  (group) => group.id === options.feature,
                )
              : null;
            const target = targetOptions(options);
            await recording.run("playwright", async (descriptor) => {
              let owned;
              runDir ??= newRun(root);
              try {
                if (!target.origin)
                  owned = await launchServer(root, {
                    built: options.built || layer === "all",
                    port: options.port,
                    runDir:
                      recording.serverDirectory ?? path.join(runDir, "server"),
                  });
                const origin = target.origin ?? owned.origin;
                const owner = target.owner ?? owned;
                if (loopback(origin) && !owner) readOwner(null, root);
                envelope.target = {
                  ...(await observeIdentity(
                    origin,
                    buildIdentity(root),
                    owner,
                  )),
                  ownership: owner?.ownerFile ?? "external",
                  kind: owner?.kind ?? "external",
                  auth: owner?.accountFixture
                    ? "guest and synthetic trusted identity fixture"
                    : "guest; provider sign-in unverified",
                  backend: owner?.accountFixture
                    ? "isolated migrated local D1"
                    : "target backend unverified",
                  accountCoverage: owner?.accountFixture
                    ? "local fixture cases enabled; hosted provider and gateway checks unverified"
                    : "local account fixture cases unreachable; provider checks unverified",
                };
                requireOwnerIdentity(envelope.target, owner);
                envelope.checks.push({
                  name: "target-source-identity",
                  status:
                    envelope.target.sourceMatch === "matched" &&
                    envelope.target.dependencyMatch === "matched"
                      ? "passed"
                      : "failed",
                  detail: envelope.target.sourceMatch,
                  remedy:
                    "Build and run expected sources or report this target only as an unmatched observation",
                });
                const artifacts = path.join(runDir, "browser");
                const reportFile = path.join(runDir, "playwright-report.json");
                const browserCheck = await check(
                  "browser-interactions",
                  process.execPath,
                  [
                    "node_modules/@playwright/test/cli.js",
                    "test",
                    ...(group?.journeys ?? []),
                    ...(options.shard ? [`--shard=${options.shard}`] : []),
                  ],
                  {
                    ...(descriptor
                      ? { ALGEBRA_PUBLIC_MATH_DESCRIPTOR: descriptor.file }
                      : {}),
                    ALGEBRA_TEST_ORIGIN: origin,
                    ALGEBRA_EVIDENCE_DIR: artifacts,
                    ALGEBRA_RUN_EVIDENCE: "",
                    ALGEBRA_REPORT_FILE: reportFile,
                    ALGEBRA_LOCAL_OWNER: owner?.ownerFile ?? "",
                    ALGEBRA_ACCOUNT_FIXTURE: owner?.accountFixture ? "1" : "0",
                    ALGEBRA_AUDIT_KIND: owner?.kind ?? "external",
                    ALGEBRA_AUDIT_SOURCE_MATCH: envelope.target.sourceMatch,
                    ALGEBRA_AUDIT_SOURCE_DIGEST:
                      envelope.target.observed?.sourceDigest ?? "unknown",
                  },
                  (options.shard ? 8 : 20) * 60_000,
                );
                if (fs.existsSync(reportFile)) {
                  const report = JSON.parse(
                    fs.readFileSync(reportFile, "utf8"),
                  );
                  envelope.browserResults = report.stats;
                  envelope.evidence.push({
                    kind: "browser-report",
                    path: reportFile,
                  });
                  if (
                    report.stats.expected +
                      report.stats.unexpected +
                      report.stats.flaky ===
                    0
                  )
                    envelope.checks.push({
                      name: "browser-cases-executed",
                      status: "failed",
                      detail:
                        "No browser case executed. Choose a populated shard or feature",
                    });
                }
                if (fs.existsSync(artifacts))
                  envelope.evidence.push({
                    kind: "browser-artifacts",
                    path: artifacts,
                  });
                return browserCheck;
              } finally {
                if (owned) {
                  const cleanup = await stopServer(owned.ownerFile, root);
                  envelope.evidence.push({
                    kind: "server-cleanup",
                    ...cleanup,
                  });
                  if (recording.serverDirectory)
                    await recording.cleanup(
                      owned.ownerFile,
                      cleanup,
                      !(await listening(new URL(owned.origin).port)),
                    );
                }
              }
            });
          }
          return { checks: envelope.checks };
        },
      );
      if (execution.directory) {
        envelope.evidence.push({
          kind: "public-math-execution",
          path: execution.directory,
          partial: Boolean(execution.partial),
        });
        if (layer === "all")
          envelope.checks.push({
            name: "public-math-required-execution",
            status: execution.satisfiesRequirement ? "passed" : "failed",
          });
      }
      envelope.ok = envelope.checks.every((check) => check.status === "passed");
      envelope.result = {
        layer,
        ...(options.feature
          ? {
              feature: options.feature,
              journeys: map.verificationGroups.find(
                (group) => group.id === options.feature,
              ).journeys,
            }
          : {}),
        ...(options.shard ? { shard: options.shard } : {}),
        catalogue: {
          lessons: map.lessons.length,
          units: map.units.length,
          features: map.features.length,
        },
        partial: Boolean(options.feature || options.shard || layer !== "all"),
        coverage: `Only named executed checks are verified.${options.feature ? ` Feature ${options.feature} is partial application coverage.` : ""}${options.shard ? ` Shard ${options.shard} is partial suite coverage; all shards must pass.` : ""} Route entry checks do not establish every mathematical claim. Hosted provider sign-in and gateway identity stripping require separate live evidence.`,
      };
    }
  }
} catch (error) {
  envelope.ok = false;
  envelope.errors.push({
    code: error.code ?? "COMMAND_FAILED",
    message: error.message,
    ...(error.logPath ? { logPath: error.logPath } : {}),
  });
}
if (runDir && fs.existsSync(runDir))
  envelope.evidence.push({ kind: "run-directory", path: runDir });
envelope.durationMs = Date.now() - started;
if (options?.evidence) {
  try {
    const destination = path.resolve(options.evidence);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const evidence = { kind: "result-file", path: destination };
    fs.writeFileSync(
      destination,
      JSON.stringify(
        { ...envelope, evidence: [...envelope.evidence, evidence] },
        null,
        2,
      ) + "\n",
    );
    envelope.evidence.push(evidence);
  } catch (error) {
    envelope.ok = false;
    envelope.errors.push({
      code: error.code ?? "EVIDENCE_IO",
      message: error.message,
    });
  }
}
process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
process.exitCode = envelope.ok ? 0 : 1;
