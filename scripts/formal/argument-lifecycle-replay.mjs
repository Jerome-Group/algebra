import assert from "node:assert/strict";
import { createServer } from "vite";

const [sourceRoot, scenario = "all"] = process.argv.slice(2);
assert(sourceRoot, "Supply the isolated source root");
const vite = await createServer({
  root: sourceRoot,
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false },
});
const { accountProgressStore } = await vite.ssrLoadModule(
  "/lib/algebra/account-store.ts",
);
const domain = await vite.ssrLoadModule("/lib/algebra/argument-records.ts");
const progress = await vite.ssrLoadModule("/lib/algebra/account-progress.ts");
const receipts = [];
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const waitFor = async (predicate, message) => {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    assert(Date.now() < deadline, message);
    await new Promise((resolve) => setImmediate(resolve));
  }
};
const account = (id) => ({
  kind: "account",
  user: { id, email: `${id}@example.test`, displayName: id },
  record: { kind: "supported", document: progress.emptyAccountDocument() },
});
const notes = (id, records = [], extra = {}) => ({
  kind: "account",
  accountId: id,
  records: records.map((saved) => ({ kind: "supported", saved })),
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
    fetcher: (url, init) => {
      const fetchResult = deferred();
      const jsonResult = deferred();
      const jsonStarted = deferred();
      requests.push({
        url,
        init,
        jsonStarted: jsonStarted.promise,
        reject: fetchResult.reject,
        releaseFetch(status = 200) {
          fetchResult.resolve({
            status,
            ok: status >= 200 && status < 300,
            json() {
              jsonStarted.resolve();
              return jsonResult.promise;
            },
          });
        },
        releaseJson: jsonResult.resolve,
        resolve(body, status = 200) {
          this.releaseFetch(status);
          this.releaseJson(body);
        },
      });
      return fetchResult.promise;
    },
  });
  return { store, arguments: store.arguments, requests };
}

async function signedIn() {
  const f = fixture();
  const loading = f.store.load();
  f.requests[0].resolve(account("A"));
  await loading;
  f.requests[1].resolve(notes("A"));
  await waitFor(() => f.arguments.getSnapshot().phase === "ready", "A loaded");
  await f.arguments.start("foundations-functions", "functions");
  edit(f, "A private captured writing");
  return f;
}

function edit(f, text) {
  const sheet = f.arguments.getSnapshot().active;
  f.arguments.edit({ ...sheet, blocks: [{ ...sheet.blocks[0], text }] });
}

async function acknowledgement(request) {
  const mutation = JSON.parse(request.init.body);
  const operation = mutation.operation;
  assert.equal(operation.kind, "put");
  const revision = operation.expectedRevision + 1;
  return notes(
    mutation.expectedAccountId,
    [{ sheet: operation.sheet, revision }],
    {
      acknowledgement: {
        operationId: mutation.operationId,
        payloadHash: await domain.argumentDigest(mutation),
        recordId: operation.sheet.id,
        revision,
        kind: "put",
      },
    },
  );
}

function pauseDigest() {
  const original = crypto.subtle.digest;
  const started = deferred();
  const release = deferred();
  crypto.subtle.digest = function (...args) {
    const result = original.apply(this, args);
    started.resolve();
    return result.then(async (bytes) => {
      await release.promise;
      return bytes;
    });
  };
  return {
    started: started.promise,
    release: release.resolve,
    restore: () => {
      crypto.subtle.digest = original;
      release.resolve();
    },
  };
}

async function switchToB(f) {
  const index = f.requests.length;
  const refreshing = f.store.refresh();
  assert.doesNotMatch(f.arguments.exportRecords(), /A private/);
  const request = f.requests[index];
  request.releaseFetch();
  await request.jsonStarted;
  assert.equal(f.arguments.getSnapshot().phase, "hidden");
  request.releaseJson(account("B"));
  await refreshing;
  assert.equal(f.store.getSnapshot().account.id, "B");
  f.requests[index + 1].resolve(notes("B"));
  await waitFor(() => f.arguments.getSnapshot().phase === "ready", "B loaded");
}

async function ownerPrivacy(boundary) {
  const f = await signedIn();
  let gate;
  try {
    const saving = f.arguments.save();
    const request = f.requests[2];
    const response = await acknowledgement(request);
    if (boundary !== "fetch") {
      request.releaseFetch();
      await request.jsonStarted;
    }
    if (boundary === "digest") {
      gate = pauseDigest();
      request.releaseJson(response);
      await gate.started;
    }
    await switchToB(f);
    if (boundary === "fetch") request.resolve(response);
    if (boundary === "json") request.releaseJson(response);
    if (gate) gate.release();
    await saving;
    assert.doesNotMatch(
      f.arguments.exportRecords(),
      /A private captured writing/,
      "OwnerPrivacy: B export contains A private captured writing",
    );
    assert.equal(f.arguments.getSnapshot().acknowledged, null);
    receipts.push({
      property: "OwnerPrivacy",
      boundary,
      trace: [
        "Save",
        `pause ${boundary}`,
        "Refresh",
        "RefreshFetch",
        "RefreshJson(B)",
        "ArgumentsFetch",
        "ArgumentsJson",
        `release ${boundary}`,
        "B export excludes A",
      ],
    });
  } finally {
    gate?.restore();
    f.store.dispose();
  }
}

async function capturedAcknowledgement() {
  const f = await signedIn();
  let gate;
  try {
    const saving = f.arguments.save();
    const request = f.requests[2];
    const response = await acknowledgement(request);
    gate = pauseDigest();
    request.resolve(response);
    await gate.started;
    edit(f, "A private later typing");
    gate.release();
    await saving;
    const snapshot = f.arguments.getSnapshot();
    assert.equal(
      snapshot.acknowledged.sheet.blocks[0].text,
      "A private captured writing",
      "CapturedAcknowledgement: acknowledgement labels later typing as saved",
    );
    assert.equal(snapshot.active.blocks[0].text, "A private later typing");
    assert.equal(snapshot.dirty, true, "Later typing must remain unsaved");
    receipts.push({
      property: "CapturedAcknowledgement",
      trace: [
        "Save",
        "WriteFetch",
        "WriteJson",
        "Edit",
        "WriteDigest",
        "later typing remains dirty",
      ],
    });
  } finally {
    gate?.restore();
    f.store.dispose();
  }
}

async function immutableRetry() {
  const f = await signedIn();
  try {
    const saving = f.arguments.save();
    const original = f.requests[2];
    original.reject(new Error("Ambiguous transport failure"));
    await saving;
    assert.equal(f.arguments.getSnapshot().canRetry, true);
    edit(f, "A private later typing");
    const retrying = f.arguments.retry();
    const retried = f.requests[3];
    assert.equal(
      retried.init.body,
      original.init.body,
      "ImmutableRetry: retry changed the captured request bytes",
    );
    retried.resolve(await acknowledgement(retried));
    await retrying;
    assert.equal(f.arguments.getSnapshot().dirty, true);
    assert.equal(
      f.arguments.getSnapshot().acknowledged.sheet.blocks[0].text,
      "A private captured writing",
    );
    receipts.push({
      property: "ImmutableRetry",
      trace: [
        "Save",
        "WriteFailure",
        "Edit",
        "Retry",
        "identical serialized body",
        "WriteFetch",
        "WriteJson",
        "WriteDigest",
      ],
    });
  } finally {
    f.store.dispose();
  }
}

async function sameOwnerLoadCancellation(boundary) {
  const f = await signedIn();
  try {
    const refreshing = f.store.refresh();
    assert.doesNotMatch(f.arguments.exportRecords(), /A private/);
    f.requests[2].resolve(account("A"));
    await refreshing;
    assert.equal(f.store.getSnapshot().account.id, "A");
    assert.equal(
      f.arguments.getSnapshot().active.blocks[0].text,
      "A private captured writing",
    );
    const staleLoad = f.requests[3];
    if (boundary === "json") {
      staleLoad.releaseFetch();
      await staleLoad.jsonStarted;
    }
    const saving = f.arguments.save();
    const request = f.requests[4];
    request.resolve(await acknowledgement(request));
    await saving;
    if (boundary === "fetch") staleLoad.resolve(notes("A"));
    else staleLoad.releaseJson(notes("A"));
    await new Promise((resolve) => setImmediate(resolve));
    const snapshot = f.arguments.getSnapshot();
    assert.equal(
      snapshot.saved.length,
      1,
      "A pre-save load must not erase the acknowledged saved record",
    );
    assert.equal(
      snapshot.saved[0].sheet.blocks[0].text,
      "A private captured writing",
    );
    assert.equal(snapshot.dirty, false);
    receipts.push({
      property: "ReadSequenceCorrespondence",
      boundary,
      trace: [
        "Refresh",
        "RefreshJson(A)",
        "Save",
        "WriteDigest",
        "release pre-save " + boundary,
        "acknowledged record retained",
      ],
    });
  } finally {
    f.store.dispose();
  }
}

try {
  if (scenario === "all") {
    for (const boundary of ["fetch", "json", "digest"])
      await ownerPrivacy(boundary);
    for (const boundary of ["fetch", "json"])
      await sameOwnerLoadCancellation(boundary);
  } else if (scenario === "privacy") await ownerPrivacy("digest");
  if (["all", "ack"].includes(scenario)) await capturedAcknowledgement();
  if (["all", "retry"].includes(scenario)) await immutableRetry();
  assert(receipts.length, "Unknown replay scenario");
  console.log(JSON.stringify({ passed: true, receipts }, null, 2));
} finally {
  await vite.close();
}
