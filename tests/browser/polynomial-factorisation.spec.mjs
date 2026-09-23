import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const id of [
  "m3220-gauss",
  "m3220-eisenstein",
  "m3220-irreducibility-tests",
]) {
  test(`${id} requires a field-specific prediction and shows a proof certificate`, async ({
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
      .fill("X²+1 is irreducible over the rationals.");
    await reveal.focus();
    await page.keyboard.press("Enter");
    await expect(lab).toContainText("Verdict: irreducible over ℚ");
    await lab
      .getByRole("combobox", { name: "Coefficient field" })
      .selectOption("C");
    await expect(reveal).toBeDisabled();
    await expect(lab).not.toContainText("Verdict: irreducible over ℚ");
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("Over C, it splits at ±i.");
    await reveal.click();
    await expect(lab).toContainText("(X−i)(X+i)");
    await lab
      .getByRole("combobox", { name: "Worked polynomial" })
      .selectOption("rootless");
    await lab
      .getByRole("combobox", { name: "Coefficient field" })
      .selectOption("Q");
    await expect(reveal).toBeDisabled();
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("No rational roots but reducible as quadratics.");
    await reveal.click();
    await expect(lab).toContainText("(X²+1)(X²+2)");
    const failure = lab.getByRole("button", {
      name: "Try a failed-test counterexample",
    });
    await failure.focus();
    await page.keyboard.press("Enter");
    await expect(lab.getByRole("status")).toContainText(
      "failed root test in degree four is inconclusive",
    );
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

test("polynomial division retains live quotient, remainder and nonunit failure", async ({
  page,
}) => {
  await page.goto("/#lab:m3220-polynomial-division");
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const reveal = page.getByRole("button", { name: "Test my prediction" });
  await page
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("For X³+1 divided by X²+1, q=X and r=1−X over ℤ.");
  await reveal.click();
  await expect(page.locator(".division-terms")).toContainText(
    "Step 1: subtract",
  );
  await expect(page.locator(".visual-panel")).toContainText("The quotient is");
  await page
    .getByRole("textbox", { name: "Polynomial f coefficients" })
    .fill("0,1");
  await page
    .getByRole("textbox", { name: "Polynomial g coefficients" })
    .fill("1,2");
  await expect(page.locator(".visual-panel .error-note")).toContainText(
    "leading coefficient is not a unit",
  );
});
