import { z } from "zod";
import type { ChatGPTUser } from "../../app/chatgpt-auth";
import {
  accountByteLimit,
  applyAccountOperation,
  documentSchema,
  emptyAccountDocument,
  mutationSchema,
  receiptLimit,
  serializedBytes,
  type AccountMutation,
  type AccountResponse,
  type AccountUser,
} from "./account-progress";
import type { AssessmentRegistry } from "./progress";

const rowSchema = z.object({
  owner: z.string(),
  revision: z.number().int().nonnegative().safe(),
  document: z.string(),
});
const personalHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, oai-authenticated-user-id, oai-authenticated-user-email",
};
export function personalResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: personalHeaders });
}
const displayUser = (user: ChatGPTUser): AccountUser => ({
  id: user.id,
  displayName: user.displayName,
  email: user.email,
});

async function accountView(
  db: D1Database,
  user: AccountUser,
): Promise<Extract<AccountResponse, { kind: "account" }>> {
  const raw = await db
    .prepare(
      "SELECT owner, revision, document FROM account_progress WHERE owner = ?",
    )
    .bind(user.id)
    .first();
  if (raw === null)
    return {
      kind: "account",
      user,
      record: { kind: "supported", document: emptyAccountDocument() },
    };
  const row = rowSchema.parse(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.document);
  } catch {
    parsed = null;
  }
  const supported = documentSchema.safeParse(parsed);
  const record =
    supported.success && supported.data.revision === row.revision
      ? { kind: "supported" as const, document: supported.data }
      : {
          kind: "unsupported" as const,
          raw: row.document,
          revision: row.revision,
        };
  return { kind: "account", user, record };
}

async function boundedBody(request: Request): Promise<unknown> {
  const announced = request.headers.get("content-length");
  if (
    announced !== null &&
    (!/^\d+$/.test(announced) || Number(announced) > accountByteLimit)
  )
    throw new RangeError("Request exceeds the account size limit.");
  if (!request.body) throw new Error("A JSON body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > accountByteLimit)
        throw new RangeError("Request exceeds the account size limit.");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, position);
    position += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

async function discardRequestRemainder(request: Request) {
  const body = request.body;
  if (!body || body.locked) return;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve();
    }, 2000);
  });
  let discardedBytes = 0;
  try {
    await Promise.race([
      body
        .pipeTo(
          new WritableStream<Uint8Array>({
            write(chunk) {
              discardedBytes += chunk.byteLength;
              if (discardedBytes > accountByteLimit * 2) controller.abort();
            },
          }),
          { signal: controller.signal },
        )
        .catch(() => {}),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function fingerprint(mutation: AccountMutation) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(mutation)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

type AccountRequest = {
  request: Request;
  user: ChatGPTUser | null;
  db: D1Database | undefined;
  registry: AssessmentRegistry;
};

export async function handleAccountProgress(
  input: AccountRequest,
): Promise<Response> {
  try {
    return await respondToAccountProgress(input);
  } finally {
    await discardRequestRemainder(input.request);
  }
}

async function respondToAccountProgress({
  request,
  user,
  db,
  registry,
}: AccountRequest): Promise<Response> {
  if (request.method === "GET" && !user)
    return personalResponse({ kind: "guest" });
  if (!user)
    return personalResponse(
      { error: "Sign in with ChatGPT before saving." },
      401,
    );
  if (request.method !== "GET" && request.method !== "POST")
    return personalResponse({ error: "Method not allowed." }, 405);
  let mutation: AccountMutation | undefined;
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
      mutation = mutationSchema.parse(await boundedBody(request));
    } catch (error) {
      return personalResponse(
        {
          error:
            error instanceof RangeError
              ? error.message
              : "Unsupported account request.",
        },
        error instanceof RangeError ? 413 : 400,
      );
    }
    if (mutation.expectedAccountId !== user.id)
      return personalResponse(
        {
          code: "account_changed",
          error: "Account changed. Reload before saving.",
        },
        409,
      );
  }
  if (!db)
    return personalResponse(
      { error: "Account storage is unavailable. Your changes are unsaved." },
      503,
    );
  try {
    const accountUser = displayUser(user);
    if (!mutation) return personalResponse(await accountView(db, accountUser));
    const current = await accountView(db, accountUser);
    if (current.record.kind === "unsupported")
      return personalResponse(
        {
          ...current,
          error:
            "Stored data is unreadable or newer. Export it; it remains unchanged.",
        },
        422,
      );
    const hash = await fingerprint(mutation);
    const receipt = current.record.document.receipts.find(
      (entry) => entry.operationId === mutation.operationId,
    );
    if (receipt)
      return receipt.payloadHash === hash
        ? personalResponse({
            ...current,
            acknowledgement: {
              operationId: mutation.operationId,
              appliedRevision: receipt.appliedRevision,
            },
          })
        : personalResponse(
            {
              ...current,
              error: "Operation ID already belongs to another request.",
            },
            409,
          );
    if (current.record.document.revision !== mutation.expectedRevision)
      return personalResponse(
        {
          ...current,
          error:
            "Another save changed your account. Your unsaved changes were not applied.",
        },
        409,
      );
    let next;
    try {
      next = applyAccountOperation(
        current.record.document,
        mutation.operation,
        registry,
      );
    } catch (error) {
      return personalResponse(
        {
          ...current,
          error:
            error instanceof Error
              ? error.message
              : "Invalid account operation.",
        },
        422,
      );
    }
    next.receipts = [
      ...next.receipts,
      {
        operationId: mutation.operationId,
        payloadHash: hash,
        appliedRevision: next.revision,
      },
    ].slice(-receiptLimit);
    if (serializedBytes(next) > accountByteLimit)
      return personalResponse(
        {
          ...current,
          error:
            "Account history exceeds the size limit. Export before making more changes; no history was removed.",
        },
        413,
      );
    await db
      .prepare(
        "INSERT INTO account_progress (owner, revision, document) VALUES (?, 0, ?) ON CONFLICT(owner) DO NOTHING",
      )
      .bind(user.id, JSON.stringify(emptyAccountDocument()))
      .run();
    const saved = await db
      .prepare(
        "UPDATE account_progress SET revision = ?, document = ? WHERE owner = ? AND revision = ?",
      )
      .bind(
        next.revision,
        JSON.stringify(next),
        user.id,
        mutation.expectedRevision,
      )
      .run();
    if (saved.meta.changes === 1)
      return personalResponse({
        kind: "account",
        user: accountUser,
        record: { kind: "supported", document: next },
        acknowledgement: {
          operationId: mutation.operationId,
          appliedRevision: next.revision,
        },
      });
    const latest = await accountView(db, accountUser);
    const repeated =
      latest.record.kind === "supported"
        ? latest.record.document.receipts.find(
            (entry) =>
              entry.operationId === mutation.operationId &&
              entry.payloadHash === hash,
          )
        : undefined;
    return repeated
      ? personalResponse({
          ...latest,
          acknowledgement: {
            operationId: mutation.operationId,
            appliedRevision: repeated.appliedRevision,
          },
        })
      : personalResponse(
          {
            ...latest,
            error:
              "Another save changed your account. Your unsaved changes were not applied.",
          },
          409,
        );
  } catch {
    return personalResponse(
      {
        error:
          "Account storage is unavailable. Delivery may be unknown; retry the same operation or export unsaved changes.",
      },
      503,
    );
  }
}
