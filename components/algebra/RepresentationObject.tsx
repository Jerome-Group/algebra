"use client";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  dihedralIndex,
  type DihedralElement,
} from "@/lib/algebra/direct-products";

const storageKey = "algebra-ureca-square-element-v1";
type RepresentationState = {
  element: DihedralElement;
  setElement: (value: DihedralElement) => void;
};
const RepresentationContext = createContext<RepresentationState>({
  element: 2,
  setElement: () => {},
});

function deviceRepresentationStore() {
  let element: DihedralElement = 2;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const load = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      element = saved === null ? 2 : dihedralIndex(Number(saved));
    } catch {
      element = 2;
    }
    notify();
  };
  const sync = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) load();
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
    getSnapshot: () => element,
    getServerSnapshot: () => 2 as DihedralElement,
    setElement(value: DihedralElement) {
      element = value;
      try {
        localStorage.setItem(storageKey, String(value));
      } catch {
        /* The current session still carries the object. */
      }
      notify();
    },
  };
}

export function RepresentationObjectProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = useMemo(() => deviceRepresentationStore(), []);
  const element = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  return (
    <RepresentationContext.Provider
      value={{ element, setElement: store.setElement }}
    >
      {children}
    </RepresentationContext.Provider>
  );
}

export const useRepresentationObject = () => useContext(RepresentationContext);
