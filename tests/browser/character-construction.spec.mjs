import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("S3 character studio builds rows, weights classes and diagnoses failure", async ({
  page,
}, testInfo) => {
  await page.goto("/#lab:representations-characters");
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const lab = page.locator(".foundation-lab");
  const reveal = lab.getByRole("button", { name: "Test my prediction" });
  await expect(reveal).toBeDisabled();
  await lab
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("Class sizes 1,3,2 add to six.");
  await reveal.focus();
  await page.keyboard.press("Enter");
  await expect(lab).toContainText("sizes sum to |S₃|=6");
  await lab
    .getByRole("combobox", { name: "Learning stage" })
    .selectOption("representations");
  await lab
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("Permutation row (3,1,0) minus trivial gives standard (2,0,-1).");
  await reveal.click();
  await expect(lab).toContainText("Std=(2, 0, -1)");
  await lab
    .getByRole("combobox", { name: "Learning stage" })
    .selectOption("orthogonality");
  await lab
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("The class-weighted norm is one.");
  await reveal.click();
  await expect(lab).toContainText("⟨Std,Std⟩=1");
  await lab
    .getByRole("button", { name: "Try the equal-column failure" })
    .click();
  await expect(lab).toContainText("⟨Std,Std⟩=5/3");
  await lab
    .getByRole("combobox", { name: "Inner-product weighting" })
    .selectOption("class-size");
  await lab
    .getByRole("combobox", { name: "Learning stage" })
    .selectOption("decomposition");
  await lab
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("Std squared contains each irreducible once.");
  await reveal.click();
  await expect(lab).toContainText("Std⊗Std≅1⊕sgn⊕Std");
  await expect(
    lab.getByRole("table", {
      name: "S₃ rows constructed from fixed points and parity",
    }),
  ).toContainText("standard");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await lab.screenshot({
      path: testInfo.outputPath(`character-${width}.png`),
    });
  }
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact),
    ),
  ).toEqual([]);
});
