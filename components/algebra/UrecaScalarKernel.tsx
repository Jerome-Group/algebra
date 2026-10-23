"use client";
import {
  centerGcd,
  dihedralIndex,
  dihedralScalar,
  pairInKernel,
  productKernel,
} from "@/lib/algebra/direct-products";
import {
  CyclicElementControl,
  CyclicFactorControl,
  DihedralElementControl,
  type UrecaSelection,
} from "./UrecaLabControls";

import { Math as M, Prose } from "./Math";
import {
  cyclicElementTex,
  cyclicScalarTex,
  dihedralTex,
} from "./RepresentationTex";

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
            <Prose>{String.raw`$\pi(${cyclicElementTex(exponent)})=(${cyclicScalarTex(order, exponent)})I_1$; ${dihedralScalar(element) === null ? `$\\rho(${dihedralTex[element]})$ is not scalar` : `$\\rho(${dihedralTex[element]})=${dihedralScalar(element) === 1 ? "+" : "-"}I_2$`}. Pair in product kernel: ${pairInKernel(order, exponent, element) ? "yes" : "no"}.`}</Prose>
          </p>
          <p>
            <Prose>{String.raw`Exact product kernel: $\{${kernel.map(({ exponent: power, index }) => `(${cyclicElementTex(power)},${dihedralTex[index]})`).join(", ")}\}$. Both factor representations are individually faithful.`}</Prose>
          </p>
          <p>
            <Prose>{String.raw`Center orders: $${order}$ and $2$. $\gcd(${order},2)=${centerGcd(order)}$; kernel size $${kernel.length}$. ${kernel.length === 1 ? "This external product is faithful." : "This external product is not faithful."}`}</Prose>
          </p>
        </div>
        <table>
          <caption>All scalar pairs in the selected product</caption>
          <thead>
            <tr>
              <th scope="col">
                Cyclic element of <M>{`C_{${order}}`}</M>
              </th>
              <th scope="col">Its scalar</th>
              <th scope="col">
                Dihedral scalar candidate in <M>{"D_8"}</M>
              </th>
              <th scope="col">Matches inversely?</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: order }, (_, power) =>
              [0, 2].map((index) => (
                <tr key={`${power}-${index}`}>
                  <th scope="row">
                    Element <M>{cyclicElementTex(power)}</M>
                  </th>
                  <td>
                    <M>{cyclicScalarTex(order, power)}</M>
                  </td>
                  <td>
                    <M>{`${dihedralTex[index]}:\ ${dihedralScalar(dihedralIndex(index))}`}</M>
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
          aria-label="Show the C₂×D₈ failure pair"
          onClick={() => {
            state.changeOrder(2);
            state.setExponent(1);
            state.setElement(2);
          }}
        >
          Show the <M focusable={false}>{String.raw`C_2\times D_8`}</M> failure
          pair
        </button>
        <button
          aria-label="Compare the faithful C₃×D₈ product"
          onClick={() => {
            state.changeOrder(3);
            state.setExponent(1);
            state.setElement(2);
          }}
        >
          Compare the faithful{" "}
          <M focusable={false}>{String.raw`C_3\times D_8`}</M> product
        </button>
        <p>
          <Prose>{String.raw`${compareFaithfulness ? String.raw`The $C_2\times D_8$ external product is irreducible but has the cancellation pair $(a,r^2)$; $C_3\times D_8$ has no reciprocal nonidentity scalar and is faithful.` : "A product kernel can contain a pair outside both factor kernels; inspect inverse scalar images before declaring faithfulness."} For faithful irreducibles over $\mathbb C$, Schur makes central images scalar; the two root-of-unity images intersect in $\mu_{\gcd(|Z(G)|,|Z(H)|)}$. The table checks these finite pairs and does not replace the general center-character proof.`}</Prose>
        </p>
      </section>
    </>
  );
}
