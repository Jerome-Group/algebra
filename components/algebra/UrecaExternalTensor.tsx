"use client";
import {
  cyclicScalarLabel,
  dihedralCharacter,
  dihedralElements,
  dihedralMatrix,
  productCharacterLabel,
} from "@/lib/algebra/direct-products";
import { Math as M } from "./Math";
import {
  CyclicElementControl,
  CyclicFactorControl,
  DihedralElementControl,
  cyclicName,
  type UrecaSelection,
} from "./UrecaLabControls";

const matrixMath = (matrix: number[][]) =>
  `\\begin{pmatrix}${matrix.map((row) => row.join("&")).join("\\\\")}\\end{pmatrix}`;

export function UrecaExternalTensor({ state }: { state: UrecaSelection }) {
  const { order, exponent, element } = state;
  const scalar = cyclicScalarLabel(order, exponent);
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
        >{`\\pi(${cyclicName(order, exponent)})=${scalar === "−1" ? "-1" : scalar === "1" ? "1" : scalar === "ω" ? "\\omega" : "\\omega^2"},\\quad \\rho(${dihedralElements[element]})=${matrixMath(matrix)}`}</M>
        <div className="presentation-board">
          <span>First factor: degree 1</span>
          <span>Second factor: degree 2</span>
          <span>Product basis: v⊗w₁, v⊗w₂</span>
        </div>
        <div className="live-mathematics" aria-live="polite">
          <p>
            Product degree: 1×2=2. Character at ({cyclicName(order, exponent)},{" "}
            {dihedralElements[element]}): {scalar} ×{" "}
            {dihedralCharacter(element)} ={" "}
            {productCharacterLabel(order, exponent, element)}.
          </p>
          <p>
            The product matrix has entries{" "}
            {matrix
              .flat()
              .map((entry) => `${entry}·${scalar}`)
              .join(", ")}{" "}
            in row order. Tensor balancing over a ring is a separate
            construction.
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
          For the selected pair, tr(A⊗B)=tr(A)tr(B) by summing the diagonal
          entries. The lesson checks the whole G×H action law.
        </p>
      </section>
    </>
  );
}
