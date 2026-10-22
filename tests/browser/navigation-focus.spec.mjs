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

test("deferred capstone focus yields to the reader's checkpoint choice", async ({
  page,
}) => {
  await page.evaluate(() => {
    location.hash = "capstone:tensor";
  });
  const target = page.locator('[id="capstone:tensor"]');
  await expect(target).toBeVisible();
  expect(
    await page.evaluate(() => window.navigationFrames.count()),
  ).toBeGreaterThan(0);
  const choice = page
    .locator(".route-options > section")
    .last()
    .getByRole("radio")
    .first();
  await choice.focus();
  await page.evaluate(() => window.navigationFrames.flush());
  await expect(choice).toBeFocused();
  await expect(target).not.toBeFocused();
});

test("capstone intent yields to reader focus before the destination commit", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Learn", exact: true }).click();
  const reader = page
    .locator(".route-options > section")
    .first()
    .getByRole("button", { name: "Start this unit", exact: true });
  await expect(reader).toBeVisible();
  await page.evaluate(() => {
    const reader = document.querySelector(".route-options > section button");
    window.addEventListener("hashchange", () => reader.focus(), { once: true });
    location.hash = "capstone:functions";
  });
  await expect(
    page.locator(".route-options > section > details[open]"),
  ).toHaveCount(1);
  await page.evaluate(() => window.navigationFrames.flush());
  await expect(reader).toBeFocused();
});

test("new navigation cancels pending capstone focus and target scrolling", async ({
  page,
}) => {
  await page.evaluate(() => {
    location.hash = "capstone:tensor";
  });
  const target = page.locator('[id="capstone:tensor"]');
  await expect(target).toBeVisible();
  await target.evaluate((summary) => {
    window.capstoneFocusCount = 0;
    summary.addEventListener("focus", () => {
      window.capstoneFocusCount++;
    });
  });
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        window.addEventListener("hashchange", resolve, { once: true });
        location.hash = "learn";
      }),
  );
  expect(
    await page.evaluate(() => window.navigationFrames.count()),
  ).toBeGreaterThan(0);
  await page.evaluate(() => window.navigationFrames.flush());
  await expect(page.locator("#mode-heading")).toBeFocused();
  expect(await page.evaluate(() => window.capstoneFocusCount)).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
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
