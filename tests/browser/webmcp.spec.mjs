import { test, expect } from "@playwright/test";

test("registered interactions activate labelled checkpoint radios and submit React state", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.algebraTestTools = new Map();
    Object.defineProperty(document, "modelContext", {
      value: {
        registerTool(tool, { signal }) {
          window.algebraTestTools.set(tool.name, tool);
          signal.addEventListener("abort", () => {
            if (window.algebraTestTools.get(tool.name) === tool)
              window.algebraTestTools.delete(tool.name);
          });
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto("/#foundations-functions");
  await expect(page.locator(".guided-reader")).toBeVisible();
  await page.waitForFunction(() =>
    window.algebraTestTools.has("algebra_controls"),
  );
  const radio = await page.evaluate(() => {
    const controls = window.algebraTestTools
      .get("algebra_controls")
      .execute({});
    return controls.elements.find((item) => item.kind === "radio");
  });
  expect(radio.label).toContain("Which rule is a function");
  expect(radio.label).toContain("0↦a, 1↦b");
  await page.evaluate(
    (control) =>
      window.algebraTestTools
        .get("algebra_interact")
        .execute({ id: control.id, label: control.label }),
    radio,
  );
  const checkpoint = page.locator(".learning-checkpoint").first();
  await expect(checkpoint.getByRole("radio").first()).toBeChecked();
  await expect(
    checkpoint.getByRole("button", { name: "Check reasoning" }),
  ).toBeEnabled();
  await page.evaluate(() => {
    const controls = window.algebraTestTools
      .get("algebra_controls")
      .execute({});
    const submit = controls.elements.find(
      (item) => item.kind === "button" && item.label === "Check reasoning",
    );
    return window.algebraTestTools
      .get("algebra_interact")
      .execute({ id: submit.id, label: submit.label });
  });
  await expect(checkpoint.getByRole("status")).toContainText("Correct");
});
