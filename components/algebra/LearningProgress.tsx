"use client";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { Lesson } from "@/lib/algebra/engine";
import {
  assessmentRegistry,
  demonstrated,
  emptyProgress,
  progressStorageKey,
  readProgress,
  submitAttempt,
  type AssessmentRegistry,
} from "@/lib/algebra/progress";
const defaults = {
  progress: emptyProgress(),
  mastered: new Set<string>() as ReadonlySet<string>,
  storageAvailable: true,
  submit: (() => {}) as (id: string, choice: number) => void,
  reset: () => {},
};
const ProgressContext = createContext(defaults);
function deviceProgressStore(registry: AssessmentRegistry) {
  const serverSnapshot = { progress: emptyProgress(), storageAvailable: true };
  let snapshot = serverSnapshot;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const load = () => {
    try {
      snapshot = {
        progress: readProgress(
          localStorage.getItem(progressStorageKey),
          registry,
        ),
        storageAvailable: true,
      };
    } catch {
      snapshot = { ...snapshot, storageAvailable: false };
    }
    notify();
  };
  const persist = (progress: typeof snapshot.progress) => {
    let storageAvailable = true;
    try {
      localStorage.setItem(progressStorageKey, JSON.stringify(progress));
    } catch {
      storageAvailable = false;
    }
    snapshot = { progress, storageAvailable };
    notify();
  };
  const sync = (event: StorageEvent) => {
    if (event.key === progressStorageKey || event.key === null) load();
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        load();
        window.addEventListener("storage", sync);
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) window.removeEventListener("storage", sync);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    submit: (id: string, choice: number) =>
      persist(submitAttempt(snapshot.progress, registry, id, choice)),
    reset: () => persist(emptyProgress()),
  };
}
export function LearningProgressProvider({
  lessons,
  children,
}: {
  lessons: Lesson[];
  children: React.ReactNode;
}) {
  const registry = useMemo(() => assessmentRegistry(lessons), [lessons]);
  const store = useMemo(() => deviceProgressStore(registry), [registry]);
  const { progress, storageAvailable } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const mastered = useMemo(
    () => demonstrated(progress, registry),
    [progress, registry],
  );
  return (
    <ProgressContext.Provider
      value={{
        progress,
        mastered,
        storageAvailable,
        submit: store.submit,
        reset: store.reset,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}
export const useLearningProgress = () => useContext(ProgressContext);
