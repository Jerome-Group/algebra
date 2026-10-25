"use client";
import { Choice } from "./Groups";

import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import { cyclicModule } from "@/lib/algebra/foundation-labs";
import { Math as M, Prose } from "./Math";
export function ModulePresentation({ lesson }: { lesson: Lesson }) {
  const [modulus, setModulus] = useState(
      Number(lesson.parameters?.modulus ?? 3),
    ),
    [scalar, setScalar] = useState(2);
  const model = cyclicModule(modulus, scalar);
  return (
    <div className="foundation-lab">
      <M
        block
      >{`R=\\mathbb Z,\\quad M=\\mathbb Z/${modulus}\\mathbb Z=\\langle e\\mid ${modulus}e=0\\rangle`}</M>
      <p>
        <Prose>{String.raw`This is a left $\mathbb Z$-module: $r\cdot[x]=[rx]$. Integers act on residue classes. It is cyclic but not free over $\mathbb Z$, since a nonzero integer annihilates its nonzero generator.`}</Prose>
      </p>
      <label>
        Relation <M focusable={false}>{"ne=0"}</M> (
        <M focusable={false}>{"n"}</M>)
        <Choice
          label="Relation ne=0 (n)"
          value={modulus}
          onChange={(value) => setModulus(value)}
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
          onChange={(value) => setScalar(value)}
          options={[-2, -1, 0, 1, 2, 3, 4, 6].map((r) => ({
            value: r,
            presentation: `$${r}$`,
            speech: String(r),
          }))}
        />
      </label>
      <M
        block
      >{`0\\longrightarrow\\mathbb Z\\xrightarrow{\\times ${modulus}}\\mathbb Z\\xrightarrow{q} M\\longrightarrow0`}</M>
      <div className="presentation-board">
        <span>
          <Prose>{String.raw`Generator: $e=[1]$`}</Prose>
        </span>
        <span>
          <Prose>{String.raw`Relation: $${modulus}e=0$`}</Prose>
        </span>
        <span>
          <Prose>{String.raw`Annihilator: $${modulus}\mathbb Z$`}</Prose>
        </span>
      </div>
      <table>
        <caption>
          <Prose>{String.raw`Scalar action $r\cdot[x]$ on every module element`}</Prose>
        </caption>
        <thead>
          <tr>
            <th scope="col">
              Vector <M>{"[x]"}</M>
            </th>
            <th scope="col">
              Image <M>{String.raw`${scalar}\cdot[x]`}</M>
            </th>
          </tr>
        </thead>
        <tbody>
          {model.elements.map((x) => (
            <tr key={x}>
              <th scope="row">
                Vector <M>{`[${x}]`}</M>
              </th>
              <td>
                <M>{`[${model.images[x]}]`}</M>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="live-mathematics" aria-live="polite">
        <p>
          <Prose>{String.raw`Kernel of $r\cdot$: $\{${model.kernel.join(", ")}\}$. Image $rM$: $\{${model.image.join(", ")}\}$. $|M/rM|=${model.quotientSize}$.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`${model.inverse === undefined ? "This scalar action is not invertible." : `This scalar action is invertible: multiplication by $${model.inverse}$ is its inverse on $M$.`}`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`$${scalar}$ is ${Math.abs(scalar) === 1 ? "a unit of $\\mathbb Z$ and therefore acts invertibly on every unital $\\mathbb Z$-module." : `not a unit of $\\mathbb Z$. ${model.inverse === undefined ? "It also fails to act invertibly on this module." : "Nevertheless it acts invertibly on this particular module."}`}`}</Prose>
        </p>
      </div>
      <button
        onClick={() => {
          setModulus(3);
          setScalar(2);
        }}
      >
        Try the nonunit acting invertibly
      </button>
      <button
        onClick={() => {
          setModulus(6);
          setScalar(2);
        }}
      >
        Try the same scalar with a nontrivial kernel
      </button>
      <p>
        <Prose>{String.raw`Exactness checks: multiplication by $n$ on $\mathbb Z$ is injective; $\operatorname{im}(\times n)=n\mathbb Z=\ker q$; $q$ reaches every residue. This infinite sequence is justified by integer divisibility, not by the finite action table. On the regular module $\mathbb Z$ itself, multiplication by $2$ is not surjective.`}</Prose>
      </p>
    </div>
  );
}
