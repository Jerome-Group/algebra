import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const id of ["m3220-ideals", "m3220-quotient-ring"]) {
  test(`${id} predicts, builds and rejects quotient operations accessibly`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/#lab:${id}`);
    await expect(page.locator(".algebra-app")).toHaveAttribute(
      "data-ready",
      "true",
    );
    const lab = page.locator(".foundation-lab");
    const start = lab.getByRole("button", { name: "Test my prediction" });
    await expect(start).toBeDisabled();
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill(
        "For I=6ℤ/12ℤ, I predict six classes, units 1 and 5, and ideals containing I.",
      );
    await start.focus();
    await page.keyboard.press("Enter");
    await expect(lab).toContainText("Quotient classes: {0, 1, 2, 3, 4, 5}");
    await expect(lab).toContainText("Units: {1, 5}");
    await expect(lab).toContainText("Nonzero zero divisors: {2, 3, 4}");
    await lab
      .getByRole("combobox", { name: "Ideal I=dℤ/12ℤ; choose d" })
      .selectOption("4");
    await expect(lab).not.toContainText("Units: {1, 5}");
    await expect(start).toBeDisabled();
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("For d=4, units are 1 and 3.");
    await start.click();
    await expect(lab).toContainText("Units: {1, 3}");
    await lab
      .getByRole("combobox", { name: "Source ring" })
      .selectOption("polynomials");
    await expect(lab).not.toContainText("Units: {1, 3}");
    await expect(start).toBeDisabled();
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("An irreducible quadratic gives a field.");
    await start.click();
    await expect(lab).toContainText("q=X²+X+1");
    await expect(lab).toContainText("Units: {1, X, 1+X}");
    await lab
      .getByRole("combobox", { name: "Ideal I=(q); choose q∈F₂[X]" })
      .selectOption("split");
    await expect(start).toBeDisabled();
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("X and X+1 are zero divisors.");
    await start.click();
    await expect(lab).toContainText("Nonzero zero divisors: {X, 1+X}");
    await expect(
      lab.getByRole("table", { name: /Ideal correspondence/ }),
    ).toContainText("(X+1)");
    const failure = lab.getByRole("button", {
      name: "Try a non-ideal failure",
    });
    await failure.focus();
    await page.keyboard.press("Enter");
    await expect(lab.getByRole("status")).toContainText(
      "Multiplication of these proposed classes depends on the representative",
    );
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await lab.screenshot({ path: testInfo.outputPath(`${id}-${width}.png`) });
    }
    const audit = await new AxeBuilder({ page }).analyze();
    await testInfo.attach("axe", {
      body: JSON.stringify(audit),
      contentType: "application/json",
    });
    expect(
      audit.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact),
      ),
    ).toEqual([]);
  });
}
