import { test, expect } from "@playwright/test";
import { selectChoice } from "./choice-controls.mjs";
import AxeBuilder from "@axe-core/playwright";
import { expectContainedMath } from "./public-math-segments.mjs";

for (const id of [
  "foundations-linear-algebra",
  "ureca-linear-action",
  "ureca-permutation-module",
  "ureca-invariant-subspaces",
  "ureca-intertwiners",
]) {
  test(`${id} checks a D8 subspace and one intertwiner accessibly`, async ({
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
        "The axis fails under rotation, but S intertwines both generators.",
      );
    await reveal.focus();
    await page.keyboard.press("Enter");
    await expectContainedMath(lab, String.raw`$W$ is not invariant`);
    await expect(lab).toContainText("intertwines both generators");
    if (id === "ureca-permutation-module") {
      await selectChoice(
        page,
        lab.getByRole("combobox", { name: "Coefficient a in a e₁−e₃" }),
        "3",
      );
      await lab
        .getByRole("textbox", { name: "Your mathematical prediction" })
        .fill("3e₁−e₃ maps to 3e₂−e₁.");
      await reveal.click();
      await expectContainedMath(lab, String.raw`$3e_1-e_3$ maps to $3e_2-e_1$`);
      await expectContainedMath(lab, String.raw`$(0\ 3)(1\ 2)(4\ 7)(5\ 6)$`);
    }
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: "Scalar field 𝔽" }),
      "C",
    );
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: "Acting generators" }),
      "rotation",
    );
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: "Candidate subspace W" }),
      "complex-eigenline",
    );
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("The complex eigenline is stable under r alone.");
    await reveal.click();
    await expectContainedMath(lab, String.raw`$W$ is invariant`);
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: "Acting generators" }),
      "dihedral",
    );
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("Reflection swaps the eigenlines.");
    await reveal.click();
    await expectContainedMath(lab, String.raw`$W$ is not invariant`);
    await lab
      .getByRole("button", {
        name: "Try the complex-line and identity-map failure",
      })
      .click();
    await expect(lab).toContainText("fails the intertwiner equation");
    await expectContainedMath(lab.getByRole("table"), String.raw`$r$`);
    await expectContainedMath(lab, String.raw`$\ker q=V\oplus0$`);
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
