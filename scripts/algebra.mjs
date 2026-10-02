#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  buildMap,
  validateMap,
  commands,
  actionKinds,
  verificationLayers,
  root,
  mapPath,
} from "./algebra-map.mjs";

const args = process.argv.slice(2),
  command = args.shift() ?? "help";
const option = (args, name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? fallback : args[index + 1];
};
const started = Date.now();
const envelope = {
  version: 1,
  command,
  ok: true,
  result: null,
  checks: [],
  evidence: [],
  errors: [],
};
const resolveLesson = (map, id) => {
  const lesson = map.lessons.find(
    (lesson) => lesson.id === id || lesson.aliases?.includes(id),
  );
  if (!lesson) throw Error(`Unknown lesson: ${id}`);
  return lesson;
};
function runCheck(root, name, executable, arguments_, environment = {}) {
  const execution = spawnSync(executable, arguments_, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, ...environment },
  });
  return {
    name,
    status: execution.status === 0 ? "passed" : "failed",
    exitCode: execution.status,
    output: `${execution.stdout ?? ""}${execution.stderr ?? ""}`,
    error: execution.error?.message,
  };
}
async function inspect(lesson, { origin, action, sequence }) {
  const url = new URL(origin);
  if (!["http:", "https:"].includes(url.protocol))
    throw Error("URL must use HTTP or HTTPS");
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
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
    if (action && sequence) throw Error("Use --action or --actions, not both");
    const actions = sequence
      ? JSON.parse(sequence)
      : action
        ? [JSON.parse(action)]
        : [];
    if (!Array.isArray(actions)) throw Error("--actions requires a JSON array");
    for (const action of actions) {
      if (!action || typeof action !== "object" || Array.isArray(action))
        throw Error("Every action requires an object with label and kind");
      const { label, kind, value } = action;
      if (typeof label !== "string" || !actionKinds.includes(kind))
        throw Error("Action requires exact accessible label and valid kind");
      const target = page.getByRole(kind, { name: label, exact: true });
      if ((await target.count()) !== 1)
        throw Error(
          `No unique ${kind} control with exact label: ${label}. Refresh inspect output before replaying actions.`,
        );
      if (!(await target.isEnabled()))
        throw Error(`Control disabled: ${label}`);
      if (
        ["combobox", "textbox", "searchbox", "spinbutton", "slider"].includes(
          kind,
        ) &&
        !(
          (typeof value === "string" && value.length <= 200) ||
          (typeof value === "number" && Number.isFinite(value))
        )
      )
        throw Error(
          "Editing requires a string under 201 characters or a finite number",
        );
      if (kind === "combobox") {
        if (await target.evaluate((element) => element.tagName === "SELECT"))
          await target.selectOption(String(value));
        else {
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
          label: item.textContent?.replace(/\s+/g, " ").trim(),
          disabled: item.getAttribute("aria-disabled") === "true",
        })),
      );
      customChoices.push({
        label,
        options,
        actionValue:
          "exact accessible option label or zero-based numeric index",
      });
      await page.keyboard.press("Escape");
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
  const map = buildMap();
  envelope.provenance = {
    sourceDigest: createHash("sha256")
      .update(JSON.stringify(map.sources))
      .digest("hex"),
    sourceFiles: map.sources.length,
    sourceManifest: "lib/algebra/feature-map.json",
  };

  if (command === "help")
    envelope.result = {
      commands,
      actionKinds,
      output:
        "JSON envelope on stdout; failures exit 1. Source map and runtime inspections have separate evidence. verify all builds then runs its exact production Worker on isolated port 5176; standalone browser defaults to Vite, or use --built or --url. --json is accepted for clarity; JSON is always emitted.",
    };
  else if (command === "map") {
    if (args.includes("--write")) {
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
    const query = option(args, "query", "").toLocaleLowerCase();
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
    const lesson = resolveLesson(map, args[0]);
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
    const lesson = resolveLesson(map, args[0]),
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
    const inspection = await inspect(resolveLesson(map, args[0]), {
      origin: option(args, "url", "http://127.0.0.1:5173"),
      action: option(args, "action"),
      sequence: option(args, "actions"),
    });
    envelope.result = inspection.result;
    envelope.evidence.push(inspection.evidence);
  } else if (command === "verify") {
    const layer = option(args, "layer", "map");
    if (!verificationLayers.includes(layer))
      throw Error("Unknown verification layer");
    if (["build", "engineering", "all"].includes(layer))
      envelope.checks.push(
        runCheck(root, "production-build", process.execPath, [
          "node_modules/vinext/dist/cli.js",
          "build",
        ]),
      );
    if (["engineering", "all"].includes(layer)) {
      envelope.checks.push(
        runCheck(root, "formatting", "npm", ["run", "format:check"]),
      );
      envelope.checks.push(runCheck(root, "lint", "npm", ["run", "lint"]));
    }
    if (["dependencies", "all"].includes(layer))
      envelope.checks.push(
        runCheck(root, "dependency-high-severity-audit", "npm", [
          "audit",
          "--audit-level=high",
          "--json",
        ]),
      );
    if (layer === "map" || layer === "all") {
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
        { name: "feature-map-current", status: current ? "passed" : "failed" },
      );
      envelope.ok &&= errors.length === 0 && current;
    }
    if (layer === "types" || layer === "all")
      envelope.checks.push(
        runCheck(root, "typescript-contracts", process.execPath, [
          "node_modules/typescript/bin/tsc",
          "--noEmit",
        ]),
      );
    const tests = map.tests.filter(
      (file) =>
        !file.endsWith("ui-components.test.mjs") &&
        !file.endsWith("rendered-html.test.mjs"),
    );
    if (layer === "math" || layer === "all")
      envelope.checks.push(
        runCheck(root, "mathematical-and-content-suites", process.execPath, [
          "--test",
          ...tests,
        ]),
      );
    if (layer === "render" || layer === "all")
      envelope.checks.push(
        runCheck(
          root,
          "built-artifact-and-component-rendering",
          process.execPath,
          [
            "--test",
            "tests/ui-components.test.mjs",
            "tests/rendered-html.test.mjs",
          ],
        ),
      );
    if (layer === "browser" || layer === "all") {
      const origin = option(args, "url", process.env.ALGEBRA_TEST_ORIGIN);
      if (origin && !["http:", "https:"].includes(new URL(origin).protocol))
        throw Error("Browser URL must use HTTP or HTTPS");
      const browserArtifacts =
        process.env.ALGEBRA_EVIDENCE_DIR ??
        path.join(root, "outputs", `verification-${started}-${process.pid}`);
      envelope.checks.push(
        runCheck(
          root,
          "browser-interactions",
          process.execPath,
          ["node_modules/@playwright/test/cli.js", "test"],
          {
            ALGEBRA_EVIDENCE_DIR: browserArtifacts,
            ...(origin
              ? { ALGEBRA_TEST_ORIGIN: origin }
              : layer === "all" || args.includes("--built")
                ? { ALGEBRA_BUILT_WORKER: "1" }
                : {}),
          },
        ),
      );
      if (fs.existsSync(browserArtifacts))
        envelope.evidence.push({
          kind: "browser-artifacts",
          path: path.resolve(browserArtifacts),
        });
    }
    envelope.ok &&= envelope.checks.every((check) => check.status === "passed");
    envelope.result = {
      layer,
      catalogue: {
        lessons: map.lessons.length,
        units: map.units.length,
        features: map.features.length,
      },
      coverage:
        "Only named executed checks are verified. Passing a route sweep proves entry rendering, not every parameter or mathematical claim.",
    };
  } else throw Error(`Unknown command: ${command}`);
} catch (error) {
  envelope.ok = false;
  envelope.errors.push({ message: error.message });
}
try {
  const artifact = path.join(root, "dist/server/index.js");
  if (envelope.provenance && fs.existsSync(artifact))
    envelope.provenance.artifact = {
      file: "dist/server/index.js",
      sha256: createHash("sha256")
        .update(fs.readFileSync(artifact))
        .digest("hex"),
    };
} catch (error) {
  envelope.ok = false;
  envelope.errors.push({
    code: error.code ?? "ARTIFACT_IO",
    message: error.message,
  });
}
envelope.durationMs = Date.now() - started;
const evidencePath = option(args, "evidence");
if (evidencePath) {
  try {
    const destination = path.resolve(evidencePath);
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
process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
process.exitCode = envelope.ok ? 0 : 1;
