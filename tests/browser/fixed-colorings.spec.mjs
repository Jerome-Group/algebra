import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const cases = [
  ["mh2220-burnside", "Fixed-point table", "= 4 orbits"],
  ["mh2220-necklaces", "Necklace and bracelet", "= 13 orbits"],
  ["mh2220-cycle-index", "Cycle-index inventory", "gives 1 orbits"],
  ["mh2220-solid-colorings", "Cube-axis", "= 23 orbits"],
];
for (const [id, label, expected] of cases)
  test(`${id} exposes exact fixed-coloring rows and accessible reflow`, async ({
    page,
  }, info) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/#lab:${id}`);
    const experiment = page.locator(".exploration");
    await expect(experiment).toContainText(label);
    await experiment
      .getByRole("textbox", { name: "Your mathematical prediction" })
      .fill(
        "A cycle can be colored consistently even when it has no fixed position.",
      );
    await experiment
      .getByRole("button", { name: "Test my prediction" })
      .focus();
    await page.keyboard.press("Enter");
    const lab = experiment.locator(".fixed-coloring-lab");
    await expect(lab.locator(".live-mathematics")).toContainText(expected);
    await expect(lab.getByRole("table")).toContainText(
      "Total before averaging",
    );
    await lab
      .getByRole("button", {
        name: "Show a motion with no fixed positions but fixed colorings",
      })
      .click();
    await expect(lab.locator(".live-mathematics")).toContainText("0 fixed");
    const firstSelect = lab.getByRole("combobox").first();
    await firstSelect.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(firstSelect).toBeFocused();
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
    expect(errors).toEqual([]);
  });

test("cycle-index inventory and cube feature controls change the mathematics", async ({
  page,
}) => {
  await page.goto("/#lab:mh2220-cycle-index");
  await page
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("Two red beads give one triangle orbit.");
  await page.getByRole("button", { name: "Test my prediction" }).click();
  const cycle = page.locator(".fixed-coloring-lab");
  await cycle
    .getByRole("combobox", { name: /Bead positions n/ })
    .selectOption("4");
  await expect(cycle.locator(".live-mathematics")).toContainText(
    "gives 2 orbits",
  );
  await page.goto("/#lab:mh2220-solid-colorings");
  await page
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("The feature set changes the cycle count.");
  await page.getByRole("button", { name: "Test my prediction" }).click();
  const cube = page.locator(".fixed-coloring-lab");
  await cube
    .getByRole("combobox", { name: /Cube feature set/ })
    .selectOption("faces");
  await expect(cube.locator(".live-mathematics")).toContainText("= 10 orbits");
  await expect(cube.getByRole("table")).toContainText("face-axis quarter-turn");
});

test("counting competency and capstone evidence persist without granting premature unit completion", async ({
  page,
}) => {
  await page.goto("/#mh2220-burnside");
  const reader = page.locator(".guided-reader");
  const boundary = reader.locator(".learning-checkpoint").nth(1);
  await boundary
    .getByRole("radio", { name: /Two, because its single three-cycle/ })
    .check();
  await boundary.getByRole("button", { name: "Check reasoning" }).click();
  await expect(reader.locator(".competency-progress")).toContainText(
    "1 of 3 competencies demonstrated",
  );
  await page.reload();
  await expect(reader.locator(".competency-progress")).toContainText(
    "1 of 3 competencies demonstrated",
  );
  await page.goto("/#learn");
  const unit = page.locator(".route-options > section").filter({
    has: page.getByRole("heading", { name: "Counting with group actions" }),
  });
  await expect(unit.locator(".competency-progress")).toContainText(
    "1 of 12 currently assessed competencies demonstrated",
  );
  await unit.getByText("Unit capstone", { exact: true }).click();
  await unit
    .getByRole("radio", { name: /Fixed counts 16,2,4,2 give six orbits/ })
    .check();
  await unit.getByRole("button", { name: "Check reasoning" }).click();
  await expect(unit.locator(".competency-progress")).toContainText(
    "Capstone demonstrated",
  );
  await expect(unit.locator(".competency-progress")).not.toContainText(
    "Unit complete",
  );
  await page.reload();
  await expect(unit.locator(".competency-progress")).toContainText(
    "Capstone demonstrated",
  );
});
