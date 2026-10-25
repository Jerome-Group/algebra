import { test, expect } from "@playwright/test";
import { selectChoice } from "./choice-controls.mjs";
import AxeBuilder from "@axe-core/playwright";
import { expectContainedMath } from "./public-math-segments.mjs";

for (const id of [
  "mh2220-sylow-existence",
  "mh2220-sylow-conjugacy",
  "mh2220-sylow-counts",
]) {
  test(`${id} prediction, subgroup action and text evidence`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/#lab:${id}`);
    await expect(page.locator(".algebra-app")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await page
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("For p=2, order two and three subgroups.");
    const start = page.getByRole("button", { name: "Test my prediction" });
    await start.focus();
    await page.keyboard.press("Enter");
    const lab = page.locator(".foundation-lab");
    await expectContainedMath(lab, String.raw`Actual count in $S_3$: $3$`);
    await expect(lab.getByRole("table")).toHaveCount(3);
    const prime = lab.getByRole("combobox", { name: "Prime p" });
    await selectChoice(page, prime, "3");
    await expectContainedMath(lab, String.raw`Actual count in $S_3$: $1$`);
    if (id === "mh2220-sylow-existence")
      await expectContainedMath(
        lab,
        String.raw`$3$-cycle class has size two, coprime to $3$`,
      );
    await lab
      .getByRole("button", { name: "Try arithmetic-only inference" })
      .click();
    await expectContainedMath(
      lab.getByRole("status"),
      String.raw`For $p=3$, arithmetic forces $n_3=1$`,
    );
    await selectChoice(page, prime, "2");
    await expect(lab.getByRole("status")).toHaveCount(0);
    const failure = lab.getByRole("button", {
      name: "Try arithmetic-only inference",
    });
    await failure.focus();
    await page.keyboard.press("Enter");
    await expect(lab.getByRole("status")).toContainText(
      "arithmetic restrictions",
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
