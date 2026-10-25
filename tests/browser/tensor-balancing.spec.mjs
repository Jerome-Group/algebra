import { test, expect } from "@playwright/test";
import { selectChoice } from "./choice-controls.mjs";
import AxeBuilder from "@axe-core/playwright";
import { expectContainedMath } from "./public-math-segments.mjs";

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
  await expectContainedMath(
    lab,
    String.raw`$\operatorname{ord}(t)=\gcd(2,4)=2$`,
  );
  await expect(lab).toContainText("Balance: equal");
  await selectChoice(
    page,
    lab.getByRole("combobox", { name: "Right module U=ℤ/mℤ; choose m" }),
    "4",
  );
  await selectChoice(
    page,
    lab.getByRole("combobox", { name: "Left module V=ℤ/nℤ; choose n" }),
    "6",
  );
  await selectChoice(
    page,
    lab.getByRole("combobox", { name: "Right-module vector [u]" }),
    "1",
  );
  await selectChoice(
    page,
    lab.getByRole("combobox", { name: "Left-module vector [v]" }),
    "1",
  );
  await lab
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("4t=6t=0 yields order two.");
  await reveal.click();
  await expectContainedMath(
    lab,
    String.raw`$\operatorname{ord}(t)=\gcd(4,6)=2$`,
  );
  await expectContainedMath(
    lab,
    String.raw`$e_1\otimes f_1+e_2\otimes f_2$ has matrix rank $2$`,
  );
  await lab
    .getByRole("button", { name: "Try the zero tensor-product failure" })
    .click();
  await expectContainedMath(
    lab.getByRole("status"),
    String.raw`$(\mathbb Z/2\mathbb Z)\otimes_{\mathbb Z}(\mathbb Z/3\mathbb Z)=0$`,
  );
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
