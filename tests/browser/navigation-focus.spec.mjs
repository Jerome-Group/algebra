import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    const frames = new Map();
    let next = -1;
    window.navigationFrames = {
      hold: false,
      count: () => frames.size,
      flush: () => {
        const callbacks = [...frames.values()];
        frames.clear();
        for (const callback of callbacks) callback(performance.now());
      },
    };
    window.requestAnimationFrame = (callback) => {
      if (!window.navigationFrames.hold) return request(callback);
      const id = next--;
      frames.set(id, callback);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      if (id < 0) frames.delete(id);
      else cancel(id);
    };
  });
  await page.goto("/#home");
  await expect(page.locator('.algebra-app[data-ready="true"]')).toBeVisible();
  await expect(page.locator("#mode-heading")).toBeFocused();
  await page.evaluate(() => {
    window.navigationFrames.hold = true;
  });
});

test("deferred lesson navigation never overwrites subsequent reader focus", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Reference", exact: true }).click();
  await expect(page.locator(".reference-atlas")).toBeVisible();
  await page.evaluate(() => {
    location.hash = "foundations-functions";
  });
  const prove = page.getByRole("button", { name: "Prove", exact: true });
  await expect(prove).toBeVisible();
  expect(
    await page.evaluate(() => window.navigationFrames.count()),
  ).toBeGreaterThan(0);
  await prove.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#foundations-functions-proof")).toBeFocused();
  await page.evaluate(() => window.navigationFrames.flush());
  await expect(page.locator("#foundations-functions-proof")).toBeFocused();
});

test("deferred mode navigation never overwrites subsequent reader focus", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Reference", exact: true }).click();
  const search = page.getByRole("searchbox", { name: "Search the atlas" });
  await expect(search).toBeVisible();
  expect(
    await page.evaluate(() => window.navigationFrames.count()),
  ).toBeGreaterThan(0);
  await search.focus();
  await page.evaluate(() => window.navigationFrames.flush());
  await expect(search).toBeFocused();
});

test("latest navigation cancels stale frames and retains default heading focus and scroll reset", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Reference", exact: true }).click();
  await expect(page.locator(".reference-atlas")).toBeVisible();
  await page.getByRole("link", { name: "Sources", exact: true }).click();
  await expect(
    page.locator('.product-navigation [aria-current="page"]'),
  ).toHaveText("Sources");
  expect(await page.evaluate(() => window.navigationFrames.count())).toBe(1);
  await page.evaluate(() => window.navigationFrames.flush());
  await expect(page.locator("#mode-heading")).toBeFocused();

  await page.evaluate(() => {
    location.hash = "foundations-functions";
  });
  await expect(page.locator("#lesson-heading")).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 300 }));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.evaluate(() => window.navigationFrames.flush());
  await expect(page.locator("#lesson-heading")).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
