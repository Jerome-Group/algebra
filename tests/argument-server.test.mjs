import test, { after } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createServer } from "vite";

const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());
const domain = await vite.ssrLoadModule("/lib/algebra/argument-records.ts");
const { handleArguments } = await vite.ssrLoadModule(
  "/lib/algebra/argument-server.ts",
);
const { handleAccountProgress } = await vite.ssrLoadModule(
  "/lib/algebra/account-server.ts",
);
const oldProgress = await vite.ssrLoadModule(
  "/lib/algebra/account-progress.ts",
);
const edition = await domain.teachingEdition("foundations-functions");
const owner = (id = "A") => ({
  id,
  email: `${id}@example.test`,
  displayName: id,
  fullName: null,
});
const sheet = (id = crypto.randomUUID(), text = "Proof in my own words") => ({
  version: 1,
  id,
  lessonId: edition.lessonId,
  unitId: "functions",
  edition,
  blocks: [
    { id: "b-1", text, question: "Why?", review: "unreviewed", reference: 0 },
  ],
  activeBlockId: "b-1",
});
const mutation = (record, expectedRevision = 0) => ({
  operationId: crypto.randomUUID(),
  expectedAccountId: "A",
  createdAt: Date.now(),
  operation: { kind: "put", sheet: record, expectedRevision },
});
function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of ["0000_account_progress.sql", "0001_argument_records.sql"])
    sqlite.exec(
      readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"),
    );
  const statement = (sql, params = []) => ({
    bind: (...values) => statement(sql, values),
    first: async () => sqlite.prepare(sql).get(...params) ?? null,
    execute() {
      const prepared = sqlite.prepare(sql);
      if (/^\s*SELECT/i.test(sql))
        return {
          success: true,
          results: prepared.all(...params),
          meta: { changes: 0 },
        };
      return {
        success: true,
        results: [],
        meta: { changes: Number(prepared.run(...params).changes) },
      };
    },
    async run() {
      return this.execute();
    },
  });
  const db = {
    prepare: statement,
    batch: async (statements) => {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map((entry) => entry.execute());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return { db, sqlite, close: () => sqlite.close() };
}
async function call(
  db,
  body,
  {
    user = owner(),
    method = body ? "POST" : "GET",
    origin = "https://algebra.example",
    type = "application/json",
    capturedOwner = "A",
    time,
  } = {},
) {
  const headers = {
    "X-Expected-Account-Id": capturedOwner,
    Origin: origin,
    "Content-Type": type,
  };
  const response = await handleArguments({
    request: new Request("https://algebra.example/api/arguments", {
      method,
      headers,
      ...(body
        ? { body: typeof body === "string" ? body : JSON.stringify(body) }
        : {}),
    }),
    user,
    db,
    ...(time === undefined ? {} : { now: () => time }),
  });
  assert.match(response.headers.get("cache-control"), /private, no-store/);
  return { response, body: await response.json() };
}

test("owner-bound CAS retains concurrent versions, exact receipts acknowledge once, reused IDs reject", async (t) => {
  const { db, sqlite, close } = fixture();
  t.after(close);
  const initial = sheet();
  const first = mutation(initial);
  const saved = await call(db, first);
  assert.equal(saved.response.status, 200);
  assert.equal(saved.body.acknowledgement.revision, 1);
  const duplicate = await call(db, first);
  assert.deepEqual(duplicate.body, saved.body);
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) AS count FROM argument_receipts").get()
      .count,
    1,
  );
  assert.equal(
    (
      await call(db, {
        ...first,
        operation: {
          ...first.operation,
          sheet: sheet(initial.id, "different"),
        },
      })
    ).response.status,
    409,
  );
  const one = mutation(sheet(initial.id, "tab one"), 1);
  const two = mutation(sheet(initial.id, "tab two"), 1);
  const results = await Promise.all([call(db, one), call(db, two)]);
  assert.deepEqual(
    results.map((entry) => entry.response.status).sort(),
    [200, 409],
  );
  const latest = await call(db);
  assert.equal(latest.body.records[0].saved.revision, 2);
  assert.equal(
    (await call(db, mutation(sheet(), 0), { user: owner("B") })).body.code,
    "account_changed",
  );
  assert.equal(
    (await call(db, null, { capturedOwner: "B" })).body.code,
    "account_changed",
  );
  const b = await call(db, null, { user: owner("B"), capturedOwner: "B" });
  assert.deepEqual(b.body.records, []);
});

test("receipts survive deletion, expired retries cannot recreate after bounded receipt cleanup", async (t) => {
  const { db, sqlite, close } = fixture();
  t.after(close);
  const initial = mutation(sheet());
  const time = initial.createdAt;
  assert.equal((await call(db, initial, { time })).response.status, 200);
  const deletion = {
    operationId: crypto.randomUUID(),
    expectedAccountId: "A",
    createdAt: time,
    operation: {
      kind: "delete",
      id: initial.operation.sheet.id,
      expectedRevision: 1,
    },
  };
  assert.equal((await call(db, deletion, { time })).response.status, 200);
  assert.equal(
    (await call(db, initial, { time })).body.acknowledgement.revision,
    1,
  );
  assert.deepEqual((await call(db)).body.records, []);
  const future = time + domain.argumentLimits.receiptLifetimeMs + 1;
  const unrelated = mutation(sheet());
  unrelated.createdAt = future;
  assert.equal(
    (await call(db, unrelated, { time: future })).response.status,
    200,
  );
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) AS count FROM argument_receipts").get()
      .count,
    1,
  );
  assert.equal(
    (await call(db, initial, { time: future })).response.status,
    422,
  );
  assert.equal(
    (await call(db, deletion, { time: future })).response.status,
    422,
  );
  assert.equal((await call(db)).body.records.length, 1);
});

test("separate quotas, malformed/newer rows and additive migration preserve old progress clients", async (t) => {
  const { db, sqlite, close } = fixture();
  t.after(close);
  const old = oldProgress.emptyAccountDocument();
  sqlite
    .prepare("INSERT INTO account_progress VALUES (?, ?, ?)")
    .run("A", 0, JSON.stringify(old));
  const before = sqlite
    .prepare("SELECT document FROM account_progress WHERE owner = 'A'")
    .get().document;
  const insert = sqlite.prepare(
    "INSERT INTO argument_records VALUES (?, ?, ?, ?)",
  );
  for (let index = 0; index < domain.argumentLimits.records; index++) {
    const record = sheet(`note-${index}`);
    insert.run("A", record.id, 1, JSON.stringify(record));
  }
  const quota = await call(db, mutation(sheet()));
  assert.equal(quota.response.status, 413);
  assert.match(quota.body.error, /quota/);
  assert.equal(
    sqlite
      .prepare("SELECT document FROM account_progress WHERE owner = 'A'")
      .get().document,
    before,
  );
  const request = new Request("https://algebra.example/api/progress", {
    method: "POST",
    headers: {
      Origin: "https://algebra.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operationId: crypto.randomUUID(),
      expectedAccountId: "A",
      expectedRevision: 0,
      operation: { kind: "reset" },
    }),
  });
  const oldClient = await handleAccountProgress({
    request,
    user: owner(),
    db,
    registry: {},
  });
  assert.equal(oldClient.status, 200);
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) AS count FROM argument_records").get()
      .count,
    domain.argumentLimits.records,
  );
  const futureRaw = '{"version":99,"private":"exact writing"}';
  sqlite
    .prepare("UPDATE argument_records SET sheet = ? WHERE id = 'note-0'")
    .run(futureRaw);
  const preserved = await call(db);
  assert.equal(preserved.body.records[0].kind, "unsupported");
  assert.equal(preserved.body.records[0].raw, futureRaw);
  assert.equal(
    (await call(db, mutation(sheet("note-0"), 1))).response.status,
    422,
  );
  assert.equal(
    sqlite
      .prepare("SELECT sheet FROM argument_records WHERE id = 'note-0'")
      .get().sheet,
    futureRaw,
  );
});

test("strict request boundary rejects forged editions, origins, body limits, unknown fields and absent storage", async (t) => {
  const { db, close } = fixture();
  t.after(close);
  const input = mutation(sheet());
  assert.equal((await call(db, input, { user: null })).response.status, 401);
  assert.equal(
    (await call(db, input, { origin: "https://foreign.example" })).response
      .status,
    403,
  );
  assert.equal(
    (await call(db, input, { type: "text/plain" })).response.status,
    415,
  );
  assert.equal(
    (await call(db, { ...input, owner: "victim" })).response.status,
    400,
  );
  assert.equal(
    (await call(db, " ".repeat(domain.argumentLimits.requestBytes + 1)))
      .response.status,
    413,
  );
  const forged = mutation({
    ...input.operation.sheet,
    edition: { ...edition, objects: "invented current teaching" },
  });
  assert.equal((await call(db, forged)).response.status, 422);
  assert.equal((await call(undefined, input)).response.status, 503);
  assert.equal(
    (await call(undefined, input, { user: owner("B") })).response.status,
    409,
  );
});

test("4096 live receipts bound storage, expired receipts free capacity without allowing an old mutation", async (t) => {
  const { db, sqlite, close } = fixture();
  t.after(close);
  const time = Date.now();
  const insert = sqlite.prepare(
    "INSERT INTO argument_receipts VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  for (let index = 0; index < domain.argumentLimits.receipts; index++)
    insert.run(
      "A",
      crypto.randomUUID(),
      "0".repeat(64),
      "old",
      1,
      "put",
      time + 1000,
    );
  const input = mutation(sheet());
  input.createdAt = time;
  assert.equal((await call(db, input, { time })).response.status, 429);
  assert.equal(
    (await call(db, input, { time: time + 1001 })).response.status,
    200,
  );
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) AS count FROM argument_receipts").get()
      .count,
    1,
  );
});

test("aggregate byte limits and simultaneous last-slot writes never evict records or overshoot quota", async (t) => {
  await t.test("atomic final slot", async (t) => {
    const { db, sqlite, close } = fixture();
    t.after(close);
    const insert = sqlite.prepare(
      "INSERT INTO argument_records VALUES (?, ?, ?, ?)",
    );
    for (let index = 0; index < domain.argumentLimits.records - 1; index++) {
      const record = sheet(`existing-${index}`);
      insert.run("A", record.id, 1, JSON.stringify(record));
    }
    const results = await Promise.all([
      call(db, mutation(sheet())),
      call(db, mutation(sheet())),
    ]);
    assert.deepEqual(
      results.map((entry) => entry.response.status).sort(),
      [200, 413],
    );
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM argument_records").get()
        .count,
      domain.argumentLimits.records,
    );
  });
  await t.test("complete serialized byte quota", async (t) => {
    const { db, sqlite, close } = fixture();
    t.after(close);
    const large = sheet();
    large.blocks = Array.from({ length: 6 }, (_, index) => ({
      ...large.blocks[0],
      id: `large-${index}`,
      text: "x".repeat(15 * 1024),
    }));
    large.activeBlockId = "large-0";
    assert.equal(domain.argumentSheetSchema.safeParse(large).success, true);
    const bytes = domain.argumentBytes(large);
    const count = Math.floor(domain.argumentLimits.accountBytes / bytes);
    const insert = sqlite.prepare(
      "INSERT INTO argument_records VALUES (?, ?, ?, ?)",
    );
    for (let index = 0; index < count; index++) {
      const record = { ...large, id: `large-sheet-${index}` };
      insert.run("A", record.id, 1, JSON.stringify(record));
    }
    const before = sqlite
      .prepare(
        "SELECT SUM(length(CAST(sheet AS BLOB))) AS bytes FROM argument_records",
      )
      .get().bytes;
    const result = await call(db, mutation(large));
    assert.equal(result.response.status, 413);
    assert.equal(
      sqlite
        .prepare(
          "SELECT SUM(length(CAST(sheet AS BLOB))) AS bytes FROM argument_records",
        )
        .get().bytes,
      before,
    );
  });
});

test("delete and same-ID recreation cannot accept a stale prior-incarnation update, including after receipt expiry", async (t) => {
  for (const delay of [0, domain.argumentLimits.receiptLifetimeMs + 1])
    await t.test(`recreate after ${delay}ms`, async (t) => {
      const { db, close } = fixture();
      t.after(close);
      const first = mutation(sheet("reused-note", "first incarnation"));
      const time = first.createdAt;
      assert.equal((await call(db, first, { time })).response.status, 200);
      const deletion = {
        operationId: crypto.randomUUID(),
        expectedAccountId: "A",
        createdAt: time,
        operation: { kind: "delete", id: "reused-note", expectedRevision: 1 },
      };
      assert.equal((await call(db, deletion, { time })).response.status, 200);
      const recreated = mutation(sheet("reused-note", "new incarnation"));
      recreated.createdAt = time + delay;
      const recreatedResponse = await call(db, recreated, {
        time: time + delay,
      });
      assert.equal(recreatedResponse.response.status, 200);
      const stale = mutation(
        sheet("reused-note", "stale old-tab overwrite"),
        1,
      );
      stale.createdAt = time + delay;
      const rejected = await call(db, stale, { time: time + delay });
      assert.equal(rejected.response.status, 409);
      assert.equal(recreatedResponse.body.acknowledgement.revision, 3);
      assert.equal(
        rejected.body.records[0].saved.sheet.blocks[0].text,
        "new incarnation",
      );
    });
});

test("exhausted owner CAS returns retryable contention for distinct records and exact retry applies once", async (t) => {
  const { db, sqlite, close } = fixture();
  t.after(close);
  const mutations = Array.from({ length: 5 }, () => mutation(sheet()));
  const results = await Promise.all(mutations.map((entry) => call(db, entry)));
  const contended = results.flatMap((result, index) =>
    result.response.status === 200
      ? []
      : [{ result, request: mutations[index] }],
  );
  assert.ok(contended.length > 0);
  for (const { result, request } of contended) {
    assert.equal(result.response.status, 503);
    assert.match(result.body.error, /retry the same save/);
    const retried = await call(db, request);
    assert.equal(retried.response.status, 200);
    assert.equal(retried.body.acknowledgement.operationId, request.operationId);
    assert.equal(
      retried.body.acknowledgement.payloadHash,
      await domain.argumentDigest(domain.argumentMutationSchema.parse(request)),
    );
    assert.equal(
      (await call(db, request)).body.acknowledgement.revision,
      retried.body.acknowledgement.revision,
    );
  }
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) AS count FROM argument_records").get()
      .count,
    5,
  );
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) AS count FROM argument_receipts").get()
      .count,
    5,
  );
});
