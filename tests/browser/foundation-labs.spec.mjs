import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const cases = [
  [
    "foundations-fibers",
    "Try incompatible representatives",
    "not well-defined",
  ],
  ["mh2220-axioms", "Find an associativity failure", "Associativity: fails"],
  ["mh2220-generators", "Try a proper generated subgroup", "Nonexample"],
  ["mh2220-quotient", "Try the nonnormal subgroup", "Failure witness"],
  [
    "mh2220-actions",
    "Try a fixed point with a faithful action",
    "Core of this point stabilizer: {e, (12), (23), (13), (123), (132)}",
  ],
  [
    "m3220-modules",
    "Try the same scalar with a nontrivial kernel",
    "not invertible",
  ],
];
for (const [id, action, result] of cases) {
  test(`${id} prediction, keyboard experiment, failure witness and accessible reflow`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/#lab:${id}`);
    await expect(page.locator(".algebra-app")).toHaveAttribute(
      "data-ready",
      "true",
    );
    const start = page.getByRole("button", { name: "Test my prediction" });
    await expect(start).toBeDisabled();
    await page
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("I predict the proposed rule needs its stated hypothesis.");
    await start.focus();
    await page.keyboard.press("Enter");
    const lab = page.locator(".foundation-lab");
    await expect(lab).toBeVisible();
    const failure = lab.getByRole("button", { name: action, exact: true });
    await failure.focus();
    await page.keyboard.press("Enter");
    await expect(lab.locator(".live-mathematics")).toContainText(result);
    if (id === "mh2220-actions") {
      const properties = lab.getByRole("table", {
        name: "Same group S₃, different action properties",
      });
      await expect(
        properties.getByRole("row", { name: "letters yes yes no no" }),
      ).toBeVisible();
      await expect(
        properties.getByRole("row", { name: "regular yes yes yes yes" }),
      ).toBeVisible();
      await expect(
        properties.getByRole("row", { name: "conjugation yes no no no" }),
      ).toBeVisible();
    }
    await expect(
      page.getByRole("heading", { name: "Theorem debrief and proof boundary" }),
    ).toBeVisible();
    const select = lab.getByRole("combobox").first();
    await select.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(select).toBeFocused();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await lab.screenshot({ path: testInfo.outputPath(`${id}-${width}.png`) });
    }
    expect(
      await lab.evaluate((element) => element.scrollHeight),
    ).toBeLessThanOrEqual(
      await lab.evaluate((element) => element.clientHeight + 1),
    );
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
