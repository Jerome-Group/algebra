"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import { Math as M, Prose } from "./Math";
import {
  matrixUnitProduct,
  wedderburnLayers,
  type AlgebraChoice,
  type FieldChoice,
} from "@/lib/algebra/wedderburn-layers";

import { wedderburnText } from "./WedderburnLayerText";

const units = ["E11", "E12", "E21", "E22"] as const;
const unitIndices = (name: (typeof units)[number]): [1 | 2, 1 | 2] => [
  Number(name[1]) as 1 | 2,
  Number(name[2]) as 1 | 2,
];

export function WedderburnLayerLab({ lesson }: { lesson: Lesson }) {
  const [algebra, setAlgebra] = useState<AlgebraChoice>(
    lesson.id === "algebra-radical" ? "triangular" : "matrix",
  );
  const [field, setField] = useState<FieldChoice>("Q");
  const [first, setFirst] = useState<(typeof units)[number]>("E12");
  const [second, setSecond] = useState<(typeof units)[number]>("E21");
  const [prediction, setPrediction] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [failure, setFailure] = useState(false);
  const model = wedderburnLayers(algebra, field);
  const display = wedderburnText(algebra, field);
  const [i, j] = unitIndices(first);
  const [k, l] = unitIndices(second);
  const product = matrixUnitProduct(i, j, k, l);
  const reset = () => {
    setPrediction("");
    setRevealed(false);
    setFailure(false);
  };
  return (
    <div className="foundation-lab">
      <p>
        <Prose>{String.raw`${lesson.id === "algebra-radical" ? "Do simple successive layers force a direct-sum decomposition?" : "Is the dimension of a matrix block the same as its simple module?"} Throughout, $A$ is an associative, finite-dimensional, unital algebra over the selected field $F$; modules are unital left $A$-modules. The Artin–Wedderburn direct-product claim applies to semisimple $A$, and over a general field its matrix blocks may use division rings rather than $F$.`}</Prose>
      </p>
      <M block>
        {
          "E_{ij}E_{kl}=\\delta_{jk}E_{il},\\qquad J(T_2(F))=FE_{12},\\quad J^2=0"
        }
      </M>
      <div className="lab-controls">
        <label>
          Algebra <M focusable={false}>{String.raw`A`}</M>
          <select
            aria-label="Algebra A"
            value={algebra}
            onChange={(e) => {
              setAlgebra(e.target.value as AlgebraChoice);
              reset();
            }}
          >
            <option value="matrix">M₂(F)</option>
            <option value="triangular">T₂(F) upper triangular</option>
            <option value="group-c2">F[C₂]</option>
          </select>
        </label>
        <label>
          Coefficient field <M focusable={false}>{String.raw`F`}</M>
          <select
            aria-label="Coefficient field F"
            value={field}
            onChange={(e) => {
              setField(e.target.value as FieldChoice);
              reset();
            }}
          >
            <option value="Q">ℚ · characteristic zero</option>
            <option value="F2">𝔽₂ · characteristic two</option>
          </select>
        </label>
        {algebra === "matrix" && (
          <>
            <label>
              First matrix unit <M focusable={false}>{String.raw`E_{ij}`}</M>
              <select
                aria-label="First matrix unit Eᵢⱼ"
                value={first}
                onChange={(e) => {
                  setFirst(e.target.value as (typeof units)[number]);
                  reset();
                }}
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Second matrix unit <M focusable={false}>{String.raw`E_{kl}`}</M>
              <select
                aria-label="Second matrix unit Eₖₗ"
                value={second}
                onChange={(e) => {
                  setSecond(e.target.value as (typeof units)[number]);
                  reset();
                }}
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      <label className="prediction-prompt">
        Predict the radical, quotient blocks, simple-module dimensions and
        whether the displayed module splits before revealing the layers.
        <textarea
          value={prediction}
          onChange={(e) => setPrediction(e.target.value)}
          aria-label="Your mathematical prediction"
        />
      </label>
      <button
        type="button"
        disabled={!prediction.trim()}
        onClick={() => setRevealed(true)}
      >
        Test my prediction
      </button>
      {revealed && (
        <div className="live-mathematics" aria-live="polite">
          <h3>Block and radical-layer evidence</h3>
          <p>
            <Prose>{String.raw`$A$ is finite-dimensional ($${model.dimension}$) and unital over $${field === "Q" ? String.raw`\mathbb Q` : String.raw`\mathbb F_2`}$. Its radical has dimension $${model.radicalDimension}$; $A/J(A)\cong${display.quotient}$. $A$ ${model.semisimple ? "is" : "is not"} semisimple.`}</Prose>
          </p>
          <p>
            <Prose>{`${display.blocks}. ${display.simples}. ${display.regular}.`}</Prose>
          </p>
          <p>
            <Prose>{`${display.naturalModule}. ${display.failure}.`}</Prose>
          </p>
          {algebra === "matrix" && (
            <p>
              <Prose>{String.raw`$E_{${i}${j}}E_{${k}${l}}=${product === "0" ? "0" : `E_{${i}${l}}`}$; $E_{ij}E_{kl}$ is zero unless $j=k$. The two column copies of $F^2$ account for the regular module’s multiplicity.`}</Prose>
            </p>
          )}
          {algebra === "triangular" && (
            <p>
              <Prose>{String.raw`For $A=\{\begin{pmatrix}a&b\\0&c\end{pmatrix}:a,b,c\in F\}$, $J(A)$ consists of matrices $\begin{pmatrix}0&b\\0&0\end{pmatrix}$. On $V=F^2$, $E_{12}e_2=e_1$; the socle $Fe_1$ and quotient $V/Fe_1$ are simple, but no invariant line complements $Fe_1$.`}</Prose>
            </p>
          )}
          {algebra === "group-c2" && (
            <p>
              <Prose>{String.raw`${field === "Q" ? String.raw`The explicit block map sends $a+bg$ to $(a+b,a-b)$, with inverse $(x,y)\mapsto\frac{x+y}{2}+\frac{x-y}{2}g$.` : String.raw`The element $\varepsilon=g+1$ has $\varepsilon^2=0$ and spans the radical; no idempotent split using $1/2$ exists.`}`}</Prose>
            </p>
          )}
          {failure && (
            <p role="status">
              <Prose>{String.raw`Failure witness: the two one-dimensional layers of the natural $T_2(F)$-module do not split, because $E_{12}$ carries $e_2$ to $e_1$.`}</Prose>
            </p>
          )}
          <table>
            <caption>Semisimple blocks versus radical layers</caption>
            <thead>
              <tr>
                <th scope="col">Invariant</th>
                <th scope="col">Selected algebra</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Hypotheses</th>
                <td>
                  <Prose>
                    {"Associative, finite-dimensional, unital $F$-algebra"}
                  </Prose>
                </td>
              </tr>
              <tr>
                <th scope="row">Dimension</th>
                <td>
                  <M>{String(model.dimension)}</M>
                </td>
              </tr>
              <tr>
                <th scope="row">Radical dimension</th>
                <td>
                  <M>{String(model.radicalDimension)}</M>
                </td>
              </tr>
              <tr>
                <th scope="row">Semisimple quotient</th>
                <td>
                  <M>{display.quotient}</M>
                </td>
              </tr>
              <tr>
                <th scope="row">Module layers</th>
                <td>
                  <Prose>{display.naturalModule}</Prose>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setAlgebra("triangular");
          setPrediction("The two simple layers might not form a direct sum.");
          setRevealed(true);
          setFailure(true);
        }}
      >
        Try the nonsplit triangular-module failure
      </button>
      <div className="laboratory-debrief">
        <h3>Theorem debrief and proof boundary</h3>
        <p>
          <Prose>{String.raw`The displayed matrices compute these finite examples. The general Artin–Wedderburn theorem requires a semisimple Artinian unital ring; finite-dimensional semisimple $F$-algebras satisfy that condition. Quotienting by $J(A)$ produces semisimple blocks but does not split every $A$-module extension. For left modules, the commuting endomorphism division ring becomes a right scalar ring only after reversing multiplication: the opposite-ring step cannot be dropped.`}</Prose>
        </p>
        <p>
          <Prose>{lesson.title}</Prose> separates algebra blocks, simple
          dimensions and regular multiplicities.
        </p>
      </div>
    </div>
  );
}
