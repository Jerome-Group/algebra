import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
  await expect(
    cyclic.getByRole("table", { name: /All subgroups of C12/ }),
  ).toContainText("0, 2, 4, 6, 8, 10");
  await expect(
    cyclic.getByRole("table", { name: /Reachability and shortest words/ }),
  ).toContainText("Length");
  await experiment
    .getByRole("button", { name: "S₃ words and relations" })
    .click();
  const lab = experiment.locator(".s3-relation-lab");
  await lab.getByRole("button", { name: "Try r³=e" }).focus();
  await page.keyboard.press("Enter");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "This word is an identity relation",
  );
  await expect(
    lab
      .getByRole("table", { name: /Six distinct normal forms/ })
      .locator("tbody tr"),
  ).toHaveCount(6);
  await lab.getByRole("button", { name: /Append s=/ }).click();
  await expect(lab.locator(".live-mathematics")).toContainText(
    "not an identity relation",
  );
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
      .getByRole("table", { name: /All subgroups of C12/ })
      .locator("tbody tr"),
  ).toHaveCount(6);
  await lab.getByRole("combobox", { name: /Generator g/ }).selectOption("4");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "3 copies return to zero",
  );
  await lab.getByRole("combobox", { name: /Generator g/ }).selectOption("5");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "12 copies return to zero",
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
  await expect(lab.locator(".live-mathematics")).toContainText(
    "agree with λgh: yes",
  );
  await expect(
    lab
      .getByRole("table", { name: /Left-regular embedding/ })
      .locator("tbody tr"),
  ).toHaveCount(6);
  await lab.getByRole("combobox", { name: /First factor g/ }).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "agree with λgh: yes",
  );
  await expect(lab.locator(".live-mathematics")).toContainText(
    "embedding is injective",
  );
  await checkReflowAndAxe(page, lab, info, "embedding");
  expect(errors).toEqual([]);
});
