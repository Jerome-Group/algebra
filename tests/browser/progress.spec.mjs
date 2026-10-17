import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
const guides = JSON.parse(
  readFileSync(
    new URL("../../lib/algebra/guided-lessons.json", import.meta.url),
  ),
);
async function answer(page, lessonId, field, correct = true) {
  const index = [
    "prerequisiteCheck",
    "boundaryCheck",
    "application",
    "transfer",
  ].indexOf(field);
  const checkpoint = page
    .locator(".guided-reader .learning-checkpoint")
    .nth(index);
  const assessment = guides[lessonId][field];
  await checkpoint
    .getByRole("radio")
    .nth(
      correct
        ? assessment.answer
        : (assessment.answer + 1) % assessment.choices.length,
    )
    .check();
  await checkpoint.getByRole("button", { name: "Check reasoning" }).click();
}
const navigate = (page, hash) =>
  page.evaluate((value) => {
    location.hash = value;
  }, hash);

test("guest checkpoints distinguish prerequisite checks, reasoning, reversible reset and session lifetime", async ({
  page,
}) => {
  const id = "foundations-functions";
  await page.goto(`/#${id}`);
  await expect(page.locator("[data-account-phase]")).toHaveAttribute(
    "data-account-phase",
    "guest",
  );
  await answer(page, id, "prerequisiteCheck");
  await expect(
    page.locator(".guided-reader .competency-progress"),
  ).toContainText("0 of 3");
  await answer(page, id, "boundaryCheck", false);
  await expect(page.locator(".saved-checkpoint")).toContainText(
    "Review needed",
  );
  for (const field of ["boundaryCheck", "application", "transfer"])
    await answer(page, id, field);
  await expect(
    page.locator(".guided-reader .competency-progress"),
  ).toContainText("Lesson complete");
  await page.getByRole("link", { name: "Reference", exact: true }).click();
  await page
    .getByRole("checkbox", { name: /prerequisites demonstrated/i })
    .check();
  await expect(page.locator(".atlas-results")).toContainText("Fibers");
  await page
    .getByRole("link", { name: "Abstract Algebra", exact: true })
    .click();
  await expect(page.locator(".device-progress progress")).toHaveAttribute(
    "value",
    "3",
  );
  await page.getByRole("button", { name: "Reset learning progress" }).click();
  await page.getByRole("button", { name: "Keep my progress" }).click();
  await expect(page.locator(".device-progress progress")).toHaveAttribute(
    "value",
    "3",
  );
  await page.getByRole("button", { name: "Reset learning progress" }).click();
  await page.getByRole("button", { name: "Clear my progress" }).click();
  await expect(page.locator(".device-progress progress")).toHaveAttribute(
    "value",
    "0",
  );
  await page.getByRole("button", { name: "Restore previous progress" }).click();
  await expect(page.locator(".device-progress progress")).toHaveAttribute(
    "value",
    "3",
  );
  await page.reload();
  await expect(page.locator(".device-progress progress")).toHaveAttribute(
    "value",
    "0",
  );
});

test("guest unit completion requires all guided competencies and its capstone", async ({
  page,
}) => {
  await page.goto("/#home");
  await expect(page.locator("[data-account-phase]")).toHaveAttribute(
    "data-account-phase",
    "guest",
  );
  for (const id of [
    "foundations-functions",
    "foundations-fibers",
    "foundations-quotient-rules",
  ]) {
    await navigate(page, `#${id}`);
    await expect(page.locator("#lesson-heading")).toBeVisible();
    for (const field of ["boundaryCheck", "application", "transfer"])
      await answer(page, id, field);
  }
  await page.getByRole("link", { name: "Learn", exact: true }).click();
  const unit = page.locator(".route-options > section").first();
  await expect(unit.locator(".competency-progress")).not.toContainText(
    "Unit complete",
  );
  await unit.getByText("Unit capstone", { exact: true }).click();
  await unit.getByRole("radio").first().check();
  await unit.getByRole("button", { name: "Check reasoning" }).click();
  await expect(unit.locator(".competency-progress")).toContainText(
    "Unit complete",
  );
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact),
    ),
  ).toEqual([]);
});

test("guest learning works with browser storage denied and performs no device writes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__accountTestWrites = 0;
    Storage.prototype.setItem = () => {
      window.__accountTestWrites++;
      throw new Error("No new browser writes");
    };
    Storage.prototype.getItem = () => {
      throw new Error("Storage disabled");
    };
  });
  await page.goto("/#foundations-functions");
  await expect(page.locator("[data-account-phase]")).toHaveAttribute(
    "data-account-phase",
    "guest",
  );
  await answer(page, "foundations-functions", "boundaryCheck");
  await expect(
    page.locator(".guided-reader .competency-progress"),
  ).toContainText("1 of 3");
  await page
    .getByRole("link", { name: "Abstract Algebra", exact: true })
    .click();
  await expect(page.locator(".device-progress")).toContainText(
    "only for this session",
  );
  await page
    .getByRole("button", { name: "Preview legacy browser records" })
    .click();
  await expect(page.getByText(/Browser access failed/)).toBeVisible();
  expect(await page.evaluate(() => window.__accountTestWrites)).toBe(0);
});

test("all four original records remain byte exact and exportable without automatic import", async ({
  page,
}) => {
  const records = {
    "algebra-competency-progress-v1":
      '{ "version": 9, "attempts": {"future":"preserve"} }',
    "algebra-competency-progress-v1-backup": '{ "broken": ',
    "algebra-resume-v1": "foundations-fibers",
    "algebra-ureca-square-element-v1": "7",
  };
  await page.addInitScript((values) => {
    for (const [key, value] of Object.entries(values))
      localStorage.setItem(key, value);
  }, records);
  await page.goto("/#home");
  await expect(page.locator(".device-progress progress")).toHaveAttribute(
    "value",
    "0",
  );
  await page
    .getByRole("button", { name: "Preview legacy browser records" })
    .click();
  await expect(
    page.getByRole("region", { name: "Legacy import preview" }),
  ).toContainText("export only");
  await expect(
    page.getByRole("button", { name: "Import preview into this account" }),
  ).toBeDisabled();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress backup" }).click();
  const download = await downloading;
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(exported.rawLegacyRecords).toEqual(records);
  expect(exported.acknowledgedAccountState).toBeNull();
  expect(
    await page.evaluate(
      (keys) =>
        Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)])),
      Object.keys(records),
    ),
  ).toEqual(records);
  await navigate(page, "#foundations-functions");
  await answer(page, "foundations-functions", "boundaryCheck");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("algebra-competency-progress-v1"),
    ),
  ).toBe(records["algebra-competency-progress-v1"]);
});
