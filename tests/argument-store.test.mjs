import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());
const { accountProgressStore } = await vite.ssrLoadModule(
  "/lib/algebra/account-store.ts",
);
const domain = await vite.ssrLoadModule("/lib/algebra/argument-records.ts");
const progress = await vite.ssrLoadModule("/lib/algebra/account-progress.ts");
const tick = () => new Promise((resolve) => setImmediate(resolve));
const account = (id = "A") => ({
  kind: "account",
  user: { id, email: `${id}@example.test`, displayName: id },
  record: { kind: "supported", document: progress.emptyAccountDocument() },
});
const notes = (id = "A", saved = [], extra = {}) => ({
  kind: "account",
  accountId: id,
  records: saved.map((record) => ({ kind: "supported", saved: record })),
  ...extra,
});
function fixture() {
  const requests = [];
  const store = accountProgressStore({
    registry: {},
    readLegacy: () => ({
      records: progress.emptyLegacyRecords(),
      unreadableKeys: [],
    }),
    fetcher: (url, init) =>
      new Promise((resolve, reject) =>
        requests.push({
          url,
          init,
          reject,
          resolve: (body, status = 200) =>
            resolve(Response.json(body, { status })),
        }),
      ),
  });
  return { store, arguments: store.arguments, requests };
}
async function signedIn(saved = []) {
  const fixtureState = fixture();
  const loading = fixtureState.store.load();
  fixtureState.requests[0].resolve(account());
  await loading;
  fixtureState.requests[1].resolve(notes("A", saved));
  await tick();
  assert.equal(fixtureState.arguments.getSnapshot().phase, "ready");
  assert.equal(fixtureState.arguments.getSnapshot().canRetry, false);
  return fixtureState;
}
async function draft(resource, text = "initial proof") {
  await resource.start("foundations-functions", "functions");
  const active = resource.getSnapshot().active;
  resource.edit({ ...active, blocks: [{ ...active.blocks[0], text }] });
  return resource.getSnapshot().active;
}
async function acknowledgement(request, saved = [], appliedRevision) {
  const mutation = JSON.parse(request.init.body);
  const operation = mutation.operation;
  const recordId = operation.kind === "put" ? operation.sheet.id : operation.id;
  const revision = appliedRevision ?? operation.expectedRevision + 1;
  const record =
    operation.kind === "put" ? { sheet: operation.sheet, revision } : null;
  return notes(
    mutation.expectedAccountId,
    record
      ? [...saved.filter((entry) => entry.sheet.id !== recordId), record]
      : saved.filter((entry) => entry.sheet.id !== recordId),
    {
      acknowledgement: {
        operationId: mutation.operationId,
        payloadHash: await domain.argumentDigest(mutation),
        recordId,
        revision,
        kind: operation.kind,
      },
    },
  );
}

test("guests explicitly export/import fresh-ID copies and lose temporary writing on reload", async () => {
  const f = fixture();
  const loading = f.store.load();
  f.requests[0].resolve({ kind: "guest" });
  await loading;
  const original = await draft(f.arguments);
  await f.arguments.save();
  assert.equal(f.requests.length, 1);
  assert.equal(f.arguments.getSnapshot().dirty, true);
  const backup = f.arguments.exportRecords();
  const preview = f.arguments.previewImport(backup);
  f.arguments.discardActive();
  await f.arguments.importSheets(preview.sheets);
  assert.notEqual(f.arguments.getSnapshot().active.id, original.id);
  assert.notEqual(
    f.arguments.getSnapshot().active.blocks[0].id,
    original.blocks[0].id,
  );
  assert.equal(
    f.arguments.getSnapshot().active.blocks[0].text,
    original.blocks[0].text,
  );
  assert.equal(f.arguments.getSnapshot().saved.length, 0);
  assert.equal(f.store.getSnapshot().draftCount, 0);
  f.store.dispose();
  assert.equal(f.arguments.getSnapshot().active, null);
  assert.doesNotMatch(f.arguments.exportRecords(), /initial proof/);
  assert.match(backup, /initial proof/);
});

test("acknowledgement names captured bytes; edits during a save remain dirty and require a further explicit save", async () => {
  const f = await signedIn();
  await draft(f.arguments, "captured writing");
  const first = f.arguments.save();
  const sent = f.requests[2];
  assert.equal(f.arguments.getSnapshot().phase, "saving");
  assert.equal(f.arguments.getSnapshot().acknowledged, null);
  const active = f.arguments.getSnapshot().active;
  f.arguments.edit({
    ...active,
    blocks: [{ ...active.blocks[0], text: "later writing" }],
  });
  sent.resolve(await acknowledgement(sent));
  await first;
  assert.equal(
    f.arguments.getSnapshot().active.blocks[0].text,
    "later writing",
  );
  assert.equal(
    f.arguments.getSnapshot().acknowledged.sheet.blocks[0].text,
    "captured writing",
  );
  assert.equal(f.arguments.getSnapshot().dirty, true);
  assert.match(f.arguments.getSnapshot().message, /later edits remain unsaved/);
  assert.equal(f.requests.length, 3);
  const next = f.arguments.save();
  assert.equal(
    JSON.parse(f.requests[3].init.body).operation.expectedRevision,
    1,
  );
  f.requests[3].resolve(await acknowledgement(f.requests[3]));
  await next;
  assert.equal(f.arguments.getSnapshot().acknowledged.revision, 2);
  assert.equal(f.arguments.getSnapshot().dirty, false);
});

test("an ambiguous save retries the identical immutable request despite further edits", async () => {
  const f = await signedIn();
  await draft(f.arguments, "captured");
  const saving = f.arguments.save();
  const sent = f.requests[2];
  sent.reject(new Error("connection lost after commit"));
  await saving;
  assert.equal(f.arguments.getSnapshot().canRetry, true);
  const active = f.arguments.getSnapshot().active;
  f.arguments.edit({
    ...active,
    blocks: [{ ...active.blocks[0], text: "edited after unknown delivery" }],
  });
  const retry = f.arguments.retry();
  assert.equal(f.requests[3].init.body, sent.init.body);
  f.requests[3].resolve(await acknowledgement(sent));
  await retry;
  assert.equal(
    f.arguments.getSnapshot().acknowledged.sheet.blocks[0].text,
    "captured",
  );
  assert.equal(f.arguments.getSnapshot().dirty, true);
});

test("two-tab conflicts retain both versions; explicit copy gets new IDs and server selection discards only on command", async () => {
  const f = await signedIn();
  await draft(f.arguments);
  const initial = f.arguments.save();
  const first = f.requests[2];
  first.resolve(await acknowledgement(first));
  await initial;
  const original = f.arguments.getSnapshot().active;
  f.arguments.edit({
    ...original,
    blocks: [{ ...original.blocks[0], text: "local correction" }],
  });
  const saving = f.arguments.save();
  const remote = {
    sheet: {
      ...original,
      blocks: [{ ...original.blocks[0], text: "remote correction" }],
    },
    revision: 2,
  };
  f.requests[3].resolve(
    notes("A", [remote], { error: "Another tab saved first." }),
    409,
  );
  await saving;
  assert.equal(f.arguments.getSnapshot().phase, "conflict");
  assert.equal(
    f.arguments.getSnapshot().active.blocks[0].text,
    "local correction",
  );
  assert.equal(
    f.arguments.getSnapshot().conflict.sheet.blocks[0].text,
    "remote correction",
  );
  const copy = f.arguments.saveCopy();
  const request = f.requests[4];
  const copied = JSON.parse(request.init.body).operation;
  assert.notEqual(copied.sheet.id, original.id);
  assert.notEqual(copied.sheet.blocks[0].id, original.blocks[0].id);
  assert.equal(copied.expectedRevision, 0);
  assert.equal(copied.sheet.blocks[0].text, "local correction");
  request.resolve(await acknowledgement(request, [remote]));
  await copy;
  assert.equal(f.arguments.getSnapshot().saved.length, 2);
  f.arguments.discardActive();
  f.arguments.resume(remote);
  f.arguments.edit({
    ...remote.sheet,
    blocks: [{ ...remote.sheet.blocks[0], text: "another local" }],
  });
  const again = f.arguments.save();
  const newest = { ...remote, revision: 3 };
  f.requests[5].resolve(notes("A", [newest], { error: "Conflict" }), 409);
  await again;
  assert.equal(
    f.arguments.getSnapshot().active.blocks[0].text,
    "another local",
  );
  f.arguments.useServerVersion();
  assert.equal(
    f.arguments.getSnapshot().active.blocks[0].text,
    "remote correction",
  );
  assert.equal(f.arguments.getSnapshot().acknowledged.revision, 3);
  assert.equal(f.arguments.getSnapshot().dirty, false);
});

test("identity refresh conceals writing, restores same-owner frozen delivery, and rejects late old-generation responses", async () => {
  const f = await signedIn();
  await draft(f.arguments, "owner A private writing");
  const saving = f.arguments.save();
  const oldSave = f.requests[2];
  const refresh = f.store.refresh();
  assert.equal(f.arguments.getSnapshot().phase, "hidden");
  assert.equal(f.arguments.getSnapshot().canRetry, false);
  assert.equal(f.arguments.getSnapshot().active, null);
  assert.doesNotMatch(f.arguments.exportRecords(), /owner A private/);
  f.requests[3].resolve(account());
  await refresh;
  f.requests[4].resolve(notes());
  await tick();
  assert.equal(
    f.arguments.getSnapshot().active.blocks[0].text,
    "owner A private writing",
  );
  assert.equal(f.arguments.getSnapshot().phase, "failed");
  assert.equal(f.arguments.getSnapshot().canRetry, true);
  oldSave.resolve(await acknowledgement(oldSave));
  await saving;
  assert.equal(f.arguments.getSnapshot().acknowledged, null);
  const retry = f.arguments.retry();
  assert.equal(f.requests[5].init.body, oldSave.init.body);
  f.requests[5].resolve(await acknowledgement(oldSave));
  await retry;
  assert.equal(f.arguments.getSnapshot().dirty, false);
});

test("owner changes, notes 401s and mixed response owners clear all private buffers through the shared coordinator", async () => {
  for (const lateStatus of [200, 401]) {
    const f = await signedIn();
    await draft(f.arguments, "A private");
    const saving = f.arguments.save();
    const late = f.requests[2];
    const switched = f.store.refresh();
    f.requests[3].resolve(account("B"));
    await switched;
    f.requests[4].resolve(notes("B"));
    await tick();
    assert.equal(f.arguments.getSnapshot().active, null);
    late.resolve(
      lateStatus === 200 ? await acknowledgement(late) : { error: "expired" },
      lateStatus,
    );
    await saving;
    assert.equal(f.store.getSnapshot().account.id, "B");
    assert.doesNotMatch(f.arguments.exportRecords(), /A private/);
    assert.equal(f.arguments.getSnapshot().saved.length, 0);
  }
  const f = await signedIn();
  await draft(f.arguments, "private before expiry");
  const reload = f.arguments.retry();
  f.requests[2].resolve(notes("B"));
  await reload;
  assert.equal(f.arguments.getSnapshot().active, null);
  assert.equal(f.store.getSnapshot().account, null);
  assert.equal(f.requests[3].url, "/api/progress");
  f.requests[3].resolve({ kind: "guest" });
  await tick();
  assert.doesNotMatch(f.arguments.exportRecords(), /private before expiry/);
});

test("progress discard/reset/export keep argument scope and imports never grant competency", async () => {
  const f = await signedIn();
  const active = await draft(
    f.arguments,
    "keep argument across progress discard",
  );
  const exported = f.store.exportRecords();
  assert.equal(
    JSON.parse(exported).format,
    "algebra-account-progress-export-v1",
  );
  assert.doesNotMatch(exported, /keep argument/);
  const discard = f.store.discard();
  f.requests[2].resolve(account());
  await discard;
  f.requests[3].resolve(notes());
  await tick();
  assert.equal(f.arguments.getSnapshot().active.id, active.id);
  assert.equal(
    f.arguments.getSnapshot().active.blocks[0].text,
    "keep argument across progress discard",
  );
  const backup = f.arguments.exportRecords();
  f.arguments.discardActive();
  await f.arguments.importSheets(f.arguments.previewImport(backup).sheets);
  assert.notEqual(f.arguments.getSnapshot().active.id, active.id);
  assert.equal(f.arguments.getSnapshot().dirty, true);
  assert.equal(f.store.getSnapshot().draftCount, 0);
  assert.deepEqual(f.store.getSnapshot().progress.attempts, {});
});

test("implicit replacement is refused; unsupported and quota failures stay exportable", async () => {
  const f = await signedIn();
  const active = await draft(f.arguments, "retain me");
  await f.arguments.start("foundations-fibers");
  await f.arguments.newAttempt();
  assert.equal(f.arguments.getSnapshot().active.id, active.id);
  const saving = f.arguments.save();
  f.requests[2].resolve(notes("A", [], { error: "quota reached" }), 413);
  await saving;
  assert.equal(f.arguments.getSnapshot().phase, "failed");
  assert.match(f.arguments.exportRecords(), /retain me/);
  assert.equal(JSON.parse(f.arguments.exportRecords()).pending, null);
  const refresh = f.store.refresh();
  f.requests[3].resolve(account());
  await refresh;
  const raw = '{"version":99,"writing":"untouched"}';
  f.requests[4].resolve({
    kind: "account",
    accountId: "A",
    records: [{ kind: "unsupported", id: "future", revision: 9, raw }],
  });
  await tick();
  const exported = JSON.parse(f.arguments.exportRecords());
  assert.equal(exported.unsupported[0].raw, raw);
  assert.equal(exported.active.blocks[0].text, "retain me");
});

test("a current argument 401 clears private writing before the shared auth refresh completes", async () => {
  const f = await signedIn();
  await draft(f.arguments, "private expired writing");
  const saving = f.arguments.save();
  f.requests[2].resolve({ error: "Sign in again" }, 401);
  await saving;
  assert.equal(f.arguments.getSnapshot().active, null);
  assert.equal(f.store.getSnapshot().account, null);
  assert.doesNotMatch(f.arguments.exportRecords(), /private expired/);
  assert.equal(f.requests[3].url, "/api/progress");
  await f.arguments.start("foundations-functions", "functions");
  assert.equal(f.arguments.getSnapshot().active, null);
  f.requests[3].resolve({ kind: "guest" });
  await tick();
  assert.equal(f.arguments.getSnapshot().phase, "guest");
  assert.equal(f.store.getSnapshot().phase, "expired");
  await draft(f.arguments, "fresh temporary writing");
  assert.equal(
    f.arguments.getSnapshot().active.blocks[0].text,
    "fresh temporary writing",
  );
  assert.doesNotMatch(f.arguments.exportRecords(), /private expired/);
  await f.arguments.save();
  assert.equal(f.requests.length, 4);
});

test("receipt acknowledgement after a later deletion retains the captured local sheet as an explicit conflict", async () => {
  const f = await signedIn();
  await draft(f.arguments, "saved then deleted elsewhere");
  const saving = f.arguments.save();
  const request = f.requests[2];
  const result = await acknowledgement(request);
  result.records = [];
  request.resolve(result);
  await saving;
  assert.equal(f.arguments.getSnapshot().phase, "conflict");
  assert.equal(
    f.arguments.getSnapshot().acknowledged.sheet.blocks[0].text,
    "saved then deleted elsewhere",
  );
  assert.match(f.arguments.exportRecords(), /saved then deleted elsewhere/);
  f.arguments.useServerVersion();
  assert.equal(f.arguments.getSnapshot().active, null);
});

test("a definitive quota rejection preserves writing but permits a newly captured smaller save", async () => {
  const f = await signedIn();
  await draft(f.arguments, "larger local draft");
  const first = f.arguments.save();
  const original = f.requests[2];
  original.resolve(notes("A", [], { error: "Argument quota reached" }), 413);
  await first;
  const active = f.arguments.getSnapshot().active;
  f.arguments.edit({
    ...active,
    blocks: [{ ...active.blocks[0], text: "smaller draft" }],
  });
  const next = f.arguments.save();
  const fresh = f.requests[3];
  assert.notEqual(
    JSON.parse(fresh.init.body).operationId,
    JSON.parse(original.init.body).operationId,
  );
  assert.equal(
    JSON.parse(fresh.init.body).operation.sheet.blocks[0].text,
    "smaller draft",
  );
  fresh.resolve(await acknowledgement(fresh));
  await next;
  assert.equal(f.arguments.getSnapshot().dirty, false);
});

test("an explicit cross-account import assigns fresh IDs and captures only the currently confirmed owner on Save", async () => {
  const f = await signedIn();
  const original = await draft(f.arguments, "export from A");
  const preview = f.arguments.previewImport(f.arguments.exportRecords());
  const switchOwner = f.store.refresh();
  f.requests[2].resolve(account("B"));
  await switchOwner;
  f.requests[3].resolve(notes("B"));
  await tick();
  await f.arguments.importSheets([preview.sheets[0]]);
  assert.notEqual(f.arguments.getSnapshot().active.id, original.id);
  assert.notEqual(
    f.arguments.getSnapshot().active.blocks[0].id,
    original.blocks[0].id,
  );
  assert.equal(f.requests.length, 4);
  const saving = f.arguments.save();
  const request = f.requests[4];
  assert.equal(JSON.parse(request.init.body).expectedAccountId, "B");
  request.resolve(await acknowledgement(request));
  await saving;
  assert.equal(f.store.getSnapshot().account.id, "B");
  assert.deepEqual(f.store.getSnapshot().progress.attempts, {});
});

test("a lower same-owner read cannot replace a newer acknowledged note revision", async () => {
  const f = await signedIn();
  await draft(f.arguments, "first version");
  const first = f.arguments.save();
  f.requests[2].resolve(await acknowledgement(f.requests[2]));
  await first;
  const previous = f.arguments.getSnapshot().acknowledged;
  const active = f.arguments.getSnapshot().active;
  f.arguments.edit({
    ...active,
    blocks: [{ ...active.blocks[0], text: "newest version" }],
  });
  const second = f.arguments.save();
  f.requests[3].resolve(await acknowledgement(f.requests[3]));
  await second;
  const read = f.arguments.retry();
  f.requests[4].resolve(notes("A", [previous]));
  await read;
  assert.equal(f.arguments.getSnapshot().saved[0].revision, 2);
  assert.equal(
    f.arguments.getSnapshot().saved[0].sheet.blocks[0].text,
    "newest version",
  );
  assert.equal(f.arguments.getSnapshot().acknowledged.revision, 2);
});

test("deletion acknowledgement preserves later typing as exportable writing with an explicit copy choice", async () => {
  const f = await signedIn();
  await draft(f.arguments, "saved original");
  const saving = f.arguments.save();
  f.requests[2].resolve(await acknowledgement(f.requests[2]));
  await saving;
  const original = f.arguments.getSnapshot().acknowledged;
  const deletion = f.arguments.remove(original);
  const request = f.requests[3];
  const active = f.arguments.getSnapshot().active;
  f.arguments.edit({
    ...active,
    blocks: [{ ...active.blocks[0], text: "typed after delete confirmation" }],
  });
  request.resolve(await acknowledgement(request, [original]));
  await deletion;
  assert.equal(
    f.arguments.getSnapshot().active?.blocks[0].text,
    "typed after delete confirmation",
  );
  assert.equal(f.arguments.getSnapshot().phase, "conflict");
  assert.equal(f.arguments.getSnapshot().dirty, true);
  assert.equal(f.arguments.getSnapshot().acknowledged, null);
  assert.equal(f.arguments.getSnapshot().canRetry, false);
  assert.match(f.arguments.exportRecords(), /typed after delete confirmation/);
  const copy = f.arguments.saveCopy();
  const copyRequest = f.requests[4];
  assert.notEqual(
    JSON.parse(copyRequest.init.body).operation.sheet.id,
    original.sheet.id,
  );
  copyRequest.resolve(await acknowledgement(copyRequest, [], 3));
  await copy;
  assert.equal(
    f.arguments.getSnapshot().acknowledged.sheet.blocks[0].text,
    "typed after delete confirmation",
  );
  assert.equal(f.arguments.getSnapshot().dirty, false);
});

test("retryable owner contention retains exact captured delivery while later edits remain dirty", async () => {
  const f = await signedIn();
  await draft(f.arguments, "captured before owner contention");
  const saving = f.arguments.save();
  const original = f.requests[2];
  original.resolve(
    notes("A", [], {
      error: "Other arguments are being saved. Retry the same save.",
    }),
    503,
  );
  await saving;
  assert.equal(f.arguments.getSnapshot().phase, "failed");
  assert.equal(f.arguments.getSnapshot().canRetry, true);
  const active = f.arguments.getSnapshot().active;
  f.arguments.edit({
    ...active,
    blocks: [{ ...active.blocks[0], text: "typed after contention" }],
  });
  const retry = f.arguments.retry();
  const request = f.requests[3];
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.body, original.init.body);
  request.resolve(await acknowledgement(request, [], 4));
  await retry;
  assert.equal(f.arguments.getSnapshot().canRetry, false);
  assert.equal(
    f.arguments.getSnapshot().acknowledged.sheet.blocks[0].text,
    "captured before owner contention",
  );
  assert.equal(
    f.arguments.getSnapshot().active.blocks[0].text,
    "typed after contention",
  );
  assert.equal(f.arguments.getSnapshot().dirty, true);
});

test("deleting another saved argument preserves a different unsaved draft", async () => {
  const f = await signedIn();
  await draft(f.arguments, "older saved sheet");
  const saving = f.arguments.save();
  f.requests[2].resolve(await acknowledgement(f.requests[2]));
  await saving;
  const original = f.arguments.getSnapshot().acknowledged;
  f.arguments.discardActive();
  const active = await draft(
    f.arguments,
    "unsaved writing needing quota space",
  );
  const deleting = f.arguments.remove(original);
  assert.equal(f.requests.length, 4);
  f.requests[3].resolve(await acknowledgement(f.requests[3], [original], 2));
  await deleting;
  assert.equal(f.arguments.getSnapshot().saved.length, 0);
  assert.deepEqual(f.arguments.getSnapshot().active, active);
  assert.equal(f.arguments.getSnapshot().dirty, true);
  assert.match(
    f.arguments.exportRecords(),
    /unsaved writing needing quota space/,
  );
});

test("a deletion conflict stays scoped to its saved record and preserves unrelated dirty writing", async () => {
  const f = await signedIn();
  await draft(f.arguments, "saved sheet A");
  const saving = f.arguments.save();
  f.requests[2].resolve(await acknowledgement(f.requests[2]));
  await saving;
  const original = f.arguments.getSnapshot().acknowledged;
  f.arguments.discardActive();
  const active = await draft(f.arguments, "dirty sheet B must not be replaced");
  const deleting = f.arguments.remove(original);
  const newer = {
    sheet: {
      ...original.sheet,
      blocks: [
        { ...original.sheet.blocks[0], text: "sheet A changed elsewhere" },
      ],
    },
    revision: 2,
  };
  f.requests[3].resolve(
    notes("A", [newer], { error: "Another tab changed this argument." }),
    409,
  );
  await deleting;
  assert.equal(f.arguments.getSnapshot().phase, "failed");
  assert.equal(f.arguments.getSnapshot().canRetry, false);
  assert.equal(f.arguments.getSnapshot().conflict, null);
  f.arguments.useServerVersion();
  assert.deepEqual(f.arguments.getSnapshot().active, active);
  assert.equal(f.arguments.getSnapshot().saved[0].revision, 2);
  assert.match(
    f.arguments.exportRecords(),
    /dirty sheet B must not be replaced/,
  );
  const retry = f.arguments.retry();
  f.requests[4].resolve(notes("A", [newer]));
  await retry;
  assert.deepEqual(f.arguments.getSnapshot().active, active);
  assert.equal(f.arguments.getSnapshot().phase, "ready");
});

test("bare definitive rejection releases captured delivery and lets Save capture corrected writing", async (t) => {
  for (const status of [400, 413, 415, 422])
    await t.test(`HTTP ${status}`, async () => {
      const f = await signedIn();
      await draft(f.arguments, "rejected writing");
      const saving = f.arguments.save();
      const rejected = f.requests[2];
      rejected.resolve({ error: "Definitive request rejection" }, status);
      await saving;
      assert.equal(f.arguments.getSnapshot().phase, "failed");
      assert.equal(JSON.parse(f.arguments.exportRecords()).pending, null);
      assert.equal(f.arguments.getSnapshot().canRetry, false);
      assert.equal(f.arguments.getSnapshot().acknowledged, null);
      const active = f.arguments.getSnapshot().active;
      f.arguments.edit({
        ...active,
        blocks: [{ ...active.blocks[0], text: "corrected writing" }],
      });
      const next = f.arguments.save();
      const request = f.requests[3];
      assert.notEqual(
        JSON.parse(request.init.body).operationId,
        JSON.parse(rejected.init.body).operationId,
      );
      assert.equal(
        JSON.parse(request.init.body).operation.sheet.blocks[0].text,
        "corrected writing",
      );
      request.resolve(await acknowledgement(request));
      await next;
      assert.equal(f.arguments.getSnapshot().dirty, false);
    });
});

test("definitive status never releases a delivery for a changed, expired, or mismatched account", async (t) => {
  for (const [name, body, status] of [
    ["expired", { error: "Expired" }, 401],
    ["changed", { code: "account_changed", error: "Changed" }, 400],
    ["other owner", notes("B", [], { error: "Rejected elsewhere" }), 400],
    ["bare other owner", { accountId: "B", error: "Rejected elsewhere" }, 422],
  ])
    await t.test(name, async () => {
      const f = await signedIn();
      await draft(f.arguments, "A private rejected writing");
      const saving = f.arguments.save();
      f.requests[2].resolve(body, status);
      await saving;
      assert.equal(f.store.getSnapshot().account, null);
      assert.equal(f.arguments.getSnapshot().active, null);
      assert.equal(f.arguments.getSnapshot().canRetry, false);
      assert.doesNotMatch(
        f.arguments.exportRecords(),
        /A private rejected writing/,
      );
      f.requests[3].resolve({ kind: "guest" });
      await tick();
    });
});

test("late bare rejection from an old generation cannot discard new-owner writing", async () => {
  const f = await signedIn();
  await draft(f.arguments, "A captured writing");
  const oldSave = f.arguments.save();
  const late = f.requests[2];
  const changed = f.store.refresh();
  f.requests[3].resolve(account("B"));
  await changed;
  f.requests[4].resolve(notes("B"));
  await tick();
  await draft(f.arguments, "B private writing");
  late.resolve({ error: "Definitive old rejection" }, 400);
  await oldSave;
  assert.equal(f.store.getSnapshot().account.id, "B");
  assert.equal(
    f.arguments.getSnapshot().active.blocks[0].text,
    "B private writing",
  );
  assert.equal(f.arguments.getSnapshot().dirty, true);
  assert.equal(f.arguments.getSnapshot().canRetry, false);
});
