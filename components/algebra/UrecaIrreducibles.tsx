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
          {cyclicName(order, exponent)}
          <select
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
              Kronecker character rows at ({cyclicName(order, exponent)}, each
              D₈ class): χθ(g,h)=θ(g)χ(h). D₈ class sizes are 1, 1, 2, 2, 2.
            </caption>
            <thead>
              <tr>
                <th scope="col">C{order} irreducible θ</th>
                <th scope="col">D₈ irreducible χ</th>
                <th scope="col">Degree</th>
                {dihedralCharacterClasses.map((name) => (
                  <th scope="col" key={name}>
                    ({cyclicName(order, exponent)}, {name})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: order }, (_, irreducible) =>
                dihedralIrreducibleRows.map((row) => {
                  const factor = cyclicCharacterValueLabel(
                    order,
                    irreducible,
                    exponent,
                  );
                  return (
                    <tr key={`${irreducible}-${row.name}`}>
                      <th scope="row">
                        θ{irreducible}, value {factor}
                      </th>
                      <td>{row.name}</td>
                      <td>{row.degree}</td>
                      {row.values.map((value, index) => (
                        <td key={index}>
                          {characterProductLabel(value, factor)}
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
            {account.rows} product rows; squared-degree sum{" "}
            {account.degrees.map((d) => `${d}²`).join(" + ")} ={" "}
            {account.sumOfSquares} = |C{order}×D₈|.
          </p>
          <p>
            Factored inner product: ⟨χᵢψⱼ,χₖψₗ⟩ = ⟨χᵢ,χₖ⟩⟨ψⱼ,ψₗ⟩ = δᵢₖδⱼₗ.
            Orthogonality proves the rows are distinct irreducibles; the full
            degree sum proves completeness.
          </p>
        </div>
        <button onClick={() => changeOrder(3)}>
          Check all 15 rows of C₃×D₈
        </button>
      </section>
    </>
  );
}
