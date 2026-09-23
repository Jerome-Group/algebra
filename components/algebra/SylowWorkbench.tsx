"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import { permutationNames } from "@/lib/algebra/foundation-labs";
import { sylowWorkbench, type SylowPrime } from "@/lib/algebra/sylow-workbench";
import { Math as M } from "./Math";

const setLabel = (members: number[]) =>
  `{${members.map((element) => permutationNames[element]).join(", ")}}`;

export function SylowWorkbench({ lesson }: { lesson: Lesson }) {
  const [prime, setPrime] = useState<SylowPrime>(2);
  const [subgroupIndex, setSubgroupIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(1);
  const [showFailure, setShowFailure] = useState(false);
  const model = sylowWorkbench(prime, subgroupIndex, targetIndex);
  const focus = lesson.id;
  return (
    <div className="foundation-lab">
      <p>
        Work in S₃ (order 6). Products and actions apply the right factor first.
      </p>
      <div className="lab-controls">
        <label>
          Prime p
          <select
            value={prime}
            onChange={(event) => {
              setPrime(Number(event.target.value) as SylowPrime);
              setSubgroupIndex(0);
              setTargetIndex(Number(event.target.value) === 2 ? 1 : 0);
              setShowFailure(false);
            }}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </label>
        <label>
          Coset subgroup Q
          <select
            value={targetIndex}
            onChange={(event) => setTargetIndex(Number(event.target.value))}
          >
            {model.sylows.map((group, index) => (
              <option key={index} value={index}>
                {setLabel(group)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chosen Sylow subgroup P
          <select
            value={subgroupIndex}
            onChange={(event) => setSubgroupIndex(Number(event.target.value))}
          >
            {model.sylows.map((group, index) => (
              <option key={index} value={index}>
                {setLabel(group)}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => setShowFailure(!showFailure)}
          aria-pressed={showFailure}
        >
          {showFailure ? "Hide" : "Try"} arithmetic-only inference
        </button>
      </div>
      <div className="live-mathematics" aria-live="polite">
        <M
          block
        >{`|G|=6=${prime === 2 ? "2\\cdot3" : "3\\cdot2"},\\quad |P|=|Q|=${model.P.length},\\quad [G:Q]=${model.cosets.length}`}</M>
        <p>
          All Sylow {prime}-subgroups: {model.sylows.map(setLabel).join("; ")}.
        </p>
        <p>
          Arithmetic candidates for n{prime}: {model.candidates.join(", ")}.
          Actual count in S₃: {model.actualCount}.
        </p>
        <p>
          Normalizer N(P): {setLabel(model.normalizer)}; [G:N(P)]=
          {6 / model.normalizer.length}.
        </p>
        <p>
          Cosets fixed by left multiplication of P:{" "}
          {model.fixedCosets.map(setLabel).join("; ")}.
        </p>
        <p>
          Fixed-coset conjugacy witness:{" "}
          {model.fixedWitnesses
            .map(
              ({ representative, conjugate }) =>
                `${permutationNames[representative]}⁻¹P${permutationNames[representative]}=${setLabel(conjugate)}=Q`,
            )
            .join("; ")}
          .
        </p>
        <p>
          P-orbit sizes on G/Q:{" "}
          {model.pOrbits.map((orbit) => orbit.length).join(" + ")} ={" "}
          {model.cosets.length}.
        </p>
        <p>
          Sylow subgroups fixed by P-conjugation:{" "}
          {model.fixedSylows.map((i) => setLabel(model.sylows[i])).join("; ")}.
        </p>
        {showFailure && (
          <p role="status">
            {prime === 2
              ? "For p=2, both 1 and 3 satisfy the arithmetic restrictions, but S₃ realizes 3. Arithmetic alone cannot assert n₂=1."
              : "For p=3, arithmetic forces n₃=1. Select p=2 to see two admissible counts and a candidate S₃ does not realize."}
          </p>
        )}
      </div>
      <table>
        <caption>
          Conjugacy class and centralizer evidence for the existence induction
        </caption>
        <thead>
          <tr>
            <th scope="col">Representative</th>
            <th scope="col">Class</th>
            <th scope="col">Class size</th>
            <th scope="col">Centralizer</th>
          </tr>
        </thead>
        <tbody>
          {model.classSizes.map((item) => (
            <tr key={item.representative}>
              <th scope="row">{permutationNames[item.representative]}</th>
              <td>{setLabel(item.elements)}</td>
              <td>{item.elements.length}</td>
              <td>{setLabel(item.centralizer)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <caption>Left cosets and fixed points for the conjugacy proof</caption>
        <thead>
          <tr>
            <th scope="col">Coset gQ</th>
            <th scope="col">Fixed by all of P?</th>
          </tr>
        </thead>
        <tbody>
          {model.cosets.map((coset, index) => (
            <tr key={index}>
              <th scope="row">{setLabel(coset)}</th>
              <td>{model.fixedCosetIndices.includes(index) ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <caption>
          Conjugation of the chosen subgroup by each element of S₃
        </caption>
        <thead>
          <tr>
            <th scope="col">g</th>
            <th scope="col">gPg⁻¹</th>
            <th scope="col">Normalizes P?</th>
          </tr>
        </thead>
        <tbody>
          {model.conjugates.map((index, g) => (
            <tr key={g}>
              <th scope="row">{permutationNames[g]}</th>
              <td>{setLabel(model.sylows[index])}</td>
              <td>{index === subgroupIndex ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {focus === "mh2220-sylow-existence"
          ? prime === 2
            ? "This S₃ table shows the class-equation branch: its center has order one; the transposition class has size three, coprime to 2, so its centralizer retains the full 2-part. The general induction also needs the central-subgroup branch shown in the guided proof."
            : "This S₃ table shows the class-equation branch: its center has order one; the 3-cycle class has size two, coprime to 3, so its centralizer retains the full 3-part. The general induction also needs the central-subgroup branch shown in the guided proof."
          : focus === "mh2220-sylow-conjugacy"
            ? "A p-group acting on a p-coprime number of cosets has a fixed coset. Fixed gQ means g⁻¹Pg≤Q; equal Sylow orders give equality. This table checks S₃, while the guided argument proves the general statement."
            : "Conjugacy gives nₚ=[G:N(P)] and P≤N(P) gives divisibility. P fixes only itself among Sylow subgroups; all other P-orbits have p-power size, giving nₚ≡1 mod p. The S₃ arithmetic candidate 1 for p=2 is not realized."}
      </p>
    </div>
  );
}
