import { test, expect } from "@playwright/test";
import { selectChoice } from "./choice-controls.mjs";
import AxeBuilder from "@axe-core/playwright";
import {
  expectContainedMath,
  expectExactMathRegion,
} from "./public-math-segments.mjs";

for (const [algebra, field, dimension, radical, quotient, semisimple] of [
  ["matrix", "Q", 4, 0, "M_2(F)", true],
  ["matrix", "F2", 4, 0, "M_2(F)", true],
  ["triangular", "Q", 3, 1, String.raw`F\times F`, false],
  ["triangular", "F2", 3, 1, String.raw`F\times F`, false],
  ["group-c2", "Q", 2, 0, String.raw`F\times F`, true],
  ["group-c2", "F2", 2, 1, "F", false],
]) {
  test(`quotient formula is whole valid TeX for ${algebra} over ${field}`, async ({
    page,
  }) => {
    await page.goto("/#lab:algebra-wedderburn");
    await expect(page.locator(".algebra-app")).toHaveAttribute(
      "data-ready",
      "true",
    );
    const lab = page.locator(".foundation-lab");
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: "Algebra A", exact: true }),
      algebra,
    );
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: "Coefficient field F", exact: true }),
      field,
    );
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill(
        "I will compare the algebra with its radical and semisimple quotient.",
      );
    await lab
      .getByRole("button", { name: "Test my prediction", exact: true })
      .click();
    await expectExactMathRegion(
      lab.locator(".live-mathematics > p").first(),
      String.raw`$A$ is finite-dimensional ($${dimension}$) and unital over $${field === "Q" ? String.raw`\mathbb Q` : String.raw`\mathbb F_2`}$. Its radical has dimension $${radical}$; $A/J(A)\cong ${quotient}$. $A$ ${semisimple ? "is" : "is not"} semisimple.`,
    );
    await expect(lab.locator(".katex-error")).toHaveCount(0);
  });
}

for (const id of ["algebra-wedderburn", "algebra-radical"]) {
  test(`${id} compares blocks and nonsplit layers accessibly`, async ({
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
      .fill("The radical detects which simple layers fail to split.");
    await reveal.focus();
    await page.keyboard.press("Enter");
    await expect(lab).toContainText("finite-dimensional");
    await expect(
      lab.getByRole("table", {
        name: "Semisimple blocks versus radical layers",
      }),
    ).toContainText("Radical dimension");
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: "Algebra A" }),
      "matrix",
    );
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: "First matrix unit Eᵢⱼ" }),
      "E12",
    );
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: "Second matrix unit Eₖₗ" }),
      "E21",
    );
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("E12E21=E11, and the regular module has two copies of F2.");
    await reveal.click();
    const mathematics = lab.locator(".live-mathematics");
    await expectContainedMath(
      mathematics,
      String.raw`$E_{12}E_{21}=E_{11}$; $E_{ij}E_{kl}$ is zero unless $j=k$.`,
    );
    await expectContainedMath(
      mathematics,
      String.raw`The left regular module $M_2(F)\cong F^2\oplus F^2$; multiplicity $2$, not $1$.`,
    );
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: "Algebra A" }),
      "group-c2",
    );
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: "Coefficient field F" }),
      "F2",
    );
    await lab
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill("In characteristic two, g+1 is nilpotent.");
    await reveal.click();
    await expectContainedMath(
      mathematics,
      String.raw`$J=(g+1)$, $J^2=0$; $A/J\cong\mathbb F_2$.`,
    );
    await lab
      .getByRole("button", {
        name: "Try the nonsplit triangular-module failure",
      })
      .click();
    await expectExactMathRegion(
      lab.getByRole("status"),
      String.raw`Failure witness: the two one-dimensional layers of the natural $T_2(F)$-module do not split, because $E_{12}$ carries $e_2$ to $e_1$.`,
    );
    await expectContainedMath(
      mathematics,
      String.raw`$A/J(A)\cong F\times F$.`,
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
