import { test, expect } from "@playwright/test";
import fs from "node:fs";

const guides = JSON.parse(
  fs.readFileSync(
    new URL("../../lib/algebra/guided-lessons.json", import.meta.url),
  ),
);

test("modes, atlas filters, aliases and browser history retain usable destinations", async ({
  page,
}) => {
  for (const mode of ["home", "learn", "explore", "reference", "sources"]) {
    await page.goto(`/#${mode}`);
    await expect(page.locator('.algebra-app[data-ready="true"]')).toBeVisible();
    await expect(page.locator("#mode-heading")).toBeVisible();
  }
  await page.goto("/#reference");
  await page.getByRole("searchbox", { name: "Search the atlas" }).fill("Sylow");
  await expect(page.locator(".atlas-results")).toContainText("Sylow");
  await page
    .getByRole("combobox", { name: "Teaching status", exact: true })
    .selectOption("guided");
  await expect(page.locator(".atlas-results li").first()).toContainText(
    "guided",
  );
  await page.locator(".atlas-results a").first().click();
  await expect(page.locator("#lesson-heading")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#mode-heading")).toBeVisible();
  await page.goto("/#ureca-cube-symmetry");
  await expect(page.locator("#lesson-heading")).toBeVisible();
  await page.goto("/#unrecognised-lesson");
  await expect(page.locator(".reference-atlas")).toBeVisible();
});

test("competencies synchronize between two tabs without losing earlier submissions", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await page.goto("/#foundations-functions");
  await other.goto("/#foundations-functions");
  const submit = async (target, field) => {
    const checkpoint = target
      .locator(".guided-reader .learning-checkpoint")
      .nth(
        [
          "prerequisiteCheck",
          "boundaryCheck",
          "application",
          "transfer",
        ].indexOf(field),
      );
    await checkpoint
      .getByRole("radio")
      .nth(guides["foundations-functions"][field].answer)
      .check();
    await checkpoint.getByRole("button", { name: "Check reasoning" }).click();
  };
  await submit(page, "boundaryCheck");
  await expect(
    other.locator(".guided-reader .competency-progress"),
  ).toContainText("1 of 3");
  await submit(other, "application");
  await expect(
    page.locator(".guided-reader .competency-progress"),
  ).toContainText("2 of 3");
  await submit(page, "transfer");
  await expect(
    other.locator(".guided-reader .competency-progress"),
  ).toContainText("3 of 3");
  await other.reload();
  await expect(
    other.locator(".guided-reader .competency-progress"),
  ).toContainText("3 of 3");
  await other.close();
});
