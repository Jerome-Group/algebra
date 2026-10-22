import { test, expect } from "@playwright/test";

test("narrow layout stays usable before the responsive coordinator commits", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.pendingMediaChanges = [];
    window.holdMediaChanges = false;
    const match = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const media = match(query);
      const add = media.addEventListener.bind(media);
      const remove = media.removeEventListener.bind(media);
      const wrapped = new Map();
      media.addEventListener = (type, listener, options) => {
        if (type !== "change") return add(type, listener, options);
        const deliver = (event) => {
          const invoke = () =>
            typeof listener === "function"
              ? listener.call(media, event)
              : listener.handleEvent(event);
          if (window.holdMediaChanges) window.pendingMediaChanges.push(invoke);
          else invoke();
        };
        wrapped.set(listener, deliver);
        add(type, deliver, options);
      };
      media.removeEventListener = (type, listener, options) =>
        remove(type, wrapped.get(listener) ?? listener, options);
      return media;
    };
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#lab:foundations-functions");
  await expect(
    page.getByRole("button", { name: "Collapse concepts", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.holdMediaChanges = true;
  });
  await page.setViewportSize({ width: 320, height: 1000 });
  const bounds = await page.locator(".visual-panel").boundingBox();
  expect(bounds.width).toBeGreaterThan(260);
  expect(bounds.x).toBeLessThan(40);
  await expect(
    page.locator(".algebra-layout > .concept-library"),
  ).not.toBeVisible();
  await page.evaluate(() => {
    window.holdMediaChanges = false;
    for (const deliver of window.pendingMediaChanges.splice(0)) deliver();
  });
  await page.getByRole("button", { name: "Concepts", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Concept library", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
});

test("encoded public aliases open their canonical lesson and laboratory", async ({
  page,
}) => {
  for (const prefix of ["", "lab:"]) {
    await page.goto(`/#${prefix}Diagonal%20tensor%20actions`);
    await expect(page.locator("#lesson-heading")).toContainText(
      "Diagonal tensor actions",
    );
    await expect(page.locator("#lesson-heading")).toBeFocused();
    await expect(
      page
        .getByRole("navigation", { name: "Concept library", exact: true })
        .locator(
          'a[href="#ureca-constructions-diagonal-tensor"][aria-current="page"]',
        ),
    ).toHaveCount(1);
  }
});

test("desktop concepts remain available across modes, collapse and long reading", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const destination of [
    "home",
    "learn",
    "explore",
    "reference",
    "sources",
    "capstone:tensor",
    "lab:ureca-theory-mackey-orbits",
  ]) {
    await page.goto(`/#${destination}`);
    await expect(page.locator('.algebra-app[data-ready="true"]')).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Concept library", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Collapse concepts", exact: true }),
    ).toBeVisible();
  }
  await page.goto("/#ureca-theory-mackey-orbits");
  await expect(page.locator(".chapter-number")).not.toHaveText("00");
  const library = page.getByRole("navigation", {
    name: "Concept library",
    exact: true,
  });
  await expect(library.locator(".subject-navigation > details")).toHaveCount(6);
  await expect(library.locator(".chapter-concepts a")).toHaveCount(227);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const toggle = page.getByRole("button", {
    name: "Collapse concepts",
    exact: true,
  });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(library).not.toBeVisible();
  await page.getByRole("link", { name: "Reference", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Expand concepts", exact: true }),
  ).toBeVisible();
  await expect(library).not.toBeVisible();
  await page
    .getByRole("button", { name: "Expand concepts", exact: true })
    .click();
  await expect(library).toBeVisible();
});

test("concept results have one independent vertical scroller", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 660 });
  await page.goto("/#home");
  await page
    .getByRole("textbox", { name: "Search concepts", exact: true })
    .fill("group");
  const scroll = page.locator(".library-scroll");
  await expect(page.locator(".search-results a").first()).toBeVisible();
  const result = await scroll.evaluate((element) => {
    const pageTop = window.scrollY;
    element.scrollTop = element.scrollHeight;
    return {
      scrollTop: element.scrollTop,
      pageTop,
      after: window.scrollY,
      overflow: getComputedStyle(element).overflowY,
    };
  });
  expect(result.overflow).toBe("auto");
  expect(result.scrollTop).toBeGreaterThan(0);
  expect(result.after).toBe(result.pageTop);
  await expect(
    page.getByRole("textbox", { name: "Search concepts", exact: true }),
  ).toBeVisible();
});

for (const width of [390, 900, 1150]) {
  test(`concept modal traps focus, dismisses and navigates at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#home");
    const toggle = page.getByRole("button", { name: "Concepts", exact: true });
    await toggle.click();
    const dialog = page.getByRole("dialog", {
      name: "Concept library",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    const search = dialog.getByRole("textbox", {
      name: "Search concepts",
      exact: true,
    });
    await expect(search).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
    await page.keyboard.press("Tab");
    await expect(
      dialog.getByRole("button", { name: "Close concepts", exact: true }),
    ).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(
      "hidden",
    );
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(toggle).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
      "hidden",
    );
    await toggle.click();
    await search.fill("Mackey");
    await dialog
      .locator('.search-results a[href="#ureca-theory-mackey-orbits"]')
      .click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator("#lesson-heading")).toBeFocused();
    await expect(page.locator("#lesson-heading")).toContainText("Mackey");
  });
}

test("widening an open modal releases modality and preserves desktop collapse choice", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#home");
  await page
    .getByRole("button", { name: "Collapse concepts", exact: true })
    .click();
  await page.setViewportSize({ width: 900, height: 900 });
  await page.getByRole("button", { name: "Concepts", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Expand concepts", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
  await page.getByRole("link", { name: "Sources", exact: true }).click();
  await expect(page.locator("#mode-heading")).toBeFocused();
  await expect(page.locator("#concept-library")).not.toBeVisible();
});

test("guest lesson and laboratory visits update Home's reading position within the session", async ({
  page,
}) => {
  for (const destination of [
    "ureca-theory-mackey-orbits",
    "lab:tensor-products",
  ]) {
    await page.goto(`/#${destination}`);
    await expect(page.locator("#lesson-heading")).toBeVisible();
    await expect(page.locator("[data-account-phase]")).toHaveAttribute(
      "data-account-phase",
      "guest",
    );
    await page
      .getByRole("link", { name: "Abstract Algebra", exact: true })
      .click();
    const resume = page
      .locator(".resume-learning")
      .getByRole("button", { name: /^Return to/ });
    await expect(resume).toBeVisible();
    await resume.click();
    await expect(page).toHaveURL(
      new RegExp(`#${destination.replace(/^lab:/, "")}$`),
    );
  }
});
