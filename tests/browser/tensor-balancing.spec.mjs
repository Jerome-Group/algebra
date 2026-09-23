import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("typed cyclic tensor guide balances scalars and diagnoses zero product", async ({
  page,
}, testInfo) => {
  await page.goto("/#lab:tensor-products");
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const lab = page.locator(".foundation-lab");
  const reveal = lab.getByRole("button", { name: "Test my prediction" });
  await expect(reveal).toBeDisabled();
  await lab
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("2t=4t=0 leaves a generator of order two.");
  await reveal.focus();
  await page.keyboard.press("Enter");
  await expect(lab).toContainText("ord(t)=gcd(2,4)=2");
  await expect(lab).toContainText("Balance: equal");
  await lab
    .getByRole("combobox", { name: "Right module U=ℤ/mℤ; choose m" })
    .selectOption("4");
  await lab
    .getByRole("combobox", { name: "Left module V=ℤ/nℤ; choose n" })
    .selectOption("6");
  await lab
    .getByRole("combobox", { name: "Right-module vector [u]" })
    .selectOption("1");
  await lab
    .getByRole("combobox", { name: "Left-module vector [v]" })
    .selectOption("1");
  await lab
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("4t=6t=0 yields order two.");
  await reveal.click();
  await expect(lab).toContainText("ord(t)=gcd(4,6)=2");
  await expect(lab).toContainText("e₁⊗f₁+e₂⊗f₂ has matrix rank 2");
  await lab
    .getByRole("button", { name: "Try the zero tensor-product failure" })
    .click();
  await expect(lab.getByRole("status")).toContainText("ℤ/2⊗_ℤℤ/3=0");
  await expect(
    lab.getByRole("table", {
      name: "Typed balancing and cyclic tensor relation",
    }),
  ).toContainText("Right input");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await lab.screenshot({ path: testInfo.outputPath(`tensor-${width}.png`) });
  }
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact),
    ),
  ).toEqual([]);
});
