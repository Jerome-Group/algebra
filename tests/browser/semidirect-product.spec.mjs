import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("V08 constructs S3 and C6 with valid actions, tables and failure", async ({
  page,
}, testInfo) => {
  await page.goto("/#lab:mh2220-semidirect");
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("Inversion makes the displayed factors fail to commute.");
  await page.getByRole("button", { name: "Test my prediction" }).click();
  const lab = page.getByRole("region", {
    name: "Semidirect product constructor",
  });
  await lab
    .getByRole("combobox", {
      name: "Prediction: do the displayed pairs commute?",
    })
    .click();
  await page.getByRole("option", { name: "No" }).click();
  await expect(lab.getByRole("status")).toContainText("prediction is correct");
  await expect(
    lab.getByRole("table", { name: /Rows multiply columns/ }),
  ).toContainText("(2,1)");
  await expect(
    lab.getByRole("table", { name: /Distinct subgroups/ }).locator("tbody tr"),
  ).toHaveCount(6);
  await lab.getByRole("combobox", { name: "Action α(s) on C₃" }).click();
  await page.getByRole("option", { name: /Trivial/ }).click();
  await expect(lab).toContainText("trivial action yields C₆");
  await expect(
    lab.getByRole("table", { name: /Distinct subgroups/ }).locator("tbody tr"),
  ).toHaveCount(4);
  await lab.getByRole("combobox", { name: "Action α(s) on C₃" }).click();
  await page.getByRole("option", { name: /Invalid/ }).click();
  await expect(lab.getByRole("status")).toContainText("Rejected action");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await lab.screenshot({ path: testInfo.outputPath(`product-${width}.png`) });
  }
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((v) => ["serious", "critical"].includes(v.impact)),
  ).toEqual([]);
});
