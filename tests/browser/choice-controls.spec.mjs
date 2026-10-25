import { test, expect } from "@playwright/test";
import { selectChoice, expectChoiceValue } from "./choice-controls.mjs";
import {
  expectContainedMath,
  expectExactMathRegion,
} from "./public-math-segments.mjs";

async function openLab(page, id) {
  await page.goto(`/#lab:${id}`);
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill(
      "I will check the selected mathematical object and its exact result.",
    );
  await page.getByRole("button", { name: "Test my prediction" }).click();
}

for (const width of [390, 1440]) {
  test(`mathematical action labels keep their own pointer targets at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await openLab(page, "mh2220-actions");
    const lab = page.locator(".foundation-lab");
    const nestedMath = lab.locator(".action-state > span .math-inline");
    await expect(nestedMath).not.toHaveCount(0);
    const nestedPaint = await nestedMath.evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return {
          border: [
            style.borderTopWidth,
            style.borderRightWidth,
            style.borderBottomWidth,
            style.borderLeftWidth,
          ],
          padding: [
            style.paddingTop,
            style.paddingRight,
            style.paddingBottom,
            style.paddingLeft,
          ],
        };
      }),
    );
    await info.attach("nested-math-paint", {
      body: JSON.stringify(nestedPaint),
      contentType: "application/json",
    });
    for (const paint of nestedPaint) {
      expect(paint.border).toEqual(["0px", "0px", "0px", "0px"]);
      expect(paint.padding).toEqual(["0px", "0px", "0px", "0px"]);
    }
    const action = lab.getByRole("combobox", {
      name: "Left action",
      exact: true,
    });
    await action.click();
    const targets = await page.getByRole("option").evaluateAll((elements) =>
      elements.map((element) => {
        const bounds = element.getBoundingClientRect();
        const hit = document
          .elementFromPoint(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2,
          )
          ?.closest('[role="option"]');
        return {
          value: element.getAttribute("data-choice-value"),
          hitValue: hit?.getAttribute("data-choice-value"),
        };
      }),
    );
    await info.attach("option-pointer-targets", {
      body: JSON.stringify(targets),
      contentType: "application/json",
    });
    expect(targets).toEqual(
      ["letters", "regular", "conjugation"].map((value) => ({
        value,
        hitValue: value,
      })),
    );
    await page.keyboard.press("Escape");
    await expect(action).toBeFocused();
    const orbit = lab
      .locator(".live-mathematics p")
      .filter({ hasText: "Orbit:" });
    for (const [value, expected] of [
      ["regular", String.raw`Orbit: $\{e, (12), (23), (13), (123), (132)\}$.`],
      ["conjugation", String.raw`Orbit: $\{e\}$.`],
      ["letters", String.raw`Orbit: $\{1, 2, 3\}$.`],
    ]) {
      await selectChoice(page, action, value);
      await expectChoiceValue(page, action, value);
      await expectExactMathRegion(orbit, expected);
    }
    await lab.screenshot({
      path: info.outputPath(`action-labels-${width}.png`),
    });
  });

  test(`numeric choices support Home, End, Escape and selection at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openLab(page, "mh2220-cyclic");
    const lab = page.locator(".foundation-lab");
    const generator = lab.getByRole("combobox", {
      name: "Generator g",
      exact: true,
    });
    await selectChoice(page, generator, 4);
    await generator.press("ArrowDown");
    await page.keyboard.press("Home");
    const zero = page.getByRole("option", { name: "0", exact: true });
    await expect(zero).toBeFocused();
    await expectExactMathRegion(zero, "$0$");
    await page.keyboard.press("End");
    const eleven = page.getByRole("option", { name: "11", exact: true });
    await expect(eleven).toBeFocused();
    await expectExactMathRegion(eleven, "$11$");
    await expect(eleven.locator(".math-inline[tabindex]")).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await expect(generator).toBeFocused();
    await expectChoiceValue(page, generator, 4);
    await generator.press("ArrowDown");
    await page.keyboard.press("End");
    await expect(eleven).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(generator).toBeFocused();
    await expectChoiceValue(page, generator, 11);
    await expectContainedMath(
      lab.locator(".live-mathematics"),
      String.raw`Order of $g$: $\frac{12}{\gcd(12,11)}=12$. $12$ copies return to zero.`,
    );
  });

  test(`permutation speech drives typeahead and the actual composition at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openLab(page, "mh2220-cayley-embedding");
    const lab = page.locator(".cayley-embedding-lab");
    const first = lab.getByRole("combobox", { name: /^First factor g,/ });
    await selectChoice(page, first, 1);
    await first.press("ArrowDown");
    await page.keyboard.type("cycle");
    const cycle = page.getByRole("option", {
      name: "cycle 1 2 3",
      exact: true,
    });
    await expect(cycle).toBeFocused();
    await expect(cycle).toHaveAttribute("data-choice-value", "4");
    await expectExactMathRegion(cycle, "$(123)$");
    await expect(cycle.locator(".math-inline[tabindex]")).toHaveCount(0);
    await page.keyboard.press("Enter");
    await expect(first).toBeFocused();
    await expectChoiceValue(page, first, 4);
    await expectContainedMath(
      lab.locator(".live-mathematics"),
      String.raw`$\lambda_g(e)=g=(123)$.`,
    );
    await expectContainedMath(
      lab.locator(".live-mathematics"),
      String.raw`All six images of $\lambda_g\circ\lambda_h$ agree with $\lambda_{gh}$: yes.`,
    );
  });

  test(`cyclic group and scalar options retain whole mathematics at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openLab(page, "ureca-external-tensor-products");
    const lab = page.locator(".ureca-lab");
    const group = lab.getByRole("combobox", { name: /^Cyclic factor G,/ });
    await selectChoice(page, group, 2);
    await group.press("ArrowDown");
    await page.keyboard.press("End");
    const cyclic = page.getByRole("option", {
      name: "Cyclic group of order 3, a maps to omega character",
      exact: true,
    });
    await expect(cyclic).toBeFocused();
    await expectExactMathRegion(
      cyclic,
      String.raw`$C_3$: $a\mapsto\omega$ character`,
    );
    await page.keyboard.press("Enter");
    await expect(group).toBeFocused();
    await expectChoiceValue(page, group, 3);
    const element = lab.getByRole("combobox", { name: /^Cyclic element g,/ });
    await element.click();
    const squared = page.getByRole("option", {
      name: "a squared maps to omega squared",
      exact: true,
    });
    await expectExactMathRegion(squared, String.raw`$a^2$ maps to $\omega^2$`);
    await page.keyboard.press("Escape");
    await expect(element).toBeFocused();
    await selectChoice(page, element, 2);
    await selectChoice(
      page,
      lab.getByRole("combobox", { name: /^D₈ element h,/ }),
      0,
    );
    await expectContainedMath(
      lab.locator(".live-mathematics"),
      String.raw`Character at $(a^2,e)$: $(\omega^2)\times(2)=2\omega^2$.`,
    );
  });

  test(`empty semantic reset stays selectable and clears the prediction at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openLab(page, "mh2220-semidirect");
    const lab = page.getByRole("region", {
      name: "Semidirect product constructor",
    });
    const prediction = lab.getByRole("combobox", {
      name: "Prediction: do the displayed pairs commute?",
      exact: true,
    });
    await expectChoiceValue(page, prediction, "");
    await selectChoice(page, prediction, "no");
    await expect(lab.getByRole("status")).toContainText(
      "Your prediction is correct.",
    );
    await selectChoice(page, prediction, "");
    await expectChoiceValue(page, prediction, "");
    await expect(prediction).toHaveAccessibleDescription("Choose a prediction");
    await expect(lab.getByRole("status")).not.toContainText("Your prediction");
    await expectContainedMath(
      lab.getByRole("status"),
      String.raw`$\alpha(s)^2=\operatorname{id}$: $2^2\equiv1\pmod3$. Thus $\alpha$ is a homomorphism.`,
    );
  });

  test(`unselected witness placeholders cannot become an empty answer at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#start");
    await expect(page.locator('.algebra-app[data-ready="true"]')).toBeVisible();
    await page
      .getByRole("navigation", { name: "Four workshop moves" })
      .getByRole("button", { name: /Give a reason/ })
      .click();
    const witness = page.getByRole("combobox", {
      name: "Missing output witness",
      exact: true,
    });
    await expect(witness).toHaveAccessibleDescription("Choose an output");
    await expectChoiceValue(page, witness, null);
    await witness.press("ArrowDown");
    await expect(
      page.getByRole("option", { name: "Choose an output", exact: true }),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole("listbox")
        .locator('[role="option"][data-choice-value=""]'),
    ).toHaveCount(0);
    await expect(page.getByRole("option")).toHaveCount(3);
    await page.keyboard.press("Escape");
    await expect(witness).toBeFocused();
    await page
      .getByRole("button", { name: "Check this witness", exact: true })
      .click();
    await expect(page.locator(".beginner-feedback")).toContainText(
      "Choose one allowed output",
    );
    await selectChoice(page, witness, "c");
    await page
      .getByRole("button", { name: "Check this witness", exact: true })
      .click();
    await expect(page.locator(".beginner-feedback")).toHaveClass(
      "beginner-feedback witness",
    );
    await expect(page.locator(".beginner-feedback")).toContainText(
      "not surjective",
    );
    await page
      .getByRole("radio", { name: /Different inputs have different outputs/ })
      .check();
    const first = page.getByRole("combobox", {
      name: "First collision input",
      exact: true,
    });
    await expect(first).toHaveAccessibleDescription("Choose an input");
    await expectChoiceValue(page, first, null);
    await selectChoice(page, first, 0);
    await expectChoiceValue(page, first, 0);
    await expectChoiceValue(
      page,
      page.getByRole("combobox", {
        name: "Second collision input",
        exact: true,
      }),
      null,
    );
  });
}
