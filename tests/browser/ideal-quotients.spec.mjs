import { test, expect } from "@playwright/test";
import { selectChoice } from "./choice-controls.mjs";
import AxeBuilder from "@axe-core/playwright";
import {
  expectContainedMath,
  expectAbsentMath,
} from "./public-math-segments.mjs";

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
    await expectContainedMath(
      lab,
      String.raw`Quotient classes: $\{0, 1, 2, 3, 4, 5\}$`,
    );
    await expectContainedMath(lab, String.raw`Units: $\{1, 5\}$`);
    await expectContainedMath(
      lab,
      String.raw`Nonzero zero divisors: $\{2, 3, 4\}$`,
    );
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: "Ideal I=dℤ/12ℤ; choose d" }),
      "4",
    );
    await expectAbsentMath(lab, String.raw`Units: $\{1, 5\}$`);
    await expect(lab.locator(".live-mathematics")).toHaveCount(0);
    await expect(start).toBeDisabled();
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("For d=4, units are 1 and 3.");
    await start.click();
    await expectContainedMath(lab, String.raw`Units: $\{1, 3\}$`);
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: "Source ring" }),
      "polynomials",
    );
    await expectAbsentMath(lab, String.raw`Units: $\{1, 3\}$`);
    await expect(lab.locator(".live-mathematics")).toHaveCount(0);
    await expect(start).toBeDisabled();
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("An irreducible quadratic gives a field.");
    await start.click();
    await expectContainedMath(lab, String.raw`$q=X^2+X+1$`);
    await expectContainedMath(lab, String.raw`Units: $\{1, X, 1+X\}$`);
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: "Ideal I=(q); choose q∈F₂[X]" }),
      "split",
    );
    await expect(start).toBeDisabled();
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("X and X+1 are zero divisors.");
    await start.click();
    await expectContainedMath(
      lab,
      String.raw`Nonzero zero divisors: $\{X, 1+X\}$`,
    );
    await expectContainedMath(
      lab.getByRole("table", { name: /Ideal correspondence/ }),
      String.raw`$(X+1)$`,
    );
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
