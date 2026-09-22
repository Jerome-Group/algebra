import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openLab(page, id) {
  await page.goto(`/#lab:${id}`);
  const experiment = page.locator(".exploration");
  await experiment
    .getByRole("textbox", { name: "Your mathematical prediction" })
    .fill("I will compare the matrices, fixed spaces and cube verdict.");
  await experiment.getByRole("button", { name: "Test my prediction" }).click();
  return experiment;
}

test("plane products keep F and their fixed lines synchronized", async ({
  page,
}) => {
  const lab = (await openLab(page, "orthogonal-plane")).locator(
    ".plane-reflection-lab",
  );
  await lab.getByRole("button", { name: "Check the θ=0 boundary" }).click();
  await expect(lab.locator(".live-mathematics")).toContainText(
    "fixes the line at 0°",
  );
  await expect(lab.getByRole("img")).toHaveAttribute(
    "aria-label",
    /fixes? the x-axis/,
  );
  const slider = lab.getByRole("slider", { name: /Plane angle/ });
  await slider.focus();
  for (let i = 0; i < 9; i++) await slider.press("PageUp");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "fixes the line at 45°",
  );
  await lab
    .getByRole("combobox", { name: /Selected product/ })
    .selectOption("FR");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "fixes the line at -45°",
  );
});

test("metric comparison changes dimension, matrix, fixed space and cube verdict together", async ({
  page,
}) => {
  const lab = (await openLab(page, "orthogonal-metric-orientation")).locator(
    ".metric-orientation-lab",
  );
  await expect(lab.locator(".live-mathematics")).toContainText(
    "x-axis, dimension 1",
  );
  const select = lab.getByRole("combobox", { name: /Transformation/ });
  await select.selectOption("plane3");
  await lab.getByRole("combobox", { name: /Plane normal/ }).selectOption("z");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "plane z=0, dimension 2",
  );
  await expect(lab.locator(".live-mathematics")).toContainText(
    "Preserves the cube vertex set: yes",
  );
  await select.selectOption("inversion3");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "{0}, dimension 0",
  );
  await select.selectOption("rotation3");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "Preserves the cube vertex set: no",
  );
  await lab.getByRole("slider", { name: /Spatial rotation/ }).press("Home");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "all R³, dimension 3",
  );
});

test("arbitrary axis reports cube words only for cube symmetries and remains accessible", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const lab = (await openLab(page, "orthogonal-axis-angle")).locator(
    ".axis-angle-lab",
  );
  const camera = lab.getByRole("group", {
    name: /Interactive three-dimensional cube projection/,
  });
  await camera.focus();
  await camera.press("ArrowRight");
  await expect(camera).toHaveAttribute("aria-label", /Yaw 0\.72/);
  await camera.press("Home");
  await expect(camera).toHaveAttribute("aria-label", /Yaw 0\.62/);
  const angle = lab.getByRole("spinbutton", { name: /Exact angle/ });
  await angle.fill("60");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "Cube symmetry: no",
  );
  await angle.fill("120");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "Cube symmetry: yes",
  );
  await expect(lab.locator(".live-mathematics")).toContainText(
    "Vertex permutation",
  );
  await lab.getByRole("spinbutton", { name: /Axis y component/ }).fill("2");
  await angle.fill("60");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "Cube symmetry: no",
  );
  await lab.getByRole("spinbutton", { name: /Axis x component/ }).fill("0");
  await lab.getByRole("spinbutton", { name: /Axis y component/ }).fill("0");
  await lab.getByRole("spinbutton", { name: /Axis z component/ }).fill("0");
  await expect(lab.getByRole("alert")).toContainText("nonzero finite axis");
  await lab.getByRole("button", { name: /Use cube body diagonal/ }).click();
  await angle.fill("180");
  await expect(lab.locator(".live-mathematics")).toContainText(
    "n and −n describe the same rotation",
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await lab.screenshot({ path: info.outputPath(`axis-angle-${width}.png`) });
  }
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
});
