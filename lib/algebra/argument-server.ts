import { z } from "zod";
import type { ChatGPTUser } from "../../app/chatgpt-auth";
import {
  boundedBody,
  discardRequestRemainder,
  personalResponse,
} from "./account-server";
import {
  argumentDigest,
  argumentLimits,
  argumentMutationSchema,
  argumentSheetSchema,
  validateArgumentEdition,
  type ArgumentMutation,
  type ArgumentResponse,
} from "./argument-records";

const controlSchema = z.object({
  revision: z.number().int().nonnegative().safe(),
});
const rowSchema = z.object({
  id: z.string(),
  revision: z.number().int().positive().safe(),
  sheet: z.string(),
});
const receiptSchema = z.object({
  operation_id: z.string(),
  payload_hash: z.string(),
  record_id: z.string(),
  revision: z.number().int().nonnegative().safe(),
  kind: z.enum(["put", "delete"]),
});
type ArgumentRequest = {
  request: Request;
  user: ChatGPTUser | null;
  db: D1Database | undefined;
  now?: () => number;
};

async function readState(
  db: D1Database,
  owner: string,
  operationId = "",
  now = Date.now(),
) {
  const [control, rows, receipt, count] = await db.batch([
    db
      .prepare("SELECT revision FROM argument_accounts WHERE owner = ?")
      .bind(owner),
    db
      .prepare(
        "SELECT id, revision, sheet FROM argument_records WHERE owner = ? ORDER BY id",
      )
      .bind(owner),
    db
      .prepare(
        "SELECT operation_id, payload_hash, record_id, revision, kind FROM argument_receipts WHERE owner = ? AND operation_id = ?",
      )
      .bind(owner, operationId),
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM argument_receipts WHERE owner = ? AND expires_at >= ?",
      )
      .bind(owner, now),
  ]);
  const rawRows = z.array(rowSchema).parse(rows.results);
  const records: ArgumentResponse["records"] = rawRows.map((row) => {
    let raw: unknown;
    try {
      raw = JSON.parse(row.sheet);
    } catch {
      raw = null;
    }
    const parsed = argumentSheetSchema.safeParse(raw);
    return parsed.success && parsed.data.id === row.id
      ? {
          kind: "supported",
          saved: { sheet: parsed.data, revision: row.revision },
        }
      : {
          kind: "unsupported",
          id: row.id,
          revision: row.revision,
          raw: row.sheet,
        };
  });
  return {
    revision: control.results.length
      ? controlSchema.parse(control.results[0]).revision
      : 0,
    rows: rawRows,
    records,
    receipt: receipt.results.length
      ? receiptSchema.parse(receipt.results[0])
      : null,
    receiptCount: z
      .object({ count: z.number().int().nonnegative() })
      .parse(count.results[0]).count,
  };
}
const acknowledgement = (receipt: z.infer<typeof receiptSchema>) => ({
  operationId: receipt.operation_id,
  payloadHash: receipt.payload_hash,
  recordId: receipt.record_id,
  revision: receipt.revision,
  kind: receipt.kind,
});

export async function handleArguments(
  input: ArgumentRequest,
): Promise<Response> {
  try {
    return await respond(input);
  } finally {
    await discardRequestRemainder(input.request, argumentLimits.requestBytes);
  }
}

async function respond({
  request,
  user,
  db,
  now = Date.now,
}: ArgumentRequest): Promise<Response> {
  if (!user)
    return personalResponse(
      { error: "Sign in with ChatGPT before saving arguments." },
      401,
    );
  if (request.method !== "GET" && request.method !== "POST")
    return personalResponse({ error: "Method not allowed." }, 405);
  let mutation: ArgumentMutation | null = null;
  if (request.method === "POST") {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return personalResponse({ error: "Same-origin request required." }, 403);
    if (
      request.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      return personalResponse({ error: "JSON content type required." }, 415);
    try {
      mutation = argumentMutationSchema.parse(
        await boundedBody(request, argumentLimits.requestBytes),
      );
    } catch (error) {
      return personalResponse(
        {
          error:
            error instanceof RangeError
              ? "Argument request exceeds 100 KiB."
              : "Unsupported argument request.",
        },
        error instanceof RangeError ? 413 : 400,
      );
    }
  }
  const expectedAccountId =
    mutation?.expectedAccountId ?? request.headers.get("X-Expected-Account-Id");
  if (expectedAccountId !== user.id)
    return personalResponse(
      {
        code: "account_changed",
        error: "Account changed. Confirm sign-in before saving arguments.",
      },
      409,
    );
  if (!db)
    return personalResponse(
      {
        error:
          "Argument storage is unavailable. Your writing remains unsaved and exportable.",
      },
      503,
    );
  try {
    if (!mutation) {
      const state = await readState(db, user.id);
      return personalResponse({
        kind: "account",
        accountId: user.id,
        records: state.records,
      } satisfies ArgumentResponse);
    }
    const payloadHash = await argumentDigest(mutation);
    const operation = mutation.operation;
    const recordId =
      operation.kind === "put" ? operation.sheet.id : operation.id;
    for (let attempt = 0; attempt < 3; attempt++) {
      const time = now();
      const state = await readState(db, user.id, mutation.operationId, time);
      const view = {
        kind: "account",
        accountId: user.id,
        records: state.records,
      } satisfies ArgumentResponse;
      if (state.receipt)
        return state.receipt.payload_hash === payloadHash
          ? personalResponse({
              ...view,
              acknowledgement: acknowledgement(state.receipt),
            })
          : personalResponse(
              {
                ...view,
                error: "Operation ID already belongs to another request.",
              },
              409,
            );
      if (
        mutation.createdAt > time + 60_000 ||
        mutation.createdAt < time - argumentLimits.receiptLifetimeMs
      )
        return personalResponse(
          {
            ...view,
            error:
              "This save operation expired. Export retained writing, then explicitly save it as a new copy.",
          },
          422,
        );
      const current = state.rows.find((row) => row.id === recordId);
      if ((current?.revision ?? 0) !== operation.expectedRevision)
        return personalResponse(
          {
            ...view,
            error:
              "Another tab changed this argument. Both versions are retained; choose the server version or save a copy.",
          },
          409,
        );
      if (
        current?.revision === Number.MAX_SAFE_INTEGER ||
        state.revision === Number.MAX_SAFE_INTEGER
      )
        return personalResponse(
          {
            ...view,
            error:
              "Argument revision limit reached. Export your writing; the stored record remains unchanged.",
          },
          422,
        );
      if (operation.kind === "put") {
        const existing = state.records.find(
          (record) => record.kind === "unsupported" && record.id === recordId,
        );
        if (existing)
          return personalResponse(
            {
              ...view,
              error:
                "This stored argument is unreadable or newer. Export it before choosing a separate new copy.",
            },
            422,
          );
        try {
          await validateArgumentEdition(operation.sheet);
        } catch {
          return personalResponse(
            {
              ...view,
              error:
                "The retained teaching edition is invalid. Your stored arguments remain unchanged.",
            },
            422,
          );
        }
        const nextCount = state.rows.length + (current ? 0 : 1);
        const nextBytes =
          state.rows.reduce(
            (total, row) =>
              total + new TextEncoder().encode(row.sheet).byteLength,
            0,
          ) -
          (current ? new TextEncoder().encode(current.sheet).byteLength : 0) +
          new TextEncoder().encode(JSON.stringify(operation.sheet)).byteLength;
        if (
          nextCount > argumentLimits.records ||
          nextBytes > argumentLimits.accountBytes
        )
          return personalResponse(
            {
              ...view,
              error:
                "Argument quota reached (128 sheets or 4 MiB). Export and explicitly delete a sheet before saving more. Competency progress is unaffected.",
            },
            413,
          );
      }
      if (state.receiptCount >= argumentLimits.receipts)
        return personalResponse(
          {
            ...view,
            error:
              "Argument save receipt quota reached (4096 operations in 24 hours). Export your writing and save again after earlier receipts expire.",
          },
          429,
        );
      await db
        .prepare(
          "INSERT INTO argument_accounts (owner, revision, transaction_id) VALUES (?, 0, '') ON CONFLICT(owner) DO NOTHING",
        )
        .bind(user.id)
        .run();
      const transactionId = crypto.randomUUID();
      const revision = Math.max(state.revision, operation.expectedRevision) + 1;
      const guard =
        "EXISTS (SELECT 1 FROM argument_accounts WHERE owner = ? AND transaction_id = ?)";
      const write =
        operation.kind === "put"
          ? db
              .prepare(
                `INSERT INTO argument_records (owner, id, revision, sheet) SELECT ?, ?, ?, ? WHERE ${guard} ON CONFLICT(owner, id) DO UPDATE SET revision = excluded.revision, sheet = excluded.sheet`,
              )
              .bind(
                user.id,
                recordId,
                revision,
                JSON.stringify(operation.sheet),
                user.id,
                transactionId,
              )
          : db
              .prepare(
                `DELETE FROM argument_records WHERE owner = ? AND id = ? AND ${guard}`,
              )
              .bind(user.id, recordId, user.id, transactionId);
      const results = await db.batch([
        db
          .prepare(
            "UPDATE argument_accounts SET revision = ?, transaction_id = ? WHERE owner = ? AND revision = ?",
          )
          .bind(revision, transactionId, user.id, state.revision),
        write,
        db
          .prepare(
            `DELETE FROM argument_receipts WHERE owner = ? AND expires_at < ? AND ${guard}`,
          )
          .bind(user.id, time, user.id, transactionId),
        db
          .prepare(
            `INSERT INTO argument_receipts (owner, operation_id, payload_hash, record_id, revision, kind, expires_at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${guard}`,
          )
          .bind(
            user.id,
            mutation.operationId,
            payloadHash,
            recordId,
            revision,
            operation.kind,
            mutation.createdAt + argumentLimits.receiptLifetimeMs,
            user.id,
            transactionId,
          ),
      ]);
      if (results[0].meta.changes !== 1) continue;
      const latest = await readState(db, user.id, mutation.operationId, time);
      if (!latest.receipt || latest.receipt.payload_hash !== payloadHash)
        throw new Error("Missing committed operation receipt.");
      return personalResponse({
        kind: "account",
        accountId: user.id,
        records: latest.records,
        acknowledgement: acknowledgement(latest.receipt),
      } satisfies ArgumentResponse);
    }
    const latest = await readState(db, user.id);
    return personalResponse(
      {
        kind: "account",
        accountId: user.id,
        records: latest.records,
        error:
          "Other arguments are being saved. Your writing is retained; retry the same save.",
      } satisfies ArgumentResponse,
      503,
    );
  } catch {
    return personalResponse(
      {
        error:
          "Argument storage is unavailable. Delivery may be unknown; retry the same operation or export your writing.",
      },
      503,
    );
  }
}
