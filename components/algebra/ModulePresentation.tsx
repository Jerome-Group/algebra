"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import { cyclicModule } from "@/lib/algebra/foundation-labs";
import { Math as M } from "./Math";
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
        This is a left Z-module: r·[x]=[rx]. Integers act on residue classes. It
        is cyclic but not free over Z, since a nonzero integer annihilates its
        nonzero generator.
      </p>
      <label>
        Relation ne=0 (n)
        <select
          value={modulus}
          onChange={(event) => setModulus(Number(event.target.value))}
        >
          {[3, 4, 6, 8, 12].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label>
        Integer scalar r
        <select
          value={scalar}
          onChange={(event) => setScalar(Number(event.target.value))}
        >
          {[-2, -1, 0, 1, 2, 3, 4, 6].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <M
        block
      >{`0\\longrightarrow\\mathbb Z\\xrightarrow{\\times ${modulus}}\\mathbb Z\\xrightarrow{q} M\\longrightarrow0`}</M>
      <div className="presentation-board">
        <span>Generator: e=[1]</span>
        <span>Relation: {modulus}e=0</span>
        <span>Annihilator: {modulus}Z</span>
      </div>
      <table>
        <caption>Scalar action r·[x] on every module element</caption>
        <thead>
          <tr>
            <th scope="col">[x]</th>
            <th scope="col">{scalar}·[x]</th>
          </tr>
        </thead>
        <tbody>
          {model.elements.map((x) => (
            <tr key={x}>
              <th scope="row">[{x}]</th>
              <td>[{model.images[x]}]</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="live-mathematics" aria-live="polite">
        <p>
          Kernel of r·: {"{"}
          {model.kernel.join(", ")}
          {"}"}. Image rM: {"{"}
          {model.image.join(", ")}
          {"}"}. |M/rM|={model.quotientSize}.
        </p>
        <p>
          {model.inverse === undefined
            ? "This scalar action is not invertible."
            : `This scalar action is invertible: multiplication by ${model.inverse} is its inverse on M.`}
        </p>
        <p>
          {Math.abs(scalar) === 1
            ? `${scalar} is a unit of Z and therefore acts invertibly on every unital Z-module.`
            : `${scalar} is not a unit of Z. ${model.inverse === undefined ? "It also fails to act invertibly on this module." : "Nevertheless it acts invertibly on this particular module."}`}
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
        Exactness checks: multiplication by n on Z is injective; im(×n)=nZ=ker
        q; q reaches every residue. This infinite sequence is justified by
        integer divisibility, not by the finite action table. On the regular
        module Z itself, multiplication by 2 is not surjective.
      </p>
    </div>
  );
}
