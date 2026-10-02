import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";

const catalogueSource = fs.readFileSync(
  new URL("../../lib/algebra/lessons.json", import.meta.url),
);
const lessons = JSON.parse(catalogueSource);
const testCatalogueSha256 = createHash("sha256")
  .update(catalogueSource)
  .digest("hex");

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
      expect(
        await page.evaluate(() => localStorage.getItem("algebra-resume-v1")),
      ).toBe(lesson.id);
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
