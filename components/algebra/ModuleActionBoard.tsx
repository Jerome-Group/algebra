"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import {
  moduleBoard,
  moduleStages,
  type ModuleStage,
} from "@/lib/algebra/module-action-board";
import { Math as M } from "./Math";

const setText = (elements: number[]) =>
  `{${elements.map((value) => `[${value}]`).join(", ")}}`;
const stageNames: Record<ModuleStage, string> = {
  action: "1. Ring action",
  presentation: "2. Generators and relations",
  submodule: "3. Submodule and quotient",
  exactness: "4. Exactness and splitting",
};

export function ModuleActionBoard({ lesson }: { lesson: Lesson }) {
  const [modulus, setModulus] = useState(6);
  const [scalar, setScalar] = useState(2);
  const [generator, setGenerator] = useState(2);
  const [vector, setVector] = useState(2);
  const [stage, setStage] = useState<ModuleStage>(
    lesson.id === "modules-generators"
      ? "presentation"
      : lesson.id === "m3220-annihilator"
        ? "exactness"
        : "action",
  );
  const [prediction, setPrediction] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [failure, setFailure] = useState(false);
  const model = moduleBoard(modulus, scalar, generator, vector);
  function reset() {
    setPrediction("");
    setRevealed(false);
    setFailure(false);
  }
  return (
    <div className="foundation-lab">
      <p>
        Carry one left <M>{"\mathbb Z"}</M>-module through action, presentation,
        submodule and exactness. For a right action over noncommutative R, use a
        left Rᵒᵖ-module.
      </p>
      <M
        block
      >{`M=\\mathbb Z/${modulus}\\mathbb Z=\\langle e\\mid ${modulus}e=0\\rangle`}</M>
      <div className="lab-controls">
        <label>
          Module relation ne=0; choose n
          <select
            value={modulus}
            onChange={(event) => {
              setModulus(Number(event.target.value));
              setGenerator(1);
              setVector(0);
              reset();
            }}
          >
            {[3, 4, 6, 8, 12].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Integer scalar r
          <select
            value={scalar}
            onChange={(event) => {
              setScalar(Number(event.target.value));
              reset();
            }}
          >
            {[-2, -1, 0, 1, 2, 3, 4, 6].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          Learning stage
          <select
            value={stage}
            onChange={(event) => {
              setStage(event.target.value as ModuleStage);
              reset();
            }}
          >
            {moduleStages.map((item) => (
              <option key={item} value={item}>
                {stageNames[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Submodule generator d dividing n
          <select
            value={generator}
            onChange={(event) => {
              setGenerator(Number(event.target.value));
              reset();
            }}
          >
            {Array.from({ length: modulus }, (_, i) => i + 1)
              .filter((d) => modulus % d === 0)
              .map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
          </select>
        </label>
        <label>
          Vector [x]
          <select
            value={vector}
            onChange={(event) => {
              setVector(Number(event.target.value));
              reset();
            }}
          >
            {model.action.elements.map((x) => (
              <option key={x} value={x}>
                [{x}]
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="prediction-prompt">
        For {stageNames[stage]}, predict the relevant action, relation,
        submodule or exactness invariant using the selected n, r, d and [x].
        <textarea
          value={prediction}
          onChange={(event) => setPrediction(event.target.value)}
          aria-label="Your mathematical prediction"
        />
      </label>
      <button disabled={!prediction.trim()} onClick={() => setRevealed(true)}>
        Test my prediction
      </button>
      {revealed && (
        <>
          <div className="live-mathematics" aria-live="polite">
            {stage === "action" && (
              <>
                <p>
                  Left action: r·[x]=[rx] in M; r↦([x]↦[rx]) is a unital map
                  ℤ→Endₐᵦ(M). The selected scalar {scalar} has kernel{" "}
                  {setText(model.action.kernel)} and image{" "}
                  {setText(model.action.image)}.
                </p>
                <p>
                  {model.action.inverse === undefined
                    ? "This operator is not invertible on M."
                    : `This operator is invertible on M, with scalar inverse ${model.action.inverse} modulo ${modulus}.`}{" "}
                  {model.regularModuleInvertible
                    ? `${scalar} is a unit of ℤ and acts invertibly on every unital ℤ-module.`
                    : `${scalar} is a nonunit of ℤ; on the regular module ℤ its multiplication map is not invertible.`}
                </p>
              </>
            )}
            {stage === "presentation" && (
              <>
                <p>
                  Generator e=[1]; relation {modulus}e=0; annihilator of M is{" "}
                  {modulus}ℤ. This cyclic module is not free over ℤ because e is
                  nonzero torsion.
                </p>
                <M
                  block
                >{`0\\longrightarrow\\mathbb Z\\xrightarrow{\\times ${modulus}}\\mathbb Z\\xrightarrow{q}M\\longrightarrow0`}</M>
                <p>
                  The relation map has image {modulus}ℤ, exactly ker q. This is
                  a presentation and a short exact sequence.
                </p>
              </>
            )}
            {stage === "submodule" && (
              <>
                <p>
                  N=⟨[{generator}]⟩={setText(model.submodule)} is closed under
                  addition and every integer scalar. M/N≅ℤ/{generator}ℤ has
                  representatives {setText(model.quotient)}; r acts on them as{" "}
                  {setText(model.quotientAction)}.
                </p>
                <p>
                  Changing [x]+N by [n]∈N changes r[x] by r[n]∈N, so quotient
                  scalar multiplication is well-defined. For T=diag(2,1) on ℚ²,{" "}
                  {model.operatorExample.invariantLine};{" "}
                  {model.operatorExample.failedLine}.
                </p>
              </>
            )}
            {stage === "exactness" && (
              <>
                <p>
                  For ×{scalar}:M→M, ker={setText(model.action.kernel)}, im=
                  {setText(model.action.image)}; |M/ker|=
                  {model.imageQuotientSize}=|im| and |M/im|={model.cokernelSize}
                  . The induced map [x]+ker↦[{scalar}x] is the first module
                  isomorphism.
                </p>
                <p>
                  Ann([{vector}])={model.vectorAnnihilator}ℤ, while Ann(M)=
                  {model.moduleAnnihilator}ℤ. For a left module over
                  noncommutative R, Ann(m) is a left ideal and Ann(M) is
                  two-sided.
                </p>
                <p>
                  At the middle ℤ of 0→ℤ --×{modulus}→ ℤ --q→ M→0, im(×{modulus}
                  )={modulus}ℤ=ker q. This sequence is nonsplit: a section M→ℤ
                  would send torsion e to a nonzero torsion integer. By
                  contrast, 0→ℤ→ℤ⊕ℤ→ℤ→0 splits by section b↦(0,b).
                </p>
                <p>{model.operatorExample.moduleMap}</p>
              </>
            )}
          </div>
          <table>
            <caption>{stageNames[stage]}: selected module evidence</caption>
            <thead>
              <tr>
                <th scope="col">Object</th>
                <th scope="col">Computed state</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Module</th>
                <td>
                  ℤ/{modulus}ℤ, generator e=[1], relation {modulus}e=0
                </td>
              </tr>
              <tr>
                <th scope="row">Scalar action</th>
                <td>
                  {scalar}·[x]=[{scalar}x]; kernel{" "}
                  {setText(model.action.kernel)}; image{" "}
                  {setText(model.action.image)}
                </td>
              </tr>
              <tr>
                <th scope="row">Submodule and quotient</th>
                <td>
                  N={setText(model.submodule)}; M/N has {model.quotient.length}{" "}
                  classes
                </td>
              </tr>
              <tr>
                <th scope="row">Annihilators</th>
                <td>
                  Ann([{vector}])={model.vectorAnnihilator}ℤ; Ann(M)=
                  {model.moduleAnnihilator}ℤ
                </td>
              </tr>
            </tbody>
          </table>
          <button onClick={() => setFailure(!failure)} aria-pressed={failure}>
            {failure ? "Hide" : "Try"} a nonunit and nonsplit failure
          </button>
          {failure && (
            <p role="status">
              Scalar 2 is not a unit of ℤ but acts invertibly on ℤ/3ℤ; it does
              not act invertibly on the regular module ℤ. The exact sequence 0→ℤ
              --×6→ ℤ→ℤ/6ℤ→0 does not split: a ℤ-linear section would send [1]
              to a nonzero integer killed by 6.
            </p>
          )}
          <p>
            Proof boundary: the finite action table checks this M only. Units
            act invertibly on every unital module by their ring inverses;
            submodule closure proves quotient well-definedness; image=kernel
            checks exactness; a section, not exactness alone, proves a
            direct-sum splitting. The guided proof supplies those general
            arguments.
          </p>
        </>
      )}
    </div>
  );
}
