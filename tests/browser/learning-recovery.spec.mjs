import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const units = JSON.parse(
  readFileSync(new URL("../../lib/algebra/units.json", import.meta.url)),
);

test("capstone comparison renders its authored mathematics", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  for (const unit of units.filter((item) =>
    item.capstone.answer.includes("$"),
  )) {
    await page.goto(`/#capstone:${unit.id}`);
    const capstone = page
      .locator("details")
      .filter({ has: page.locator(`[id="capstone:${unit.id}"]`) });
    const comparison = capstone.locator("details");
    await comparison
      .getByText("Compare your reasoning", { exact: true })
      .click();
    await expect(comparison.locator(".katex").first()).toBeVisible();
    await expect(comparison.locator(".katex-error")).toHaveCount(0);
    const raw = await comparison.evaluate((element) => {
      const copy = element.cloneNode(true);
      copy
        .querySelectorAll(".math-inline,.math-display")
        .forEach((math) => math.remove());
      return copy.textContent;
    });
    expect(raw, unit.id).not.toMatch(/\$|\\(?:begin|mathbb|mapsto|frac)/);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  }
});

test("remembered worked examples are searchable and empty searches recover", async ({
  page,
}) => {
  await page.goto("/#reference");
  await expect(page.locator(".atlas-results > li").first()).toBeVisible();
  const available = await page.locator(".atlas-results > li").count();
  await page
    .getByRole("searchbox", { name: "Search the atlas" })
    .fill("missing outputs");
  await expect(
    page
      .locator(".atlas-results")
      .getByRole("link", { name: "Functions & equivalence" }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search the atlas" })
    .fill("no-such-mathematical-example");
  await expect(
    page.getByRole("status").filter({ hasText: "0 matching concepts" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search and filters" }).click();
  await expect(
    page.getByRole("searchbox", { name: "Search the atlas" }),
  ).toHaveValue("");
  await expect(page.locator(".atlas-results > li")).toHaveCount(available);
});
