"use client";
import {
  characterProductLabel,
  cyclicCharacterValueLabel,
  dihedralCharacterClasses,
  dihedralIrreducibleRows,
  productIrreducibleAccounting,
} from "@/lib/algebra/direct-products";
import {
  CyclicFactorControl,
  cyclicName,
  type UrecaSelection,
} from "./UrecaLabControls";

import { Math as M, Prose } from "./Math";
import {
  cyclicElementTex,
  cyclicScalarTex,
  dihedralClassTex,
  dihedralCharacterTex,
  characterValueTex,
} from "./RepresentationTex";

export function UrecaIrreducibles({ state }: { state: UrecaSelection }) {
  const { order, exponent, setExponent, changeOrder } = state;
  const account = productIrreducibleAccounting(order);
  return (
    <>
      <CyclicFactorControl state={state} />
      <section>
        <h3>Character-row and degree accounting</h3>
        <label>
          Product argument in the cyclic factor, currently{" "}
          <M focusable={false}>{cyclicElementTex(exponent)}</M>
          <select
            aria-label={`Product argument in the cyclic factor, currently ${cyclicName(order, exponent)}`}
            value={exponent}
            onChange={(event) => setExponent(Number(event.target.value))}
          >
            {Array.from({ length: order }, (_, value) => (
              <option key={value} value={value}>
                {cyclicName(order, value)}
              </option>
            ))}
          </select>
        </label>
        <div className="math-table-scroll">
          <table>
            <caption>
              <Prose>{String.raw`Kronecker character rows at $(${cyclicElementTex(exponent)},\text{each }D_8\text{ class})$: $\chi_\theta(g,h)=\theta(g)\chi(h)$. $D_8$ class sizes are $1,1,2,2,2$.`}</Prose>
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  Cyclic irreducible <M>{String.raw`C_{${order}},\ \theta`}</M>
                </th>
                <th scope="col">
                  Dihedral irreducible <M>{String.raw`D_8,\ \chi`}</M>
                </th>
                <th scope="col">Degree</th>
                {dihedralCharacterClasses.map((name, index) => (
                  <th scope="col" key={name}>
                    Class{" "}
                    <M>{`(${cyclicElementTex(exponent)},${dihedralClassTex[index]})`}</M>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: order }, (_, irreducible) =>
                dihedralIrreducibleRows.map((row, rowIndex) => {
                  const factor = cyclicCharacterValueLabel(
                    order,
                    irreducible,
                    exponent,
                  );
                  return (
                    <tr key={`${irreducible}-${row.name}`}>
                      <th scope="row">
                        Character <M>{String.raw`\theta_{${irreducible}}`}</M>,
                        value{" "}
                        <M>{cyclicScalarTex(order, irreducible * exponent)}</M>
                      </th>
                      <td>
                        <M>{dihedralCharacterTex[rowIndex]}</M>
                      </td>
                      <td>
                        <M>{String(row.degree)}</M>
                      </td>
                      {row.values.map((value, index) => (
                        <td key={index}>
                          <M>
                            {
                              characterValueTex[
                                characterProductLabel(value, factor)
                              ]
                            }
                          </M>
                        </td>
                      ))}
                    </tr>
                  );
                }),
              ).flat()}
            </tbody>
          </table>
        </div>
        <div className="live-mathematics" aria-live="polite">
          <p>
            <Prose>{String.raw`${account.rows} product rows; squared-degree sum $${account.degrees.map((d) => `${d}^2`).join(" + ")}=${account.sumOfSquares}=|C_{${order}}\times D_8|$.`}</Prose>
          </p>
          <p>
            <Prose>{String.raw`Factored inner product: $\langle\chi_i\psi_j,\chi_k\psi_l\rangle=\langle\chi_i,\chi_k\rangle\langle\psi_j,\psi_l\rangle=\delta_{ik}\delta_{jl}$. Orthogonality proves the rows are distinct irreducibles; the full degree sum proves completeness.`}</Prose>
          </p>
        </div>
        <button
          aria-label="Check all 15 rows of C₃×D₈"
          onClick={() => changeOrder(3)}
        >
          Check all 15 rows of{" "}
          <M focusable={false}>{String.raw`C_3\times D_8`}</M>
        </button>
      </section>
    </>
  );
}
