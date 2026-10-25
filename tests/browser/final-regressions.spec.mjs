import { test, expect } from "@playwright/test";
import { selectChoice } from "./choice-controls.mjs";
import AxeBuilder from "@axe-core/playwright";
import {
  expectContainedMath,
  expectExactMathRegion,
  expectAbsentMath,
} from "./public-math-segments.mjs";

async function revealLab(page, id, prediction) {
  await page.goto(`/#lab:${id}`);
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill(prediction);
  await page.getByRole("button", { name: "Test my prediction" }).click();
}

test("double-coset generators follow both subgroup toggle directions", async ({
  page,
}, info) => {
  await page.goto("/#lab:mh2220-double-cosets");
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const lab = page.locator(".generic-lab");
  await selectChoice(
    page,
    lab.getByRole("combobox", { name: "Finite group", exact: true }),
    "C",
  );
  await selectChoice(
    page,
    lab.getByRole("combobox", { name: "Parameter n", exact: true }),
    "6",
  );
  await selectChoice(
    page,
    lab.getByRole("combobox", { name: "Element a", exact: true }),
    "2",
  );
  await selectChoice(
    page,
    lab.getByRole("combobox", { name: "Element b", exact: true }),
    "3",
  );
  const explanation = lab
    .locator("p.lab-explain")
    .filter({ hasText: "A double coset" });
  const subgroup = lab
    .locator("p.lab-explain")
    .filter({ hasText: "The selected generated subgroup" });
  for (const [step, [both, action]] of [
    [false, null],
    [true, "Generate H using both a and b"],
    [false, "Generate H using a only"],
  ].entries()) {
    if (action)
      await lab.getByRole("button", { name: action, exact: true }).click();
    await expectExactMathRegion(
      explanation,
      `${both ? String.raw`$H=\langle a,b\rangle$` : String.raw`$H=\langle a\rangle$`} and $K=\\langle b\\rangle$. A double coset $HgK$ lets $H$ act on the left and $K$ on the right; unlike ordinary cosets, double cosets can have different sizes. Here the sizes are $6$.`,
    );
    await expectContainedMath(
      subgroup,
      both ? String.raw`$H=\{0,1,2,3,4,5\}$` : String.raw`$H=\{0,2,4\}$`,
    );
    await expectContainedMath(
      subgroup,
      both
        ? String.raw`$1$ equal pieces of size $6$`
        : String.raw`$2$ equal pieces of size $3$`,
    );
    await expect(lab.locator(".katex-error")).toHaveCount(0);
    await lab.screenshot({
      path: info.outputPath(`double-generators-${step}.png`),
    });
  }
});

test("permutation matrices keep the column and right-to-left composition convention", async ({
  page,
}, testInfo) => {
  await page.goto("/#lab:mh2220-permutation-matrices");
  await expect(page.locator(".algebra-app")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.getByRole("textbox", { name: "Permutation p" }).fill("2,3,1");
  await page.getByRole("textbox", { name: "Permutation q" }).fill("2,1,3");
  await expect(page.locator(".lab-controls").last()).toContainText(
    "apply q first",
  );
  await expectExactMathRegion(
    page.locator(".lab-controls .katex").last(),
    String.raw`$P_{p}P_q = P_{pq}$`,
  );
  await page
    .locator(".math-svg")
    .screenshot({ path: testInfo.outputPath("permutation-columns.png") });
});

test("regular and conjugation actions follow the prompt with different identity orbits", async ({
  page,
}, testInfo) => {
  await revealLab(
    page,
    "mh2220-actions",
    "Regular and conjugation actions move identity differently.",
  );
  const lab = page.locator(".foundation-lab");
  await selectChoice(page, lab.getByLabel("Left action"), "regular");
  const orbit = lab
    .locator(".live-mathematics p")
    .filter({ hasText: "Orbit:" });
  const stabilizer = lab
    .locator(".live-mathematics p")
    .filter({ hasText: /^Point stabilizer\b/ });
  await expectExactMathRegion(
    orbit,
    String.raw`Orbit: $\{e, (12), (23), (13), (123), (132)\}$.`,
  );
  await expectExactMathRegion(
    stabilizer,
    String.raw`Point stabilizer $G_x$: $\{e\}$.`,
  );
  await selectChoice(page, lab.getByLabel("Left action"), "conjugation");
  await expectExactMathRegion(orbit, String.raw`Orbit: $\{e\}$.`);
  await expectExactMathRegion(
    stabilizer,
    String.raw`Point stabilizer $G_x$: $\{e, (12), (23), (13), (123), (132)\}$.`,
  );
  await lab.screenshot({
    path: testInfo.outputPath("conjugation-identity.png"),
  });
});

test("Burnside solvability shows centralizer indices and its imported proof boundary", async ({
  page,
}, testInfo) => {
  await revealLab(
    page,
    "characters-burnside",
    "A central Sylow element has a prime-power class size.",
  );
  const lab = page.getByRole("region", {
    name: "Burnside class-size proof workbench",
  });
  await expect(
    lab
      .getByRole("table", {
        name: /conjugacy classes and exact centralizer indices/,
      })
      .locator("tbody tr"),
  ).toHaveCount(3);
  await expectExactMathRegion(
    lab.getByRole("table").locator("caption"),
    String.raw`$S_3$ conjugacy classes and exact centralizer indices`,
  );
  await expectContainedMath(lab.getByRole("status"), "class has $2$ elements");
  await selectChoice(page, lab.getByLabel("Representative z"), "identity");
  await expectExactMathRegion(
    lab.getByRole("status"),
    String.raw`For $z=e$, $C_G(e)=S_3$; no Sylow subgroup selection is needed. The class has $1$ element.`,
  );
  await expect(lab.getByRole("status")).toContainText(
    "no Sylow subgroup selection is needed",
  );
  await expectAbsentMath(lab.getByRole("status"), "Sylow subgroup $S_3$");
  await expect(lab).toContainText("Imported character-theoretic lemma");
  await expect(lab).toContainText("distinct from the orbit-counting average");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await lab.screenshot({
      path: testInfo.outputPath(`burnside-${width}.png`),
    });
  }
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((v) => ["serious", "critical"].includes(v.impact)),
  ).toEqual([]);
});

test("nilradical checker keeps commutative hypotheses and matrix failure visible", async ({
  page,
}, testInfo) => {
  await revealLab(
    page,
    "m3220-nilradical",
    "In ℤ/8ℤ, 2³=0; matrix nilpotence need not imply radical membership.",
  );
  const lab = page.getByRole("region", {
    name: "Nilradical hypothesis checker",
  });
  await expectContainedMath(
    lab.getByRole("status"),
    String.raw`$\operatorname{Nil}(R)=J(R)=\{0, 2, 4, 6\}$`,
  );
  await expectContainedMath(
    lab.getByRole("table", { name: /Element powers/ }),
    String.raw`$\{0, 4\}$`,
  );
  await selectChoice(page, lab.getByLabel("Ring and hypotheses"), "6");
  await expectContainedMath(
    lab.getByRole("status"),
    String.raw`$\operatorname{Nil}(R)=J(R)=\{0\}$`,
  );
  await selectChoice(page, lab.getByLabel("Ring and hypotheses"), "matrix");
  await expectContainedMath(lab.getByRole("status"), String.raw`$E_{12}^2=0$`);
  await expect(
    lab.getByRole("table", { name: "Noncommutative failure state" }),
  ).toContainText("No");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await lab.screenshot({
      path: testInfo.outputPath(`nilradical-${width}.png`),
    });
  }
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((v) => ["serious", "critical"].includes(v.impact)),
  ).toEqual([]);
});
