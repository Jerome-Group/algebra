import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";

const lessons = JSON.parse(
  readFileSync(new URL("../../lib/algebra/lessons.json", import.meta.url)),
);
const guided = JSON.parse(
  readFileSync(
    new URL("../../lib/algebra/guided-lessons.json", import.meta.url),
  ),
);
const targetId = "ureca-constructions-induction-adjunction";
const unitId = "ureca-constructions-induction-adjunctions";
const targetHash = `#work:${targetId}?unit=${unitId}`;
const targetName = lessons.find((lesson) => lesson.id === targetId).navTitle;
const question = "Why does this descend to the tensor quotient?";
const writing =
  "Let $\\alpha:V\\to W$ be A-linear. I must check balancing before defining $F_\\alpha$.";
const editor = (page) =>
  page.getByRole("textbox", { name: /^Your argument, block/ });
const backup = (page) => page.locator(".argument-records");
const headers = (owner) => ({
  "oai-authenticated-user-id": owner,
  "oai-authenticated-user-email": `${owner}@local.example.test`,
});

async function readArguments(page, owner) {
  const response = await page.request.get("/api/arguments", {
    headers: { "X-Expected-Account-Id": owner },
  });
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.kind).toBe("account");
  expect(result.accountId).toBe(owner);
  return result;
}

async function openBackup(page) {
  if (!(await backup(page).evaluate((element) => element.open)))
    await backup(page).locator("summary").first().click();
}

async function start(page) {
  await page.goto(`/${targetHash}`);
  await expect(editor(page)).toBeVisible();
  await editor(page).fill(writing);
  await page
    .getByRole("textbox", { name: "Question for this block", exact: true })
    .fill(question);
}

test("a cold support route exposes stable public headings while private writing waits for identity", async ({
  page,
}) => {
  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  let first = true;
  await page.route("**/api/progress", async (route) => {
    if (route.request().method() === "GET" && first) {
      first = false;
      await held;
    }
    await route.continue();
  });
  try {
    await page.goto(`/${targetHash}&support=tensor-products`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("#work-heading")).toHaveText(targetName);
    await expect(page.locator("#support-heading")).toHaveText(
      lessons.find((lesson) => lesson.id === "tensor-products").navTitle,
    );
    await expect(page.locator("#support-heading")).toBeFocused();
    await expect(editor(page)).toHaveCount(0);
    await expect(backup(page)).toHaveCount(0);
  } finally {
    release();
  }
  await expect(editor(page)).toBeVisible();
  await expect(page.locator("#support-heading")).toHaveCount(1);
  await expect(page.locator("#support-heading")).toBeFocused();
});

for (const width of [390, 1440]) {
  test(`an argument retains its question and unit through balancing support, comparison and transfer at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await start(page);
    await expect(page.locator(".argument-save-status")).toContainText(
      "Temporary writing",
    );
    await expect(page.locator(".argument-proof-references")).toHaveCount(0);
    await expect(
      page.locator(".argument-workspace .learning-checkpoint"),
    ).toHaveCount(0);
    await page
      .getByRole("button", {
        name: "Find support for this question",
        exact: true,
      })
      .click();
    const support = page.locator(".argument-support-tree");
    await expect(support.locator(":scope > li")).toHaveCount(2);
    await expect(
      support.locator('a[href*="support=tensor-products"]'),
    ).toHaveCount(0);
    const tensorBranch = support.locator(":scope > li").filter({
      has: page.locator(
        'a[href*="support=ureca-constructions-tensor-coset-identification"]',
      ),
    });
    await tensorBranch.locator("summary").first().click();
    await support.locator('a[href*="support=tensor-products"]').click();
    await expect(page.locator("#support-heading")).toBeFocused();
    await expect(page).toHaveURL(/support=tensor-products/);
    await page
      .getByRole("link", { name: "Open its laboratory", exact: true })
      .click();
    const lab = page.locator(
      '.argument-consultation [data-machine="tensor-balancing"]',
    );
    await expect(lab).toBeVisible();
    await lab
      .getByRole("textbox", {
        name: "Your mathematical prediction",
        exact: true,
      })
      .fill("The two balanced expressions represent the same tensor.");
    await lab
      .getByRole("button", { name: "Test my prediction", exact: true })
      .click();
    await expect(lab.locator(".live-mathematics")).toContainText(
      "Balance: equal",
    );
    await expect(
      page.getByRole("textbox", {
        name: "Question for this block",
        exact: true,
      }),
    ).toHaveValue(question);
    await expect(editor(page)).toHaveValue(writing);
    await page
      .getByRole("button", { name: "Return to my writing", exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`work:${targetId}.*unit=${unitId}$`),
    );
    await expect(page.locator(".argument-proof-references")).toBeVisible();
    await expect(editor(page)).toHaveValue(writing);
    await page
      .getByRole("button", {
        name: "Attach reference 2 to this block",
        exact: true,
      })
      .click();
    await expect(page.locator(".argument-attached-reference")).toContainText(
      "Reference 2",
    );
    await page
      .getByRole("combobox", { name: "Your self-review", exact: true })
      .selectOption("revisited");
    await expect(
      page.locator(".argument-workspace .learning-checkpoint"),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Try transfer check", exact: true })
      .click();
    const transfer = page.locator(".argument-transfer .learning-checkpoint");
    await expect(
      page.locator(".argument-workspace .learning-checkpoint"),
    ).toHaveCount(1);
    await transfer
      .getByRole("radio")
      .nth(guided[targetId].transfer.answer)
      .check();
    await expect(transfer.locator(".saved-checkpoint")).toHaveCount(0);
    await transfer
      .getByRole("button", { name: "Check reasoning", exact: true })
      .click();
    await expect(transfer.getByRole("status")).toContainText("Correct.");
    await expect(
      page.getByRole("link", {
        name: "Return to original unit capstone",
        exact: true,
      }),
    ).toHaveAttribute("href", `#capstone:${unitId}`);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: testInfo.outputPath(`argument-transfer-${width}.png`),
      fullPage: true,
    });
    const audit = await new AxeBuilder({ page }).analyze();
    await testInfo.attach("argument-axe", {
      body: JSON.stringify(audit),
      contentType: "application/json",
    });
    expect(
      audit.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact),
      ),
    ).toEqual([]);
    await page
      .getByRole("link", {
        name: "Return to original unit capstone",
        exact: true,
      })
      .click();
    await expect(page.locator(`[id="capstone:${unitId}"]`)).toBeFocused();
    await page
      .getByRole("link", { name: "Return to my argument", exact: true })
      .click();
    await expect(editor(page)).toHaveValue(writing);
    await expect(
      page.getByRole("textbox", {
        name: "Question for this block",
        exact: true,
      }),
    ).toHaveValue(question);
    await expect(page.locator(".argument-unit-context")).toContainText(
      "Adjunction, naturality and induced trace",
    );
  });
}

test("guest argument backup previews a selected sheet, imports a fresh copy and states reload loss", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "Add block", exact: true }).click();
  await editor(page).fill("My second block keeps a separate gap.");
  await page
    .getByRole("textbox", { name: "Question for this block", exact: true })
    .fill("Where do the inverse identities enter?");
  await openBackup(page);
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export argument backup", exact: true })
    .click();
  const download = await downloadEvent;
  const raw = await readFile(await download.path(), "utf8");
  const exported = JSON.parse(raw);
  expect(exported.active.blocks).toHaveLength(2);
  await page.getByRole("button", { name: "New attempt", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Discard unsaved changes and continue",
      exact: true,
    })
    .click();
  await expect(editor(page)).toHaveValue("");
  await backup(page)
    .locator('input[type="file"]')
    .setInputFiles({
      name: "arguments.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
  await expect(
    page.getByRole("region", { name: "Argument backup preview", exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: new RegExp(targetName) }).check();
  await page
    .getByRole("button", { name: "Use selected copy", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Discard unsaved changes and continue",
      exact: true,
    })
    .click();
  await expect(editor(page)).toHaveValue(
    "My second block keeps a separate gap.",
  );
  await expect(
    page.getByRole("textbox", { name: "Question for this block", exact: true }),
  ).toHaveValue("Where do the inverse identities enter?");
  await expect(page.locator(".argument-save-status")).toContainText(
    "Reloading or closing this page loses it",
  );
  const importedDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export argument backup", exact: true })
    .click();
  const imported = JSON.parse(
    await readFile(await (await importedDownload).path(), "utf8"),
  );
  expect(imported.active.id).not.toBe(exported.active.id);
  expect(imported.active.blocks[1].id).not.toBe(exported.active.blocks[1].id);
  expect(imported.active.blocks[1].text).toBe(exported.active.blocks[1].text);
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(editor(page)).toHaveValue("");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => /argument/i.test(key)),
    ),
  ).toEqual([]);
});

test("opening another target requires an explicit choice and keeping restores the same writing", async ({
  page,
}) => {
  await start(page);
  await page
    .getByRole("link", { name: "Read full lesson", exact: true })
    .click();
  await page
    .locator(".concept-end")
    .getByRole("button", { name: /^Next:/ })
    .click();
  await page
    .getByRole("link", { name: "Work on this argument", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open this argument", exact: true })
    .click();
  await expect(
    page.getByRole("region", {
      name: "Keep your unsaved argument",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Keep current argument", exact: true })
    .click();
  await expect(editor(page)).toHaveValue(writing);
  await expect(
    page.getByRole("textbox", { name: "Question for this block", exact: true }),
  ).toHaveValue(question);
  await expect(page.locator(".argument-desk")).toHaveAttribute(
    "data-argument-target",
    targetId,
  );
});

test("a failed support laboratory preserves guest writing and its backup before a deliberate reload", async ({
  page,
}) => {
  const laboratoryImport =
    /\/(?:components\/algebra\/FunctionFibers\.tsx|assets\/FunctionFibers-[\w-]+\.js)(?:\?.*)?$/;
  await page.route(laboratoryImport, (route) => route.abort());
  await start(page);
  await page
    .getByRole("button", {
      name: "Find support for this question",
      exact: true,
    })
    .click();
  await page
    .getByRole("searchbox", {
      name: "Search teaching for your question",
      exact: true,
    })
    .fill("functions");
  await page
    .locator(
      '.argument-search-results a[href$="support=foundations-functions"]',
    )
    .click();
  await page
    .getByRole("link", { name: "Open its laboratory", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Your mathematical prediction", exact: true })
    .fill("A fiber changes.");
  await page
    .getByRole("button", { name: "Test my prediction", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Laboratory unavailable" }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Reload laboratory", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Laboratory unavailable" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Return to my argument", exact: true })
    .click();
  await expect(editor(page)).toHaveValue(writing);
  await openBackup(page);
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export argument backup", exact: true })
    .click();
  const raw = await readFile(await (await downloadEvent).path(), "utf8");
  expect(JSON.parse(raw).active.blocks[0].text).toBe(writing);
});

test.describe("argument UI with an owned Worker and synthetic account identity", () => {
  test.beforeEach(async ({ baseURL }, testInfo) => {
    test.skip(
      process.env.ALGEBRA_ACCOUNT_FIXTURE !== "1" ||
        !["127.0.0.1", "localhost", "[::1]"].includes(
          new URL(baseURL).hostname,
        ),
      "Requires the owned local Worker/D1 fixture. Native provider sign-in remains unverified.",
    );
    testInfo.annotations.push({
      type: "identity",
      description:
        "Local synthetic trusted-header fixture. No provider sign-in proof.",
    });
  });

  test("expiry clears private writing and permits fresh guest writing after server confirmation", async ({
    page,
    context,
  }) => {
    const owner = `argument-expiry-${randomUUID()}`;
    await context.setExtraHTTPHeaders(headers(owner));
    await start(page);
    await context.setExtraHTTPHeaders({});
    await page
      .getByRole("button", { name: "Save argument", exact: true })
      .click();
    await expect(page.locator("[data-account-phase]")).toHaveAttribute(
      "data-account-phase",
      "expired",
    );
    await expect(page.locator(".argument-save-status")).toContainText(
      "Temporary writing",
    );
    await expect(editor(page)).toHaveValue("");
    await editor(page).fill(
      "A fresh guest argument contains none of the former private writing.",
    );
    await expect(editor(page)).toHaveValue(
      "A fresh guest argument contains none of the former private writing.",
    );
    await openBackup(page);
    const downloadEvent = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export argument backup", exact: true })
      .click();
    const raw = await readFile(await (await downloadEvent).path(), "utf8");
    expect(raw).not.toContain(writing);
    expect(JSON.parse(raw).active.blocks[0].text).toContain(
      "fresh guest argument",
    );
  });

  test("acknowledgement names captured writing while later typing remains unsaved, then reload resumes the saved sheet", async ({
    page,
    context,
  }) => {
    const owner = `argument-typing-${randomUUID()}`;
    await context.setExtraHTTPHeaders(headers(owner));
    await start(page);
    const progressBefore = await (
      await page.request.get("/api/progress")
    ).json();
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    let first = true;
    await page.route("**/api/arguments", async (route) => {
      if (route.request().method() === "POST" && first) {
        first = false;
        await held;
      }
      await route.continue();
    });
    await page
      .getByRole("button", { name: "Save argument", exact: true })
      .click();
    await expect(page.locator(".argument-save-status")).toHaveAttribute(
      "data-argument-phase",
      "saving",
    );
    await editor(page).fill(`${writing} I am still working.`);
    release();
    await expect(page.locator(".argument-save-status")).toContainText(
      "Unsaved changes",
    );
    const firstSave = await readArguments(page, owner);
    expect(
      firstSave.records.find((record) => record.kind === "supported").saved
        .sheet.blocks[0].text,
    ).toBe(writing);
    await page
      .getByRole("button", { name: "Save argument", exact: true })
      .click();
    await expect(page.locator(".argument-save-status")).toContainText(
      "This writing is saved to your account",
    );
    const progressAfter = await (
      await page.request.get("/api/progress")
    ).json();
    expect(progressAfter.record.document.progress).toEqual(
      progressBefore.record.document.progress,
    );
    await page.reload();
    await expect(editor(page)).toHaveValue(`${writing} I am still working.`);
    await expect(
      page.getByRole("textbox", {
        name: "Question for this block",
        exact: true,
      }),
    ).toHaveValue(question);
    await expect(page.locator(".argument-save-status")).toContainText(
      "This writing is saved to your account",
    );
  });

  test("two tabs preserve both versions through conflict and explicit save as a copy", async ({
    page,
    context,
  }) => {
    const owner = `argument-conflict-${randomUUID()}`;
    await context.setExtraHTTPHeaders(headers(owner));
    await start(page);
    await page
      .getByRole("button", { name: "Save argument", exact: true })
      .click();
    await expect(page.locator(".argument-save-status")).toContainText(
      "This writing is saved to your account",
    );
    const other = await context.newPage();
    await other.goto(`/${targetHash}`);
    await expect(editor(other)).toHaveValue(writing);
    await editor(other).fill(
      "The second tab has an independent local revision.",
    );
    await editor(page).fill("The first tab saves a different revision.");
    await page
      .getByRole("button", { name: "Save argument", exact: true })
      .click();
    await expect(page.locator(".argument-save-status")).toContainText(
      "This writing is saved to your account",
    );
    await other
      .getByRole("button", { name: "Save argument", exact: true })
      .click();
    await expect(other.locator(".argument-save-status")).toHaveAttribute(
      "data-argument-phase",
      "conflict",
    );
    await expect(editor(other)).toHaveValue(
      "The second tab has an independent local revision.",
    );
    await other
      .getByRole("button", { name: "Save my writing as a copy", exact: true })
      .click();
    await expect(other.locator(".argument-save-status")).toContainText(
      "This writing is saved to your account",
    );
    const saved = await readArguments(other, owner);
    expect(
      saved.records
        .filter((record) => record.kind === "supported")
        .map((record) => record.saved.sheet.blocks[0].text)
        .sort(),
    ).toEqual(
      [
        "The first tab saves a different revision.",
        "The second tab has an independent local revision.",
      ].sort(),
    );
    await other.close();
  });
  test("resuming the selected active attempt after Save uses its latest acknowledged revision", async ({
    page,
    context,
  }) => {
    const owner = `argument-resume-${randomUUID()}`;
    await context.setExtraHTTPHeaders(headers(owner));
    await start(page);
    await page
      .getByRole("button", { name: "Save argument", exact: true })
      .click();
    await expect(page.locator(".argument-save-status")).toContainText(
      "This writing is saved",
    );
    await editor(page).fill(
      "The corrected argument must survive this confirmation.",
    );
    await openBackup(page);
    await page
      .getByRole("button", { name: "Resume saved argument", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save current argument", exact: true })
      .click();
    await expect(page.locator(".argument-save-status")).toContainText(
      "This writing is saved",
    );
    await page
      .getByRole("button", {
        name: "Continue with selected argument",
        exact: true,
      })
      .click();
    await expect(page.locator(".argument-confirmation")).toHaveCount(0);
    await expect(editor(page)).toHaveValue(
      "The corrected argument must survive this confirmation.",
    );
    await expect(page.locator(".argument-notice")).toHaveCount(0);
    const saved = await readArguments(page, owner);
    expect(saved.records[0].saved.sheet.blocks[0].text).toBe(
      "The corrected argument must survive this confirmation.",
    );
  });

  test("deletion protects dirty active writing and can free quota space while a different draft remains unsaved", async ({
    page,
    context,
  }) => {
    const owner = `argument-delete-${randomUUID()}`;
    await context.setExtraHTTPHeaders(headers(owner));
    await start(page);
    await page
      .getByRole("button", { name: "Save argument", exact: true })
      .click();
    await expect(page.locator(".argument-save-status")).toContainText(
      "This writing is saved",
    );
    await editor(page).fill("Unfinished changes to this saved argument.");
    await openBackup(page);
    await expect(
      page.getByRole("button", { name: "Delete saved argument", exact: true }),
    ).toBeDisabled();
    await expect(backup(page)).toContainText(
      "Save or discard current changes before deleting this active argument.",
    );
    await page
      .getByRole("button", { name: "New attempt", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Discard unsaved changes and continue",
        exact: true,
      })
      .click();
    await editor(page).fill(
      "A different unsaved argument must remain exportable.",
    );
    await openBackup(page);
    await page
      .getByRole("button", { name: "Delete saved argument", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Delete this saved argument", exact: true })
      .click();
    await expect(page.locator(".argument-save-status")).toContainText(
      "Unsaved changes",
    );
    await expect(editor(page)).toHaveValue(
      "A different unsaved argument must remain exportable.",
    );
    await expect(page.locator(".argument-saved-list")).toHaveCount(0);
    expect((await readArguments(page, owner)).records).toEqual([]);
  });
  test("failed initial argument loading offers a direct reload action", async ({
    page,
    context,
  }) => {
    const owner = `argument-outage-${randomUUID()}`;
    await context.setExtraHTTPHeaders(headers(owner));
    await page.route("**/api/arguments", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "Temporary note storage outage." }),
          })
        : route.continue(),
    );
    await page.goto(`/${targetHash}`);
    await expect(page.locator(".argument-save-status")).toHaveAttribute(
      "data-argument-phase",
      "failed",
    );
    await expect(editor(page)).toHaveCount(0);
    const reload = page.getByRole("button", {
      name: "Reload saved arguments",
      exact: true,
    });
    await expect(reload).toBeEnabled();
    await page.unroute("**/api/arguments");
    await reload.click();
    await expect(editor(page)).toBeVisible();
    await expect(page.locator(".argument-save-status")).toHaveAttribute(
      "data-argument-phase",
      "ready",
    );
  });

  test("a conflict deleting saved A cannot replace unrelated unsaved draft B", async ({
    page,
    context,
  }) => {
    const owner = `argument-delete-conflict-${randomUUID()}`;
    await context.setExtraHTTPHeaders(headers(owner));
    await start(page);
    await page
      .getByRole("button", { name: "Save argument", exact: true })
      .click();
    await expect(page.locator(".argument-save-status")).toContainText(
      "This writing is saved",
    );
    const other = await context.newPage();
    await other.goto(`/${targetHash}`);
    await expect(editor(other)).toHaveValue(writing);
    await page
      .getByRole("button", { name: "New attempt", exact: true })
      .click();
    await editor(page).fill(
      "Draft B is unrelated and must remain unsaved and exportable.",
    );
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    await page.route("**/api/arguments", async (route) => {
      if (
        route.request().method() === "POST" &&
        route.request().postDataJSON().operation.kind === "delete"
      )
        await held;
      await route.continue();
    });
    try {
      await openBackup(page);
      await page
        .getByRole("button", { name: "Delete saved argument", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Delete this saved argument",
          exact: true,
        })
        .click();
      await expect(page.locator(".argument-save-status")).toHaveAttribute(
        "data-argument-phase",
        "saving",
      );
      await editor(other).fill("Saved A changed on another device.");
      await other
        .getByRole("button", { name: "Save argument", exact: true })
        .click();
      await expect(other.locator(".argument-save-status")).toContainText(
        "This writing is saved",
      );
      release();
      await expect(page.locator(".argument-save-status")).toHaveAttribute(
        "data-argument-phase",
        "failed",
      );
      await expect(page.locator(".argument-save-status")).toContainText(
        "selected saved argument changed",
      );
      await expect(
        page.getByRole("button", { name: "Use saved version", exact: true }),
      ).toHaveCount(0);
      await expect(editor(page)).toHaveValue(
        "Draft B is unrelated and must remain unsaved and exportable.",
      );
      await page
        .getByRole("button", { name: "Reload saved arguments", exact: true })
        .click();
      await expect(page.locator(".argument-save-status")).toHaveAttribute(
        "data-argument-phase",
        "ready",
      );
      await expect(editor(page)).toHaveValue(
        "Draft B is unrelated and must remain unsaved and exportable.",
      );
      expect(
        (await readArguments(page, owner)).records[0].saved.sheet.blocks[0]
          .text,
      ).toBe("Saved A changed on another device.");
    } finally {
      release();
      await other.close();
    }
  });
});

test("a consulted reference's experiment button opens its laboratory without losing the argument", async ({
  page,
}) => {
  await page.goto(`/${targetHash}&support=tensor-products`);
  await expect(editor(page)).toBeVisible();
  await editor(page).fill(writing);
  const consultation = page.locator(".argument-consultation");
  await consultation
    .getByRole("button", {
      name: "Read the reference notes and further practice",
      exact: true,
    })
    .click();
  await consultation
    .getByRole("button", { name: "Open experiment", exact: true })
    .click();
  await expect(page).toHaveURL(/support=tensor-products&lab=1$/);
  await expect(
    consultation.locator('[data-machine="tensor-balancing"]'),
  ).toBeVisible();
  await expect(editor(page)).toHaveValue(writing);
  await expect(page.locator("#support-heading")).toBeFocused();
});
