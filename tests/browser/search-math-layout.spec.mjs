import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { expectExactMathRegion } from "./public-math-segments.mjs";

const lessons = JSON.parse(
  fs.readFileSync(new URL("../../lib/algebra/lessons.json", import.meta.url)),
);
const smallGroups = lessons.find(({ id }) => id === "mh2220-small-groups");
const rings = lessons.find(({ id }) => id === "m3220-rings");
const permutationMatrices = lessons.find(
  ({ id }) => id === "mh2220-permutation-matrices",
);

for (const width of [390, 1440]) {
  test(`complete search table pans by keyboard and opens its lesson at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#home");
    await expect(page.locator(".algebra-app")).toHaveAttribute(
      "data-ready",
      "true",
    );
    if (width === 390)
      await page.getByRole("button", { name: "Concepts", exact: true }).click();
    const search = page.getByRole("textbox", {
      name: "Search concepts",
      exact: true,
    });
    await search.fill("array");
    const link = page.locator('.search-results a[href="#mh2220-small-groups"]');
    await expect(link).toHaveCount(1);
    await expect(link).toBeVisible();
    await expect(link.locator(":scope > span").first()).toHaveText(
      smallGroups.navTitle,
    );
    await expect(link.locator("small")).toHaveText(
      `${smallGroups.subject} · ${smallGroups.family}`,
    );
    await expect(link).toHaveAttribute("href", `#${smallGroups.id}`);
    const snippet = link.locator(".search-snippet");
    await expectExactMathRegion(snippet, `$${smallGroups.definition}$`);
    await expect(snippet).toHaveCSS("-webkit-line-clamp", "none");
    expect(
      await link.evaluate(
        (element) => element.scrollHeight - element.clientHeight,
      ),
    ).toBeLessThanOrEqual(1);
    await expect(
      link.locator("a, button, input, select, textarea, [tabindex]"),
    ).toHaveCount(0);

    await search.focus();
    for (
      let attempt = 0;
      attempt < 40 &&
      !(await link.evaluate((element) => element === document.activeElement));
      attempt++
    )
      await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
    expect(await link.evaluate((element) => element.scrollLeft)).toBe(0);
    if (width === 1440) {
      expect(
        await link.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        ),
      ).toBeGreaterThan(1);
      await link.press("ArrowRight");
      await expect
        .poll(() => link.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
      await expect
        .poll(async () => {
          await link.press("ArrowRight");
          return link.evaluate(
            (element) =>
              element.scrollWidth - element.clientWidth - element.scrollLeft,
          );
        })
        .toBeLessThanOrEqual(1);
      await expect(link).toBeFocused();
      await page.screenshot({
        path: info.outputPath(`search-table-right-${width}.png`),
      });
      await link.press("ArrowLeft");
      await expect
        .poll(() => link.evaluate((element) => element.scrollLeft))
        .toBeLessThan(
          await link.evaluate(
            (element) => element.scrollWidth - element.clientWidth,
          ),
        );
      await expect
        .poll(async () => {
          await link.press("ArrowLeft");
          return link.evaluate((element) => element.scrollLeft);
        })
        .toBeLessThanOrEqual(1);
    } else {
      expect(
        await link.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
    }
    await expect(link).toBeFocused();
    await expectExactMathRegion(snippet, `$${smallGroups.definition}$`);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: info.outputPath(`search-table-left-${width}.png`),
    });
    await link.press("Enter");
    await expect(page).toHaveURL(new RegExp(`#${smallGroups.id}$`));
    await expect(page.locator("#lesson-heading")).toHaveText(
      `01${smallGroups.navTitle || smallGroups.title}`,
    );
    await expect(page.locator("#lesson-heading")).toBeFocused();
  });

  test(`mixed mathematical search passage stays complete while prose stays clamped at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#home");
    await expect(page.locator(".algebra-app")).toHaveAttribute(
      "data-ready",
      "true",
    );
    if (width === 390)
      await page.getByRole("button", { name: "Concepts", exact: true }).click();
    const search = page.getByRole("textbox", {
      name: "Search concepts",
      exact: true,
    });
    await search.fill("pmatrix");
    const link = page.locator(
      '.search-results a[href="#mh2220-permutation-matrices"]',
    );
    await expect(link).toBeVisible();
    const snippet = link.locator(".search-snippet");
    await expectExactMathRegion(snippet, permutationMatrices.worked.steps[0]);
    await expect(snippet).toHaveCSS("-webkit-line-clamp", "none");
    const bounds = await snippet.evaluate((element) => {
      const { top, bottom } = element.getBoundingClientRect();
      return [...element.querySelectorAll(".katex-html > .katex-base")].map(
        (math) => {
          const bounds = math.getBoundingClientRect();
          return {
            top: bounds.top - top,
            bottom: bottom - bounds.bottom,
          };
        },
      );
    });
    expect(bounds.length).toBeGreaterThanOrEqual(3);
    for (const math of bounds) {
      expect(math.top).toBeGreaterThanOrEqual(-1);
      expect(math.bottom).toBeGreaterThanOrEqual(-1);
    }
    expect(
      await link.evaluate(
        (element) => element.scrollHeight - element.clientHeight,
      ),
    ).toBeLessThanOrEqual(1);
    await expect(link.locator("[tabindex]")).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await link.focus();
    await page.screenshot({
      path: info.outputPath(`search-mixed-passage-${width}.png`),
    });

    await search.fill("multiplicative row");
    const prose = page.locator(
      '.search-results a[href="#m3220-rings"] .search-snippet',
    );
    await expect(prose).toBeVisible();
    await expect(prose).toHaveText(rings.explanation);
    await expect(prose.locator(".katex")).toHaveCount(0);
    await expect(prose).toHaveCSS("-webkit-line-clamp", "3");
    const preview = await prose.evaluate((element) => ({
      height: element.clientHeight,
      contentHeight: element.scrollHeight,
      lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
    }));
    expect(preview.height).toBeLessThanOrEqual(preview.lineHeight * 3 + 1);
    expect(preview.contentHeight).toBeGreaterThan(preview.height);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: info.outputPath(`search-prose-preview-${width}.png`),
    });
  });
}
