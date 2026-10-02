import { test, expect } from "@playwright/test";
// Match the observed production FunctionFibers-<hash>.js chunk and Vite source.
const laboratoryImport =
  /\/(?:components\/algebra\/FunctionFibers\.tsx|assets\/FunctionFibers-[\w-]+\.js)(?:\?.*)?$/;

test("laboratory code loads on demand with readable pending feedback", async ({
  page,
}) => {
  let requested = false;
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(laboratoryImport, async (route) => {
    requested = true;
    await pending;
    await route.continue();
  });
  await page.goto("/#home");
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  expect(requested).toBe(false);
  await page.evaluate(() => {
    location.hash = "lab:foundations-functions";
  });
  await page
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("A fiber changes.");
  await page.getByRole("button", { name: "Test my prediction" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /Loading .* laboratory/ }),
  ).toBeVisible();
  expect(requested).toBe(true);
  release();
  await expect(page.locator(".laboratory-loading")).toHaveCount(0);
  await expect(page.locator(".katex").first()).toBeVisible();
});

test("failed laboratory import keeps navigation usable and offers route-preserving reload", async ({
  page,
}) => {
  await page.route(laboratoryImport, (route) => route.abort());
  await page.goto("/#home");
  await page.evaluate(() => {
    location.hash = "lab:foundations-functions";
  });
  await page
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("A fiber changes.");
  await page.getByRole("button", { name: "Test my prediction" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Laboratory unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Learn", exact: true }),
  ).toBeVisible();
  const developerOverlay = page.getByRole("dialog", { name: "Runtime Error" });
  if (await developerOverlay.isVisible())
    await developerOverlay
      .getByRole("button", { name: "Dismiss", exact: true })
      .click();
  await page.unroute(laboratoryImport);
  await page.getByRole("button", { name: "Reload laboratory" }).click();
  await expect(page).toHaveURL(/#lab:foundations-functions$/);
  await page
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("A fiber changes.");
  await page.getByRole("button", { name: "Test my prediction" }).click();
  await expect(page.locator(".laboratory-load-error")).toHaveCount(0);
  await expect(page.locator(".katex").first()).toBeVisible();
});
