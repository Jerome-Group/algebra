"use client";
import { useState } from "react";
import {
  cyclicScalarLabel,
  dihedralCharacter,
  dihedralElements,
  dihedralIndex,
  type CyclicFactor,
} from "@/lib/algebra/direct-products";
import { useRepresentationObject } from "./RepresentationObject";

export const cyclicName = (order: CyclicFactor, exponent: number) =>
  exponent === 0 ? "e" : exponent === 1 ? "a" : "a²";

export function useUrecaSelection(initialOrder: CyclicFactor) {
  const [order, setOrder] = useState<CyclicFactor>(initialOrder);
  const [exponent, setExponent] = useState(1);
  const { element, setElement } = useRepresentationObject();
  const changeOrder = (next: CyclicFactor) => {
    setOrder(next);
    setExponent(1);
  };
  return {
    order,
    exponent,
    element,
    setExponent,
    setElement,
    changeOrder,
  };
}
export type UrecaSelection = ReturnType<typeof useUrecaSelection>;

export function CyclicFactorControl({ state }: { state: UrecaSelection }) {
  return (
    <label>
      Cyclic factor G, currently C{state.order}
      <select
        value={state.order}
        onChange={(event) =>
          state.changeOrder(Number(event.target.value) as CyclicFactor)
        }
      >
        <option value={2}>C₂: sign character</option>
        <option value={3}>C₃: a↦ω character</option>
      </select>
    </label>
  );
}
export function CyclicElementControl({ state }: { state: UrecaSelection }) {
  return (
    <label>
      Cyclic element g, currently {cyclicName(state.order, state.exponent)} with
      scalar {cyclicScalarLabel(state.order, state.exponent)}
      <select
        value={state.exponent}
        onChange={(event) => state.setExponent(Number(event.target.value))}
      >
        {Array.from({ length: state.order }, (_, value) => (
          <option key={value} value={value}>
            {cyclicName(state.order, value)} maps to{" "}
            {cyclicScalarLabel(state.order, value)}
          </option>
        ))}
      </select>
    </label>
  );
}
export function DihedralElementControl({ state }: { state: UrecaSelection }) {
  return (
    <label>
      D₈ element h, currently {dihedralElements[state.element]} with trace{" "}
      {dihedralCharacter(state.element)}
      <select
        value={state.element}
        onChange={(event) =>
          state.setElement(dihedralIndex(Number(event.target.value)))
        }
      >
        {dihedralElements.map((name, index) => (
          <option key={name} value={index}>
            {name} · trace {dihedralCharacter(dihedralIndex(index))}
          </option>
        ))}
      </select>
    </label>
  );
}
