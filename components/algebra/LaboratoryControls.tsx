"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
export type LaboratoryControl = {
  label: string;
  value: string | number;
  options?: [string, string][];
  min?: number;
  max?: number;
  step?: number;
  set: (value: string) => void;
};
type Registry = Map<string, LaboratoryControl>;
const LaboratoryContext = createContext<Registry | null>(null);
export function LaboratoryProvider({ children }: { children: ReactNode }) {
  const [registry] = useState(() => new Map<string, LaboratoryControl>());
  return (
    <LaboratoryContext.Provider value={registry}>
      {children}
    </LaboratoryContext.Provider>
  );
}
export function useLaboratoryControls() {
  const registry = useContext(LaboratoryContext);
  if (!registry) throw Error("Laboratories require a LaboratoryProvider");
  return registry;
}
export function useLaboratoryControl(id: string, control: LaboratoryControl) {
  const registry = useLaboratoryControls();
  useEffect(() => {
    registry.set(id, control);
    return () => {
      registry.delete(id);
    };
  }, [registry, id, control]);
}
