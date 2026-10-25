"use client";
import {
  cyclicElementSpeech,
  cyclicScalarSpeech,
  dihedralElementSpeech,
} from "./ChoiceSpeech";
import { Choice } from "./Groups";

import { useState } from "react";
import {
  cyclicScalarLabel,
  dihedralCharacter,
  dihedralElements,
  dihedralIndex,
  type CyclicFactor,
} from "@/lib/algebra/direct-products";
import { useRepresentationObject } from "./RepresentationObject";

import { Math as M } from "./Math";
import {
  cyclicElementTex,
  cyclicScalarTex,
  dihedralTex,
} from "./RepresentationTex";

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
      Cyclic factor <M focusable={false}>{"G"}</M>, currently{" "}
      <M focusable={false}>{`C_{${state.order}}`}</M>
      <Choice
        label={`Cyclic factor G, currently C${state.order}`}
        value={state.order}
        onChange={(value) => state.changeOrder(value)}
        options={[
          {
            value: 2,
            presentation: "$C_2$: sign character",
            speech: "Cyclic group of order 2, sign character",
          },
          {
            value: 3,
            presentation: "$C_3$: $a\\mapsto\\omega$ character",
            speech: "Cyclic group of order 3, a maps to omega character",
          },
        ]}
      />
    </label>
  );
}
export function CyclicElementControl({ state }: { state: UrecaSelection }) {
  return (
    <label>
      Cyclic element <M focusable={false}>{"g"}</M>, currently{" "}
      <M focusable={false}>{cyclicElementTex(state.exponent)}</M> with scalar{" "}
      <M focusable={false}>{cyclicScalarTex(state.order, state.exponent)}</M>
      <Choice
        label={`Cyclic element g, currently ${cyclicName(state.order, state.exponent)} with scalar ${cyclicScalarLabel(state.order, state.exponent)}`}
        value={state.exponent}
        onChange={(value) => state.setExponent(value)}
        options={Array.from({ length: state.order }, (_, value) => ({
          value,
          presentation: `$${cyclicElementTex(value)}$ maps to $${cyclicScalarTex(state.order, value)}$`,
          speech: `${cyclicElementSpeech(value)} maps to ${cyclicScalarSpeech(state.order, value)}`,
        }))}
      />
    </label>
  );
}
export function DihedralElementControl({ state }: { state: UrecaSelection }) {
  return (
    <label>
      <M focusable={false}>{"D_8"}</M> element <M focusable={false}>{"h"}</M>,
      currently <M focusable={false}>{dihedralTex[state.element]}</M> with trace{" "}
      <M focusable={false}>{String(dihedralCharacter(state.element))}</M>
      <Choice
        label={`D₈ element h, currently ${dihedralElements[state.element]} with trace ${dihedralCharacter(state.element)}`}
        value={state.element}
        onChange={(value) => state.setElement(dihedralIndex(value))}
        options={dihedralElements.map((name, index) => ({
          value: index,
          presentation: `$${dihedralTex[index]}$ · trace $${dihedralCharacter(dihedralIndex(index))}$`,
          speech: `${dihedralElementSpeech(index, 4)}, trace ${dihedralCharacter(dihedralIndex(index))}`,
        }))}
      />
    </label>
  );
}
