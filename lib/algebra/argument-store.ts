import {
  argumentBytes,
  argumentDigest,
  argumentErrorSchema,
  argumentLimits,
  argumentResponseSchema,
  argumentSheetSchema,
  previewArgumentImport,
  savedArgumentSchema,
  teachingEdition,
  validateArgumentEdition,
  type ArgumentMutation,
  type ArgumentResponse,
  type ArgumentSheet,
  type SavedArgument,
} from "./argument-records";

type Identity = {
  active: boolean;
  generation: number;
  accountId: string | null;
  confirmed: boolean;
};
export type ArgumentSnapshot = {
  phase:
    | "hidden"
    | "guest"
    | "loading"
    | "ready"
    | "saving"
    | "failed"
    | "conflict"
    | "unsupported";
  active: ArgumentSheet | null;
  saved: SavedArgument[];
  acknowledged: SavedArgument | null;
  conflict: SavedArgument | null;
  dirty: boolean;
  canRetry: boolean;
  message: string;
};
type Unsupported = Extract<
  ArgumentResponse["records"][number],
  { kind: "unsupported" }
>;
type Pending = { request: ArgumentMutation; body: string };
const responseOwnerSchema = argumentResponseSchema
  .pick({ accountId: true })
  .strip();
const sameSheet = (left: ArgumentSheet | null, right: ArgumentSheet | null) =>
  JSON.stringify(left) === JSON.stringify(right);

export function argumentStore({
  identity,
  expireIdentity,
  fetcher = fetch,
  uuid = () => crypto.randomUUID(),
  now = Date.now,
}: {
  identity: () => Identity;
  expireIdentity: () => void;
  fetcher?: typeof fetch;
  uuid?: () => string;
  now?: () => number;
}) {
  const initial: ArgumentSnapshot = {
    phase: "hidden",
    active: null,
    saved: [],
    acknowledged: null,
    conflict: null,
    dirty: false,
    canRetry: false,
    message: "Confirming account before showing private arguments…",
  };
  let snapshot = initial;
  let unsupported: Unsupported[] = [];
  let pending: Pending | null = null;
  let transmitting = false;
  let readSequence = 0;
  let concealed: {
    snapshot: ArgumentSnapshot;
    unsupported: Unsupported[];
    pending: Pending | null;
  } | null = null;
  const listeners = new Set<() => void>();
  const emit = (patch: Partial<ArgumentSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    snapshot = {
      ...snapshot,
      canRetry: pending !== null,
      dirty:
        snapshot.active !== null &&
        !sameSheet(snapshot.active, snapshot.acknowledged?.sheet ?? null),
    };
    listeners.forEach((listener) => listener());
  };
  const current = (capture: Identity) => {
    const live = identity();
    return (
      live.active &&
      live.confirmed &&
      live.generation === capture.generation &&
      live.accountId === capture.accountId
    );
  };
  const visible = () => !["hidden", "loading"].includes(snapshot.phase);
  const canReplace = () => {
    if (!visible()) return false;
    if (snapshot.dirty || pending) {
      emit({
        message:
          "Keep, save, export, or explicitly discard the current writing before replacing it.",
      });
      return false;
    }
    return true;
  };
  const basePhase = (): ArgumentSnapshot["phase"] =>
    identity().accountId
      ? unsupported.length
        ? "unsupported"
        : "ready"
      : "guest";
  const recordsFrom = (response: ArgumentResponse) => {
    const previous: ArgumentResponse["records"] = [
      ...snapshot.saved.map((saved) => ({ kind: "supported" as const, saved })),
      ...unsupported,
    ];
    const recordId = (record: ArgumentResponse["records"][number]) =>
      record.kind === "supported" ? record.saved.sheet.id : record.id;
    const revision = (record: ArgumentResponse["records"][number]) =>
      record.kind === "supported" ? record.saved.revision : record.revision;
    const known = new Map(previous.map((record) => [recordId(record), record]));
    const records = response.records.map((record) => {
      const retained = known.get(recordId(record));
      return retained && revision(retained) > revision(record)
        ? retained
        : record;
    });
    unsupported = records.filter(
      (record): record is Unsupported => record.kind === "unsupported",
    );
    return records.flatMap((record) =>
      record.kind === "supported" ? [record.saved] : [],
    );
  };
  const fail = (error: unknown) =>
    emit({
      phase: "failed",
      message:
        error instanceof Error
          ? error.message
          : "Arguments could not load. Writing remains unsaved and exportable.",
    });

  const load = async () => {
    const capture = identity();
    if (!capture.confirmed || !capture.accountId) return;
    const sequence = ++readSequence;
    if (!snapshot.active && !snapshot.saved.length)
      emit({ phase: "loading", message: "Loading this account’s arguments…" });
    try {
      const response = await fetcher("/api/arguments", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { "X-Expected-Account-Id": capture.accountId },
      });
      if (!current(capture) || sequence !== readSequence) return;
      if (response.status === 401) {
        expireIdentity();
        return;
      }
      const raw: unknown = await response.json();
      if (!current(capture) || sequence !== readSequence) return;
      if (isAccountChanged(raw)) {
        expireIdentity();
        return;
      }
      const parsed = argumentResponseSchema.safeParse(raw);
      if (!response.ok || !parsed.success)
        throw new Error(
          errorMessage(
            raw,
            "Argument storage could not load. Your writing remains unsaved and exportable.",
          ),
        );
      if (parsed.data.accountId !== capture.accountId) {
        expireIdentity();
        return;
      }
      const saved = recordsFrom(parsed.data);
      const acknowledged = snapshot.acknowledged;
      const latest = snapshot.active
        ? saved.find((record) => record.sheet.id === snapshot.active?.id)
        : undefined;
      if (
        acknowledged &&
        (!latest || latest.revision > acknowledged.revision) &&
        snapshot.active
      ) {
        emit({
          saved,
          conflict: latest ?? null,
          phase: "conflict",
          message:
            "Another tab changed or deleted this argument. Local writing is retained. Choose the server version or save a copy.",
        });
      } else {
        emit({
          saved,
          phase: pending
            ? "failed"
            : snapshot.phase === "conflict"
              ? "conflict"
              : basePhase(),
          message: pending
            ? "Save outcome is unknown after checking sign-in. Retry the same operation or export your writing."
            : unsupported.length
              ? "Some stored arguments are unreadable or newer. They remain unchanged and exportable."
              : "Arguments loaded. Save explicitly to acknowledge your writing.",
        });
      }
    } catch (error) {
      if (current(capture) && sequence === readSequence) fail(error);
    }
  };

  const transmit = async () => {
    const capture = identity();
    if (
      transmitting ||
      !pending ||
      !capture.accountId ||
      !capture.confirmed ||
      !visible()
    )
      return;
    const sent = pending;
    if (sent.request.expectedAccountId !== capture.accountId) {
      expireIdentity();
      return;
    }
    transmitting = true;
    readSequence++;
    emit({
      phase: "saving",
      message:
        "Saving the captured writing. Later edits remain unsaved until a further acknowledgement.",
    });
    try {
      const response = await fetcher("/api/arguments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: sent.body,
      });
      if (!current(capture) || pending !== sent) return;
      if (response.status === 401) {
        expireIdentity();
        return;
      }
      const raw: unknown = await response.json();
      if (!current(capture) || pending !== sent) return;
      if (isAccountChanged(raw)) {
        expireIdentity();
        return;
      }
      const owner = responseOwnerSchema.safeParse(raw);
      if (owner.success && owner.data.accountId !== capture.accountId) {
        expireIdentity();
        return;
      }
      const parsed = argumentResponseSchema.safeParse(raw);
      if (parsed.success) {
        const result = parsed.data;
        const receipt = result.acknowledgement;
        const saved = recordsFrom(result);
        if (
          response.ok &&
          receipt?.operationId === sent.request.operationId &&
          receipt.payloadHash === (await argumentDigest(sent.request))
        ) {
          if (!current(capture) || pending !== sent) return;
          const operation = sent.request.operation;
          const id =
            operation.kind === "put" ? operation.sheet.id : operation.id;
          if (
            receipt.recordId !== id ||
            receipt.kind !== operation.kind ||
            receipt.revision <= operation.expectedRevision
          )
            throw new Error(
              "The argument acknowledgement did not match the captured save. Retry the same operation.",
            );
          pending = null;
          if (operation.kind === "delete") {
            const activeDeleted = snapshot.active?.id === operation.id;
            const laterWriting = activeDeleted && snapshot.dirty;
            emit({
              saved,
              ...(activeDeleted
                ? {
                    active: laterWriting ? snapshot.active : null,
                    acknowledged: null,
                    conflict: null,
                  }
                : {}),
              phase: laterWriting ? "conflict" : basePhase(),
              message: laterWriting
                ? "Deletion acknowledged. Later edits remain unsaved and exportable; save a copy or choose the server deletion."
                : "Argument deletion acknowledged. Competency progress is unchanged.",
            });
            return;
          }
          const acknowledged = {
            sheet: operation.sheet,
            revision: receipt.revision,
          };
          const latest = saved.find(
            (record) => record.sheet.id === operation.sheet.id,
          );
          const changedAgain = !latest || latest.revision > receipt.revision;
          emit({
            saved,
            acknowledged,
            conflict: changedAgain ? (latest ?? null) : null,
            phase: changedAgain ? "conflict" : basePhase(),
            message: changedAgain
              ? "Captured writing was saved, then changed or deleted elsewhere. Both versions are retained; choose the server version or save a copy."
              : sameSheet(snapshot.active, operation.sheet)
                ? "Saved this exact writing to your ChatGPT account."
                : "Captured writing saved. Your later edits remain unsaved.",
          });
          return;
        }
        if (response.status === 409) {
          const operation = sent.request.operation;
          const id =
            operation.kind === "put" ? operation.sheet.id : operation.id;
          pending = null;
          if (
            operation.kind === "delete" &&
            snapshot.active?.id !== operation.id
          ) {
            emit({
              saved,
              phase: "failed",
              message:
                "The selected saved argument changed before deletion. Your current writing is unchanged. Review the updated saved argument before deleting it again.",
            });
            return;
          }
          emit({
            saved,
            conflict: saved.find((record) => record.sheet.id === id) ?? null,
            phase: "conflict",
            message:
              result.error ??
              "Another tab saved first. Local writing remains available; use the server version or save a copy.",
          });
          return;
        }
        if ([400, 413, 415, 422, 429].includes(response.status)) pending = null;
        emit({ saved });
      } else if (
        [400, 413, 415, 422].includes(response.status) &&
        argumentErrorSchema.safeParse(raw).success
      )
        pending = null;
      fail(
        new Error(
          errorMessage(
            raw,
            "Save outcome is unknown. Retry the same operation or export your writing.",
          ),
        ),
      );
    } catch (error) {
      if (current(capture) && pending === sent)
        fail(
          error instanceof Error
            ? new Error(
                `Save outcome is unknown. ${error.message} Retry the same operation or export your writing.`,
              )
            : error,
        );
    } finally {
      if (current(capture) && (pending === sent || pending === null))
        transmitting = false;
    }
  };
  const enqueue = async (operation: ArgumentMutation["operation"]) => {
    const capture = identity();
    if (!capture.accountId || !capture.confirmed || !visible()) return;
    if (pending) {
      emit({
        message:
          "Resolve the pending captured save with Retry before creating another operation, or explicitly save a copy.",
      });
      return;
    }
    const request: ArgumentMutation = {
      operationId: uuid(),
      expectedAccountId: capture.accountId,
      createdAt: now(),
      operation,
    };
    pending = { request, body: JSON.stringify(request) };
    await transmit();
  };
  const save = async () => {
    if (!visible() || !snapshot.active) return;
    if (!identity().accountId) {
      emit({
        message:
          "Guest writing stays in temporary memory. Export it before leaving; sign in before saving across devices.",
      });
      return;
    }
    if (snapshot.phase === "conflict") {
      emit({
        message:
          "Choose the server version or Save as a copy to resolve this conflict.",
      });
      return;
    }
    if (pending) {
      await transmit();
      return;
    }
    const sheet = argumentSheetSchema.parse(snapshot.active);
    await enqueue({
      kind: "put",
      expectedRevision: snapshot.acknowledged?.revision ?? 0,
      sheet,
    });
  };
  const start = async (lessonId: string, unitId?: string) => {
    if (!canReplace()) return;
    const capture = identity();
    const before = snapshot.active;
    const edition = await teachingEdition(lessonId);
    if (!current(capture) || snapshot.active !== before || !canReplace())
      return;
    const blockId = uuid();
    const sheet = argumentSheetSchema.parse({
      version: 1,
      id: uuid(),
      lessonId,
      unitId: unitId ?? null,
      edition,
      blocks: [
        {
          id: blockId,
          text: "",
          question: "",
          review: "unreviewed",
          reference: null,
        },
      ],
      activeBlockId: blockId,
    });
    emit({
      active: sheet,
      acknowledged: null,
      conflict: null,
      phase: basePhase(),
      message: "New temporary argument. Save explicitly when ready.",
    });
  };
  const copy = async (empty: boolean) => {
    if (!visible() || !snapshot.active || transmitting) return;
    const previous = snapshot.active;
    pending = null;
    const blocks = empty
      ? [
          {
            id: uuid(),
            text: "",
            question: "",
            review: "unreviewed" as const,
            reference: null,
          },
        ]
      : previous.blocks.map((block) => ({ ...block, id: uuid() }));
    const activeIndex = previous.blocks.findIndex(
      (block) => block.id === previous.activeBlockId,
    );
    const sheet = argumentSheetSchema.parse({
      ...previous,
      id: uuid(),
      blocks,
      activeBlockId: blocks[Math.max(0, activeIndex)]?.id ?? blocks[0].id,
    });
    emit({
      active: sheet,
      acknowledged: null,
      conflict: null,
      phase: basePhase(),
      message: empty
        ? "New attempt in temporary memory. Save explicitly when ready."
        : "A separate copy retains your local writing.",
    });
    if (!empty) await save();
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    load,
    conceal() {
      if (snapshot.phase !== "hidden")
        concealed = { snapshot, unsupported, pending };
      readSequence++;
      transmitting = false;
      snapshot = initial;
      unsupported = [];
      pending = null;
      emit({});
    },
    restore() {
      if (!concealed) return;
      ({ snapshot, unsupported, pending } = concealed);
      concealed = null;
      emit(
        pending
          ? {
              phase: "failed",
              message:
                "Save outcome is unknown after checking sign-in. Retry the same operation or export retained writing.",
            }
          : {},
      );
    },
    clear() {
      readSequence++;
      concealed = null;
      unsupported = [];
      pending = null;
      transmitting = false;
      snapshot = initial;
      emit({});
    },
    guest() {
      emit({
        phase: "guest",
        message:
          "Guest arguments stay only in memory. Export before closing or reloading.",
      });
    },
    start,
    edit(raw: ArgumentSheet) {
      if (!visible() || !snapshot.active) return;
      const sheet = argumentSheetSchema.parse(raw);
      if (
        sheet.id !== snapshot.active.id ||
        sheet.lessonId !== snapshot.active.lessonId ||
        JSON.stringify(sheet.edition) !==
          JSON.stringify(snapshot.active.edition)
      )
        throw new Error(
          "Editing cannot replace an argument identity or its retained teaching edition.",
        );
      emit({
        active: sheet,
        message:
          "Writing has unsaved changes. Self-review grants no competency credit.",
      });
    },
    resume(raw: SavedArgument) {
      if (!canReplace()) return;
      const selected = savedArgumentSchema.parse(raw);
      const saved = snapshot.saved.find(
        (record) =>
          record.sheet.id === selected.sheet.id &&
          record.revision === selected.revision &&
          sameSheet(record.sheet, selected.sheet),
      );
      if (!saved)
        throw new Error(
          "That saved argument is no longer in the confirmed account view. Refresh before resuming it.",
        );
      emit({
        active: saved.sheet,
        acknowledged: saved,
        conflict: null,
        phase: basePhase(),
        message:
          "Saved argument resumed. Further edits require an explicit save.",
      });
    },
    save,
    retry: async () => {
      if (pending) await transmit();
      else await load();
    },
    useServerVersion() {
      if (!visible() || snapshot.phase !== "conflict" || transmitting) return;
      const server = snapshot.conflict;
      pending = null;
      emit({
        active: server?.sheet ?? null,
        acknowledged: server,
        conflict: null,
        phase: basePhase(),
        message: server
          ? "Server version selected. Local writing was explicitly discarded."
          : "Server deletion selected. Local writing was explicitly discarded.",
      });
    },
    saveCopy: () => copy(false),
    newAttempt: async () => {
      if (snapshot.dirty || pending) {
        emit({
          message:
            "Save, export, or explicitly discard the current writing before starting another attempt.",
        });
        return;
      }
      await copy(true);
    },
    discardActive() {
      if (!visible() || transmitting) return;
      pending = null;
      emit({
        active: null,
        acknowledged: null,
        conflict: null,
        phase: basePhase(),
        message:
          "Current temporary writing explicitly discarded. Saved arguments remain available.",
      });
    },
    remove: async (raw: SavedArgument) => {
      if (
        !["ready", "unsupported"].includes(snapshot.phase) ||
        transmitting ||
        pending
      )
        return;
      const saved = savedArgumentSchema.parse(raw);
      if (
        !snapshot.saved.some(
          (record) =>
            record.sheet.id === saved.sheet.id &&
            record.revision === saved.revision,
        )
      )
        return;
      if (snapshot.dirty && snapshot.active?.id === saved.sheet.id) {
        emit({
          message:
            "Export or explicitly discard the unsaved local writing before deleting its saved argument.",
        });
        return;
      }
      await enqueue({
        kind: "delete",
        expectedRevision: saved.revision,
        id: saved.sheet.id,
      });
    },
    exportRecords() {
      return JSON.stringify(
        {
          format: "algebra-arguments-export-v1",
          saved: snapshot.saved,
          active: snapshot.active,
          unsupported: unsupported.map(({ id, revision, raw }) => ({
            id,
            revision,
            raw,
          })),
          pending: pending?.request ?? null,
        },
        null,
        2,
      );
    },
    previewImport: previewArgumentImport,
    importSheets: async (sheets: ArgumentSheet[]) => {
      if (!canReplace()) return;
      if (
        sheets.length > argumentLimits.records ||
        argumentBytes(sheets) > argumentLimits.importBytes
      )
        throw new Error("Argument import exceeds its complete-record limits.");
      const capture = identity();
      const parsed = sheets.map((sheet) => argumentSheetSchema.parse(sheet));
      for (const sheet of parsed) await validateArgumentEdition(sheet);
      if (!current(capture) || !canReplace()) return;
      if (parsed.length > 1)
        throw new Error(
          "Choose one previewed sheet at a time. Each imported argument needs an explicit save.",
        );
      const sheet = parsed[0];
      if (!sheet) return;
      const blocks = sheet.blocks.map((block) => ({ ...block, id: uuid() }));
      const index = sheet.blocks.findIndex(
        (block) => block.id === sheet.activeBlockId,
      );
      emit({
        active: {
          ...sheet,
          id: uuid(),
          blocks,
          activeBlockId: blocks[Math.max(0, index)].id,
        },
        acknowledged: null,
        conflict: null,
        phase: basePhase(),
        message:
          "Imported copy is temporary. Review retained historical teaching, then explicitly save to this confirmed account. No competency credit was added.",
      });
    },
  };
}
function isAccountChanged(raw: unknown) {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "code" in raw &&
    raw.code === "account_changed"
  );
}
function errorMessage(raw: unknown, fallback: string) {
  return typeof raw === "object" &&
    raw !== null &&
    "error" in raw &&
    typeof raw.error === "string"
    ? raw.error
    : fallback;
}
