"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import { Math as M } from "./Math";
import {
  characterConstruction,
  characterNames,
  characterStages,
  s3Character,
  s3Classes,
  type CharacterName,
  type CharacterStage,
  type Weighting,
} from "@/lib/algebra/character-construction";

const stageNames: Record<CharacterStage, string> = {
  classes: "1. Conjugacy classes",
  representations: "2. Construct rows from representations",
  orthogonality: "3. Weighted orthogonality",
  decomposition: "4. Tensor decomposition",
};

export function CharacterConstruction({ lesson }: { lesson: Lesson }) {
  const [stage, setStage] = useState<CharacterStage>("classes");
  const [first, setFirst] = useState<CharacterName>("standard");
  const [second, setSecond] = useState<CharacterName>("standard");
  const [weighting, setWeighting] = useState<Weighting>("class-size");
  const [prediction, setPrediction] = useState("");
  const [revealed, setRevealed] = useState(false);
  const model = characterConstruction(first, second, weighting);
  const reset = () => {
    setPrediction("");
    setRevealed(false);
  };
  const rowText = (values: number[]) => `(${values.join(", ")})`;
  const scalarText = (value: number) =>
    Number.isInteger(value) ? String(value) : `${Math.round(value * 3)}/3`;
  return (
    <div className="foundation-lab">
      <p>
        Construct the complex character table of S₃ from actual left
        representations, then use class-weighted inner products. The three point
        permutation representation has trace equal to fixed points; subtract its
        constant line to obtain the two-dimensional standard row.
      </p>
      <M block>
        {
          "\\chi_{\\mathrm{Std}}=\\chi_{\\mathbb C[3]}-\\chi_{\\mathbf1},\\quad \\langle\\chi,\\psi\\rangle=\\frac1{6}\\sum_C|C|\\chi(C)\\overline{\\psi(C)}"
        }
      </M>
      <div className="lab-controls">
        <label>
          Learning stage
          <select
            value={stage}
            onChange={(e) => {
              setStage(e.target.value as CharacterStage);
              reset();
            }}
          >
            {characterStages.map((item) => (
              <option key={item} value={item}>
                {stageNames[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          First representation
          <select
            value={first}
            onChange={(e) => {
              setFirst(e.target.value as CharacterName);
              reset();
            }}
          >
            {characterNames.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Second representation
          <select
            value={second}
            onChange={(e) => {
              setSecond(e.target.value as CharacterName);
              reset();
            }}
          >
            {characterNames.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Inner-product weighting
          <select
            value={weighting}
            onChange={(e) => {
              setWeighting(e.target.value as Weighting);
              reset();
            }}
          >
            <option value="class-size">By conjugacy-class size</option>
            <option value="equal-columns">Incorrect equal-column trial</option>
          </select>
        </label>
      </div>
      <label className="prediction-prompt">
        For {stageNames[stage]}, predict a row, inner product or multiplicity
        before revealing the constructed table.
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
          <h3>Constructed S₃ character evidence</h3>
          {stage === "classes" && (
            <p>
              Conjugacy classes are e (size 1), transpositions (size 3), and
              3-cycles (size 2). Their sizes sum to |S₃|={model.order}; a
              character is constant on each class because trace is unchanged
              under conjugation.
            </p>
          )}
          {stage === "representations" && (
            <p>
              Trivial trace: {rowText(s3Character("trivial"))}; sign from
              parity:
              {rowText(s3Character("sign"))}. The three-point permutation trace
              counts fixed points:{" "}
              {rowText(s3Classes.map((item) => item.fixedPoints))}. Subtracting
              the trivial row yields Std={rowText(s3Character("standard"))}.
            </p>
          )}
          {stage === "orthogonality" && (
            <p>
              With{" "}
              {weighting === "class-size"
                ? "class-size weights (1,3,2)"
                : "incorrect equal-column weights (1,1,1)"}
              , ⟨Std,Std⟩={scalarText(model.standardNorm)}. The correct weighted
              norm is 1; the equal-column result 5/3 violates irreducible
              orthogonality. Degrees satisfy 1²+1²+2²={model.degreesSquared}
              =|S₃|.
            </p>
          )}
          {stage === "decomposition" && (
            <p>
              χ_{first}χ_{second}={rowText(model.product)}. Inner products give
              multiplicities: trivial {scalarText(model.multiplicities.trivial)}
              , sign {scalarText(model.multiplicities.sign)}, standard{" "}
              {scalarText(model.multiplicities.standard)}.
              {weighting === "class-size" &&
                first === "standard" &&
                second === "standard" &&
                " Thus Std⊗Std≅1⊕sgn⊕Std."}
            </p>
          )}
          <table>
            <caption>S₃ rows constructed from fixed points and parity</caption>
            <thead>
              <tr>
                <th scope="col">Representation</th>
                {s3Classes.map((item) => (
                  <th scope="col" key={item.name}>
                    {item.name} · size {item.size}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Permutation on three points</th>
                {s3Classes.map((item) => (
                  <td key={item.name}>{item.fixedPoints}</td>
                ))}
              </tr>
              {characterNames.map((name) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  {s3Character(name).map((value, index) => (
                    <td key={s3Classes[index].name}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setStage("orthogonality");
          setWeighting("equal-columns");
          setPrediction("Equal columns should give norm 1; test this failure.");
          setRevealed(true);
        }}
      >
        Try the equal-column failure
      </button>
      <div className="laboratory-debrief">
        <h3>Theorem debrief and proof boundary</h3>
        <p>
          The table follows from the three displayed representations, not a list
          of memorised rows. Complex-character orthogonality requires the actual
          class sizes and a proof via matrix coefficients. The finite
          computation verifies S₃; it does not prove orthogonality for every
          finite group. Maschke’s averaging needs |G| invertible in the field,
          and Schur’s scalar conclusion needs an algebraically closed field.
        </p>
        <p>{lesson.title} connects trace to representation structure.</p>
      </div>
    </div>
  );
}
