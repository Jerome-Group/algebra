import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const units = JSON.parse(
  readFileSync(new URL("../../lib/algebra/units.json", import.meta.url)),
);

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders preview metadata and crawler-readable social images", async ({
  request,
}) => {
  const response = await request.get("/", {
    headers: { accept: "text/html" },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"] ?? "").toMatch(/^text\/html\b/i);
  const html = await response.text();
  expect(html).toMatch(developmentPreviewMeta);
  expect(html).toMatch(
    /<meta(?=[^>]*property="og:title")(?=[^>]*content="Abstract Algebra")[^>]*>/,
  );
  expect(html).toMatch(
    /<meta(?=[^>]*property="og:image")(?=[^>]*content="https:\/\/algebra\.jeromegroup\.org\/og\.png")[^>]*>/,
  );
  expect(html).toMatch(
    /<meta(?=[^>]*name="twitter:card")(?=[^>]*content="summary_large_image")[^>]*>/,
  );
  expect(html).toMatch(
    /<meta(?=[^>]*name="twitter:image")(?=[^>]*content="https:\/\/algebra\.jeromegroup\.org\/og\.png")[^>]*>/,
  );
  expect(html).toMatch(
    /<link(?=[^>]*rel="apple-touch-icon")(?=[^>]*href="[^"]*logo\.png")[^>]*>/,
  );
});

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

test("a unit endpoint returns to its capstone and restores lesson context through history", async ({
  page,
}) => {
  await page.goto("/#learn");
  const unit = page.locator(".route-options > section").first();
  await unit
    .getByRole("button", { name: "Start this unit", exact: true })
    .click();
  await page
    .locator(".concept-end")
    .getByRole("button", { name: /^Next:/ })
    .click();
  await expect(page.locator(".route-progress")).toContainText(
    "Reading position 2 of 3",
  );
  await page
    .locator(".concept-end")
    .getByRole("button", { name: /^Next:/ })
    .click();
  await expect(page.locator(".route-progress")).toContainText(
    "Reading position 3 of 3",
  );
  const destination = page.locator(".concept-end a");
  await expect(destination).toHaveText("Return to unit capstone");
  await expect(destination).toHaveAttribute("href", "#capstone:functions");
  await destination.click();
  const capstone = page.locator('[id="capstone:functions"]');
  await expect(capstone).toBeFocused();
  await expect(unit.locator(":scope > details")).toHaveAttribute("open", "");
  await expect(unit.locator("details details")).not.toHaveAttribute("open");
  await expect(
    page.locator('.product-navigation [aria-current="page"]'),
  ).toHaveText("Learn");
  await expect(unit.locator(".competency-progress")).toContainText("0 of");
  await expect(unit.locator(".competency-progress")).toContainText(
    "Capstone not yet demonstrated",
  );

  await unit.getByRole("radio").first().check();
  await unit.getByText("Compare your reasoning", { exact: true }).click();
  await page.getByRole("link", { name: "Learn", exact: true }).click();
  await expect(page.locator("#mode-heading")).toBeFocused();
  await page.goBack();
  await expect(capstone).toBeFocused();
  await expect(unit.locator("details details")).not.toHaveAttribute("open");
  await expect(unit.getByRole("radio").first()).toBeChecked();

  await page.goBack();
  await expect(page.locator("#lesson-heading")).toBeFocused();
  await expect(page.locator(".route-progress")).toContainText(
    "Reading position 3 of 3",
  );
  await page.goForward();
  await expect(capstone).toBeFocused();
  await page.reload();
  await expect(capstone).toBeFocused();
  await expect(unit.locator("details details")).not.toHaveAttribute("open");
});

test("capstone cold entry and reload focus the committed catalogue on a slower device", async ({
  page,
}) => {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto("/#capstone:functions");
  const target = page.locator('[id="capstone:functions"]');
  await expect(target).toBeFocused();
  await page.reload();
  await expect(target).toBeFocused();
});

for (const width of [390, 1440]) {
  test(`later unit capstone direct entry and return remain visible at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const unit = units.at(-1);
    await page.goto(`/#capstone:${unit.id}`);
    const target = page.locator(`[id="capstone:${unit.id}"]`);
    await expect(target).toBeFocused();
    const catalogUnit = page.locator(".route-options > section").last();
    await catalogUnit.locator("ol a").last().focus();
    await page.keyboard.press("Tab");
    await expect(target).toBeFocused();
    await catalogUnit.locator("ol a").last().click();
    await expect(page.locator(".route-progress")).toContainText(unit.title);
    const returnLink = page.getByRole("link", {
      name: "Return to unit capstone",
    });
    await returnLink.focus();
    await returnLink.press("Enter");
    await expect(target).toBeFocused();
    await expect(target).toHaveCSS("outline-width", "3px");
    const header = await page.locator(".algebra-header").boundingBox();
    const summary = await target.boundingBox();
    expect(summary.y).toBeGreaterThanOrEqual(header.y + header.height);
    expect(summary.y + summary.height).toBeLessThanOrEqual(1000);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(catalogUnit.locator("details details")).not.toHaveAttribute(
      "open",
    );
    await expect(
      page.locator(".route-options > section > details[open]"),
    ).toHaveCount(1);
    await page.screenshot({
      path: testInfo.outputPath(`capstone-${unit.id}-${width}.png`),
    });
    await page.reload();
    await expect(target).toBeFocused();
  });
}

test("invalid capstones recover to Learn and unscoped reading endpoints promise no unit destination", async ({
  page,
}) => {
  for (const target of ["", "unknown", "functions:extra", "%E0%A4%A"]) {
    await page.goto(`/#capstone:${target}`);
    await expect(page.locator(".course-catalog")).toBeVisible();
    await expect(page.locator("#mode-heading")).toBeFocused();
    await expect(
      page.locator(".route-options > section > details[open]"),
    ).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto(`/#${units.at(-1).lessons.at(-1)}`);
  await expect(page.locator(".route-progress")).toHaveCount(0);
  await expect(
    page
      .locator(".concept-end")
      .getByText("End of reading list", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Return to unit capstone" }),
  ).toHaveCount(0);
});

test("reference teaching filter reports empty results after every entry has a guided lesson", async ({
  page,
}) => {
  await page.goto("/#reference");
  await page
    .getByRole("combobox", { name: /^Teaching status/ })
    .selectOption("reference-only");
  await expect(page.locator(".reference-atlas").getByRole("status")).toHaveText(
    "0 matching concepts",
  );
  await expect(page.locator(".atlas-results > li")).toHaveCount(0);
  await page
    .getByRole("combobox", { name: /^Teaching status/ })
    .selectOption("guided");
  await expect(page.locator(".reference-atlas").getByRole("status")).toHaveText(
    "150 matching concepts",
  );
  await expect(page.locator(".atlas-results > li")).toHaveCount(150);
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
