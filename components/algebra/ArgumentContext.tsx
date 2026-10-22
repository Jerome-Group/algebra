"use client";
import { createContext, useContext, useSyncExternalStore } from "react";
import { argumentStore } from "@/lib/algebra/argument-store";

const fallback = argumentStore({
  identity: () => ({
    active: false,
    generation: 0,
    accountId: null,
    confirmed: false,
  }),
  expireIdentity: () => {},
});
type Store = ReturnType<typeof argumentStore>;
function publicArguments(
  store: Store,
  snapshot: ReturnType<Store["getSnapshot"]>,
) {
  return {
    ...snapshot,
    start: store.start,
    edit: store.edit,
    resume: store.resume,
    save: store.save,
    retry: store.retry,
    useServerVersion: store.useServerVersion,
    saveCopy: store.saveCopy,
    newAttempt: store.newAttempt,
    discardActive: store.discardActive,
    remove: store.remove,
    exportRecords: store.exportRecords,
    previewImport: store.previewImport,
    importSheets: store.importSheets,
  };
}
const ArgumentContext = createContext(
  publicArguments(fallback, fallback.getServerSnapshot()),
);
export function ArgumentProvider({
  store,
  children,
}: {
  store: Store;
  children: React.ReactNode;
}) {
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  return (
    <ArgumentContext.Provider value={publicArguments(store, snapshot)}>
      {children}
    </ArgumentContext.Provider>
  );
}
export const useArguments = () => useContext(ArgumentContext);
