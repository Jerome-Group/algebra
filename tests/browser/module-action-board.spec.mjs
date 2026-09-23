import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const id of ["m3220-modules", "modules-generators", "m3220-annihilator"]) {
  test(`${id} carries a cyclic module through four stages accessibly`, async ({
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
      .fill(
        "For n=6, scalar 2 has kernel {0,3}; 6e=0 gives a nonfree cyclic module.",
      );
    await reveal.focus();
    await page.keyboard.press("Enter");
    await expect(lab).toContainText("Ann([2])=3ℤ");
    await lab
      .getByRole("combobox", { name: "Learning stage" })
      .selectOption("action");
    await expect(reveal).toBeDisabled();
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("2 is not invertible on Z/6.");
    await reveal.click();
    await expect(lab).toContainText("This operator is not invertible on M");
    await lab
      .getByRole("combobox", { name: "Module relation ne=0; choose n" })
      .selectOption("3");
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("2 is invertible on Z/3 despite being a nonunit of Z.");
    await reveal.click();
    await expect(lab).toContainText("This operator is invertible on M");
    await lab
      .getByRole("combobox", { name: "Module relation ne=0; choose n" })
      .selectOption("6");
    await lab
      .getByRole("combobox", { name: "Submodule generator d dividing n" })
      .selectOption("2");
    await lab
      .getByRole("combobox", { name: "Learning stage" })
      .selectOption("submodule");
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill(
        "The even residue submodule has three elements and quotient two classes.",
      );
    await reveal.click();
    await expect(lab).toContainText("N=⟨[2]⟩={[0], [2], [4]}");
    await lab
      .getByRole("combobox", { name: "Learning stage" })
      .selectOption("exactness");
    await lab.getByRole("combobox", { name: "Vector [x]" }).selectOption("2");
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill(
        "Kernel size two, image size three; the cyclic extension is nonsplit.",
      );
    await reveal.click();
    await expect(lab).toContainText("This sequence is nonsplit");
    await expect(lab).toContainText("p(T(a,b))=2a=X·p(a,b)");
    const failure = lab.getByRole("button", {
      name: "Try a nonunit and nonsplit failure",
    });
    await failure.focus();
    await page.keyboard.press("Enter");
    await expect(lab.getByRole("status")).toContainText(
      "Scalar 2 is not a unit of ℤ but acts invertibly on ℤ/3ℤ",
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

test("operator submodule lesson retains its invariant-line laboratory", async ({
  page,
}) => {
  await page.goto("/#lab:m3220-submodules");
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const reveal = page.getByRole("button", { name: "Test my prediction" });
  await expect(reveal).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("The x-axis is stable and the quotient remembers height.");
  await reveal.click();
  await expect(page.locator(".visual-panel")).toContainText(
    "is invariant because",
  );
  await expect(page.locator(".laboratory-debrief")).toContainText(
    "General quotient well-definedness needs submodule closure",
  );
});
