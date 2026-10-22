"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { ArgumentProvider } from "./ArgumentContext";
import type { Lesson } from "@/lib/algebra/engine";
import {
  assessmentRegistry,
  demonstrated,
  emptyProgress,
} from "@/lib/algebra/progress";
import { accountProgressStore } from "@/lib/algebra/account-store";

const fallbackStore = accountProgressStore({ registry: {} });
const fallback = {
  ...fallbackStore.getServerSnapshot(),
  mastered: new Set<string>() as ReadonlySet<string>,
  submit: fallbackStore.submit,
  reset: fallbackStore.reset,
  undo: fallbackStore.undo,
  refresh: fallbackStore.refresh,
  discard: fallbackStore.discard,
  retry: fallbackStore.retry,
  clearIdentity: fallbackStore.clearIdentity,
  setResume: fallbackStore.setResume,
  setSquare: fallbackStore.setSquare,
  previewLegacy: fallbackStore.previewLegacy,
  importLegacy: fallbackStore.importLegacy,
  exportRecords: fallbackStore.exportRecords,
};
const ProgressContext = createContext(fallback);
export function LearningProgressProvider({
  lessons,
  children,
}: {
  lessons: Lesson[];
  children: React.ReactNode;
}) {
  const registry = useMemo(() => assessmentRegistry(lessons), [lessons]);
  const store = useMemo(() => accountProgressStore({ registry }), [registry]);
  useEffect(() => {
    void store.load();
    const sync = () => {
      if (document.visibilityState === "visible") void store.refresh();
    };
    const resume = (event: PageTransitionEvent) => {
      if (event.persisted) sync();
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pageshow", resume);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pageshow", resume);
      store.dispose();
    };
  }, [store]);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const mastered = useMemo(
    () =>
      demonstrated(
        snapshot.account
          ? (snapshot.acknowledged?.progress ?? emptyProgress())
          : snapshot.progress,
        registry,
      ),
    [snapshot.account, snapshot.acknowledged, snapshot.progress, registry],
  );
  return (
    <ProgressContext.Provider
      value={{
        ...snapshot,
        mastered,
        submit: store.submit,
        reset: store.reset,
        undo: store.undo,
        refresh: store.refresh,
        discard: store.discard,
        retry: store.retry,
        clearIdentity: store.clearIdentity,
        setResume: store.setResume,
        setSquare: store.setSquare,
        previewLegacy: store.previewLegacy,
        importLegacy: store.importLegacy,
        exportRecords: store.exportRecords,
      }}
    >
      <ArgumentProvider store={store.arguments}>{children}</ArgumentProvider>
    </ProgressContext.Provider>
  );
}
export const useLearningProgress = () => useContext(ProgressContext);

export function AccountProgressStatus() {
  const {
    phase,
    account,
    message,
    retry,
    discard,
    refresh,
    clearIdentity,
    draftCount,
  } = useLearningProgress();
  return (
    <aside
      className="account-progress-status"
      aria-label="Account progress"
      data-account-phase={phase}
    >
      <p role="status">{message}</p>
      {account ? (
        <>
          <span>Signed in as {account.displayName}. </span>
          <a
            href="/signout-with-chatgpt?return_to=%2F"
            target="_top"
            onClick={clearIdentity}
          >
            Sign out
          </a>
        </>
      ) : (
        <a href="/signin-with-chatgpt?return_to=%2F" target="_top">
          Sign in with ChatGPT
        </a>
      )}
      {phase === "failed" && (
        <button type="button" onClick={retry}>
          Retry loading or saving
        </button>
      )}
      {["failed", "conflict"].includes(phase) && draftCount > 0 && (
        <button type="button" onClick={discard}>
          Discard unsaved changes and reload
        </button>
      )}
      {phase === "ready" && (
        <button type="button" onClick={refresh}>
          Refresh account progress
        </button>
      )}
    </aside>
  );
}

export function ProgressDataControls() {
  const {
    progress,
    phase,
    account,
    canUndo,
    unsupportedRecord,
    undo,
    previewLegacy,
    importLegacy,
    legacy,
    exportRecords,
  } = useLearningProgress();
  const count = Object.values(progress.archived ?? {}).reduce(
    (sum, history) => sum + history.length,
    0,
  );
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([exportRecords()], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "algebra-progress-backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return (
    <div className="progress-data-controls">
      <p>
        {account
          ? "Acknowledged progress, your reading position, and the shared square element belong to this ChatGPT account."
          : "Guest answers and preferences last only for this session. Sign in to save across devices."}
      </p>
      {count > 0 && (
        <p>
          {count} earlier assessment records kept as history. Revised questions
          require a new answer.
        </p>
      )}
      {unsupportedRecord !== null && (
        <p>
          Stored account data is unreadable or from a newer version. It stays
          unchanged and can be exported.
        </p>
      )}
      <button type="button" onClick={download}>
        Export progress backup
      </button>
      <button type="button" onClick={undo} disabled={!canUndo}>
        Restore previous progress
      </button>
      <button type="button" onClick={previewLegacy}>
        Preview legacy browser records
      </button>
      {legacy && (
        <section aria-label="Legacy import preview">
          <p>
            Original browser records remain unchanged. Account answers win
            conflicts; earlier and obsolete answers become history. Nothing
            imports on sign-in.
          </p>
          <ul>
            {legacy.statuses.map(({ key, status }) => (
              <li key={key}>
                {key} · {status}
              </li>
            ))}
          </ul>
          <p>
            Preview result · {legacy.summary.currentAnswers} current answers ·{" "}
            {legacy.summary.archivedAnswers} archived answers. Reading position
            · {legacy.summary.preferences.resumeLessonId ?? "none"}. Shared
            square element ·{" "}
            {legacy.summary.preferences.squareElement ?? "default (2)"}.
          </p>
          {legacy.unreadableKeys.length > 0 && (
            <p>
              Browser access failed for {legacy.unreadableKeys.join(", ")}.
              Their bytes could not be read or exported.
            </p>
          )}
          <p>
            {legacy.draft
              ? "Temporary memory draft is shown separately in the export."
              : "No temporary memory draft is included."}
          </p>
          <button
            type="button"
            onClick={importLegacy}
            disabled={phase !== "ready"}
          >
            Import preview into this account
          </button>
        </section>
      )}
    </div>
  );
}
