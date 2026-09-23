import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const id of [
  "m3220-fractions",
  "m3220-localization",
  "m3220-prime-localization",
]) {
  test(`${id} classifies reduced fractions and map factorisation accessibly`, async ({
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
      .fill("1/2 is a unit at 3 but absent from Z[1/3].");
    await reveal.focus();
    await page.keyboard.press("Enter");
    await expect(lab).toContainText("1/2 reduces to 1/2 and is unit in ℤ₍₃₎");
    await expect(lab).toContainText("Surviving prime ideals: (0) and 3ℤ₍₃₎");
    await expect(lab).toContainText("The factor map ℤ₍₃₎→ℤ₍₃₎");
    await expect(lab).toContainText("sends 5/2 to 5/2");
    await expect(
      lab.getByRole("table", { name: /classification across three/ }),
    ).toContainText("absent");
    await lab.getByRole("combobox", { name: "Fraction a/b" }).selectOption("3");
    await expect(reveal).toBeDisabled();
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("3/6 reduces to 1/2, so it is a unit.");
    await reveal.click();
    await expect(lab).toContainText("3/6 reduces to 1/2 and is unit");
    await lab
      .getByRole("combobox", { name: "Set to invert in ℤ" })
      .selectOption("powersThree");
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("3 is not invertible in Z at 3.");
    await reveal.click();
    await expect(lab).toContainText(
      "has no induced factor map: 3 is not a unit",
    );
    const failure = lab.getByRole("button", {
      name: "Try a zero-divisor failure",
    });
    await failure.focus();
    await page.keyboard.press("Enter");
    await expect(lab.getByRole("status")).toContainText("2(1−4)=0");
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

test("Noetherian chain explorer distinguishes infinite size, ACC and DCC", async ({
  page,
}, testInfo) => {
  await page.goto("/#lab:m3220-noetherian");
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const lab = page.locator(".foundation-lab");
  const reveal = lab.getByRole("button", { name: "Test my prediction" });
  await lab
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("(12) is strictly inside (6), yet Z is Noetherian.");
  await reveal.click();
  await expect(lab).toContainText("Global condition: ACC holds");
  await lab
    .getByRole("combobox", { name: "Ring and chain" })
    .selectOption("infiniteVariables");
  await expect(reveal).toBeDisabled();
  await lab
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("A fresh variable witnesses each strict inclusion.");
  await reveal.click();
  await expect(lab).toContainText("X3 is outside this ideal");
  await lab
    .getByRole("combobox", { name: "Ring and chain" })
    .selectOption("integerDescending");
  await lab
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("Z is Noetherian but DCC fails.");
  await reveal.click();
  await expect(lab).toContainText("Global condition: DCC fails");
  await lab
    .getByRole("combobox", { name: "Ring and chain" })
    .selectOption("primeChain");
  await lab.getByRole("combobox", { name: "Stage n" }).selectOption("3");
  await lab
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("The prime chain reaches (X,Y), a maximal ideal.");
  await reveal.click();
  await expect(lab).toContainText("upper bound dim F[X,Y]=2 needs");
  const failure = lab.getByRole("button", {
    name: "Try a finite-cardinality fallacy",
  });
  await failure.focus();
  await page.keyboard.press("Enter");
  await expect(lab.getByRole("status")).toContainText(
    "ℤ has infinitely many elements, yet every ideal is principal",
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await lab.screenshot({
      path: testInfo.outputPath(`noetherian-${width}.png`),
    });
  }
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact),
    ),
  ).toEqual([]);
});
