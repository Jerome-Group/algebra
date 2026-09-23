import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const id of ["algebra-wedderburn", "algebra-radical"]) {
  test(`${id} compares blocks and nonsplit layers accessibly`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/#lab:${id}`);
    await expect(page.locator(".algebra-app")).toHaveAttribute(
      "data-ready",
      "true",
    );
    const lab = page.locator(".foundation-lab");
    const reveal = lab.getByRole("button", { name: "Test my prediction" });
    await expect(reveal).toBeDisabled();
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("The radical detects which simple layers fail to split.");
    await reveal.focus();
    await page.keyboard.press("Enter");
    await expect(lab).toContainText("finite-dimensional");
    await expect(
      lab.getByRole("table", {
        name: "Semisimple blocks versus radical layers",
      }),
    ).toContainText("Radical dimension");
    await lab
      .getByRole("combobox", { name: "Algebra A" })
      .selectOption("matrix");
    await lab
      .getByRole("combobox", { name: "First matrix unit Eᵢⱼ" })
      .selectOption("E12");
    await lab
      .getByRole("combobox", { name: "Second matrix unit Eₖₗ" })
      .selectOption("E21");
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("E12E21=E11, and the regular module has two copies of F2.");
    await reveal.click();
    await expect(lab).toContainText("E12E21=E11");
    await expect(lab).toContainText("multiplicity 2");
    await lab
      .getByRole("combobox", { name: "Algebra A" })
      .selectOption("group-c2");
    await lab
      .getByRole("combobox", { name: "Coefficient field F" })
      .selectOption("F2");
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("In characteristic two, g+1 is nilpotent.");
    await reveal.click();
    await expect(lab).toContainText("J=(g+1), J²=0");
    await lab
      .getByRole("button", {
        name: "Try the nonsplit triangular-module failure",
      })
      .click();
    await expect(lab.getByRole("status")).toContainText("E₁₂ carries e₂ to e₁");
    await expect(lab).toContainText("A/J(A)≅F×F");
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await lab.screenshot({ path: testInfo.outputPath(`${id}-${width}.png`) });
    }
    const audit = await new AxeBuilder({ page }).analyze();
    expect(
      audit.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact),
      ),
    ).toEqual([]);
  });
}
