import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("representative release flows keep MathML, console and 200% reflow clean", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  // 1280 device pixels at 200% browser zoom expose a 640 CSS-pixel layout viewport.
  await page.setViewportSize({ width: 640, height: 900 });
  for (const route of [
    "home",
    "learn",
    "explore",
    "reference",
    "sources",
    "lab:mh2220-semidirect",
    "mh2220-permutation-matrices",
  ]) {
    await page.goto(`/#${route}`);
    await expect(page.locator(".algebra-app")).toHaveAttribute(
      "data-ready",
      "true",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(640);
  }
  await page.goto("/#mh2220-permutation-matrices");
  await expect(page.locator(".katex-mathml").first()).toBeAttached();
  const lessonLink = page.locator(".algebra-app a").first();
  await lessonLink.evaluate((element) => {
    element.style.transition = "opacity 1s";
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(
    await lessonLink.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  ).toBe("1s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await lessonLink.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  ).toBe("0s");
  await page.screenshot({ path: testInfo.outputPath("release-mathml.png") });
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((v) => ["serious", "critical"].includes(v.impact)),
  ).toEqual([]);
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  const mobileAudit = await new AxeBuilder({ page }).analyze();
  expect(
    mobileAudit.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
});
