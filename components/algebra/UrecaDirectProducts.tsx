"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import {
  centerGcd,
  dihedralCharacterClasses,
  dihedralIrreducibleRows,
  cyclicCharacterValueLabel,
  characterProductLabel,
  cyclicScalarLabel,
  dihedralCharacter,
  dihedralEigenvalues,
  dihedralElements,
  dihedralMatrix,
  dihedralScalar,
  pairInKernel,
  productIrreducibleAccounting,
  productKernel,
  type CyclicFactor,
} from "@/lib/algebra/direct-products";
import { Math as M } from "./Math";

const matrixMath = (matrix: number[][]) =>
  `\\begin{pmatrix}${matrix.map((row) => row.join("&")).join("\\\\")}\\end{pmatrix}`;
const cyclicName = (order: CyclicFactor, exponent: number) =>
  exponent === 0 ? "e" : exponent === 1 ? "a" : "a²";
const productTrace = (
  order: CyclicFactor,
  exponent: number,
  dihedral: number,
) => {
  const trace = dihedralCharacter(dihedral);
  const scalar = cyclicScalarLabel(order, exponent);
  if (trace === 0) return "0";
  if (scalar === "1") return String(trace);
  if (scalar === "−1") return String(-trace);
  return `${trace}·${scalar}`;
};

export function UrecaDirectProducts({ lesson }: { lesson: Lesson }) {
  const mode = lesson.id;
  const [order, setOrder] = useState<CyclicFactor>(
    mode === "ureca-direct-product-irreducibles" ? 3 : 2,
  );
  const [exponent, setExponent] = useState(1);
  const [dihedral, setDihedral] = useState(2);
  const factorName = `C${order}`;
  const scalar = cyclicScalarLabel(order, exponent);
  const trace = dihedralCharacter(dihedral);
  const kernel = productKernel(order);
  const selectedKernel = pairInKernel(order, exponent, dihedral);
  const selectedMatrix = dihedralMatrix(dihedral);
  const account = productIrreducibleAccounting(order);
  const changeOrder = (next: CyclicFactor) => {
    setOrder(next);
    setExponent(1);
  };
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
      {mode !== "ureca-character-bound-kernel" && (
        <label>
          Cyclic factor G, currently {factorName}
          <select
            value={order}
            onChange={(event) =>
              changeOrder(Number(event.target.value) as CyclicFactor)
            }
          >
            <option value={2}>C₂: sign character</option>
            <option value={3}>C₃: a↦ω character</option>
          </select>
        </label>
      )}
      {(mode === "ureca-external-tensor-products" ||
        mode === "ureca-product-kernel-scalar-matching" ||
        mode === "ureca-faithful-direct-product") && (
        <label>
          Cyclic element g, currently {cyclicName(order, exponent)} with scalar{" "}
          {scalar}
          <select
            value={exponent}
            onChange={(event) => setExponent(Number(event.target.value))}
          >
            {Array.from({ length: order }, (_, value) => (
              <option key={value} value={value}>
                {cyclicName(order, value)} maps to{" "}
                {cyclicScalarLabel(order, value)}
              </option>
            ))}
          </select>
        </label>
      )}
      {(mode === "ureca-character-bound-kernel" ||
        mode === "ureca-external-tensor-products" ||
        mode === "ureca-product-kernel-scalar-matching" ||
        mode === "ureca-faithful-direct-product") && (
        <label>
          D₈ element h, currently {dihedralElements[dihedral]} with trace{" "}
          {trace}
          <select
            value={dihedral}
            onChange={(event) => setDihedral(Number(event.target.value))}
          >
            {dihedralElements.map((name, index) => (
              <option key={name} value={index}>
                {name} · trace {dihedralCharacter(index)}
              </option>
            ))}
          </select>
        </label>
      )}
      {mode === "ureca-character-bound-kernel" && (
        <section>
          <h3>Finite-order eigenvalue polygon</h3>
          <svg
            viewBox="0 0 260 250"
            role="img"
            aria-label={`Two unit-circle eigenvalues of ${dihedralElements[dihedral]}, listed below as text`}
          >
            <circle cx="130" cy="125" r="88" fill="none" stroke="#536982" />
            <line x1="30" y1="125" x2="230" y2="125" stroke="#70839a" />
            <line x1="130" y1="25" x2="130" y2="225" stroke="#70839a" />
            {dihedralEigenvalues(dihedral).map((value, index) => (
              <circle
                key={index}
                cx={130 + 88 * value.real}
                cy={125 - 88 * value.imaginary}
                r={index === 0 ? 9 : 5}
                fill={index === 0 ? "#2d467d" : "#9b5427"}
                stroke="#fff"
              />
            ))}
            <text x="224" y="119">
              1
            </text>
            <text x="30" y="119">
              −1
            </text>
          </svg>
          <div className="live-mathematics" aria-live="polite">
            <p>
              Eigenvalues:{" "}
              {dihedral === 0
                ? "1, 1"
                : dihedral === 1
                  ? "i, −i"
                  : dihedral === 2
                    ? "−1, −1"
                    : dihedral === 3
                      ? "−i, i"
                      : "1, −1"}
              . Their sum is χ(h)={trace}; degree d=2.
            </p>
            <p>
              |χ(h)|={Math.abs(trace)}.{" "}
              {dihedralScalar(dihedral) === null
                ? "Strict bound: the image is not scalar."
                : `Equality: image ${dihedralScalar(dihedral) === 1 ? "I₂" : "−I₂"} is scalar.`}{" "}
              {dihedral === 0
                ? "h is in the kernel."
                : "h is not in the kernel."}
            </p>
          </div>
          <button onClick={() => setDihedral(2)}>
            Try −I₂: absolute equality outside the kernel
          </button>
          <p>
            The general proof uses diagonalizability of a finite-order complex
            matrix and equality in the triangle inequality. The picture shows
            these two eigenvalues; it is not that proof.
          </p>
        </section>
      )}
      {mode === "ureca-external-tensor-products" && (
        <section>
          <h3>Two factors act on a tensor basis</h3>
          <M
            block
          >{`\\pi(${cyclicName(order, exponent)})=${scalar === "−1" ? "-1" : scalar === "1" ? "1" : scalar === "ω" ? "\\omega" : "\\omega^2"},\\quad \\rho(${dihedralElements[dihedral]})=${matrixMath(selectedMatrix)}`}</M>
          <div className="presentation-board">
            <span>First factor: degree 1</span>
            <span>Second factor: degree 2</span>
            <span>Product basis: v⊗w₁, v⊗w₂</span>
          </div>
          <div className="live-mathematics" aria-live="polite">
            <p>
              Product degree: 1×2=2. Character at ({cyclicName(order, exponent)}
              , {dihedralElements[dihedral]}): {scalar} × {trace} ={" "}
              {productTrace(order, exponent, dihedral)}.
            </p>
            <p>
              The product matrix has entries{" "}
              {selectedMatrix
                .flat()
                .map((entry) => `${entry}·${scalar}`)
                .join(", ")}{" "}
              in row order. Tensor balancing over a ring is a separate
              construction.
            </p>
          </div>
          <button
            onClick={() => {
              changeOrder(2);
              setDihedral(2);
            }}
          >
            Try the cancellation pair
          </button>
          <p>
            For the selected pair, tr(A⊗B)=tr(A)tr(B) by summing the diagonal
            entries. The lesson checks the whole G×H action law.
          </p>
        </section>
      )}
      {mode === "ureca-direct-product-irreducibles" && (
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
      )}
      {(mode === "ureca-product-kernel-scalar-matching" ||
        mode === "ureca-faithful-direct-product") && (
        <section>
          <h3>Reciprocal scalar preimages</h3>
          <div className="live-mathematics" aria-live="polite">
            <p>
              π({cyclicName(order, exponent)})={scalar}I₁; ρ(
              {dihedralElements[dihedral]})=
              {dihedralScalar(dihedral) === null
                ? "not scalar"
                : dihedralScalar(dihedral) === 1
                  ? "+I₂"
                  : "−I₂"}
              . Pair in product kernel:{" "}
              <strong>{selectedKernel ? "yes" : "no"}</strong>.
            </p>
            <p>
              Exact product kernel:{" "}
              {kernel
                .map(
                  ({ exponent, index }) =>
                    `(${cyclicName(order, exponent)},${dihedralElements[index]})`,
                )
                .join(", ")}
              . Both factor representations are individually faithful.
            </p>
            <p>
              Center orders: {order} and 2. gcd={centerGcd(order)}; kernel size=
              {kernel.length}.{" "}
              {kernel.length === 1
                ? "This external product is faithful."
                : "This external product is not faithful."}
            </p>
          </div>
          <table>
            <caption>All scalar pairs in the selected product</caption>
            <thead>
              <tr>
                <th scope="col">C{order} element</th>
                <th scope="col">Its scalar</th>
                <th scope="col">D₈ scalar candidate</th>
                <th scope="col">Matches inversely?</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: order }, (_, exponent) =>
                [0, 2].map((index) => (
                  <tr key={`${exponent}-${index}`}>
                    <th scope="row">{cyclicName(order, exponent)}</th>
                    <td>{cyclicScalarLabel(order, exponent)}</td>
                    <td>
                      {dihedralElements[index]}: {dihedralScalar(index)}
                    </td>
                    <td>
                      {pairInKernel(order, exponent, index)
                        ? "yes, kernel pair"
                        : "no"}
                    </td>
                  </tr>
                )),
              ).flat()}
            </tbody>
          </table>
          <button
            onClick={() => {
              changeOrder(2);
              setExponent(1);
              setDihedral(2);
            }}
          >
            Show the C₂×D₈ failure pair
          </button>
          <button
            onClick={() => {
              changeOrder(3);
              setExponent(1);
              setDihedral(2);
            }}
          >
            Compare the faithful C₃×D₈ product
          </button>
          <p>
            For faithful irreducibles over C, Schur makes central images scalar;
            the two root-of-unity images intersect in μ_gcd. The table checks
            these finite pairs and does not replace the general center-character
            proof.
          </p>
        </section>
      )}
    </div>
  );
}
