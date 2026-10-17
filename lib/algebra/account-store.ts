import {
  accountResponseSchema,
  applyAccountOperation,
  emptyAccountData,
  emptyAccountDocument,
  emptyLegacyRecords,
  importAccountData,
  legacyKeys,
  legacyPreview,
  type AccountData,
  type AccountDocument,
  type AccountMutation,
  type AccountOperation,
  type AccountUser,
  type LegacyRecords,
} from "./account-progress";
import { assessmentRevision, type AssessmentRegistry } from "./progress";

type Phase =
  | "loading"
  | "guest"
  | "ready"
  | "saving"
  | "conflict"
  | "failed"
  | "expired"
  | "unsupported";
type Draft = { id: string; operation: AccountOperation };
type Delivery = {
  draft: Draft;
  request: AccountMutation;
  generation: number;
  accountId: string;
};
type LegacyPreview = {
  records: LegacyRecords;
  unreadableKeys: string[];
  statuses: { key: string; status: string }[];
  draft: AccountData | null;
  summary: {
    currentAnswers: number;
    archivedAnswers: number;
    preferences: AccountData["preferences"];
  };
};
type Snapshot = AccountData & {
  phase: Phase;
  account: AccountUser | null;
  acknowledged: AccountDocument | null;
  unsupportedRecord: string | null;
  canUndo: boolean;
  message: string;
  legacy: LegacyPreview | null;
  draftCount: number;
};

export function readLegacyRecords(storage: Pick<Storage, "getItem">) {
  const records = emptyLegacyRecords();
  const unreadableKeys: string[] = [];
  for (const key of legacyKeys) {
    try {
      records[key] = storage.getItem(key);
    } catch {
      unreadableKeys.push(key);
    }
  }
  return { records, unreadableKeys };
}

export function accountProgressStore({
  registry,
  fetcher = fetch,
  readLegacy = () => readLegacyRecords(localStorage),
  uuid = () => crypto.randomUUID(),
}: {
  registry: AssessmentRegistry;
  fetcher?: typeof fetch;
  readLegacy?: () => ReturnType<typeof readLegacyRecords>;
  uuid?: () => string;
}) {
  const initial: Snapshot = {
    ...emptyAccountData(),
    phase: "loading",
    account: null,
    acknowledged: null,
    unsupportedRecord: null,
    canUndo: false,
    message: "Loading account progress…",
    legacy: null,
    draftCount: 0,
  };
  let snapshot = initial;
  let generation = 0;
  let readSequence = 0;
  let active = true;
  let guest = emptyAccountDocument();
  let drafts: Draft[] = [];
  let delivery: Delivery | null = null;
  let concealed: {
    snapshot: Snapshot;
    guest: AccountDocument;
    drafts: Draft[];
    delivery: Delivery | null;
  } | null = null;
  let transmitting = false;
  const listeners = new Set<() => void>();
  const emit = (patch: Partial<Snapshot>) => {
    snapshot = { ...snapshot, ...patch };
    let display = snapshot.acknowledged ?? guest;
    for (const draft of drafts) {
      try {
        display = applyAccountOperation(display, draft.operation, registry);
      } catch {}
    }
    snapshot = {
      ...snapshot,
      progress: display.progress,
      preferences: display.preferences,
      canUndo:
        drafts.length === 0 &&
        !!display.previous &&
        display.previous.restorableAt === display.revision &&
        ["ready", "guest"].includes(snapshot.phase),
      draftCount: snapshot.account
        ? drafts.length
        : Object.keys(guest.progress.attempts).length,
    };
    listeners.forEach((listener) => listener());
  };
  const clearPrivate = () => {
    generation++;
    guest = emptyAccountDocument();
    drafts = [];
    delivery = null;
    transmitting = false;
    snapshot = { ...initial };
  };
  const currentDelivery = (sent: NonNullable<typeof delivery>) =>
    active &&
    generation === sent.generation &&
    snapshot.account?.id === sent.accountId;
  const expireIdentity = () => {
    concealed = null;
    clearPrivate();
    emit({
      phase: "expired",
      message:
        "Account changed or sign-in expired. Private progress and unsaved changes were cleared. Sign in again to save.",
    });
  };

  const refresh = async (discard = false) => {
    if (discard) {
      concealed = null;
      clearPrivate();
      emit({ acknowledged: null, unsupportedRecord: null, legacy: null });
    } else if (snapshot.account) {
      concealed = { snapshot, guest, drafts, delivery };
      clearPrivate();
      emit({
        phase: "loading",
        message:
          "Checking sign-in. Private progress is hidden until your account is confirmed.",
      });
    }
    const sequence = ++readSequence;
    const startedGeneration = generation;
    try {
      const response = await fetcher("/api/progress", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (
        !active ||
        generation !== startedGeneration ||
        sequence !== readSequence
      )
        return;
      if (response.status === 401) {
        expireIdentity();
        return;
      }
      const value = accountResponseSchema.safeParse(await response.json());
      if (
        !active ||
        generation !== startedGeneration ||
        sequence !== readSequence
      )
        return;
      if (!response.ok || !value.success)
        throw new Error(
          "Account progress could not load. Answers remain unsaved.",
        );
      if (value.data.kind === "guest") {
        const expired =
          concealed !== null ||
          snapshot.account !== null ||
          snapshot.phase === "expired";
        concealed = null;
        if (expired) clearPrivate();
        emit({
          account: null,
          acknowledged: null,
          unsupportedRecord: null,
          phase: expired ? "expired" : "guest",
          legacy: expired ? null : snapshot.legacy,
          message: expired
            ? "Sign-in expired. Private progress and unsaved changes were cleared. Sign in again to save."
            : "Guest session. Answers and preferences last only for this session. Sign in to save across devices.",
        });
        return;
      }
      const account = value.data;
      if (concealed?.snapshot.account?.id === account.user.id) {
        snapshot = concealed.snapshot;
        guest = concealed.guest;
        drafts = concealed.drafts;
        delivery = concealed.delivery
          ? { ...concealed.delivery, generation }
          : null;
        concealed = null;
        if (delivery)
          snapshot = {
            ...snapshot,
            phase: "failed",
            message:
              "Save outcome is unknown after checking sign-in. Retry the same operation or export unsaved changes.",
          };
      } else concealed = null;
      if (snapshot.account?.id !== account.user.id) clearPrivate();
      if (account.record.kind === "unsupported") {
        emit({
          account: account.user,
          acknowledged: null,
          phase: "unsupported",
          unsupportedRecord: account.record.raw,
          legacy: null,
          message:
            "Stored account data is unreadable or newer. It remains unchanged and exportable; new answers are unsaved.",
        });
      } else if (
        !snapshot.acknowledged ||
        account.record.document.revision >= snapshot.acknowledged.revision
      ) {
        emit({
          account: account.user,
          acknowledged: account.record.document,
          unsupportedRecord: null,
          phase: drafts.length ? snapshot.phase : "ready",
          message: drafts.length
            ? snapshot.message
            : "Account progress loaded. Changes save to this ChatGPT account.",
        });
      } else emit({});
    } catch (error) {
      if (
        !active ||
        generation !== startedGeneration ||
        sequence !== readSequence
      )
        return;
      emit({
        phase: "failed",
        message:
          error instanceof Error
            ? error.message
            : "Account progress could not load. Answers remain unsaved.",
      });
    }
  };

  const transmit = async () => {
    if (
      transmitting ||
      !snapshot.account ||
      !snapshot.acknowledged ||
      !drafts.length ||
      !["ready", "saving", "failed"].includes(snapshot.phase)
    )
      return;
    if (!delivery) {
      const draft = drafts[0];
      delivery = {
        draft,
        generation,
        accountId: snapshot.account.id,
        request: {
          operationId: draft.id,
          expectedAccountId: snapshot.account.id,
          expectedRevision: snapshot.acknowledged.revision,
          operation: draft.operation,
        },
      };
    }
    const sent = delivery;
    transmitting = true;
    emit({
      phase: "saving",
      message:
        "Saving to your ChatGPT account. Changes are not acknowledged yet.",
    });
    try {
      const response = await fetcher("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(sent.request),
      });
      if (!currentDelivery(sent)) return;
      if (response.status === 401) {
        expireIdentity();
        void refresh();
        return;
      }
      const raw: unknown = await response.json();
      if (!currentDelivery(sent)) return;
      if (
        typeof raw === "object" &&
        raw !== null &&
        "code" in raw &&
        raw.code === "account_changed"
      ) {
        expireIdentity();
        void refresh();
        return;
      }
      const parsed = accountResponseSchema.safeParse(raw);
      if (
        parsed.success &&
        parsed.data.kind === "account" &&
        parsed.data.user.id === sent.accountId
      ) {
        const account = parsed.data;
        if (account.record.kind === "unsupported") {
          delivery = null;
          emit({
            acknowledged: null,
            unsupportedRecord: account.record.raw,
            phase: "unsupported",
            message:
              "Stored account data is unreadable or newer. Your changes were not saved; export your records.",
          });
          return;
        }
        if (
          response.ok &&
          account.acknowledgement?.operationId === sent.request.operationId
        ) {
          drafts = drafts.filter((draft) => draft.id !== sent.draft.id);
          delivery = null;
          emit({
            acknowledged: account.record.document,
            phase: "ready",
            message: "Saved to your ChatGPT account.",
            legacy: null,
          });
          return;
        }
        if (response.status === 409) {
          delivery = null;
          emit({
            acknowledged: account.record.document,
            phase: "conflict",
            message:
              account.error ??
              "Another device saved first. Your unsaved changes were not applied. Export them or discard and reload before submitting again.",
          });
          return;
        }
      }
      const error =
        typeof raw === "object" &&
        raw !== null &&
        "error" in raw &&
        typeof raw.error === "string"
          ? raw.error
          : "Save outcome is unknown. Retry the same operation or export unsaved changes.";
      emit({ phase: "failed", message: error });
    } catch {
      if (currentDelivery(sent))
        emit({
          phase: "failed",
          message:
            "Save outcome is unknown. Retry the same operation or export unsaved changes.",
        });
    } finally {
      if (currentDelivery(sent)) {
        transmitting = false;
        if (snapshot.phase === "ready" && drafts.length) void transmit();
      }
    }
  };

  const change = (operation: AccountOperation) => {
    if (
      !snapshot.account &&
      ["guest", "expired", "loading", "failed"].includes(snapshot.phase)
    ) {
      guest = applyAccountOperation(guest, operation, registry);
      emit({
        message: "Temporary session changes. Sign in to save across devices.",
      });
      return;
    }
    drafts.push({ id: uuid(), operation });
    emit({
      message: ["ready", "saving"].includes(snapshot.phase)
        ? "Changes are unsaved until the account confirms them."
        : "Changes are unsaved. Export them or discard and reload your account.",
    });
    if (snapshot.phase === "ready") void transmit();
  };
  const previewLegacy = () => {
    let records = emptyLegacyRecords();
    let unreadableKeys: string[] = [];
    try {
      ({ records, unreadableKeys } = readLegacy());
    } catch {
      unreadableKeys = [...legacyKeys];
    }
    const preview = legacyPreview(records, registry);
    let draft = emptyAccountDocument();
    for (const item of drafts) {
      try {
        draft = applyAccountOperation(draft, item.operation, registry);
      } catch {}
    }
    const memoryDraft = snapshot.account
      ? drafts.length
        ? { progress: draft.progress, preferences: draft.preferences }
        : null
      : { progress: guest.progress, preferences: guest.preferences };
    const imported = importAccountData(
      snapshot.acknowledged ?? emptyAccountData(),
      { kind: "import", legacy: records, draft: memoryDraft },
      registry,
    );
    emit({
      legacy: {
        records,
        unreadableKeys,
        statuses: preview.statuses,
        draft: memoryDraft,
        summary: {
          currentAnswers: Object.keys(imported.progress.attempts).length,
          archivedAnswers: Object.values(
            imported.progress.archived ?? {},
          ).reduce((sum, history) => sum + history.length, 0),
          preferences: imported.preferences,
        },
      },
    });
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
    load: () => {
      active = true;
      return refresh();
    },
    refresh: () => refresh(),
    discard: () => refresh(true),
    dispose: () => {
      active = false;
      readSequence++;
      concealed = null;
      clearPrivate();
    },
    clearIdentity: () => {
      readSequence++;
      concealed = null;
      clearPrivate();
      emit({
        phase: "expired",
        message:
          "Signing out. Private progress and unsaved changes were cleared.",
      });
    },
    submit(id: string, choice: number) {
      const assessment = Object.hasOwn(registry, id) ? registry[id] : undefined;
      if (
        assessment &&
        Number.isInteger(choice) &&
        choice >= 0 &&
        choice < assessment.choices.length
      )
        change({
          kind: "submit",
          assessmentId: id,
          assessmentRevision: assessmentRevision(assessment),
          choice,
        });
    },
    setResume(lessonId: string) {
      if (snapshot.preferences.resumeLessonId !== lessonId)
        change({ kind: "resume", lessonId });
    },
    setSquare(element: number) {
      if (
        Number.isInteger(element) &&
        element >= 0 &&
        element <= 7 &&
        snapshot.preferences.squareElement !== element
      )
        change({ kind: "square", element });
    },
    reset: () => {
      if (
        snapshot.phase === "guest" ||
        (snapshot.phase === "ready" && !drafts.length)
      )
        change({ kind: "reset" });
    },
    undo: () => {
      if (snapshot.canUndo) change({ kind: "undo" });
    },
    retry: () => {
      if (snapshot.phase === "failed" && delivery) void transmit();
      else if (snapshot.phase === "failed") void refresh();
    },
    previewLegacy,
    importLegacy: () => {
      if (snapshot.phase === "ready" && !drafts.length && snapshot.legacy)
        change({
          kind: "import",
          legacy: snapshot.legacy.records,
          draft: snapshot.legacy.draft,
        });
    },
    exportRecords: () => {
      let legacy = snapshot.legacy;
      if (!legacy) {
        previewLegacy();
        legacy = snapshot.legacy;
      }
      return JSON.stringify(
        {
          format: "algebra-account-progress-export-v1",
          account: snapshot.account,
          acknowledgedAccountState: snapshot.acknowledged,
          unsupportedAccountRecord: snapshot.unsupportedRecord,
          rawLegacyRecords: legacy?.records,
          unreadableLegacyKeys: legacy?.unreadableKeys,
          unsavedDraft: snapshot.account
            ? {
                progress: snapshot.progress,
                preferences: snapshot.preferences,
                operations: drafts,
                delivery: delivery?.request ?? null,
              }
            : {
                progress: guest.progress,
                preferences: guest.preferences,
                operations: [],
              },
        },
        null,
        2,
      );
    },
  };
}
