import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { cataloguePresentation, expectCatalogueText } from "./math-content.mjs";
import {
  sourceSegments,
  expectExactMathRegion,
} from "./public-math-segments.mjs";

const catalogueSource = fs.readFileSync(
  new URL("../../lib/algebra/lessons.json", import.meta.url),
);
const lessons = JSON.parse(catalogueSource);
const presentations = JSON.parse(
  fs.readFileSync(
    new URL("../../lib/algebra/laboratory-presentations.json", import.meta.url),
  ),
);
const testCatalogueSha256 = createHash("sha256")
  .update(catalogueSource)
  .digest("hex");

test.describe.configure({ mode: "parallel" });
test.use({ hasTouch: true });

for (const lesson of lessons) {
  test(`${lesson.id}: lesson and laboratory entries render`, async ({
    page,
  }, testInfo) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const observations = [];
    for (const route of [`#${lesson.id}`, `#lab:${lesson.id}`]) {
      await page.goto(`/${route}`);
      await expect(page.locator(".algebra-app")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await expect(page.locator("#lesson-heading")).toBeVisible();
      await expect(page.locator(".katex-error")).toHaveCount(0);
      if (route.startsWith("#lab:")) {
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
              "I predict the displayed example satisfies its stated hypotheses.",
            );
          await start.click();
        }
        const presentation = presentations[lesson.id];
        if (presentation === "worked-example") {
          const worked = page.getByRole("region", {
            name: "Worked mathematical construction",
            exact: true,
          });
          await expect(worked).toBeVisible();
          await expect(worked.locator(".worked-steps li")).toHaveCount(
            lesson.worked.steps.length,
          );
          for (const [index, step] of lesson.worked.steps.entries())
            await expectCatalogueText(
              worked.locator(".worked-steps li").nth(index),
              step,
            );
          await expect(
            page.locator(".structure-node, .relationship-steps"),
          ).toHaveCount(0);
        } else if (lesson.id === "m3220-krull") {
          await expect(
            page.getByRole("figure", { name: "Integer ring", exact: true }),
          ).toBeVisible();
          await expect(
            page.getByRole("figure", {
              name: "Polynomial ring over a field",
              exact: true,
            }),
          ).toBeVisible();
        } else if (
          lesson.id.startsWith("ureca-theory-tetrahedron-") &&
          presentation === "model"
        ) {
          const extensions = page.getByRole("table", {
            name: "First-order spring extensions",
            exact: true,
          });
          await expect(extensions.locator("tbody tr")).toHaveCount(6);
          await expect(extensions.locator("tbody td annotation")).toHaveText([
            "0",
            "0",
            "0",
            "0",
            "0",
            "0",
          ]);
        } else if (
          lesson.machine === "diagram" &&
          lesson.id !== "characters-burnside" &&
          lesson.parameters?.nodes?.length
        ) {
          const panel = page.locator(".visual-panel");
          await expect(
            panel.getByRole("img", {
              name: "Mathematical structure relationships",
              exact: true,
            }),
          ).toBeVisible();
          await expect(panel.locator(".structure-node")).toHaveCount(
            lesson.parameters?.mode === "euclidean"
              ? 4
              : lesson.parameters.nodes.length,
          );
          if (lesson.parameters.nodes.some((node) => !node.text))
            await expect(panel.locator(".katex").first()).toBeVisible();
          const relationships = panel.locator(".relationship-steps button");
          await expect(relationships).toHaveCount(
            lesson.parameters?.mode === "euclidean"
              ? 3
              : lesson.parameters.edges.length,
          );
          for (const index of [0, (await relationships.count()) - 1]) {
            const control = relationships.nth(index);
            await control.click();
            await expect(control).toHaveClass("active");
            if (lesson.parameters?.mode === "euclidean")
              await expect(
                panel.locator(".relationship-readout annotation").first(),
              ).toHaveText(
                index === 0
                  ? String.raw`\langle 84,30\rangle_{\mathbb Z}`
                  : String.raw`\langle 24,6\rangle_{\mathbb Z}`,
              );
            else {
              const [from, to, label] = lesson.parameters.edges[index];
              const node = (id) =>
                typeof id === "number"
                  ? lesson.parameters.nodes[id]
                  : lesson.parameters.nodes.find((item) => item.id === id);
              const parts = (item) =>
                item.text
                  ? sourceSegments(cataloguePresentation(item.label))
                  : [{ kind: "math", tex: item.label, display: false }];
              await expectExactMathRegion(
                panel.locator(".relationship-readout"),
                [
                  ...parts(node(from)),
                  ...sourceSegments(cataloguePresentation(label)),
                  ...parts(node(to)),
                ],
              );
            }
          }
        } else
          await expect(
            page.locator(".visual-panel .katex").first(),
          ).toBeVisible();
        await expect(page.locator(".laboratory-loading")).toHaveCount(0);
        await expect(page.locator(".laboratory-load-error")).toHaveCount(0);
        await expect(page.locator(".katex-error")).toHaveCount(0);
        const panel = page.locator(".visual-panel");
        const experiments = [];
        const selects = panel.locator("select");
        for (let index = 0; index < (await selects.count()); index++) {
          const control = selects.nth(index);
          const original = await control.inputValue();
          const options = await control
            .locator("option")
            .evaluateAll((items) =>
              items.filter((item) => !item.disabled).map((item) => item.value),
            );
          for (const value of [...new Set([options[0], options.at(-1)])]) {
            if (value === undefined) continue;
            await control.selectOption(value);
            await expect(page.locator(".katex-error")).toHaveCount(0);
            experiments.push({ control: index, kind: "select", value });
          }
          await control.selectOption(original);
          await control.focus();
          await page.keyboard.press("ArrowDown");
          await page.keyboard.press("Enter");
          await expect(control).toBeFocused();
        }
        const ranges = panel.locator('input[type="range"]');
        for (let index = 0; index < (await ranges.count()); index++) {
          const control = ranges.nth(index);
          const original = await control.inputValue();
          for (const attribute of ["min", "max"]) {
            const value = await control.getAttribute(attribute);
            if (value === null) continue;
            await control.fill(value);
            await expect(page.locator(".katex-error")).toHaveCount(0);
            experiments.push({
              control: index,
              kind: "range",
              boundary: attribute,
              value,
            });
          }
          await control.fill(original);
        }
        const choiceTriggers = panel.getByRole("combobox");
        for (let index = 0; index < (await choiceTriggers.count()); index++) {
          const trigger = choiceTriggers.nth(index);
          if (await trigger.evaluate((element) => element.tagName === "SELECT"))
            continue;
          for (const endpoint of ["first", "last"]) {
            await trigger.click();
            const options = page.locator(
              '[role="option"]:visible:not([aria-disabled="true"])',
            );
            const option =
              endpoint === "first" ? options.first() : options.last();
            const label = await option.textContent();
            await option.click();
            await expect(page.locator(".katex-error")).toHaveCount(0);
            experiments.push({
              control: index,
              kind: "custom-choice",
              endpoint,
              label,
            });
          }
          await trigger.focus();
          await page.keyboard.press("Enter");
          await page.keyboard.press("Home");
          await page.keyboard.press("Enter");
          await expect(trigger).toBeFocused();
        }
        const sliders = panel.getByRole("slider");
        for (let index = 0; index < (await sliders.count()); index++) {
          const control = sliders.nth(index);
          if (await control.evaluate((element) => element.tagName === "INPUT"))
            continue;
          for (const key of ["Home", "End"]) {
            await control.focus();
            await page.keyboard.press(key);
            const boundary = await control.getAttribute(
              key === "Home" ? "aria-valuemin" : "aria-valuemax",
            );
            await expect(control).toHaveAttribute("aria-valuenow", boundary);
            await expect(page.locator(".katex-error")).toHaveCount(0);
            experiments.push({
              control: index,
              kind: "custom-slider",
              key,
              value: boundary,
            });
          }
        }
        const failures = panel.getByRole("button", {
          name: /failure|nonexample|nonnormal|incompatible|proper generated|associativity|wrong|counterexample|fixed point/i,
        });
        for (let index = 0; index < (await failures.count()); index++) {
          const control = failures.nth(index);
          if (!(await control.isEnabled())) continue;
          const label = await control.textContent();
          await control.focus();
          await page.keyboard.press("Enter");
          await expect(page.locator(".katex-error")).toHaveCount(0);
          experiments.push({ kind: "counterexample", label });
        }
        await testInfo.attach("laboratory-interactions", {
          body: JSON.stringify(experiments),
          contentType: "application/json",
        });
        await page.screenshot({
          path: testInfo.outputPath("desktop.png"),
          fullPage: true,
        });
        await page.setViewportSize({ width: 375, height: 1000 });
        const menu = page.locator("#library-toggle");
        if (await menu.isVisible()) {
          await menu.tap();
          await page.keyboard.press("Escape");
        }
        await page.screenshot({
          path: testInfo.outputPath("mobile-375.png"),
          fullPage: true,
        });
        const dimensions = await page.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
        }));
        await testInfo.attach("mobile-reflow", {
          body: JSON.stringify(dimensions),
          contentType: "application/json",
        });
        expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
      }
      observations.push(
        await page.locator(".algebra-app").evaluate((element) => ({
          route: location.hash,
          heading: element.querySelector("h1")?.textContent,
          renderedMath: element.querySelectorAll(".katex").length,
          controls: element.querySelectorAll("button,input,select,textarea")
            .length,
        })),
      );
    }
    expect(errors).toEqual([]);
    await testInfo.attach("catalogue-entry-evidence", {
      body: JSON.stringify({
        lesson: lesson.id,
        testCatalogueSha256,
        environment: testInfo.config.metadata,
        observations,
        errors,
        scope:
          "entry rendering, prediction gate, select/range boundaries, available counterexample buttons, keyboard and reflow; not every combination or mathematical claim",
      }),
      contentType: "application/json",
    });
  });
}
