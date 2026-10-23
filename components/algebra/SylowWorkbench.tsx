"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import { permutationNames } from "@/lib/algebra/foundation-labs";
import { sylowWorkbench, type SylowPrime } from "@/lib/algebra/sylow-workbench";
import { Math as M, Prose } from "./Math";

const setLabel = (members: number[]) =>
  String.raw`\{${members.map((element) => permutationNames[element]).join(", ")}\}`;

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
        <Prose>{String.raw`Work in $S_3$ (order $6$). Products and actions apply the right factor first.`}</Prose>
      </p>
      <div className="lab-controls">
        <label>
          Prime <M focusable={false}>{String.raw`p`}</M>
          <select
            aria-label="Prime p"
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
          Coset subgroup <M focusable={false}>{String.raw`Q`}</M>
          <select
            aria-label="Coset subgroup Q"
            value={targetIndex}
            onChange={(event) => setTargetIndex(Number(event.target.value))}
          >
            {model.sylows.map((group, index) => (
              <option key={index} value={index}>
                {`{${group.map((element) => permutationNames[element]).join(", ")}}`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chosen Sylow subgroup <M focusable={false}>{String.raw`P`}</M>
          <select
            aria-label="Chosen Sylow subgroup P"
            value={subgroupIndex}
            onChange={(event) => setSubgroupIndex(Number(event.target.value))}
          >
            {model.sylows.map((group, index) => (
              <option key={index} value={index}>
                {`{${group.map((element) => permutationNames[element]).join(", ")}}`}
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
          <Prose>{String.raw`All Sylow $${prime}$-subgroups: $${model.sylows.map(setLabel).join("; ")}$.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`Arithmetic candidates for $n_{${prime}}$: $${model.candidates.join(", ")}$. Actual count in $S_3$: $${model.actualCount}$.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`Normalizer $N(P)$: $${setLabel(model.normalizer)}$; $[G:N(P)]=${6 / model.normalizer.length}$.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`Cosets fixed by left multiplication of $P$: $${model.fixedCosets.map(setLabel).join("; ")}$.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`Fixed-coset conjugacy witness: $${model.fixedWitnesses.map(({ representative, conjugate }) => String.raw`${permutationNames[representative]}^{-1}P${permutationNames[representative]}=${setLabel(conjugate)}=Q`).join("; ")}$.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`$P$-orbit sizes on $G/Q$: $${model.pOrbits.map((orbit) => orbit.length).join(" + ")}=${model.cosets.length}$.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`Sylow subgroups fixed by $P$-conjugation: $${model.fixedSylows.map((i) => setLabel(model.sylows[i])).join("; ")}$.`}</Prose>
        </p>
        {showFailure && (
          <p role="status">
            <Prose>{String.raw`${prime === 2 ? "For $p=2$, both $1$ and $3$ satisfy the arithmetic restrictions, but $S_3$ realizes $3$. Arithmetic alone cannot assert $n_2=1$." : "For $p=3$, arithmetic forces $n_3=1$. Select $p=2$ to see two admissible counts and a candidate $S_3$ does not realize."}`}</Prose>
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
              <th scope="row">
                Representative <M>{permutationNames[item.representative]}</M>
              </th>
              <td>
                <M>{setLabel(item.elements)}</M>
              </td>
              <td>
                <M>{String(item.elements.length)}</M>
              </td>
              <td>
                <M>{setLabel(item.centralizer)}</M>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <caption>Left cosets and fixed points for the conjugacy proof</caption>
        <thead>
          <tr>
            <th scope="col">
              Coset <M>{"gQ"}</M>
            </th>
            <th scope="col">
              Fixed by all of <M>{"P"}</M>?
            </th>
          </tr>
        </thead>
        <tbody>
          {model.cosets.map((coset, index) => (
            <tr key={index}>
              <th scope="row">
                Coset <M>{setLabel(coset)}</M>
              </th>
              <td>{model.fixedCosetIndices.includes(index) ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <caption>
          <Prose>{String.raw`Conjugation of the chosen subgroup by each element of $S_3$`}</Prose>
        </caption>
        <thead>
          <tr>
            <th scope="col">
              Element <M>{"g"}</M>
            </th>
            <th scope="col">
              Conjugate <M>{"gPg^{-1}"}</M>
            </th>
            <th scope="col">
              Normalizes <M>{"P"}</M>?
            </th>
          </tr>
        </thead>
        <tbody>
          {model.conjugates.map((index, g) => (
            <tr key={g}>
              <th scope="row">
                Element <M>{permutationNames[g]}</M>
              </th>
              <td>
                <M>{setLabel(model.sylows[index])}</M>
              </td>
              <td>{index === subgroupIndex ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <Prose>{String.raw`${focus === "mh2220-sylow-existence" ? (prime === 2 ? "This $S_3$ table shows the class-equation branch: its center has order one; the transposition class has size three, coprime to $2$, so its centralizer retains the full $2$-part. The general induction also needs the central-subgroup branch shown in the guided proof." : "This $S_3$ table shows the class-equation branch: its center has order one; the $3$-cycle class has size two, coprime to $3$, so its centralizer retains the full $3$-part. The general induction also needs the central-subgroup branch shown in the guided proof.") : focus === "mh2220-sylow-conjugacy" ? String.raw`A $p$-group acting on a $p$-coprime number of cosets has a fixed coset. Fixed $gQ$ means $g^{-1}Pg\le Q$; equal Sylow orders give equality. This table checks $S_3$, while the guided argument proves the general statement.` : String.raw`Conjugacy gives $n_p=[G:N(P)]$ and $P\le N(P)$ gives divisibility. $P$ fixes only itself among Sylow subgroups; all other $P$-orbits have $p$-power size, giving $n_p\equiv1\pmod p$. The $S_3$ arithmetic candidate $1$ for $p=2$ is not realized.`}`}</Prose>
      </p>
    </div>
  );
}
