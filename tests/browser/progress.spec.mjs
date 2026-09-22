import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
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
test("submitted competencies survive reload; correction, prerequisite readiness and reset are real", async ({
  page,
}) => {
  const id = "foundations-functions";
  await page.goto(`/#${id}`);
  await expect(
    page.locator(".guided-reader .competency-progress"),
  ).toContainText("0 of 3");
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
  await page.reload();
  await expect(
    page.locator(".guided-reader .competency-progress"),
  ).toContainText("3 of 3");
  await page.getByRole("link", { name: "Reference", exact: true }).click();
  await page
    .getByRole("checkbox", { name: /prerequisites demonstrated/i })
    .check();
  await expect(page.locator(".atlas-results")).toContainText("Fibers");
  await page
    .getByRole("link", { name: "Abstract Algebra", exact: true })
    .click();
  await expect(page.locator(".device-progress [role=status]")).toContainText(
    "3 of",
  );
  await page.getByRole("button", { name: "Reset learning progress" }).click();
  await page.getByRole("button", { name: "Keep my progress" }).click();
  await expect(page.locator(".device-progress [role=status]")).toContainText(
    "3 of",
  );
  await page.getByRole("button", { name: "Reset learning progress" }).click();
  await page.getByRole("button", { name: "Clear my progress" }).click();
  await page.reload();
  await expect(page.locator(".device-progress [role=status]")).toContainText(
    "0 of",
  );
});
test("unit completion requires its transfer checkpoint and every guided competency", async ({
  page,
}) => {
  for (const id of [
    "foundations-functions",
    "foundations-fibers",
    "foundations-quotient-rules",
  ]) {
    await page.goto(`/#${id}`);
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
  await page.reload();
  await expect(unit.locator(".competency-progress")).toContainText(
    "Unit complete",
  );
});
test("unavailable storage retains usable session assessment feedback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Storage disabled");
    };
    Storage.prototype.getItem = () => {
      throw new Error("Storage disabled");
    };
  });
  await page.goto("/#foundations-functions");
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
});
