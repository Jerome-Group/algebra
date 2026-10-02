import {
  emptyProgress,
  progressRecordSupported,
  progressStorageKey,
  readProgress,
  submitAttempt,
  type AssessmentRegistry,
  type Progress,
} from "./progress";

export const progressBackupKey = `${progressStorageKey}-backup`;
type DeviceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Backup = { version: 1; record: string | null };
export function deviceProgressStore(
  registry: AssessmentRegistry,
  storage: () => DeviceStorage,
) {
  const serverSnapshot = {
    progress: emptyProgress(),
    storageAvailable: true,
    protectedRecord: false,
    canUndo: false,
    message: "",
  };
  let snapshot = serverSnapshot;
  let raw: string | null = null;
  let backup: Backup | null = null;
  const pending = new Set<string>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const withSessionAnswers = (record: string | null): Progress => {
    if (!progressRecordSupported(record))
      return pending.size ? snapshot.progress : emptyProgress();
    const latest = readProgress(record, registry);
    if (!pending.size) return latest;
    for (const key of pending)
      if (Object.hasOwn(snapshot.progress.attempts, key))
        latest.attempts[key] = snapshot.progress.attempts[key];
    const archived = { ...latest.archived };
    for (const [key, history] of Object.entries(
      snapshot.progress.archived ?? {},
    ))
      Object.defineProperty(archived, key, {
        value: [
          ...(Object.hasOwn(archived, key) ? archived[key] : []),
          ...history,
        ],
        enumerable: true,
        configurable: true,
      });
    return readProgress(JSON.stringify({ ...latest, archived }), registry);
  };
  const load = () => {
    try {
      const device = storage();
      raw = device.getItem(progressStorageKey);
      backup = null;
      const savedBackup = device.getItem(progressBackupKey);
      try {
        const value = savedBackup === null ? null : JSON.parse(savedBackup);
        if (
          value?.version === 1 &&
          (value.record === null || typeof value.record === "string") &&
          (!Object.hasOwn(value, "restoreTarget") ||
            value.restoreTarget === null ||
            typeof value.restoreTarget === "string")
        )
          backup = {
            version: 1,
            // A restore journal retains both records before the primary write.
            // If that write failed, the original target remains recoverable.
            record:
              Object.hasOwn(value, "restoreTarget") &&
              raw !== value.restoreTarget
                ? value.restoreTarget
                : value.record,
          };
      } catch {
        /* A corrupt backup does not affect current progress. */
      }
      snapshot = {
        progress: withSessionAnswers(raw),
        storageAvailable: true,
        protectedRecord: !progressRecordSupported(raw),
        canUndo: backup !== null,
        message: "",
      };
    } catch {
      snapshot = { ...snapshot, storageAvailable: false };
    }
    notify();
  };
  const persist = (progress: Progress, replaceProtected = false) => {
    try {
      const device = storage();
      const previous = device.getItem(progressStorageKey);
      raw = previous;
      if (!replaceProtected && !progressRecordSupported(previous)) {
        snapshot = {
          ...snapshot,
          progress,
          protectedRecord: true,
          message:
            "Saved record kept unchanged. New answers last only this session.",
        };
        notify();
        return false;
      }
      const saved = { version: 1 as const, record: previous };
      device.setItem(progressBackupKey, JSON.stringify(saved));
      device.setItem(progressStorageKey, JSON.stringify(progress));
      raw = JSON.stringify(progress);
      backup = saved;
      snapshot = {
        progress,
        storageAvailable: true,
        protectedRecord: false,
        canUndo: true,
        message: "Progress saved; the previous record can be restored.",
      };
      pending.clear();
    } catch {
      snapshot = {
        ...snapshot,
        progress,
        storageAvailable: false,
        message: "Saving unavailable. Answers last only this session.",
      };
      notify();
      return false;
    }
    notify();
    return true;
  };
  return {
    load,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    submit: (id: string, choice: number) => {
      // Storage events arrive asynchronously: synchronously rebase each answer.
      let base = snapshot.progress;
      try {
        const latest = storage().getItem(progressStorageKey);
        if (progressRecordSupported(latest)) base = withSessionAnswers(latest);
      } catch {
        /* Keep session answers when browser storage cannot be read. */
      }
      const progress = submitAttempt(base, registry, id, choice);
      if (progress !== base) {
        pending.add(id);
        persist(progress);
      }
    },
    reset: () => persist(emptyProgress(), true),
    undo: () => {
      if (!backup) return;
      try {
        const device = storage();
        const current = device.getItem(progressStorageKey);
        const restore = backup.record;
        device.setItem(
          progressBackupKey,
          JSON.stringify({
            version: 1,
            record: current,
            restoreTarget: restore,
          }),
        );
        if (restore === null) device.removeItem(progressStorageKey);
        else device.setItem(progressStorageKey, restore);
        pending.clear();
        load();
        snapshot = {
          ...snapshot,
          message:
            "Previous record restored. Restore again to reverse this change.",
        };
      } catch {
        snapshot = {
          ...snapshot,
          storageAvailable: false,
          message: "Restore failed. Export your records before retrying.",
        };
      }
      notify();
    },
    exportRecords: () =>
      JSON.stringify(
        {
          format: "algebra-local-progress-export-v1",
          current: snapshot.progress,
          savedRecord: raw,
          previousRecord: backup?.record ?? null,
        },
        null,
        2,
      ),
  };
}
