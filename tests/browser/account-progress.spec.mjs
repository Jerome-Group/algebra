import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

const guides = JSON.parse(
  readFileSync(
    new URL("../../lib/algebra/guided-lessons.json", import.meta.url),
  ),
);
const lessonId = "foundations-functions";
const id = `${lessonId}:boundaryCheck`;
const headers = (owner) => ({
  "oai-authenticated-user-id": owner,
  "oai-authenticated-user-email": `${owner}@local.example.test`,
});
const submit = (field = "boundaryCheck", correct = true) => {
  const question = guides[lessonId][field];
  return {
    kind: "submit",
    assessmentId: `${lessonId}:${field}`,
    assessmentRevision: JSON.stringify(question),
    choice: correct
      ? question.answer
      : (question.answer + 1) % question.choices.length,
  };
};
const mutation = (owner, revision, operation) => ({
  operationId: randomUUID(),
  expectedAccountId: owner,
  expectedRevision: revision,
  operation,
});
async function post(request, baseURL, owner, body, overrides = {}) {
  return request.post("/api/progress", {
    headers: {
      ...headers(owner),
      Origin: new URL(baseURL).origin,
      "Content-Type": "application/json",
      ...overrides,
    },
    data: JSON.stringify(body),
  });
}
async function state(request, owner) {
  const response = await request.get("/api/progress", {
    headers: headers(owner),
  });
  expect(response.status()).toBe(200);
  const value = await response.json();
  expect(value.kind).toBe("account");
  return value.record.document;
}
async function answer(page, field = "boundaryCheck") {
  const checkpoint = page
    .locator(".guided-reader .learning-checkpoint")
    .nth(
      ["prerequisiteCheck", "boundaryCheck", "application", "transfer"].indexOf(
        field,
      ),
    );
  await checkpoint
    .getByRole("radio")
    .nth(guides[lessonId][field].answer)
    .check();
  await checkpoint.getByRole("button", { name: "Check reasoning" }).click();
}

test.describe("local built Worker and real D1 with synthetic trusted Sites headers", () => {
  test.beforeEach(async ({ baseURL }, testInfo) => {
    test.skip(
      process.env.ALGEBRA_ACCOUNT_FIXTURE !== "1" ||
        !["127.0.0.1", "localhost", "[::1]"].includes(
          new URL(baseURL).hostname,
        ),
      "Requires an explicitly owned loopback Worker/D1 fixture. This does not prove hosted provider sign-in or gateway header stripping.",
    );
    testInfo.annotations.push({
      type: "identity",
      description:
        "Local synthetic trusted-header fixture. No provider sign-in proof.",
    });
  });

  test("public reading, missing identity, owner preconditions and strict validation protect private state", async ({
    page,
    request,
    baseURL,
  }) => {
    const owner = `validation-${randomUUID()}`;
    const guest = await request.get("/api/progress");
    expect(await guest.json()).toEqual({ kind: "guest" });
    expect(guest.headers()["cache-control"]).toContain("private, no-store");
    expect((await request.post("/api/progress", { data: {} })).status()).toBe(
      401,
    );
    for (const incomplete of [
      { "oai-authenticated-user-email": "display@example.test" },
      { "oai-authenticated-user-id": owner },
    ])
      expect(
        await (
          await request.get("/api/progress", { headers: incomplete })
        ).json(),
      ).toEqual({ kind: "guest" });
    expect((await state(request, owner)).revision).toBe(0);
    const body = mutation(owner, 0, submit());
    for (const [invalid, status] of [
      [{ ...body, owner: "victim" }, 400],
      [{ ...body, expectedAccountId: "other-account" }, 409],
      [
        { ...body, operation: { ...submit(), assessmentRevision: "stale" } },
        422,
      ],
      [{ ...body, operation: { ...submit(), choice: 99 } }, 422],
      [{ ...body, operation: { kind: "square", element: 8 } }, 400],
      [{ ...body, operation: { kind: "resume", lessonId: "unknown" } }, 400],
    ])
      expect((await post(request, baseURL, owner, invalid)).status()).toBe(
        status,
      );
    expect(
      (
        await post(request, baseURL, owner, body, {
          Origin: "https://different.example",
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await post(request, baseURL, owner, body, {
          "Content-Type": "text/plain",
        })
      ).status(),
    ).toBe(415);
    for (const [bytes, extraHeaders, expectedStatus] of [
      [1_900_001, headers(owner), 413],
      [3_000_000, headers(owner), 413],
      [3_000_000, {}, 401],
      [
        3_000_000,
        { ...headers(owner), Origin: "https://different.example" },
        403,
      ],
      [3_000_000, { ...headers(owner), "Content-Type": "text/plain" }, 415],
    ])
      expect(
        (
          await request.post("/api/progress", {
            headers: {
              Origin: new URL(baseURL).origin,
              "Content-Type": "application/json",
              ...extraHeaders,
            },
            data: " ".repeat(bytes),
          })
        ).status(),
      ).toBe(expectedStatus);
    expect((await state(request, owner)).revision).toBe(0);
    await page.goto(`/#${lessonId}`);
    await expect(page.locator("#lesson-heading")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign in with ChatGPT" }),
    ).toHaveAttribute("target", "_top");
  });

  test("CAS, retries, bounded receipt eviction, isolation, reset and undo use real D1", async ({
    request,
    baseURL,
  }) => {
    const owner = `cas-${randomUUID()}`;
    const first = mutation(owner, 0, submit());
    const second = mutation(owner, 0, submit("application"));
    const responses = await Promise.all([
      post(request, baseURL, owner, first),
      post(request, baseURL, owner, second),
    ]);
    expect(responses.map((response) => response.status()).sort()).toEqual([
      200, 409,
    ]);
    const winner = responses[0].ok() ? first : second;
    let saved = await state(request, owner);
    expect(saved.revision).toBe(1);
    const retry = await post(request, baseURL, owner, winner);
    expect(retry.status()).toBe(200);
    expect((await retry.json()).acknowledgement.appliedRevision).toBe(1);
    expect((await state(request, owner)).revision).toBe(1);
    expect(
      (
        await post(request, baseURL, owner, {
          ...winner,
          operation: { kind: "square", element: 4 },
        })
      ).status(),
    ).toBe(409);
    const other = `other-${randomUUID()}`;
    expect((await state(request, other)).progress.attempts).toEqual({});
    expect((await post(request, baseURL, other, winner)).status()).toBe(409);
    expect((await state(request, other)).revision).toBe(0);
    for (let index = 0; index < 65; index++) {
      const response = await post(
        request,
        baseURL,
        owner,
        mutation(owner, saved.revision, { kind: "square", element: index % 8 }),
      );
      expect(response.status()).toBe(200);
      saved = (await response.json()).record.document;
      if (index === 0) {
        const earlierReceipt = await post(request, baseURL, owner, winner);
        expect(earlierReceipt.status()).toBe(200);
        const acknowledged = await earlierReceipt.json();
        expect(acknowledged.acknowledgement.appliedRevision).toBe(1);
        expect(acknowledged.record.document.revision).toBe(2);
      }
    }
    expect(saved.receipts).toHaveLength(64);
    expect((await post(request, baseURL, owner, winner)).status()).toBe(409);
    expect(
      (await state(request, owner)).progress.attempts[
        winner.operation.assessmentId
      ].submissions,
    ).toBe(1);
    const resetResponse = await post(
      request,
      baseURL,
      owner,
      mutation(owner, saved.revision, { kind: "reset" }),
    );
    const reset = (await resetResponse.json()).record.document;
    expect(reset.revision).toBe(saved.revision + 1);
    expect(reset.progress.attempts).toEqual({});
    const restoreResponse = await post(
      request,
      baseURL,
      owner,
      mutation(owner, reset.revision, { kind: "undo" }),
    );
    const restored = (await restoreResponse.json()).record.document;
    expect(restored.revision).toBe(reset.revision + 1);
    expect(restored.progress).toEqual(saved.progress);
    const resetAgain = (
      await (
        await post(
          request,
          baseURL,
          owner,
          mutation(owner, restored.revision, { kind: "reset" }),
        )
      ).json()
    ).record.document;
    const intervening = (
      await (
        await post(
          request,
          baseURL,
          owner,
          mutation(owner, resetAgain.revision, { kind: "resume", lessonId }),
        )
      ).json()
    ).record.document;
    expect(
      (
        await post(
          request,
          baseURL,
          owner,
          mutation(owner, intervening.revision, { kind: "undo" }),
        )
      ).status(),
    ).toBe(422);
    expect((await state(request, owner)).revision).toBe(intervening.revision);
  });

  test("explicit legacy preview/import preserves bytes, account conflicts, history and preferences across browsers", async ({
    page,
    context,
    browser,
    request,
    baseURL,
  }) => {
    const owner = `import-${randomUUID()}`;
    await context.setExtraHTTPHeaders(headers(owner));
    expect(
      (
        await post(
          request,
          baseURL,
          owner,
          mutation(owner, 0, submit("boundaryCheck", false)),
        )
      ).status(),
    ).toBe(200);
    const existing = await state(request, owner);
    const current = {
      version: 1,
      attempts: {
        [id]: {
          revision: submit().assessmentRevision,
          choice: submit().choice,
          submissions: 9,
        },
        [`${lessonId}:application`]: {
          revision: submit("application").assessmentRevision,
          choice: submit("application").choice,
          submissions: 2,
        },
        retired: { revision: "previous assessment", choice: 0, submissions: 3 },
      },
    };
    const records = {
      "algebra-competency-progress-v1": JSON.stringify(current),
      "algebra-competency-progress-v1-backup":
        '{ "version":9, "exact":"raw backup preserved" }',
      "algebra-resume-v1": "foundations-fibers",
      "algebra-ureca-square-element-v1": "7",
    };
    await page.addInitScript((values) => {
      for (const [key, value] of Object.entries(values))
        localStorage.setItem(key, value);
    }, records);
    await page.goto("/#home");
    await expect(page.locator("[data-account-phase]")).toHaveAttribute(
      "data-account-phase",
      "ready",
    );
    await expect(page.locator(".device-progress progress")).toHaveAttribute(
      "value",
      "0",
    );
    expect((await state(request, owner)).revision).toBe(existing.revision);
    await page
      .getByRole("button", { name: "Preview legacy browser records" })
      .click();
    await expect(
      page.getByRole("region", { name: "Legacy import preview" }),
    ).toContainText("export only");
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export progress backup" }).click();
    const exported = JSON.parse(
      await readFile(await (await downloading).path(), "utf8"),
    );
    expect(exported.rawLegacyRecords).toEqual(records);
    expect(exported.acknowledgedAccountState.revision).toBe(existing.revision);
    await expect(page.locator("[data-account-phase]")).toHaveAttribute(
      "data-account-phase",
      "ready",
    );
    await page
      .getByRole("button", { name: "Import preview into this account" })
      .click();
    await expect(page.locator(".device-progress progress")).toHaveAttribute(
      "value",
      "1",
    );
    let imported = await state(request, owner);
    expect(imported.progress.attempts[id]).toEqual(
      existing.progress.attempts[id],
    );
    expect(imported.progress.archived[id][0].submissions).toBe(9);
    expect(imported.progress.archived.retired[0].revision).toBe(
      "previous assessment",
    );
    expect(imported.preferences).toEqual({
      resumeLessonId: "foundations-fibers",
      squareElement: 7,
    });
    expect(
      await page.evaluate(
        (keys) =>
          Object.fromEntries(
            keys.map((key) => [key, localStorage.getItem(key)]),
          ),
        Object.keys(records),
      ),
    ).toEqual(records);
    const independent = await browser.newContext({
      baseURL,
      extraHTTPHeaders: headers(owner),
    });
    try {
      const device = await independent.newPage();
      await device.goto("/#home");
      await expect(device.locator(".device-progress progress")).toHaveAttribute(
        "value",
        "1",
      );
      await expect(
        device.getByRole("button", { name: /Return to.*Fibers/i }),
      ).toBeVisible();
      await device.evaluate(() => {
        location.hash = "#route-ureca-representation-theory";
      });
      await expect(
        device.getByRole("combobox", {
          name: /Same representation, selected element/,
        }),
      ).toHaveValue("7");
      await device
        .getByRole("combobox", {
          name: /Same representation, selected element/,
        })
        .selectOption("3");
      await expect(device.locator("[data-account-phase]")).toHaveAttribute(
        "data-account-phase",
        "ready",
      );
      imported = await state(request, owner);
      expect(imported.preferences.squareElement).toBe(3);
    } finally {
      await independent.close();
    }
    await page.reload();
    await expect(page.locator(".device-progress progress")).toHaveAttribute(
      "value",
      "1",
    );
    await page.getByRole("button", { name: "Reset learning progress" }).click();
    await page.getByRole("button", { name: "Clear my progress" }).click();
    await expect(page.locator(".device-progress progress")).toHaveAttribute(
      "value",
      "0",
    );
    await page.reload();
    await page
      .getByRole("button", { name: "Restore previous progress" })
      .click();
    await expect(page.locator(".device-progress progress")).toHaveAttribute(
      "value",
      "1",
    );
  });

  test("lost acknowledgement retains unsaved feedback and retry acknowledges one stored attempt", async ({
    page,
    context,
    request,
  }) => {
    const owner = `delivery-${randomUUID()}`;
    await context.setExtraHTTPHeaders(headers(owner));
    await page.goto(`/#${lessonId}`);
    await expect(page.locator("[data-account-phase]")).toHaveAttribute(
      "data-account-phase",
      "ready",
    );
    await expect
      .poll(
        async () => (await state(request, owner)).preferences.resumeLessonId,
      )
      .toBe(lessonId);
    let drop = true;
    const bodies = [];
    await page.route("**/api/progress", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      bodies.push(route.request().postData());
      if (drop) {
        drop = false;
        const committed = await route.fetch();
        expect(committed.status()).toBe(200);
        return route.abort("failed");
      }
      return route.continue();
    });
    await answer(page);
    await expect(page.locator("[data-account-phase]")).toHaveAttribute(
      "data-account-phase",
      "failed",
    );
    await expect(
      page.locator(".guided-reader .competency-progress"),
    ).toContainText("0 of 3");
    await expect(
      page.locator(".guided-reader .learning-checkpoint").nth(1),
    ).toContainText("Correct.");
    await expect(
      page.getByRole("complementary", { name: "Account progress" }),
    ).toContainText("unknown");
    await page.getByRole("button", { name: "Retry loading or saving" }).click();
    await expect(
      page.locator(".guided-reader .competency-progress"),
    ).toContainText("1 of 3");
    expect(bodies[1]).toBe(bodies[0]);
    expect(
      (await state(request, owner)).progress.attempts[id].submissions,
    ).toBe(1);
    await context.setExtraHTTPHeaders(headers(`switched-${randomUUID()}`));
    await page
      .getByRole("button", { name: "Refresh account progress" })
      .click();
    await expect(
      page.locator(".guided-reader .competency-progress"),
    ).toContainText("0 of 3");
    await expect(page.locator(".saved-checkpoint")).toHaveCount(0);
  });
});
