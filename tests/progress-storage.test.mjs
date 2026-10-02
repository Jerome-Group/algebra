import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
});
after(() => vite.close());
const { deviceProgressStore, progressBackupKey } = await vite.ssrLoadModule(
  "/lib/algebra/progress-storage.ts",
);
const { progressStorageKey, readProgress, assessmentRevision, demonstrated } =
  await vite.ssrLoadModule("/lib/algebra/progress.ts");
const question = {
  question: "First question",
  choices: ["yes", "no"],
  answer: 0,
  explanation: "Reason",
};
const registry = { example: question };
const original = JSON.stringify({
  version: 1,
  attempts: {
    example: {
      revision: assessmentRevision(question),
      choice: 0,
      submissions: 1,
    },
  },
});
function fixture(record = original) {
  const values = new Map(record === null ? [] : [[progressStorageKey, record]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
  const store = deviceProgressStore(registry, () => storage);
  store.load();
  return { store, storage, values };
}
test("question revisions archive evidence; historical records survive subsequent answers", () => {
  const revised = { example: { ...question, question: "Revised question" } };
  const progress = readProgress(original, revised);
  assert.equal(demonstrated(progress, revised).size, 0);
  assert.equal(
    progress.archived.example[0].revision,
    assessmentRevision(question),
  );
  const { storage } = fixture();
  const store = deviceProgressStore(revised, () => storage);
  store.load();
  store.submit("example", 0);
  const reloaded = readProgress(storage.getItem(progressStorageKey), revised);
  assert.equal(demonstrated(reloaded, revised).size, 1);
  assert.equal(reloaded.archived.example.length, 1);
  assert.deepEqual(readProgress(JSON.stringify(reloaded), revised), reloaded);
});
test("backup preserves exact previous record; reset and restoration are reversible across reload", () => {
  const { store, storage, values } = fixture();
  store.reset();
  assert.deepEqual(store.getSnapshot().progress.attempts, {});
  assert.equal(JSON.parse(values.get(progressBackupKey)).record, original);
  const reloaded = deviceProgressStore(registry, () => storage);
  reloaded.load();
  reloaded.undo();
  assert.equal(values.get(progressStorageKey), original);
  assert.equal(demonstrated(reloaded.getSnapshot().progress, registry).size, 1);
  reloaded.undo();
  assert.deepEqual(reloaded.getSnapshot().progress.attempts, {});
});
test("failed primary restore writes retain the exact target across reload and retry", () => {
  for (const target of [original, '{"version":2,"private":"preserved"}']) {
    const { store, storage, values } = fixture(target);
    store.reset();
    const current = values.get(progressStorageKey);
    const setItem = storage.setItem;
    storage.setItem = (key, value) => {
      if (key === progressStorageKey) throw Error("primary write denied");
      setItem(key, value);
    };
    store.undo();
    assert.equal(values.get(progressStorageKey), current);
    assert.match(store.getSnapshot().message, /Restore failed/);
    const reloaded = deviceProgressStore(registry, () => storage);
    reloaded.load();
    assert.equal(reloaded.getSnapshot().canUndo, true);
    assert.equal(JSON.parse(reloaded.exportRecords()).previousRecord, target);
    assert.equal(JSON.parse(reloaded.exportRecords()).savedRecord, current);
    storage.setItem = setItem;
    reloaded.undo();
    assert.equal(values.get(progressStorageKey), target);
    const successfulReload = deviceProgressStore(registry, () => storage);
    successfulReload.load();
    assert.equal(
      JSON.parse(successfulReload.exportRecords()).previousRecord,
      current,
    );
    successfulReload.undo();
    assert.equal(values.get(progressStorageKey), current);
  }
});
test("failed primary removal preserves the null restore target across reload", () => {
  const { store, storage, values } = fixture(null);
  store.submit("example", 0);
  const current = values.get(progressStorageKey);
  const removeItem = storage.removeItem;
  storage.removeItem = () => {
    throw Error("primary removal denied");
  };
  store.undo();
  assert.equal(values.get(progressStorageKey), current);
  assert.match(store.getSnapshot().message, /Restore failed/);
  const reloaded = deviceProgressStore(registry, () => storage);
  reloaded.load();
  assert.equal(reloaded.getSnapshot().canUndo, true);
  assert.equal(JSON.parse(reloaded.exportRecords()).previousRecord, null);
  storage.removeItem = removeItem;
  reloaded.undo();
  assert.equal(values.has(progressStorageKey), false);
  const successfulReload = deviceProgressStore(registry, () => storage);
  successfulReload.load();
  assert.equal(
    JSON.parse(successfulReload.exportRecords()).previousRecord,
    current,
  );
  successfulReload.undo();
  assert.equal(values.get(progressStorageKey), current);
});
test("future and corrupt records stay byte-for-byte intact until explicit reset, then can be restored", () => {
  for (const raw of [
    '{"version":2,"attempts":{"private":"untouched"}}',
    "broken",
    "null",
    "[]",
    '{"version":1,"attempts":{"example":{"revision":"old","choice":0,"submissions":0}}}',
    '{"version":1,"attempts":{"example":null}}',
    '{"version":1,"attempts":{},"archived":{"old":[{"revision":"old","choice":-1,"submissions":1}]}}',
    '{"version":1,"attempts":{},"archived":{"old":"not-history"}}',
    '{"version":1,"attempts":{},"archived":null}',
  ]) {
    const { store, values } = fixture(raw);
    store.submit("example", 0);
    store.submit("example", 1);
    store.submit("example", 0);
    assert.equal(values.get(progressStorageKey), raw);
    assert.equal(store.getSnapshot().protectedRecord, true);
    assert.equal(demonstrated(store.getSnapshot().progress, registry).size, 1);
    assert.equal(JSON.parse(store.exportRecords()).savedRecord, raw);
    store.reset();
    store.undo();
    assert.equal(values.get(progressStorageKey), raw);
    assert.equal(demonstrated(store.getSnapshot().progress, registry).size, 0);
  }
});
test("two stores preserve distinct answers before asynchronous storage events arrive", () => {
  const { storage, values } = fixture(null);
  const sharedRegistry = { first: question, second: question };
  const first = deviceProgressStore(sharedRegistry, () => storage);
  const second = deviceProgressStore(sharedRegistry, () => storage);
  first.load();
  second.load();
  first.submit("first", 0);
  second.submit("second", 1);
  assert.deepEqual(
    Object.keys(JSON.parse(values.get(progressStorageKey)).attempts).sort(),
    ["first", "second"],
  );
  first.submit("first", 1);
  const saved = JSON.parse(values.get(progressStorageKey));
  assert.equal(saved.attempts.first.submissions, 2);
  assert.equal(saved.attempts.second.choice, 1);
});
test("session answers survive a failed save and rejoin the latest supported device record", () => {
  const { storage, values } = fixture(null);
  const sharedRegistry = { first: question, second: question };
  const store = deviceProgressStore(sharedRegistry, () => storage);
  store.load();
  const save = storage.setItem;
  storage.setItem = () => {
    throw Error("quota");
  };
  store.submit("first", 0);
  storage.setItem = save;
  const other = deviceProgressStore(sharedRegistry, () => storage);
  other.load();
  other.submit("second", 1);
  store.submit("first", 1);
  const saved = JSON.parse(values.get(progressStorageKey));
  assert.equal(saved.attempts.first.submissions, 2);
  assert.equal(saved.attempts.second.choice, 1);
});
test("backup failure never overwrites evidence; session answers still work and export", () => {
  const { store, storage, values } = fixture();
  storage.setItem = () => {
    throw Error("quota");
  };
  store.submit("example", 1);
  assert.equal(values.get(progressStorageKey), original);
  assert.equal(store.getSnapshot().storageAvailable, false);
  assert.equal(store.getSnapshot().progress.attempts.example.choice, 1);
  assert.equal(
    JSON.parse(store.exportRecords()).current.attempts.example.choice,
    1,
  );
});
test("storage access denial preserves session feedback and cached immutable snapshots", () => {
  const store = deviceProgressStore(registry, () => {
    throw Error("blocked");
  });
  assert.equal(store.getSnapshot(), store.getSnapshot());
  store.load();
  store.submit("example", 0);
  assert.equal(store.getSnapshot().storageAvailable, false);
  assert.equal(demonstrated(store.getSnapshot().progress, registry).size, 1);
  assert.equal(store.getSnapshot(), store.getSnapshot());
});
test("external record reload notifies subscribers; null prior record can be restored", () => {
  const { store, storage, values } = fixture(null);
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications++;
  });
  storage.setItem(progressStorageKey, original);
  store.load();
  assert.equal(demonstrated(store.getSnapshot().progress, registry).size, 1);
  assert.equal(notifications, 1);
  unsubscribe();
  store.load();
  assert.equal(notifications, 1);
  values.delete(progressStorageKey);
  store.load();
  store.submit("example", 0);
  store.undo();
  assert.equal(values.has(progressStorageKey), false);
});
