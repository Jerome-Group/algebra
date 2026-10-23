import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const lessons = [
  "foundations-functions",
  "foundations-fibers",
  "foundations-quotient-rules",
];

for (const width of [390, 1440]) {
  for (const id of lessons) {
    test(`${id} keeps typeset choices named and keyboard usable at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/#${id}`);
      const guide = page.locator(".guided-reader");
      await expect(guide).toBeVisible();
      await expect(guide.locator(".katex-error")).toHaveCount(0);
      expect(await guide.locator("math").count()).toBeGreaterThan(5);
      const checkpoint = guide.locator(".learning-checkpoint").first();
      const choices = checkpoint.getByRole("radio");
      const names = await choices.evaluateAll((inputs) =>
        inputs.map((input) => input.getAttribute("aria-label")),
      );
      expect(names.every((name) => name?.trim())).toBe(true);
      expect(new Set(names).size).toBe(names.length);
      await expect(
        checkpoint.locator("label .math-inline[tabindex]"),
      ).toHaveCount(0);
      await expect(
        checkpoint.locator("legend .math-inline[tabindex]").first(),
      ).toBeAttached();
      await choices.first().check();
      await choices.first().press("ArrowDown");
      await expect(choices.nth(1)).toBeChecked();
      await expect(choices.nth(1)).toBeFocused();
      await checkpoint
        .getByRole("button", { name: "Check reasoning", exact: true })
        .click();
      await expect(checkpoint.getByRole("status")).not.toBeEmpty();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      const audit = await new AxeBuilder({ page }).analyze();
      await testInfo.attach("math-accessibility", {
        body: JSON.stringify(audit),
        contentType: "application/json",
      });
      expect(
        audit.violations.filter((violation) =>
          ["serious", "critical"].includes(violation.impact),
        ),
      ).toEqual([]);
      await page.getByRole("button", { name: "Define", exact: true }).click();
      if (width === 390 && id === "foundations-functions") {
        const equation = guide.locator(".math-display").first();
        expect(
          await equation.evaluate(
            (element) => element.scrollWidth > element.clientWidth,
          ),
        ).toBe(true);
        await equation.focus();
        await equation.press("ArrowRight");
        await expect
          .poll(() => equation.evaluate((element) => element.scrollLeft))
          .toBeGreaterThan(0);
      }
      await page.screenshot({ path: testInfo.outputPath("objects.png") });
    });
  }
}
