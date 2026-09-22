import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const cases = [
  [
    "ureca-character-bound-kernel",
    "Finite-order eigenvalue polygon",
    "h is not in the kernel",
  ],
  [
    "ureca-external-tensor-products",
    "Two factors act on a tensor basis",
    "Product degree: 1×2=2",
  ],
  [
    "ureca-direct-product-irreducibles",
    "Character-row and degree accounting",
    "15 product rows",
  ],
  [
    "ureca-product-kernel-scalar-matching",
    "Reciprocal scalar preimages",
    "kernel size=2",
  ],
  [
    "ureca-faithful-direct-product",
    "Reciprocal scalar preimages",
    "kernel size=2",
  ],
];
for (const [id, heading, result] of cases)
  test(`${id} teaches its exact state at four widths`, async ({
    page,
  }, info) => {
    await page.goto(`/#lab:${id}`);
    const experiment = page.locator(".exploration");
    await experiment
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill(
        "I predict the scalar or trace condition must be checked on this pair.",
      );
    await experiment
      .getByRole("button", { name: "Test my prediction" })
      .focus();
    await page.keyboard.press("Enter");
    const lab = experiment.locator(".ureca-lab");
    await expect(lab.getByRole("heading", { name: heading })).toBeVisible();
    await expect(lab.locator(".live-mathematics")).toContainText(result);
    const firstSelect = lab.getByRole("combobox").first();
    await firstSelect.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(firstSelect).toBeFocused();
    if (
      id === "ureca-product-kernel-scalar-matching" ||
      id === "ureca-faithful-direct-product"
    ) {
      await lab
        .getByRole("button", { name: "Compare the faithful C₃×D₈ product" })
        .click();
      await expect(lab.locator(".live-mathematics")).toContainText(
        "kernel size=1",
      );
      await lab
        .getByRole("button", { name: "Show the C₂×D₈ failure pair" })
        .click();
      await expect(lab.locator(".live-mathematics")).toContainText(
        "Pair in product kernel: yes",
      );
    }
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await lab.screenshot({ path: info.outputPath(`${id}-${width}.png`) });
    }
    const audit = await new AxeBuilder({ page }).analyze();
    await info.attach("axe", {
      body: JSON.stringify(audit),
      contentType: "application/json",
    });
    expect(
      audit.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact),
      ),
    ).toEqual([]);
  });
test("integrated URECA route carries one D8 representation through nine stages", async ({
  page,
}) => {
  await page.goto("/#learn");
  const route = page.locator(".representation-journey");
  await expect(route.locator("ol > li")).toHaveCount(9);
  await expect(route).toContainText("D₈ square");
  await expect(route).toContainText("⟨χ,χ⟩=(4+4)/8=1");
  await expect(route).toContainText("C₂×D₈ product fails");
  await route.getByRole("button", { name: "Open this step" }).last().click();
  await expect(page.locator(".guided-reader")).toBeVisible();
  await expect(page.locator("#lesson-heading")).toContainText("faithful");
});
