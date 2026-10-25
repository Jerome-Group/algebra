import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";

const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());
const domain = await vite.ssrLoadModule("/lib/algebra/account-progress.ts");
const progress = await vite.ssrLoadModule("/lib/algebra/progress.ts");
const { handleAccountProgress } = await vite.ssrLoadModule(
  "/lib/algebra/account-server.ts",
);
const lessons = JSON.parse(
  readFileSync(new URL("../lib/algebra/lessons.json", import.meta.url)),
);
const units = JSON.parse(
  readFileSync(new URL("../lib/algebra/units.json", import.meta.url)),
);
const registry = progress.assessmentRegistry(lessons);
const id = "foundations-functions:boundaryCheck";
const submit = {
  kind: "submit",
  assessmentId: id,
  assessmentRevision: progress.assessmentRevision(registry[id]),
  choice: registry[id].answer,
};
const apply = (document, operation) =>
  domain.applyAccountOperation(
    document,
    domain.operationSchema.parse(operation),
    registry,
  );

test("complete catalogue, one history copy, reset backup and 64 receipts fit the nontruncating D1 bound", (t) => {
  let document = domain.emptyAccountDocument();
  for (const [assessmentId, assessment] of Object.entries(registry))
    document = apply(document, {
      kind: "submit",
      assessmentId,
      assessmentRevision: progress.assessmentRevision(assessment),
      choice: assessment.answer,
    });
  const completeBytes = domain.serializedBytes(document.progress);
  document.progress.archived = Object.fromEntries(
    Object.entries(document.progress.attempts).map(([key, attempt]) => [
      key,
      [{ ...attempt }],
    ]),
  );
  const historyBytes = domain.serializedBytes(document.progress);
  document = apply(document, { kind: "reset" });
  document = {
    ...document,
    progress: document.previous.data.progress,
    receipts: Array.from({ length: 64 }, (_, index) => ({
      operationId: crypto.randomUUID(),
      payloadHash: "0".repeat(64),
      appliedRevision: index + 1,
    })),
  };
  domain.documentSchema.parse(document);
  const fullRowBytes = domain.serializedBytes(document);
  assert.equal(
    Object.keys(registry).length,
    lessons.length * 3 + units.length + 1,
  );
  assert.ok(fullRowBytes < domain.accountByteLimit);
  assert.ok(domain.accountByteLimit < 2 * 1024 * 1024);
  t.diagnostic(
    JSON.stringify({
      assessments: Object.keys(registry).length,
      completeBytes,
      historyBytes,
      fullRowBytes,
      bound: domain.accountByteLimit,
    }),
  );
});

test("reset and one exact undo increase revisions; every intervening personal write invalidates undo", () => {
  const answered = apply(domain.emptyAccountDocument(), submit);
  const reset = apply(answered, { kind: "reset" });
  assert.equal(reset.revision, 2);
  assert.deepEqual(reset.progress.attempts, {});
  assert.deepEqual(reset.previous.data.progress, answered.progress);
  const restored = apply(reset, { kind: "undo" });
  assert.equal(restored.revision, 3);
  assert.deepEqual(restored.progress, answered.progress);
  assert.equal(restored.previous, null);
  for (const operation of [
    submit,
    { kind: "resume", lessonId: lessons[0].id },
    { kind: "square", element: 2 },
    { kind: "import", legacy: domain.emptyLegacyRecords(), draft: null },
  ]) {
    const changed = apply(reset, operation);
    assert.equal(changed.previous, null);
    assert.throws(() => apply(changed, { kind: "undo" }), /no longer/);
  }
});

test("legacy import keeps account answers, missing current answers and obsolete or conflicting history", () => {
  const account = apply(domain.emptyAccountDocument(), submit);
  const otherId = "foundations-functions:application";
  const current = {
    version: 1,
    attempts: {
      [id]: {
        ...account.progress.attempts[id],
        choice: (registry[id].answer + 1) % registry[id].choices.length,
        submissions: 7,
      },
      [otherId]: {
        revision: progress.assessmentRevision(registry[otherId]),
        choice: registry[otherId].answer,
        submissions: 2,
      },
      retired: { revision: "old", choice: 0, submissions: 1 },
    },
  };
  const records = {
    ...domain.emptyLegacyRecords(),
    [progress.progressStorageKey]: JSON.stringify(current),
    [domain.progressBackupKey]: JSON.stringify({
      version: 1,
      record: JSON.stringify({
        version: 1,
        attempts: {
          obsolete: { revision: "older", choice: 1, submissions: 4 },
        },
      }),
      restoreTarget: "broken",
    }),
    [domain.resumeStorageKey]: lessons[0].id,
    [domain.squareStorageKey]: "7",
  };
  const immutableRaw = JSON.stringify(records);
  const imported = apply(account, {
    kind: "import",
    legacy: records,
    draft: null,
  });
  assert.deepEqual(
    imported.progress.attempts[id],
    account.progress.attempts[id],
  );
  assert.equal(imported.progress.attempts[otherId].submissions, 2);
  assert.equal(imported.progress.archived[id][0].submissions, 7);
  assert.equal(imported.progress.archived.retired[0].revision, "old");
  assert.equal(imported.progress.archived.obsolete[0].revision, "older");
  assert.deepEqual(imported.preferences, {
    resumeLessonId: lessons[0].id,
    squareElement: 7,
  });
  assert.equal(JSON.stringify(records), immutableRaw);
  const repeated = apply(imported, {
    kind: "import",
    legacy: records,
    draft: null,
  });
  assert.deepEqual(repeated.progress, imported.progress);
  const chosen = apply(imported, { kind: "square", element: 2 });
  assert.equal(
    apply(chosen, { kind: "import", legacy: records, draft: null }).preferences
      .squareElement,
    2,
  );
});

test("strict boundaries reject unknown fields, revisions, choices, preferences and future records", () => {
  for (const operation of [
    { ...submit, choice: -1 },
    { ...submit, other: "ignored" },
    { kind: "square", element: 8 },
    { kind: "resume", lessonId: "unknown" },
  ])
    assert.equal(domain.operationSchema.safeParse(operation).success, false);
  for (const operation of [
    { ...submit, assessmentRevision: "stale" },
    { ...submit, choice: 999 },
    { ...submit, assessmentId: "unknown" },
  ])
    assert.throws(
      () => apply(domain.emptyAccountDocument(), operation),
      /changed|invalid/,
    );
  const mutation = {
    operationId: crypto.randomUUID(),
    expectedAccountId: "owned",
    expectedRevision: 0,
    operation: submit,
  };
  assert.equal(
    domain.mutationSchema.safeParse({ ...mutation, owner: "victim" }).success,
    false,
  );
  assert.equal(
    domain.documentSchema.safeParse({
      ...domain.emptyAccountDocument(),
      schemaVersion: 2,
    }).success,
    false,
  );
  const raw = '{"version":9,"attempts":{"unreadable":"kept"}}';
  const records = {
    ...domain.emptyLegacyRecords(),
    [progress.progressStorageKey]: raw,
    [domain.progressBackupKey]: "{broken",
    [domain.squareStorageKey]: "9",
  };
  const preview = domain.legacyPreview(records, registry);
  assert.equal(preview.candidates.length, 0);
  assert.equal(records[progress.progressStorageKey], raw);
  assert.match(preview.statuses[0].status, /export only/);
});

test("an originating-account mismatch rejects before database access even when storage is unavailable", async () => {
  const request = new Request("https://algebra.example/api/progress", {
    method: "POST",
    headers: {
      Origin: "https://algebra.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operationId: crypto.randomUUID(),
      expectedAccountId: "originating-A",
      expectedRevision: 0,
      operation: submit,
    }),
  });
  const response = await handleAccountProgress({
    request,
    user: {
      id: "current-B",
      email: "display@example.test",
      displayName: "B",
      fullName: null,
    },
    db: undefined,
    registry,
  });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "account_changed");
  assert.match(response.headers.get("cache-control"), /private, no-store/);
});

test("rejected uploads cancel beyond the discard byte and time budgets", async (t) => {
  for (const [name, firstChunkBytes, cancellationStalls] of [
    ["byte budget", domain.accountByteLimit * 2 + 1, false],
    ["stalled upload and cancellation", 1, true],
  ])
    await t.test(name, { timeout: 5000 }, async () => {
      let cancelled = false;
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(firstChunkBytes));
        },
        cancel() {
          cancelled = true;
          if (cancellationStalls) return new Promise(() => {});
        },
      });
      const response = await handleAccountProgress({
        request: new Request("https://algebra.example/api/progress", {
          method: "POST",
          body,
          duplex: "half",
        }),
        user: null,
        db: undefined,
        registry,
      });
      assert.equal(response.status, 401);
      assert.equal(cancelled, true);
      assert.match(response.headers.get("cache-control"), /private, no-store/);
    });
});

test("raw forbidden progress keys fail at every saved and imported boundary", async () => {
  const attempt = { revision: "retained", choice: 0, submissions: 1 };
  for (const field of ["attempts", "archived"])
    for (const key of ["__proto__", "prototype", "constructor"]) {
      const raw = JSON.parse(
        `{"version":1,"attempts":{},"${field}":{${JSON.stringify(key)}:${JSON.stringify(field === "attempts" ? attempt : [attempt])}}}`,
      );
      assert.equal(Object.hasOwn(raw[field], key), true);
      const data = { ...domain.emptyAccountData(), progress: raw };
      const document = { ...domain.emptyAccountDocument(), progress: raw };
      const operation = {
        kind: "import",
        legacy: domain.emptyLegacyRecords(),
        draft: data,
      };
      const mutation = {
        operationId: crypto.randomUUID(),
        expectedAccountId: "owner",
        expectedRevision: 0,
        operation,
      };
      for (const [schema, input] of [
        [domain.progressSchema, raw],
        [domain.accountDataSchema, data],
        [domain.documentSchema, document],
        [
          domain.documentSchema,
          {
            ...domain.emptyAccountDocument(),
            previous: { data, restorableAt: 0 },
          },
        ],
        [domain.operationSchema, operation],
        [domain.mutationSchema, mutation],
        [
          domain.accountResponseSchema,
          {
            kind: "account",
            user: { id: "owner", displayName: "Fixture", email: "" },
            record: { kind: "supported", document },
          },
        ],
      ])
        assert.equal(schema.safeParse(input).success, false, `${field}/${key}`);
      const response = await handleAccountProgress({
        request: new Request("https://algebra.example/api/progress", {
          method: "POST",
          headers: {
            Origin: "https://algebra.example",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mutation),
        }),
        user: {
          id: "owner",
          displayName: "Fixture",
          email: "",
          fullName: null,
        },
        db: undefined,
        registry,
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: "Unsupported account request.",
      });
      assert.equal(Object.hasOwn(raw[field], key), true);
    }
});

test("account operation identifiers preserve arbitrary hexadecimal GUID bytes", () => {
  const document = domain.emptyAccountDocument();
  const ids = [
    "00000000-0000-0000-0000-000000000000",
    "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
  ];
  for (const version of "0123456789abcdef")
    for (const variant of "0123456789abcdef")
      ids.push(`01234567-89ab-${version}def-${variant}123-456789abcdef`);
  for (const operationId of ids) {
    const receipt = {
      operationId,
      payloadHash: "a".repeat(64),
      appliedRevision: 0,
    };
    assert.equal(
      domain.documentSchema.parse({ ...document, receipts: [receipt] })
        .receipts[0].operationId,
      operationId,
    );
    assert.equal(
      domain.mutationSchema.parse({
        operationId,
        expectedAccountId: "owner",
        expectedRevision: 0,
        operation: { kind: "reset" },
      }).operationId,
      operationId,
    );
    assert.equal(
      domain.accountResponseSchema.parse({
        kind: "account",
        user: { id: "owner", displayName: "Fixture", email: "" },
        record: { kind: "supported", document },
        acknowledgement: { operationId, appliedRevision: 0 },
      }).acknowledgement.operationId,
      operationId,
    );
  }
  for (const operationId of [
    "wrong",
    `${ids[0]}\n`,
    ` ${ids[0]}`,
    ids[0].replaceAll("-", ""),
  ])
    assert.equal(
      domain.mutationSchema.safeParse({
        operationId,
        expectedAccountId: "owner",
        expectedRevision: 0,
        operation: { kind: "reset" },
      }).success,
      false,
    );
});
