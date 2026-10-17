import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
});
after(() => vite.close());
const { accountProgressStore, readLegacyRecords } = await vite.ssrLoadModule(
  "/lib/algebra/account-store.ts",
);
const domain = await vite.ssrLoadModule("/lib/algebra/account-progress.ts");
const question = {
  question: "Which?",
  choices: ["yes", "no"],
  answer: 0,
  explanation: "Reason",
};
const registry = { example: question };
const user = (id) => ({ id, email: `${id}@example.test`, displayName: id });
const view = (
  id = "A",
  document = domain.emptyAccountDocument(),
  acknowledgement,
) => ({
  kind: "account",
  user: user(id),
  record: { kind: "supported", document },
  ...(acknowledgement ? { acknowledgement } : {}),
});
const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture() {
  const requests = [];
  const store = accountProgressStore({
    registry,
    readLegacy: () => ({
      records: domain.emptyLegacyRecords(),
      unreadableKeys: [],
    }),
    fetcher: (url, init) =>
      new Promise((resolve, reject) =>
        requests.push({
          url,
          init,
          resolve: (body, status = 200) =>
            resolve(
              body instanceof Response ? body : Response.json(body, { status }),
            ),
          reject,
        }),
      ),
  });
  return { requests, store };
}
async function signedIn(id = "A") {
  const fixtureState = fixture();
  const loading = fixtureState.store.load();
  fixtureState.requests[0].resolve(view(id));
  await loading;
  return fixtureState;
}

test("guest learning, preferences and reset stay in memory; four legacy keys are read only on request", async () => {
  let reads = 0;
  const store = accountProgressStore({
    registry,
    fetcher: async () => Response.json({ kind: "guest" }),
    readLegacy: () => {
      reads++;
      return { records: domain.emptyLegacyRecords(), unreadableKeys: [] };
    },
  });
  await store.load();
  store.submit("example", 0);
  store.setSquare(7);
  assert.equal(reads, 0);
  assert.equal(store.getSnapshot().progress.attempts.example.choice, 0);
  assert.equal(store.getSnapshot().preferences.squareElement, 7);
  store.reset();
  assert.deepEqual(store.getSnapshot().progress.attempts, {});
  store.undo();
  assert.equal(store.getSnapshot().progress.attempts.example.choice, 0);
  const exported = JSON.parse(store.exportRecords());
  assert.equal(reads, 1);
  assert.equal(exported.acknowledgedAccountState, null);
  assert.equal(exported.unsavedDraft.progress.attempts.example.submissions, 1);
  const keys = [];
  const raw = '{ "future": true }';
  const legacy = readLegacyRecords({
    getItem: (key) => {
      keys.push(key);
      return raw;
    },
  });
  assert.deepEqual(keys, [...domain.legacyKeys]);
  assert.ok(Object.values(legacy.records).every((value) => value === raw));
});

test("ambiguous delivery retries identical immutable operation; feedback waits for acknowledgement", async () => {
  const { store, requests } = await signedIn();
  store.submit("example", 0);
  assert.equal(store.getSnapshot().phase, "saving");
  assert.equal(store.getSnapshot().acknowledged.revision, 0);
  assert.equal(store.getSnapshot().draftCount, 1);
  const firstBody = requests[1].init.body;
  requests[1].reject(new Error("connection lost after commit"));
  await tick();
  assert.equal(store.getSnapshot().phase, "failed");
  assert.match(store.getSnapshot().message, /unknown/);
  store.retry();
  assert.equal(requests[2].init.body, firstBody);
  const mutation = JSON.parse(firstBody);
  const saved = domain.applyAccountOperation(
    domain.emptyAccountDocument(),
    mutation.operation,
    registry,
  );
  requests[2].resolve(
    view("A", saved, { operationId: mutation.operationId, appliedRevision: 1 }),
  );
  await tick();
  assert.equal(store.getSnapshot().phase, "ready");
  assert.equal(store.getSnapshot().acknowledged.revision, 1);
  assert.equal(store.getSnapshot().progress.attempts.example.submissions, 1);
  assert.equal(store.getSnapshot().draftCount, 0);
});

test("conflicts keep exportable drafts and never automatically rebase or resend", async () => {
  const { store, requests } = await signedIn();
  store.submit("example", 0);
  const other = domain.applyAccountOperation(
    domain.emptyAccountDocument(),
    { kind: "square", element: 6 },
    registry,
  );
  requests[1].resolve(
    { ...view("A", other), error: "Another save changed your account." },
    409,
  );
  await tick();
  assert.equal(store.getSnapshot().phase, "conflict");
  assert.equal(store.getSnapshot().draftCount, 1);
  assert.equal(store.getSnapshot().progress.attempts.example.choice, 0);
  const refreshed = store.refresh();
  requests[2].resolve(view("A", other));
  await refreshed;
  assert.equal(store.getSnapshot().phase, "conflict");
  assert.equal(
    requests.filter((request) => request.init?.method === "POST").length,
    1,
  );
  assert.equal(
    JSON.parse(store.exportRecords()).unsavedDraft.operations.length,
    1,
  );
  const discard = store.discard();
  requests[3].resolve(view("A", other));
  await discard;
  assert.equal(store.getSnapshot().draftCount, 0);
  assert.deepEqual(store.getSnapshot().progress.attempts, {});
});

test("identity changes clear private drafts; late old-account writes, GETs and 401s cannot replace the new account", async () => {
  for (const delayedStatus of [200, 401]) {
    const { store, requests } = await signedIn();
    store.submit("example", 0);
    const mutation = JSON.parse(requests[1].init.body);
    const switching = store.refresh();
    requests[2].resolve(view("B"));
    await switching;
    assert.equal(store.getSnapshot().account.id, "B");
    assert.equal(store.getSnapshot().draftCount, 0);
    const old = domain.applyAccountOperation(
      domain.emptyAccountDocument(),
      mutation.operation,
      registry,
    );
    requests[1].resolve(
      delayedStatus === 401
        ? { error: "Expired" }
        : view("A", old, {
            operationId: mutation.operationId,
            appliedRevision: 1,
          }),
      delayedStatus,
    );
    await tick();
    assert.equal(store.getSnapshot().account.id, "B");
    assert.deepEqual(store.getSnapshot().progress.attempts, {});
    const older = store.refresh();
    const newer = store.refresh();
    requests[4].resolve(view("B"));
    await newer;
    requests[3].resolve(view("A", old));
    await older;
    assert.equal(store.getSnapshot().account.id, "B");
  }
});

test("unsupported account rows stay exportable, permit temporary reasoning, and never send writes", async () => {
  const { store, requests } = fixture();
  const raw = '{"schemaVersion":99,"private":"exact bytes"}';
  const loading = store.load();
  requests[0].resolve({
    kind: "account",
    user: user("A"),
    record: { kind: "unsupported", revision: 12, raw },
  });
  await loading;
  store.submit("example", 0);
  store.reset();
  store.importLegacy();
  assert.equal(requests.length, 1);
  assert.equal(store.getSnapshot().phase, "unsupported");
  assert.equal(store.getSnapshot().progress.attempts.example.choice, 0);
  assert.equal(JSON.parse(store.exportRecords()).unsupportedAccountRecord, raw);
});

test("same-account stale GET cannot roll back acknowledged progress and a current 401 clears it", async () => {
  const { store, requests } = await signedIn();
  store.submit("example", 0);
  const mutation = JSON.parse(requests[1].init.body);
  const saved = domain.applyAccountOperation(
    domain.emptyAccountDocument(),
    mutation.operation,
    registry,
  );
  requests[1].resolve(
    view("A", saved, { operationId: mutation.operationId, appliedRevision: 1 }),
  );
  await tick();
  const stale = store.refresh();
  assert.equal(store.getSnapshot().account, null);
  assert.deepEqual(store.getSnapshot().progress.attempts, {});
  requests[2].resolve(view("A"));
  await stale;
  assert.equal(store.getSnapshot().acknowledged.revision, 1);
  store.submit("example", 1);
  const expiry = store.refresh();
  requests[4].resolve(new Response("Sign in again", { status: 401 }));
  await expiry;
  assert.equal(store.getSnapshot().phase, "expired");
  assert.equal(store.getSnapshot().account, null);
  assert.equal(
    JSON.parse(store.exportRecords()).acknowledgedAccountState,
    null,
  );
  requests[3].resolve(view("A", saved));
  await tick();
  assert.equal(store.getSnapshot().phase, "expired");
});
