import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const labels = ["A", "B", "C", "D"];
const clockwise = [1, 2, 3, 0];
const vertical = [1, 0, 3, 2];
function imageDescription(images) {
  return `Square vertex images: ${labels.map((label, index) => `${label} goes to position ${labels[images[index]]}`).join(", ")}`;
}

test("square actions compose on the left; native keyboard controls preserve exact vertex images", async ({
  page,
}) => {
  await page.goto("/#home");
  await expect(page.locator('.algebra-app[data-ready="true"]')).toBeVisible();
  const square = page.getByRole("region", {
    name: "Square symmetry investigation",
  });
  const rotate = square.getByRole("button", { name: "Rotate 90° clockwise" });
  const reflect = square.getByRole("button", {
    name: "Reflect across vertical axis",
  });
  const reset = square.getByRole("button", { name: "Reset square" });
  const sequence = ["r", "s", "r", "r", "s", "s", "r", "r", "r", "r"];
  let images = [0, 1, 2, 3];
  await expect(square.getByRole("img")).toHaveAttribute(
    "aria-label",
    imageDescription(images),
  );
  for (const move of sequence) {
    const control = move === "r" ? rotate : reflect;
    await control.focus();
    await page.keyboard.press("Enter");
    const permutation = move === "r" ? clockwise : vertical;
    images = images.map((image) => permutation[image]);
    await expect(square.getByRole("img")).toHaveAttribute(
      "aria-label",
      imageDescription(images),
    );
    await expect(control).toBeFocused();
  }
  await reset.click();
  for (let turn = 0; turn < 4; turn++) await rotate.click();
  await expect(square.getByRole("img")).toHaveAttribute(
    "aria-label",
    imageDescription([0, 1, 2, 3]),
  );
  await reflect.click();
  await reflect.click();
  await expect(square.getByRole("img")).toHaveAttribute(
    "aria-label",
    imageDescription([0, 1, 2, 3]),
  );
  await reset.click();
  await rotate.click();
  await reflect.click();
  const firstOrder = await square.getByRole("img").getAttribute("aria-label");
  await reset.click();
  await reflect.click();
  await rotate.click();
  expect(await square.getByRole("img").getAttribute("aria-label")).not.toBe(
    firstOrder,
  );
});

test("studio and lesson stages reflow; compass focus and proof recall remain keyboard usable", async ({
  page,
}) => {
  for (const width of [320, 390, 640, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#home");
    await expect(page.locator('.algebra-app[data-ready="true"]')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(
      page.getByRole("button", { name: "Export progress backup" }),
    ).toBeVisible();
    await page.goto("/#foundations-functions");
    await expect(
      page.getByRole("navigation", { name: "Lesson stages" }),
    ).toBeVisible();
    const prove = page.getByRole("button", { name: "Prove", exact: true });
    await prove.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#foundations-functions-proof")).toBeFocused();
    const hide = page.getByRole("button", {
      name: "Hide proof steps and reconstruct",
    });
    await hide.focus();
    await page.keyboard.press("Space");
    await expect(
      page.locator("#foundations-functions-proof-steps"),
    ).toBeHidden();
    const reveal = page.getByRole("button", {
      name: "Reveal justified proof steps",
    });
    await expect(reveal).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.locator("#foundations-functions-proof-steps"),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
  await page.goto("/#home");
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((issue) =>
      ["serious", "critical"].includes(issue.impact),
    ),
  ).toEqual([]);
});
