import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("S3 induction follows coset correction and reciprocity accessibly", async ({
  page,
}, testInfo) => {
  await page.goto("/#lab:odyssey-induction");
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const lab = page.locator(".foundation-lab");
  const reveal = lab.getByRole("button", { name: "Test my prediction" });
  await expect(reveal).toBeDisabled();
  await lab
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("s sends u1 to minus u2, and both Hom dimensions are one.");
  await reveal.focus();
  await page.keyboard.press("Enter");
  await expect(lab).toContainText("s·u1=−u2");
  await expect(lab).toContainText("dim Hom_G(Ind φ,standard)=1");
  await expect(lab).toContainText("dim Hom_H(φ,Res standard)=1");
  await lab
    .getByRole("combobox", { name: "Inducing H-character φ" })
    .selectOption("trivial");
  await lab
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("For trivial induction the correction is positive.");
  await reveal.click();
  await expect(lab).toContainText("s·u1=u2");
  await expect(lab).toContainText("χ_Ind=(3, 1, 0)");
  await lab
    .getByRole("button", { name: "Try forgetting the subgroup correction" })
    .click();
  await expect(lab.getByRole("status")).toContainText(
    "changes its trace from −1 to +1",
  );
  await expect(
    lab.getByRole("table", {
      name: "Induced character and Hom dimensions by target",
    }),
  ).toContainText("standard");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await lab.screenshot({
      path: testInfo.outputPath(`induction-${width}.png`),
    });
  }
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact),
    ),
  ).toEqual([]);
});
