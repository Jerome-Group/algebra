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
const records = await vite.ssrLoadModule("/lib/algebra/argument-records.ts");
const edition = await records.teachingEdition("foundations-functions");
const sheet = () => ({
  version: 1,
  id: crypto.randomUUID(),
  lessonId: edition.lessonId,
  unitId: "functions",
  edition,
  blocks: [
    {
      id: "block-1",
      text: "My proof",
      question: "Why unique?",
      review: "unreviewed",
      reference: 0,
    },
  ],
  activeBlockId: "block-1",
});

test("teaching freshness binds objects, statement, conventions and ordered proof strings", async () => {
  assert.equal((await records.validateArgumentEdition(sheet())).current, true);
  for (const patch of [
    { objects: `${edition.objects} changed` },
    { statement: `${edition.statement} changed` },
    { conventions: [...edition.conventions, "new convention"] },
    { proof: [...edition.proof].reverse() },
  ]) {
    const historical = { ...edition, ...patch };
    historical.digest = await records.argumentDigest(
      records.teachingFields(historical),
    );
    assert.equal(
      (
        await records.validateArgumentEdition({
          ...sheet(),
          edition: historical,
        })
      ).current,
      false,
    );
  }
  await assert.rejects(
    () =>
      records.validateArgumentEdition({
        ...sheet(),
        edition: { ...edition, objects: "forged" },
      }),
    /digest/,
  );
});

test("complete UTF-8 record bounds reject oversized, duplicate and unbound references without truncation", () => {
  const valid = sheet();
  assert.deepEqual(records.argumentSheetSchema.parse(valid), valid);
  const bad = [
    { ...valid, owner: "injected" },
    { ...valid, version: 2 },
    { ...valid, activeBlockId: "absent" },
    { ...valid, blocks: [valid.blocks[0], valid.blocks[0]] },
    {
      ...valid,
      blocks: [{ ...valid.blocks[0], reference: edition.proof.length }],
    },
    {
      ...valid,
      blocks: [
        {
          ...valid.blocks[0],
          text: "😀".repeat(records.argumentLimits.textBytes / 4 + 1),
        },
      ],
    },
    {
      ...valid,
      blocks: Array.from({ length: 8 }, (_, index) => ({
        ...valid.blocks[0],
        id: `b-${index}`,
        text: "a".repeat(records.argumentLimits.textBytes),
      })),
    },
  ];
  for (const value of bad)
    assert.equal(records.argumentSheetSchema.safeParse(value).success, false);
  assert.equal(valid.blocks[0].text, "My proof");
});

test("import preview rejects trusted owner fields and preserves historical content and unsupported export bytes", () => {
  const original = sheet();
  const backup = {
    format: "algebra-arguments-export-v1",
    saved: [{ sheet: original, revision: 5 }],
    active: {
      ...original,
      blocks: [{ ...original.blocks[0], text: "newer local writing" }],
    },
    unsupported: [
      { id: "future", revision: 9, raw: '{"version":99,"writing":"kept"}' },
    ],
    pending: null,
  };
  const preview = records.previewArgumentImport(JSON.stringify(backup));
  assert.equal(preview.sheets.length, 1);
  assert.equal(preview.sheets[0].blocks[0].text, "newer local writing");
  assert.match(preview.warnings.join(" "), /historical|newer/);
  assert.throws(() =>
    records.previewArgumentImport({ ...backup, owner: "victim" }),
  );
  assert.throws(() =>
    records.previewArgumentImport({
      ...backup,
      saved: [{ sheet: { ...original, owner: "victim" }, revision: 5 }],
    }),
  );
});

test("every public lesson has a complete bounded teaching edition and initial proof sheet", async () => {
  const { readFileSync } = await import("node:fs");
  const lessons = JSON.parse(
    readFileSync(
      new URL("../lib/algebra/lessons.json", import.meta.url),
      "utf8",
    ),
  );
  for (const lesson of lessons) {
    const current = await records.teachingEdition(lesson.id);
    const initial = {
      ...sheet(),
      lessonId: lesson.id,
      unitId: null,
      edition: current,
    };
    assert.equal(
      records.argumentSheetSchema.safeParse(initial).success,
      true,
      lesson.id,
    );
  }
});

test("argument mutation and acknowledgement identifiers preserve hexadecimal GUIDs", () => {
  for (const version of "0123456789abcdef")
    for (const variant of "0123456789abcdef") {
      const operationId = `01234567-89ab-${version}def-${variant}123-456789abcdef`;
      assert.equal(
        records.argumentMutationSchema.parse({
          operationId,
          expectedAccountId: "owner",
          createdAt: 0,
          operation: { kind: "put", expectedRevision: 0, sheet: sheet() },
        }).operationId,
        operationId,
      );
      assert.equal(
        records.argumentAcknowledgementSchema.parse({
          operationId,
          payloadHash: "a".repeat(64),
          recordId: "sheet",
          revision: 1,
          kind: "put",
        }).operationId,
        operationId,
      );
    }
});
