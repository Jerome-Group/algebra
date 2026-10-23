import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function enter(page, hash = "start") {
  await page.goto(`/#${hash}`);
  await expect(page.locator('.algebra-app[data-ready="true"]')).toBeVisible();
  await expect(page.locator("#mode-heading")).toBeFocused();
  await expect(
    page.getByRole("region", { name: "Start from zero workshop" }),
  ).toBeVisible();
}

async function move(page, name) {
  await page
    .getByRole("navigation", { name: "Four workshop moves" })
    .getByRole("button", { name: new RegExp(name) })
    .click();
  await expect(page.locator("#beginner-move-heading")).toBeFocused();
}

test("a new guest names objects, reads a quantifier and supplies exact counterexamples", async ({
  page,
}) => {
  await page.goto("/#home");
  await expect(page.locator('.algebra-app[data-ready="true"]')).toBeVisible();
  await page
    .getByRole("link", { name: "Start from zero", exact: true })
    .click();
  await expect(page).toHaveURL(/#start$/);
  await expect(page.locator("#mode-heading")).toBeFocused();
  const codomain = page.getByRole("button", {
    name: "Y, the codomain",
    exact: true,
  });
  await codomain.focus();
  await page.keyboard.press("Enter");
  await expect(codomain).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator('.beginner-output[data-highlighted="true"]'),
  ).toHaveCount(3);
  await expect(
    page.locator('.beginner-input[data-highlighted="true"]'),
  ).toHaveCount(0);
  await expect(page.locator(".beginner-meaning")).toContainText(
    "Allowed does not mean reached",
  );
  await move(page, "Read the sentence");
  await expect(
    page.getByRole("button", { name: "Every allowed output", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Output to inspect").selectOption("a");
  await page
    .getByRole("button", { name: "has at least one input", exact: true })
    .click();
  await expect(
    page.locator('.beginner-input[data-highlighted="true"]'),
  ).toHaveCount(2);
  await expect(page.locator(".beginner-fiber annotation")).toHaveText(
    "f^{-1}(\\{a\\})=\\{0,1\\}",
  );
  await page.getByLabel("Output to inspect").selectOption("c");
  await expect(
    page.locator('.beginner-input[data-highlighted="true"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('.beginner-output[data-highlighted="true"]'),
  ).toHaveCount(1);
  await expect(page.locator(".beginner-fiber annotation")).toHaveText(
    "f^{-1}(\\{c\\})=\\varnothing",
  );
  await move(page, "Give a reason");
  await page
    .getByRole("button", { name: "Check this witness", exact: true })
    .click();
  await expect(page.locator(".beginner-feedback")).toContainText(
    "Choose one allowed output",
  );
  await page.getByLabel("Missing output witness").selectOption("a");
  await page
    .getByRole("button", { name: "Check this witness", exact: true })
    .click();
  await expect(page.locator(".beginner-feedback")).toContainText(
    "At least one incoming arrow is enough",
  );
  await expect(
    page.locator(".beginner-feedback annotation").first(),
  ).toHaveText("0,1");
  await page.getByLabel("Missing output witness").selectOption("b");
  await page
    .getByRole("button", { name: "Check this witness", exact: true })
    .click();
  await expect(
    page.locator(".beginner-feedback annotation").first(),
  ).toHaveText("2");
  await page.getByLabel("Missing output witness").selectOption("c");
  await page
    .getByRole("button", { name: "Check this witness", exact: true })
    .click();
  await expect(page.locator(".beginner-feedback")).toHaveClass(
    "beginner-feedback witness",
  );
  await expect(page.locator(".beginner-feedback")).toContainText(
    "not surjective",
  );
  await page
    .getByRole("radio", { name: /Different inputs have different outputs/ })
    .check();
  await page.getByLabel("First collision input").selectOption("0");
  await page.getByLabel("Second collision input").selectOption("0");
  await page
    .getByRole("button", { name: "Check this witness", exact: true })
    .click();
  await expect(page.locator(".beginner-feedback")).toContainText("twice");
  await page.getByLabel("Second collision input").selectOption("2");
  await page
    .getByRole("button", { name: "Check this witness", exact: true })
    .click();
  await expect(page.locator(".beginner-feedback")).toContainText(
    "These outputs differ",
  );
  await page.getByLabel("Second collision input").selectOption("1");
  await page
    .getByRole("button", { name: "Check this witness", exact: true })
    .click();
  await expect(page.locator(".beginner-feedback")).toContainText(
    "not injective",
  );
  await page.getByLabel("Output for input 1").selectOption("c");
  await expect(page.locator(".beginner-feedback")).toBeEmpty();
  await expect(page.getByLabel("First collision input")).toHaveValue("");
  await expect(page.getByLabel("Second collision input")).toHaveValue("");
});

test("codomain edits preserve arrows, refuse in-use c and recompute both definitions", async ({
  page,
}) => {
  await enter(page);
  await move(page, "Change an assumption");
  await page
    .getByRole("button", { name: "Use codomain a, b", exact: true })
    .click();
  await expect(page.locator('[data-property="surjective"] strong')).toHaveText(
    "Surjective",
  );
  await expect(page.locator('[data-property="injective"] strong')).toHaveText(
    "Not injective",
  );
  await expect(page.getByLabel("Output for input 0")).toHaveValue("a");
  await expect(page.getByLabel("Output for input 1")).toHaveValue("a");
  await expect(page.getByLabel("Output for input 2")).toHaveValue("b");
  await expect(page.locator('[data-output="c"]')).toHaveCount(0);
  await page
    .getByRole("button", { name: "Use codomain a, b, c", exact: true })
    .click();
  await page.getByLabel("Output for input 1").selectOption("c");
  await expect(page.locator('[data-property="surjective"] strong')).toHaveText(
    "Surjective",
  );
  await expect(page.locator('[data-property="injective"] strong')).toHaveText(
    "Injective",
  );
  await page
    .getByRole("button", { name: "Use codomain a, b", exact: true })
    .click();
  await expect(page.locator(".beginner-feedback")).toContainText(
    "Cannot remove",
  );
  await expect(page.locator(".beginner-feedback annotation").nth(1)).toHaveText(
    "1",
  );
  await expect(page.getByLabel("Output for input 1")).toHaveValue("c");
  await expect(page.locator('[data-output="c"]')).toBeVisible();
  await page.getByLabel("Output for input 1").selectOption("a");
  await expect(page.locator(".beginner-feedback")).toBeEmpty();
  await page
    .getByRole("button", { name: "Use codomain a, b", exact: true })
    .click();
  await expect(page.locator('[data-property="surjective"] strong')).toHaveText(
    "Surjective",
  );
});

test("contextual return, history and full laboratory links use existing destinations", async ({
  page,
}) => {
  await page.goto("/#foundations-functions");
  await expect(page.locator('.algebra-app[data-ready="true"]')).toBeVisible();
  await expect(page.locator("#lesson-heading")).toBeFocused();
  const resume = await page
    .getByRole("link", { name: "Help me read the symbols", exact: true })
    .getAttribute("href");
  expect(resume).toBe("#start?move=read&return=foundations-functions");
  await page
    .getByRole("link", { name: "Help me read the symbols", exact: true })
    .click();
  await expect(page.locator("#beginner-move-heading")).toHaveText(
    "A sentence becomes a search.",
  );
  await expect(page.locator("#mode-heading")).toBeFocused();
  await page
    .getByRole("link", {
      name: "Return to the lesson you came from",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/#foundations-functions$/);
  await expect(page.locator("#lesson-heading")).toBeFocused();
  await page.goBack();
  await expect(page.locator("#mode-heading")).toBeFocused();
  await page
    .getByRole("link", { name: "Use the existing laboratory", exact: true })
    .click();
  await expect(page).toHaveURL(/#lab:foundations-functions$/);
  await expect(page.locator("#lesson-heading")).toBeFocused();
  await expect(
    page.getByRole("region", { name: "Start from zero workshop" }),
  ).toHaveCount(0);
  await page.goBack();
  await expect(page.locator("#mode-heading")).toBeFocused();
  await page
    .getByRole("link", { name: "Open the full functions lesson", exact: true })
    .click();
  await expect(page).toHaveURL(/#foundations-functions$/);
  await expect(page.locator("#lesson-heading")).toBeFocused();
});

test("workshop stays temporary and does not write account or legacy learning records", async ({
  page,
}) => {
  const writes = [];
  page.on("request", (request) => {
    if (
      /\/api\/(progress|arguments)(\?|$)/.test(request.url()) &&
      request.method() !== "GET"
    )
      writes.push(request.method());
  });
  await enter(page);
  const before = await page.evaluate(() => Object.entries(localStorage));
  await page.getByLabel("Output for input 0").selectOption("c");
  await move(page, "Give a reason");
  await page.getByLabel("Missing output witness").selectOption("b");
  await page
    .getByRole("button", { name: "Check this witness", exact: true })
    .click();
  await expect(page.locator(".beginner-feedback")).not.toBeEmpty();
  expect(await page.evaluate(() => Object.entries(localStorage))).toEqual(
    before,
  );
  await page.reload();
  await expect(page.locator("#mode-heading")).toBeFocused();
  await expect(page.getByLabel("Output for input 0")).toHaveValue("a");
  await expect(page.locator("#beginner-move-heading")).toHaveText(
    "Each input has one output.",
  );
  expect(writes).toEqual([]);
});

test("all four moves typeset math and reflow with native keyboard controls", async ({
  page,
}, testInfo) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await enter(page);
    for (const title of [
      "Name the objects",
      "Read the sentence",
      "Give a reason",
      "Change an assumption",
    ]) {
      await move(page, title);
      await expect(page.locator(".beginner-workshop .katex-error")).toHaveCount(
        0,
      );
      expect(
        await page.locator(".beginner-workshop .katex-mathml math").count(),
      ).toBeGreaterThan(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      const select = page.getByLabel("Output for input 0");
      await select.focus();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await expect(select).toBeFocused();
      const accessibility = await new AxeBuilder({ page })
        .include(".beginner-workshop")
        .analyze();
      expect(accessibility.violations).toEqual([]);
      if (
        (width === 320 || width === 1440) &&
        (title === "Read the sentence" || title === "Change an assumption")
      )
        await testInfo.attach(`workshop-${width}-${title}`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: "image/png",
        });
    }
  }
});

test("move controls keep their focused heading below the sticky header", async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await enter(page);
    for (const title of [
      "Read the sentence",
      "Give a reason",
      "Change an assumption",
    ]) {
      await move(page, title);
      await expect
        .poll(() =>
          page.evaluate(() => {
            const heading = document
              .querySelector("#beginner-move-heading")
              .getBoundingClientRect();
            const header = document
              .querySelector(".algebra-header")
              .getBoundingClientRect();
            return heading.top - header.bottom;
          }),
        )
        .toBeGreaterThanOrEqual(12);
    }
    for (let previous = 0; previous < 3; previous++) {
      await page
        .getByRole("button", { name: "Previous move", exact: true })
        .click();
      await expect(page.locator("#beginner-move-heading")).toBeFocused();
      await expect
        .poll(() =>
          page.evaluate(() => {
            const heading = document
              .querySelector("#beginner-move-heading")
              .getBoundingClientRect();
            const header = document
              .querySelector(".algebra-header")
              .getBoundingClientRect();
            return heading.top - header.bottom;
          }),
        )
        .toBeGreaterThanOrEqual(12);
    }
  }
});
