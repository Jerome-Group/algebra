"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { Lesson } from "@/lib/algebra/engine";
import {
  assessmentRegistry,
  demonstrated,
  emptyProgress,
  progressStorageKey,
} from "@/lib/algebra/progress";
import {
  deviceProgressStore,
  progressBackupKey,
} from "@/lib/algebra/progress-storage";
const defaults = {
  progress: emptyProgress(),
  mastered: new Set<string>() as ReadonlySet<string>,
  storageAvailable: true,
  submit: (() => {}) as (id: string, choice: number) => void,
  reset: () => {},
  undo: () => {},
  canUndo: false,
  protectedRecord: false,
  message: "",
  exportRecords: () => "",
};
const ProgressContext = createContext(defaults);
export function LearningProgressProvider({
  lessons,
  children,
}: {
  lessons: Lesson[];
  children: React.ReactNode;
}) {
  const registry = useMemo(() => assessmentRegistry(lessons), [lessons]);
  const store = useMemo(
    () => deviceProgressStore(registry, () => localStorage),
    [registry],
  );
  useEffect(() => {
    store.load();
    const sync = (event: StorageEvent) => {
      if (
        event.key === progressStorageKey ||
        event.key === progressBackupKey ||
        event.key === null
      )
        store.load();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [store]);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const { progress } = snapshot;
  const mastered = useMemo(
    () => demonstrated(progress, registry),
    [progress, registry],
  );
  return (
    <ProgressContext.Provider
      value={{
        ...snapshot,
        mastered,
        submit: store.submit,
        reset: store.reset,
        undo: store.undo,
        exportRecords: store.exportRecords,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}
export const useLearningProgress = () => useContext(ProgressContext);

export function ProgressDataControls() {
  const { progress, canUndo, protectedRecord, message, undo, exportRecords } =
    useLearningProgress();
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
        Progress stays on this browser. Export a backup before changing device
        or clearing browser data.
      </p>
      {count > 0 && (
        <p>
          {count} earlier assessment records kept as history. Revised questions
          require a new answer.
        </p>
      )}
      {protectedRecord && (
        <p>
          Saved data is unreadable or from a newer version. It stays unchanged;
          export it before resetting.
        </p>
      )}
      <button type="button" onClick={download}>
        Export progress backup
      </button>
      <button type="button" onClick={undo} disabled={!canUndo}>
        Restore previous progress
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
