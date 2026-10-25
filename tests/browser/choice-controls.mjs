import assert from "node:assert/strict";
import { expect } from "@playwright/test";

function optionFor(page, value) {
  assert(
    typeof value === "string" || typeof value === "number",
    "Choose an original semantic string or number value",
  );
  return page
    .getByRole("listbox")
    .locator(
      `[role="option"][data-choice-value=${JSON.stringify(String(value))}]`,
    );
}

export async function selectChoice(page, control, value) {
  await expect(control).toBeVisible();
  await expect(control).toBeEnabled();
  await control.click();
  const option = optionFor(page, value);
  await expect(option).toBeVisible();
  await expect(option).toBeEnabled();
  const speech = await option.getAttribute("aria-label");
  assert(speech?.trim(), "The actual option needs a plain accessible name");
  await expect(option).toHaveAccessibleName(speech);
  await option.click();
  await expect(control).toHaveAttribute("aria-expanded", "false");
  await expect(control).toHaveAccessibleDescription(speech);
  await expect(control).toBeFocused();
  await expectChoiceValue(page, control, value);
}

export async function expectChoiceValue(page, control, value) {
  await expect(control).toBeVisible();
  if (value === null)
    await expect(control).toHaveAttribute("data-placeholder", "");
  else await expect(control).not.toHaveAttribute("data-placeholder", "");
  await control.click();
  let speech;
  if (value === null)
    await expect(
      page
        .getByRole("listbox")
        .locator('[role="option"][data-state="checked"]'),
    ).toHaveCount(0);
  else {
    const option = optionFor(page, value);
    await expect(option).toHaveAttribute("data-state", "checked");
    await expect(option).toHaveAttribute("aria-selected", "true");
    speech = await option.getAttribute("aria-label");
    assert(speech?.trim(), "The selected option needs a plain accessible name");
    await expect(option).toHaveAccessibleName(speech);
  }
  await page.keyboard.press("Escape");
  await expect(control).toHaveAttribute("aria-expanded", "false");
  await expect(control).toBeFocused();
  if (speech) await expect(control).toHaveAccessibleDescription(speech);
}
