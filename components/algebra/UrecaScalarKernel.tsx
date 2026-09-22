"use client";
import {
  centerGcd,
  cyclicScalarLabel,
  dihedralElements,
  dihedralIndex,
  dihedralScalar,
  pairInKernel,
  productKernel,
} from "@/lib/algebra/direct-products";
import {
  CyclicElementControl,
  CyclicFactorControl,
  DihedralElementControl,
  cyclicName,
  type UrecaSelection,
} from "./UrecaLabControls";

export function UrecaScalarKernel({
  state,
  compareFaithfulness = false,
}: {
  state: UrecaSelection;
  compareFaithfulness?: boolean;
}) {
  const { order, exponent, element } = state;
  const kernel = productKernel(order);
  return (
    <>
      <CyclicFactorControl state={state} />
      <CyclicElementControl state={state} />
      <DihedralElementControl state={state} />
      <section>
        <h3>Reciprocal scalar preimages</h3>
        <div className="live-mathematics" aria-live="polite">
          <p>
            π({cyclicName(order, exponent)})=
            {cyclicScalarLabel(order, exponent)}I₁; ρ(
            {dihedralElements[element]})=
            {dihedralScalar(element) === null
              ? "not scalar"
              : dihedralScalar(element) === 1
                ? "+I₂"
                : "−I₂"}
            . Pair in product kernel:{" "}
            <strong>
              {pairInKernel(order, exponent, element) ? "yes" : "no"}
            </strong>
            .
          </p>
          <p>
            Exact product kernel:{" "}
            {kernel
              .map(
                ({ exponent: power, index }) =>
                  `(${cyclicName(order, power)},${dihedralElements[index]})`,
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
            {Array.from({ length: order }, (_, power) =>
              [0, 2].map((index) => (
                <tr key={`${power}-${index}`}>
                  <th scope="row">{cyclicName(order, power)}</th>
                  <td>{cyclicScalarLabel(order, power)}</td>
                  <td>
                    {dihedralElements[dihedralIndex(index)]}:{" "}
                    {dihedralScalar(dihedralIndex(index))}
                  </td>
                  <td>
                    {pairInKernel(order, power, dihedralIndex(index))
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
            state.changeOrder(2);
            state.setExponent(1);
            state.setElement(2);
          }}
        >
          Show the C₂×D₈ failure pair
        </button>
        <button
          onClick={() => {
            state.changeOrder(3);
            state.setExponent(1);
            state.setElement(2);
          }}
        >
          Compare the faithful C₃×D₈ product
        </button>
        <p>
          {compareFaithfulness
            ? "The C₂×D₈ external product is irreducible but has the cancellation pair (a,r²); C₃×D₈ has no reciprocal nonidentity scalar and is faithful."
            : "A product kernel can contain a pair outside both factor kernels; inspect inverse scalar images before declaring faithfulness."}
          For faithful irreducibles over C, Schur makes central images scalar;
          the two root-of-unity images intersect in μ_gcd. The table checks
          these finite pairs and does not replace the general center-character
          proof.
        </p>
      </section>
    </>
  );
}
