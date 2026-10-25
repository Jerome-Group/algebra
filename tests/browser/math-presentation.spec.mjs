import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { expectExactMathRegion } from "./public-math-segments.mjs";
import { expectChoiceValue } from "./choice-controls.mjs";

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
      for (let index = 0; index < (await choices.count()); index++) {
        await expect(choices.nth(index)).toHaveAccessibleName(
          new RegExp(`^Choice ${index + 1}\\. \\S`),
        );
        expect(await choices.nth(index).ariaSnapshot()).not.toMatch(
          /\\(?:operatorname|mathbb|oplus|frac|text)/,
        );
      }
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

for (const width of [390, 1440]) {
  test(`existing TeX choices expose rendered mathematical names at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#ureca-theory-mackey-isomorphism");
    const choice = page.getByRole("radio", { name: /Choice 1\. sgn/ });
    await expect(choice).toHaveAccessibleName(/sgn.*H.*⊕.*C.*H/);
    expect(await choice.ariaSnapshot()).not.toMatch(
      /\\(?:operatorname|mathbb|oplus)/,
    );
    await choice.check();
    await choice.press("ArrowDown");
    const checkpoint = choice.locator("xpath=ancestor::form");
    await expect(checkpoint.getByRole("radio").nth(1)).toBeFocused();
    await expect(checkpoint.getByRole("radio").nth(1)).toBeChecked();
    await expect(
      checkpoint.locator("label .math-inline[tabindex]"),
    ).toHaveCount(0);
    const audit = await new AxeBuilder({ page }).analyze();
    await testInfo.attach("existing-tex-choice-accessibility", {
      body: JSON.stringify(audit),
      contentType: "application/json",
    });
    expect(
      audit.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact),
      ),
    ).toEqual([]);
    await checkpoint.screenshot({
      path: testInfo.outputPath("existing-tex-checkpoint.png"),
    });
  });
}

test("typeset custom group options retain prefix keyboard search", async ({
  page,
}) => {
  await page.goto("/#lab:mh2220-subgroups");
  const group = page.getByRole("combobox", {
    name: "Finite group",
    exact: true,
  });
  await expect(group).toBeVisible();
  await group.press("ArrowDown");
  await page.keyboard.press("s");
  const symmetric = page.getByRole("option", {
    name: "Symmetric group S n",
    exact: true,
  });
  await expect(symmetric).toBeFocused();
  await expectExactMathRegion(symmetric, "Symmetric $S_n$");
  await expect(symmetric.locator(".math-inline[tabindex]")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(group).toContainText("Symmetric");
  await expect(group).toBeFocused();
  await expectChoiceValue(page, group, "S");
});
