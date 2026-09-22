"use client";
import type { Lesson } from "@/lib/algebra/engine";
import type { CyclicFactor } from "@/lib/algebra/direct-products";
import { Math as M } from "./Math";
import { UrecaCharacterBound } from "./UrecaCharacterBound";
import { UrecaExternalTensor } from "./UrecaExternalTensor";
import { UrecaIrreducibles } from "./UrecaIrreducibles";
import { useUrecaSelection, type UrecaSelection } from "./UrecaLabControls";
import { UrecaScalarKernel } from "./UrecaScalarKernel";

const panels: Record<string, (state: UrecaSelection) => React.ReactNode> = {
  "ureca-character-bound-kernel": (state) => (
    <UrecaCharacterBound state={state} />
  ),
  "ureca-external-tensor-products": (state) => (
    <UrecaExternalTensor state={state} />
  ),
  "ureca-direct-product-irreducibles": (state) => (
    <UrecaIrreducibles state={state} />
  ),
  "ureca-product-kernel-scalar-matching": (state) => (
    <UrecaScalarKernel state={state} />
  ),
  "ureca-faithful-direct-product": (state) => (
    <UrecaScalarKernel state={state} compareFaithfulness />
  ),
};

export function UrecaDirectProducts({ lesson }: { lesson: Lesson }) {
  const initialOrder: CyclicFactor =
    lesson.id === "ureca-external-tensor-products" ||
    lesson.id === "ureca-direct-product-irreducibles"
      ? 3
      : 2;
  const state = useUrecaSelection(initialOrder);
  const panel = panels[lesson.id];
  if (!panel) return null;
  return (
    <div className="foundation-lab ureca-lab">
      <M block>
        {
          "\\begin{aligned}(\\pi\\boxtimes\\rho)(g,h)\\\\=\\pi(g)\\otimes\\rho(h)\\end{aligned}"
        }
      </M>
      <p>
        Here G=Cₙ and H=D₈. Both factors act on complex vector spaces. D₈ has
        eight elements; r⁴=s²=e and srs=r⁻¹. The matrices act on columns, with
        AB applying B first. The cyclic factor uses its faithful one-dimensional
        character.
      </p>
      {panel(state)}
    </div>
  );
}
