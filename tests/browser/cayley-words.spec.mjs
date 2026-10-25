import { test, expect } from "@playwright/test";
import { selectChoice } from "./choice-controls.mjs";
import AxeBuilder from "@axe-core/playwright";
import {
  expectContainedMath,
  expectExactMathRegion,
} from "./public-math-segments.mjs";

async function openLab(page, id) {
  await page.goto(`/#lab:${id}`);
  const experiment = page.locator(".exploration");
  await experiment
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill(
      "I will compare words, relations and permutations before drawing a conclusion.",
    );
  await experiment.getByRole("button", { name: "Test my prediction" }).click();
  return experiment;
}

async function checkReflowAndAxe(page, lab, info, id) {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await lab.screenshot({ path: info.outputPath(`${id}-${width}.png`) });
  }
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact),
    ),
  ).toEqual([]);
}

test("generator workbench distinguishes finite relations from a complete S3 presentation", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const experiment = await openLab(page, "mh2220-generators");
  const cyclic = experiment.locator(".foundation-lab");
  await expectContainedMath(
    cyclic
      .getByRole("region", { name: "Subgroups of C12", exact: true })
      .getByRole("table"),
    String.raw`$\{0, 2, 4, 6, 8, 10\}$`,
  );
  await expect(
    cyclic.getByRole("table", { name: /Reachability and shortest words/ }),
  ).toContainText("Length");
  await experiment
    .getByRole("button", { name: "S₃ words and relations" })
    .click();
  const lab = experiment.locator(".s3-relation-lab");
  const live = lab.locator(".live-mathematics");
  const empty = String.raw`Written word $e$ evaluates to $e$. Shortest word length for this element: $0$.The empty word is the trivial identity relation in $S_3$. This alone does not prove a presentation complete.$$r^3=e,\qquad s^2=e,\qquad srs=r^{-1}$$`;
  await expectExactMathRegion(live, empty);
  await lab.getByRole("button", { name: "Try r³=e" }).focus();
  await page.keyboard.press("Enter");
  await expectExactMathRegion(
    live,
    String.raw`Written word $r\cdot r\cdot r$ evaluates to $e$. Shortest word length for this element: $0$.This word is an identity relation in $S_3$. One observed relation alone does not prove a presentation complete.$$r^3=e,\qquad s^2=e,\qquad srs=r^{-1}$$`,
  );
  await expect(
    lab
      .getByRole("table", { name: /Six distinct normal forms/ })
      .locator("tbody tr"),
  ).toHaveCount(6);
  await lab.getByRole("button", { name: /Append s=/ }).click();
  await expectExactMathRegion(
    live,
    String.raw`Written word $r\cdot r\cdot r\cdot s$ evaluates to $(12)$. Shortest word length for this element: $1$.The current word is not an identity relation; compare two words by their evaluated permutation.$$r^3=e,\qquad s^2=e,\qquad srs=r^{-1}$$`,
  );
  await lab.getByRole("button", { name: "Clear word", exact: true }).click();
  await expectExactMathRegion(live, empty);
  await checkReflowAndAxe(page, lab, info, "relations");
  expect(errors).toEqual([]);
});

test("cyclic explorer enumerates every C12 subgroup and preserves the quotient boundary", async ({
  page,
}, info) => {
  const experiment = await openLab(page, "mh2220-cyclic");
  const lab = experiment.locator(".foundation-lab");
  await expect(
    lab
      .getByRole("region", { name: "Subgroups of C12", exact: true })
      .getByRole("table")
      .locator("tbody tr"),
  ).toHaveCount(6);
  await selectChoice(
    page,
    lab.getByRole("combobox", { name: /Generator g/ }),
    "4",
  );
  await expectContainedMath(
    lab.locator(".live-mathematics"),
    String.raw`$3$ copies return to zero`,
  );
  await selectChoice(
    page,
    lab.getByRole("combobox", { name: /Generator g/ }),
    "5",
  );
  await expectContainedMath(
    lab.locator(".live-mathematics"),
    String.raw`$12$ copies return to zero`,
  );
  await checkReflowAndAxe(page, lab, info, "cyclic");
});

test("Cayley embedding checks composition and injectivity on all six elements", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const experiment = await openLab(page, "mh2220-cayley-embedding");
  const lab = experiment.locator(".cayley-embedding-lab");
  await expectContainedMath(
    lab.locator(".live-mathematics"),
    String.raw`agree with $\lambda_{gh}$: yes`,
  );
  await expect(
    lab
      .getByRole("table", { name: /Left-regular embedding/ })
      .locator("tbody tr"),
  ).toHaveCount(6);
  await lab.getByRole("combobox", { name: /First factor g/ }).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expectContainedMath(
    lab.locator(".live-mathematics"),
    String.raw`agree with $\lambda_{gh}$: yes`,
  );
  await expect(lab.locator(".live-mathematics")).toContainText(
    "embedding is injective",
  );
  await checkReflowAndAxe(page, lab, info, "embedding");
  expect(errors).toEqual([]);
});
