import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const mode of ["home", "learn", "explore", "reference", "sources"]) {
  test(`${mode} reflows at required widths and has no serious accessibility failures`, async ({
    page,
  }, testInfo) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/#${mode}`);
    await expect(page.locator("#mode-heading")).toBeVisible();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: testInfo.outputPath(`${mode}-${width}.png`),
      });
    }
    const results = await new AxeBuilder({ page }).analyze();
    await testInfo.attach("axe", {
      body: JSON.stringify(results),
      contentType: "application/json",
    });
    expect(
      results.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact),
      ),
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("mobile drawer begins below every header row and restores keyboard focus", async ({
  page,
}) => {
  await page.goto("/#home");
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const toggle = page.getByRole("button", { name: "Concepts", exact: true });
    await toggle.click();
    await expect(
      page.getByRole("textbox", { name: "Search concepts", exact: true }),
    ).toBeFocused();
    const header = await page.locator(".algebra-header").boundingBox();
    const navigation = await page
      .getByRole("navigation", { name: "Learning modes" })
      .boundingBox();
    const drawer = await page
      .getByRole("navigation", { name: "Concept library" })
      .boundingBox();
    expect(navigation.y + navigation.height).toBeLessThanOrEqual(
      header.y + header.height + 1,
    );
    expect(drawer.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }
});

test("unit context and heading focus survive Back and forward", async ({
  page,
}) => {
  await page.goto("/#learn");
  await page
    .getByRole("button", { name: "Start this unit", exact: true })
    .first()
    .click();
  await expect(page.locator("#lesson-heading")).toBeFocused();
  await expect(page.locator(".route-progress")).toContainText(
    "Functions, fibers and equivalence",
  );
  await page.goBack();
  await expect(page.locator("#mode-heading")).toBeFocused();
  await page.goForward();
  await expect(page.locator("#lesson-heading")).toBeFocused();
  await expect(page.locator(".route-progress")).toContainText(
    "Reading position 1 of 3",
  );
});

test("reference teaching filter returns the explicit reference entries", async ({
  page,
}) => {
  await page.goto("/#reference");
  await page
    .getByRole("combobox", { name: /^Teaching status/ })
    .selectOption("reference-only");
  await expect(page.getByRole("status")).toHaveText("23 matching concepts");
  await expect(page.locator(".atlas-results > li")).toHaveCount(23);
});

test("guided checkpoints diagnose an error and keep the source/reference path available", async ({
  page,
}, testInfo) => {
  await page.goto("/#foundations-functions");
  const guide = page.locator(".guided-reader");
  await expect(guide).toBeVisible();
  const checkpoint = guide.locator(".learning-checkpoint").first();
  await checkpoint.getByRole("radio").nth(1).check();
  await checkpoint.getByRole("button", { name: "Check reasoning" }).click();
  await expect(checkpoint.getByRole("status")).toContainText("Reconsider");
  await expect(checkpoint.getByRole("status")).toContainText(
    "exactly one output",
  );
  await checkpoint.getByRole("radio").first().check();
  await checkpoint.getByRole("button", { name: "Check reasoning" }).click();
  await expect(checkpoint.getByRole("status")).toContainText("Correct");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: testInfo.outputPath(`guided-functions-${width}.png`),
    });
  }
  const audit = await new AxeBuilder({ page }).analyze();
  await testInfo.attach("guided-axe", {
    body: JSON.stringify(audit),
    contentType: "application/json",
  });
  expect(
    audit.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact),
    ),
  ).toEqual([]);
  await page
    .getByRole("button", {
      name: "Read the reference notes and further practice",
    })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Reading view" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Read lesson", exact: true }).click();
  await expect(guide).toBeVisible();
});
