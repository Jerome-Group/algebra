"use client";
import { Choice } from "./Groups";

import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import {
  moduleBoard,
  moduleStages,
  type ModuleStage,
} from "@/lib/algebra/module-action-board";
import { Math as M, Prose } from "./Math";

const setText = (elements: number[]) =>
  String.raw`\{${elements.map((value) => `[${value}]`).join(", ")}\}`;
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
        <Prose>{String.raw`Carry one left $\mathbb Z$-module through action, presentation, submodule and exactness. For a right action over noncommutative $R$, use a left $R^{\mathrm{op}}$-module.`}</Prose>
      </p>
      <M
        block
      >{`M=\\mathbb Z/${modulus}\\mathbb Z=\\langle e\\mid ${modulus}e=0\\rangle`}</M>
      <div className="lab-controls">
        <label>
          Module relation <M focusable={false}>{"ne=0"}</M>; choose{" "}
          <M focusable={false}>{"n"}</M>
          <Choice
            label="Module relation ne=0; choose n"
            value={modulus}
            onChange={(value) => {
              setModulus(value);
              setGenerator(1);
              setVector(0);
              reset();
            }}
            options={[3, 4, 6, 8, 12].map((n) => ({
              value: n,
              presentation: `$${n}$`,
              speech: String(n),
            }))}
          />
        </label>
        <label>
          Integer scalar <M focusable={false}>{String.raw`r`}</M>
          <Choice
            label="Integer scalar r"
            value={scalar}
            onChange={(value) => {
              setScalar(value);
              reset();
            }}
            options={[-2, -1, 0, 1, 2, 3, 4, 6].map((r) => ({
              value: r,
              presentation: `$${r}$`,
              speech: String(r),
            }))}
          />
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
          Submodule generator <M focusable={false}>{String.raw`d\mid n`}</M>
          <Choice
            label="Submodule generator d dividing n"
            value={generator}
            onChange={(value) => {
              setGenerator(value);
              reset();
            }}
            options={Array.from({ length: modulus }, (_, i) => i + 1)
              .filter((d) => modulus % d === 0)
              .map((d) => ({
                value: d,
                presentation: `$${d}$`,
                speech: String(d),
              }))}
          />
        </label>
        <label>
          Vector <M focusable={false}>{String.raw`[x]`}</M>
          <Choice
            label="Vector [x]"
            value={vector}
            onChange={(value) => {
              setVector(value);
              reset();
            }}
            options={model.action.elements.map((x) => ({
              value: x,
              presentation: `$[${x}]$`,
              speech: `Residue class ${x}`,
            }))}
          />
        </label>
      </div>
      <label className="prediction-prompt">
        For {stageNames[stage]}, predict the relevant action, relation,
        submodule or exactness invariant using the selected{" "}
        <M focusable={false}>{"n,r,d"}</M> and <M focusable={false}>{"[x]"}</M>.
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
                  <Prose>{String.raw`Left action: $r\cdot[x]=[rx]$ in $M$; $r\mapsto([x]\mapsto[rx])$ is a unital map $\mathbb Z\to\operatorname{End}_{\mathrm{Ab}}(M)$. The selected scalar $${scalar}$ has kernel $${setText(model.action.kernel)}$ and image $${setText(model.action.image)}$.`}</Prose>
                </p>
                <p>
                  <Prose>{String.raw`${model.action.inverse === undefined ? "This operator is not invertible on $M$." : `This operator is invertible on $M$, with scalar inverse $${model.action.inverse}$ modulo $${modulus}$.`} ${model.regularModuleInvertible ? `$${scalar}$ is a unit of $\\mathbb Z$ and acts invertibly on every unital $\\mathbb Z$-module.` : `$${scalar}$ is a nonunit of $\\mathbb Z$; on the regular module $\\mathbb Z$ its multiplication map is not invertible.`}`}</Prose>
                </p>
              </>
            )}
            {stage === "presentation" && (
              <>
                <p>
                  <Prose>{String.raw`Generator $e=[1]$; relation $${modulus}e=0$; annihilator of $M$ is $${modulus}\mathbb Z$. This cyclic module is not free over $\mathbb Z$ because $e$ is nonzero torsion.`}</Prose>
                </p>
                <M
                  block
                >{`0\\longrightarrow\\mathbb Z\\xrightarrow{\\times ${modulus}}\\mathbb Z\\xrightarrow{q}M\\longrightarrow0`}</M>
                <p>
                  <Prose>{String.raw`The relation map has image $${modulus}\mathbb Z$, exactly $\ker q$. This is a presentation and a short exact sequence.`}</Prose>
                </p>
              </>
            )}
            {stage === "submodule" && (
              <>
                <p>
                  <Prose>{String.raw`$N=\langle[${generator}]\rangle=${setText(model.submodule)}$ is closed under addition and every integer scalar. $M/N\cong\mathbb Z/${generator}\mathbb Z$ has representatives $${setText(model.quotient)}$; $r$ acts on them as $${setText(model.quotientAction)}$.`}</Prose>
                </p>
                <p>
                  <Prose>{String.raw`Changing $[x]+N$ by $[n]\in N$ changes $r[x]$ by $r[n]\in N$, so quotient scalar multiplication is well-defined. For $T=\operatorname{diag}(2,1)$ on $\mathbb Q^2$, $\mathbb Qe_1$ is stable; $\mathbb Q(e_1+e_2)$ is not stable: $T(e_1+e_2)=2e_1+e_2$.`}</Prose>
                </p>
              </>
            )}
            {stage === "exactness" && (
              <>
                <p>
                  <Prose>{String.raw`For $\times ${scalar}:M\to M$, $\ker=${setText(model.action.kernel)}$, $\operatorname{im}=${setText(model.action.image)}$; $|M/\ker|=${model.imageQuotientSize}=|\operatorname{im}|$ and $|M/\operatorname{im}|=${model.cokernelSize}$. The induced map $[x]+\ker\mapsto[${scalar}x]$ is the first module isomorphism.`}</Prose>
                </p>
                <p>
                  <Prose>{String.raw`$\operatorname{Ann}([${vector}])=${model.vectorAnnihilator}\mathbb Z$, while $\operatorname{Ann}(M)=${model.moduleAnnihilator}\mathbb Z$. For a left module over noncommutative $R$, $\operatorname{Ann}(m)$ is a left ideal and $\operatorname{Ann}(M)$ is two-sided.`}</Prose>
                </p>
                <p>
                  <Prose>{String.raw`At the middle $\mathbb Z$ of $0\to\mathbb Z\xrightarrow{\times ${modulus}}\mathbb Z\xrightarrow{q}M\to0$, $\operatorname{im}(\times ${modulus})=${modulus}\mathbb Z=\ker q$. This sequence is nonsplit: a section $M\to\mathbb Z$ would send torsion $e$ to a nonzero torsion integer. By contrast, $0\to\mathbb Z\to\mathbb Z\oplus\mathbb Z\to\mathbb Z\to0$ splits by section $b\mapsto(0,b)$.`}</Prose>
                </p>
                <p>
                  <Prose>{String.raw`For $T=\operatorname{diag}(2,1)$ on $M=\mathbb Q^2$ and $X$ acting as $2$ on $N=\mathbb Q$, $p(a,b)=a$ is $\mathbb Q[X]$-linear: $p(T(a,b))=2a=X\cdot p(a,b)$. Its kernel is $\mathbb Qe_2$, its image is $\mathbb Q$, and $M/\mathbb Qe_2\cong\mathbb Q$ as $\mathbb Q[X]$-modules.`}</Prose>
                </p>
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
                  <Prose>{String.raw`$\mathbb Z/${modulus}\mathbb Z$, generator $e=[1]$, relation $${modulus}e=0$`}</Prose>
                </td>
              </tr>
              <tr>
                <th scope="row">Scalar action</th>
                <td>
                  <Prose>{String.raw`$${scalar}\cdot[x]=[${scalar}x]$; kernel $${setText(model.action.kernel)}$; image $${setText(model.action.image)}$`}</Prose>
                </td>
              </tr>
              <tr>
                <th scope="row">Submodule and quotient</th>
                <td>
                  <Prose>{String.raw`$N=${setText(model.submodule)}$; $M/N$ has $${model.quotient.length}$ classes`}</Prose>
                </td>
              </tr>
              <tr>
                <th scope="row">Annihilators</th>
                <td>
                  <Prose>{String.raw`$\operatorname{Ann}([${vector}])=${model.vectorAnnihilator}\mathbb Z$; $\operatorname{Ann}(M)=${model.moduleAnnihilator}\mathbb Z$`}</Prose>
                </td>
              </tr>
            </tbody>
          </table>
          <button onClick={() => setFailure(!failure)} aria-pressed={failure}>
            {failure ? "Hide" : "Try"} a nonunit and nonsplit failure
          </button>
          {failure && (
            <p role="status">
              <Prose>{String.raw`Scalar $2$ is not a unit of $\mathbb Z$ but acts invertibly on $\mathbb Z/3\mathbb Z$; it does not act invertibly on the regular module $\mathbb Z$. The exact sequence $0\to\mathbb Z\xrightarrow{\times6}\mathbb Z\to\mathbb Z/6\mathbb Z\to0$ does not split: a $\mathbb Z$-linear section would send $[1]$ to a nonzero integer killed by $6$.`}</Prose>
            </p>
          )}
          <p>
            <Prose>{String.raw`Proof boundary: the finite action table checks this $M$ only. Units act invertibly on every unital module by their ring inverses; submodule closure proves quotient well-definedness; $\operatorname{im}=\ker$ checks exactness; a section, not exactness alone, proves a direct-sum splitting. The guided proof supplies those general arguments.`}</Prose>
          </p>
        </>
      )}
    </div>
  );
}
