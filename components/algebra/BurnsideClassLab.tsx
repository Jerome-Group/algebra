"use client";

import { useState } from "react";
import { Math as M, Prose } from "./Math";

const cases = {
  identity: { name: "e", centralizer: 6, classSize: 1 },
  transposition: { name: "(12)", centralizer: 2, classSize: 3 },
  cycle: { name: "(123)", centralizer: 3, classSize: 2 },
} as const;
type Case = keyof typeof cases;

export function BurnsideClassLab() {
  const [selected, setSelected] = useState<Case>("cycle");
  const row = cases[selected];
  return (
    <section aria-label="Burnside class-size proof workbench">
      <h3>What does a Sylow center force?</h3>
      <p>
        <Prose>{String.raw`Predict the conjugacy-class size of a nonidentity element in the center of a Sylow subgroup. First inspect the complete $S_3$ example; then read the general proof chain.`}</Prose>
      </p>
      <label>
        Representative <M focusable={false}>{"z"}</M>
        <select
          aria-label="Representative z"
          value={selected}
          onChange={(event) => setSelected(event.target.value as Case)}
        >
          <option value="identity">Identity boundary</option>
          <option value="transposition">
            Transposition in a Sylow 2-subgroup
          </option>
          <option value="cycle">Three-cycle in a Sylow 3-subgroup</option>
        </select>
      </label>
      <M block>{`|z^G|=[G:C_G(z)]=6/${row.centralizer}=${row.classSize}`}</M>
      <p role="status">
        <Prose>{String.raw`${selected === "identity" ? "For $z=e$, $C_G(e)=S_3$; no Sylow subgroup selection is needed. The class has $1$ element." : `For $z=${row.name}$, the selected Sylow subgroup $C_{${selected === "cycle" ? 3 : 2}}$ lies in $C_G(z)$. The class has $${row.classSize}$ elements.`}`}</Prose>
      </p>
      <table>
        <caption>
          <Prose>{String.raw`$S_3$ conjugacy classes and exact centralizer indices`}</Prose>
        </caption>
        <thead>
          <tr>
            <th scope="col">Representative</th>
            <th scope="col">Centralizer order</th>
            <th scope="col">Class size</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(cases).map(([key, value]) => (
            <tr key={key}>
              <th scope="row">
                Representative <M>{value.name}</M>
              </th>
              <td>
                <M>{String(value.centralizer)}</M>
              </td>
              <td>
                <M>{String(value.classSize)}</M>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>General two-prime proof chain</h4>
      <ol>
        <li>
          <Prose>{String.raw`Let finite $|G|=p^a q^b$ with distinct primes $p,q$. If $G$ is a nonabelian simple counterexample, its center is trivial.`}</Prose>
        </li>
        <li>
          <Prose>{String.raw`Choose a Sylow $q$-subgroup $Q$ and $1\ne z\in Z(Q)$. A nontrivial finite $q$-group has nontrivial center. Then $Q\le C_G(z)$, so $|z^G|=[G:C_G(z)]$ is a power of $p$.`}</Prose>
        </li>
        <li>
          <Prose>{String.raw`Because $Z(G)=\{e\}$, this class is not a singleton: its size is $p^r>1$.`}</Prose>
        </li>
        <li>
          <strong>Imported character-theoretic lemma:</strong> a nonabelian
          finite simple group has no nontrivial conjugacy class of prime-power
          size. This rules out the counterexample.
        </li>
        <li>
          <Prose>{String.raw`A finite $p$-group has nontrivial center and is solvable. In the remaining case, a proper normal subgroup and quotient have smaller two-prime orders; induction and closure under extensions prove solvability.`}</Prose>
        </li>
      </ol>
      <p>
        <Prose>{String.raw`Failure boundary. Selecting $e$ gives class size one, so it cannot trigger the lemma. The $S_3$ table illustrates the centralizer computation, not the imported character lemma. This is Burnside’s solvability theorem, distinct from the orbit-counting average.`}</Prose>
      </p>
    </section>
  );
}
