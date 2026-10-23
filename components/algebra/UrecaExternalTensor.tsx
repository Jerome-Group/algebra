"use client";
import {
  dihedralCharacter,
  dihedralMatrix,
  productCharacterLabel,
} from "@/lib/algebra/direct-products";
import { Math as M, Prose } from "./Math";
import {
  CyclicElementControl,
  CyclicFactorControl,
  DihedralElementControl,
  type UrecaSelection,
} from "./UrecaLabControls";

import {
  cyclicElementTex,
  cyclicScalarTex,
  dihedralTex,
  characterValueTex,
} from "./RepresentationTex";

const matrixMath = (matrix: number[][]) =>
  `\\begin{pmatrix}${matrix.map((row) => row.join("&")).join("\\\\")}\\end{pmatrix}`;

export function UrecaExternalTensor({ state }: { state: UrecaSelection }) {
  const { order, exponent, element } = state;
  const matrix = dihedralMatrix(element);
  return (
    <>
      <CyclicFactorControl state={state} />
      <CyclicElementControl state={state} />
      <DihedralElementControl state={state} />
      <section>
        <h3>Two factors act on a tensor basis</h3>
        <M
          block
        >{`\\pi(${cyclicElementTex(exponent)})=${cyclicScalarTex(order, exponent)},\\quad \\rho(${dihedralTex[element]})=${matrixMath(matrix)}`}</M>
        <div className="presentation-board">
          <span>First factor: degree 1</span>
          <span>Second factor: degree 2</span>
          <span>
            <Prose>{String.raw`Product basis: $v\otimes w_1$, $v\otimes w_2$`}</Prose>
          </span>
        </div>
        <div className="live-mathematics" aria-live="polite">
          <p>
            <Prose>{String.raw`Product degree: $1\times2=2$. Character at $(${cyclicElementTex(exponent)},${dihedralTex[element]})$: $(${cyclicScalarTex(order, exponent)})\times(${dihedralCharacter(element)})=${characterValueTex[productCharacterLabel(order, exponent, element)]}$.`}</Prose>
          </p>
          <p>
            <Prose>{String.raw`The product matrix has entries $${matrix
              .flat()
              .map(
                (entry) =>
                  String.raw`(${entry})\cdot(${cyclicScalarTex(order, exponent)})`,
              )
              .join(
                ", ",
              )}$ in row order. Tensor balancing over a ring is a separate construction.`}</Prose>
          </p>
        </div>
        <button
          onClick={() => {
            state.changeOrder(2);
            state.setElement(2);
          }}
        >
          Try the cancellation pair
        </button>
        <p>
          <Prose>{String.raw`For the selected pair, $\operatorname{tr}(A\otimes B)=\operatorname{tr}(A)\operatorname{tr}(B)$ by summing the diagonal entries. The lesson checks the whole $G\times H$ action law.`}</Prose>
        </p>
      </section>
    </>
  );
}
