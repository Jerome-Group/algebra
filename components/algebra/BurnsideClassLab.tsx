"use client";

import { useState } from "react";
import { Math as M } from "./Math";

const cases = {
  identity: { name: "e", centralizer: 6, classSize: 1, subgroup: "" },
  transposition: { name: "(12)", centralizer: 2, classSize: 3, subgroup: "C₂" },
  cycle: { name: "(123)", centralizer: 3, classSize: 2, subgroup: "C₃" },
} as const;
type Case = keyof typeof cases;

export function BurnsideClassLab() {
  const [selected, setSelected] = useState<Case>("cycle");
  const row = cases[selected];
  return (
    <section aria-label="Burnside class-size proof workbench">
      <h3>What does a Sylow center force?</h3>
      <p>
        Predict the conjugacy-class size of a nonidentity element in the center
        of a Sylow subgroup. First inspect the complete S₃ example; then read
        the general proof chain.
      </p>
      <label>
        Representative z
        <select
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
        {selected === "identity"
          ? "For z=e, C_G(e)=S₃; no Sylow subgroup selection is needed. The class has 1 element."
          : `For z=${row.name}, the selected Sylow subgroup ${row.subgroup} lies in C_G(z). The class has ${row.classSize} elements.`}
      </p>
      <table>
        <caption>S₃ conjugacy classes and exact centralizer indices</caption>
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
              <th scope="row">{value.name}</th>
              <td>{value.centralizer}</td>
              <td>{value.classSize}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>General two-prime proof chain</h4>
      <ol>
        <li>
          Let finite |G|=pᵃqᵇ with distinct primes p,q. If G is a nonabelian
          simple counterexample, its center is trivial.
        </li>
        <li>
          Choose a Sylow q-subgroup Q and 1≠z∈Z(Q). A nontrivial finite q-group
          has nontrivial center. Then Q≤C_G(z), so |zᴳ|=[G:C_G(z)] is a power of
          p.
        </li>
        <li>
          Because Z(G)=&#123;e&#125;, this class is not a singleton: its size is
          pʳ&gt;1.
        </li>
        <li>
          <strong>Imported character-theoretic lemma:</strong> a nonabelian
          finite simple group has no nontrivial conjugacy class of prime-power
          size. This rules out the counterexample.
        </li>
        <li>
          A finite p-group has nontrivial center and is solvable. In the
          remaining case, a proper normal subgroup and quotient have smaller
          two-prime orders; induction and closure under extensions prove
          solvability.
        </li>
      </ol>
      <p>
        <strong>Failure boundary.</strong> Selecting e gives class size one, so
        it cannot trigger the lemma. The S₃ table illustrates the centralizer
        computation, not the imported character lemma. This is Burnside’s
        solvability theorem, distinct from the orbit-counting average.
      </p>
    </section>
  );
}
