"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import { Math as M } from "./Math";
import {
  matrixUnitProduct,
  wedderburnLayers,
  type AlgebraChoice,
  type FieldChoice,
} from "@/lib/algebra/wedderburn-layers";

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
        {lesson.id === "algebra-radical"
          ? "Do simple successive layers force a direct-sum decomposition? "
          : "Is the dimension of a matrix block the same as its simple module? "}
        Throughout, A is an associative, finite-dimensional, unital algebra over
        the selected field F; modules are unital left A-modules. The
        Artin–Wedderburn direct-product claim applies to semisimple A, and over
        a general field its matrix blocks may use division rings rather than F.
      </p>
      <M block>
        {
          "E_{ij}E_{kl}=\\delta_{jk}E_{il},\\qquad J(T_2(F))=FE_{12},\\quad J^2=0"
        }
      </M>
      <div className="lab-controls">
        <label>
          Algebra A
          <select
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
          Coefficient field F
          <select
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
              First matrix unit Eᵢⱼ
              <select
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
              Second matrix unit Eₖₗ
              <select
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
            A is finite-dimensional ({model.dimension}) and unital over{" "}
            {field === "Q" ? "ℚ" : "𝔽₂"}. Its radical has dimension{" "}
            {model.radicalDimension}; A/J(A)≅{model.quotient}. A{" "}
            {model.semisimple ? "is" : "is not"} semisimple.
          </p>
          <p>
            {model.blocks}. {model.simples}. {model.regular}.
          </p>
          <p>
            {model.naturalModule}. {model.failure}.
          </p>
          {algebra === "matrix" && (
            <p>
              {first}
              {second}={product}; EᵢⱼEₖₗ is zero unless j=k. The two column
              copies of F² account for the regular module’s multiplicity.
            </p>
          )}
          {algebra === "triangular" && (
            <p>
              For A=[[a,b],[0,c]], J(A) consists of [[0,b],[0,0]]. On V=F²,
              E₁₂e₂=e₁; the socle Fe₁ and quotient V/Fe₁ are simple, but no
              invariant line complements Fe₁.
            </p>
          )}
          {algebra === "group-c2" && (
            <p>
              {field === "Q"
                ? "The explicit block map sends a+bg to (a+b,a−b), with inverse (x,y)↦((x+y)/2)+((x−y)/2)g."
                : "The element ε=g+1 has ε²=0 and spans the radical; no idempotent split using 1/2 exists."}
            </p>
          )}
          {failure && (
            <p role="status">
              Failure witness: the two one-dimensional layers of the natural
              T₂(F)-module do not split, because E₁₂ carries e₂ to e₁.
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
                <td>Associative, finite-dimensional, unital F-algebra</td>
              </tr>
              <tr>
                <th scope="row">Dimension</th>
                <td>{model.dimension}</td>
              </tr>
              <tr>
                <th scope="row">Radical dimension</th>
                <td>{model.radicalDimension}</td>
              </tr>
              <tr>
                <th scope="row">Semisimple quotient</th>
                <td>{model.quotient}</td>
              </tr>
              <tr>
                <th scope="row">Module layers</th>
                <td>{model.naturalModule}</td>
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
          The displayed matrices compute these finite examples. The general
          Artin–Wedderburn theorem requires a semisimple Artinian unital ring;
          finite-dimensional semisimple F-algebras satisfy that condition.
          Quotienting by J(A) produces semisimple blocks but does not split
          every A-module extension. For left modules, the commuting endomorphism
          division ring becomes a right scalar ring only after reversing
          multiplication: the opposite-ring step cannot be dropped.
        </p>
        <p>
          {lesson.title} separates algebra blocks, simple dimensions and regular
          multiplicities.
        </p>
      </div>
    </div>
  );
}
