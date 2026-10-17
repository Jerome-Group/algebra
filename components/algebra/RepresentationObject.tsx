"use client";
import { createContext, useContext } from "react";
import {
  dihedralIndex,
  type DihedralElement,
} from "@/lib/algebra/direct-products";
import { useLearningProgress } from "./LearningProgress";

const RepresentationContext = createContext<{
  element: DihedralElement;
  setElement: (value: DihedralElement) => void;
}>({
  element: dihedralIndex(2),
  setElement: () => {},
});
export function RepresentationObjectProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { preferences, setSquare } = useLearningProgress();
  return (
    <RepresentationContext.Provider
      value={{
        element: dihedralIndex(preferences.squareElement ?? 2),
        setElement: setSquare,
      }}
    >
      {children}
    </RepresentationContext.Provider>
  );
}
export const useRepresentationObject = () => useContext(RepresentationContext);
