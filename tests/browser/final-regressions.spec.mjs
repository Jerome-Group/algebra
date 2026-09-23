import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
  await expect(page.locator(".lab-controls .katex").last()).toContainText("Pp");
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
  await lab.getByLabel("Left action").selectOption("regular");
  await expect(lab.getByText("Orbit:", { exact: false })).toContainText(
    "(123)",
  );
  await expect(lab.getByText("Point stabilizer Gₓ:")).toContainText("e");
  await lab.getByLabel("Left action").selectOption("conjugation");
  await expect(lab.getByText("Orbit:", { exact: false })).toContainText("{e}");
  await expect(lab.getByText("Point stabilizer Gₓ:")).toContainText("(123)");
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
      .getByRole("table", { name: /S₃ conjugacy classes/ })
      .locator("tbody tr"),
  ).toHaveCount(3);
  await expect(lab.getByRole("status")).toContainText("class has 2 elements");
  await lab.getByLabel("Representative z").selectOption("identity");
  await expect(lab.getByRole("status")).toContainText("class has 1 element");
  await expect(lab.getByRole("status")).toContainText(
    "no Sylow subgroup selection is needed",
  );
  await expect(lab.getByRole("status")).not.toContainText("Sylow subgroup S₃");
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
  await expect(lab.getByRole("status")).toContainText(
    "Nil(R)=J(R)={0, 2, 4, 6}",
  );
  await expect(
    lab.getByRole("table", { name: /Element powers/ }),
  ).toContainText("0, 4");
  await lab.getByLabel("Ring and hypotheses").selectOption("6");
  await expect(lab.getByRole("status")).toContainText("Nil(R)=J(R)={0}");
  await lab.getByLabel("Ring and hypotheses").selectOption("matrix");
  await expect(lab.getByRole("status")).toContainText("E₁₂²=0");
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
