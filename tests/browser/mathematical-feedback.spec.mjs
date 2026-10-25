import { test, expect } from "@playwright/test";
import { selectChoice, expectChoiceValue } from "./choice-controls.mjs";
import { expectExactMathRegion } from "./public-math-segments.mjs";
import { readFileSync } from "node:fs";

const catalogue = (file) =>
  JSON.parse(
    readFileSync(
      new URL(`../../lib/algebra/${file}.json`, import.meta.url),
      "utf8",
    ),
  );
const lessons = catalogue("lessons");
const contracts = catalogue("lab-contracts");
const contractPresentations = catalogue("lab-contract-presentations");
const presentations = catalogue("laboratory-presentations");

async function openExperiment(
  page,
  { id, machine, presentation, role, control },
) {
  expect(lessons.find((lesson) => lesson.id === id)).toMatchObject({ machine });
  expect(contracts[id]).toBeUndefined();
  expect(contractPresentations[id]).toBeUndefined();
  expect(presentations[id]).toBe(presentation);
  await page.goto(`/#lab:${id}`);
  await expect(page).toHaveURL(new RegExp(`#lab:${id}$`));
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const experiment = page.locator(".exploration");
  const panel = experiment.locator(".visual-panel");
  await expect(panel).toHaveAttribute("data-machine", machine);
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole(role, { name: control, exact: true }),
  ).toBeVisible();
  await expect(
    experiment.getByRole("textbox", { name: "Your mathematical prediction" }),
  ).toHaveCount(0);
  await expect(
    experiment.getByRole("button", { name: "Test my prediction", exact: true }),
  ).toHaveCount(0);
  return experiment;
}

for (const [prime, mixedValue, mixedTex, mixedSpeech] of [
  [2, "3", String.raw`1+\alpha`, "1 plus alpha"],
  [3, "8", String.raw`2+2\alpha`, "2 plus 2 times alpha"],
  [5, "24", String.raw`4+4\alpha`, "4 plus 4 times alpha"],
])
  test(`quadratic quotient over F${prime} names actual coordinates and preserves both selections`, async ({
    page,
  }, info) => {
    const experiment = await openExperiment(page, {
      id: "quadratic-quotient",
      machine: "quadratic-quotient",
      presentation: "model",
      role: "combobox",
      control: "Base field",
    });
    await selectChoice(
      page,
      experiment.getByRole("combobox", { name: "Base field", exact: true }),
      String(prime),
    );
    const grid = experiment.locator(".quotient-elements");
    await expect(grid.getByRole("button")).toHaveCount(prime * prime);
    const alpha = grid.getByRole("button", {
      name: "Select quotient element alpha",
      exact: true,
    });
    await expectExactMathRegion(
      alpha.locator(".math-inline"),
      String.raw`$\alpha$`,
    );
    await alpha.click();
    await expect(alpha).toHaveAttribute("aria-pressed", "true");
    const first = experiment.getByRole("combobox", {
      name: "First quotient element",
      exact: true,
    });
    const second = experiment.getByRole("combobox", {
      name: "Second quotient element",
      exact: true,
    });
    await expect(first).toHaveAccessibleDescription("alpha");
    await expectChoiceValue(page, first, String(prime));
    const mixed = grid.getByRole("button", {
      name: `Select quotient element ${mixedSpeech}`,
      exact: true,
    });
    await expectExactMathRegion(mixed.locator(".math-inline"), `$${mixedTex}$`);
    await mixed.click();
    await expect(mixed).toHaveAttribute("aria-pressed", "true");
    await expect(alpha).toHaveAttribute("aria-pressed", "false");
    await expect(grid.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(first).toHaveAccessibleDescription(mixedSpeech);
    await expectChoiceValue(page, first, mixedValue);
    await selectChoice(page, second, String(prime));
    await expect(second).toHaveAccessibleDescription("alpha");
    await expectChoiceValue(page, first, mixedValue);
    const equations = experiment.locator(
      ".quotient-elements + .lab-controls > .math-display",
    );
    await expectExactMathRegion(
      equations.nth(0),
      `$$(${mixedTex})+(\\alpha)=${prime - 1}$$`,
    );
    await expectExactMathRegion(
      equations.nth(1),
      `$$(${mixedTex})(\\alpha)=1$$`,
    );
    await expectExactMathRegion(
      equations.nth(2),
      `$$(${mixedTex})^{-1}=\\alpha$$`,
    );
    await expect(experiment.locator(".katex-error")).toHaveCount(0);
    await grid.screenshot({
      path: info.outputPath(`quotient-f${prime}-coordinates.png`),
    });
  });

test("actual DVR route shows whole distinct ideal chains at minimum, intermediate and maximum steps", async ({
  page,
}, info) => {
  const experiment = await openExperiment(page, {
    id: "m3220-dvr",
    machine: "diagram",
    presentation: "reference-diagram",
    role: "slider",
    control: "Number of steps to inspect",
  });
  const steps = experiment.getByRole("slider", {
    name: "Number of steps to inspect",
    exact: true,
  });
  const chain = experiment.locator(".lab-controls > .math-display");
  await steps.focus();
  await page.keyboard.press("Home");
  await expect(steps).toHaveAttribute("aria-valuenow", "1");
  await expectExactMathRegion(chain, String.raw`$$R\supsetneq(t)$$`);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(steps).toHaveAttribute("aria-valuenow", "4");
  await expectExactMathRegion(
    chain,
    String.raw`$$R\supsetneq(t)\supsetneq(t^{2})\supsetneq(t^{3})\supsetneq(t^{4})$$`,
  );
  await page.keyboard.press("End");
  await expect(steps).toHaveAttribute("aria-valuenow", "7");
  await expectExactMathRegion(
    chain,
    String.raw`$$R\supsetneq(t)\supsetneq(t^{2})\supsetneq(t^{3})\supsetneq(t^{4})\supsetneq(t^{5})\supsetneq(t^{6})\supsetneq(t^{7})$$`,
  );
  await expect(experiment.locator(".katex-error")).toHaveCount(0);
  await chain.screenshot({
    path: info.outputPath("dvr-seven-strict-descents.png"),
  });
});
