"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import { Math as M } from "./Math";
import {
  inducedState,
  type HCharacter,
  type S3Element,
  type TargetCharacter,
} from "@/lib/algebra/induction-restriction";

const matrixText = (matrix: number[][]) =>
  matrix.map((row) => `[${row.join(", ")}]`).join("; ");

export function InductionReciprocityLab({ lesson }: { lesson: Lesson }) {
  const [character, setCharacter] = useState<HCharacter>("sign");
  const [element, setElement] = useState<S3Element>("s");
  const [basis, setBasis] = useState(1);
  const [target, setTarget] = useState<TargetCharacter>("standard");
  const [prediction, setPrediction] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [failure, setFailure] = useState(false);
  const state = inducedState(character, element, basis, target);
  const reset = () => {
    setPrediction("");
    setRevealed(false);
    setFailure(false);
  };
  return (
    <div className="foundation-lab">
      <p>
        How does induction from H=⟨s=(12)⟩≅C₂ to S₃ move one vector across coset
        copies? Choose the one-dimensional H-character φ and the transversal
        t₀=e, t₁=r=(123), t₂=r². In Ind_H^G φ the basis vector uᵢ=tᵢ⊗1 has
        dimension [G:H]·dim φ=3.
      </p>
      <M block>
        {
          "g t_i=t_j h,\\quad g\\cdot u_i=\\varphi(h)u_j,\\qquad \\langle\\operatorname{Ind}_H^G\\varphi,\\chi\\rangle_G=\\langle\\varphi,\\operatorname{Res}_H^G\\chi\\rangle_H"
        }
      </M>
      <div className="lab-controls">
        <label>
          Inducing H-character φ
          <select
            value={character}
            onChange={(e) => {
              setCharacter(e.target.value as HCharacter);
              reset();
            }}
          >
            <option value="trivial">trivial: φ(s)=1</option>
            <option value="sign">sign: φ(s)=−1</option>
          </select>
        </label>
        <label>
          Acting element g
          <select
            value={element}
            onChange={(e) => {
              setElement(e.target.value as S3Element);
              reset();
            }}
          >
            <option value="e">e</option>
            <option value="r">r=(123)</option>
            <option value="s">s=(12)</option>
          </select>
        </label>
        <label>
          Coset basis vector uᵢ
          <select
            value={basis}
            onChange={(e) => {
              setBasis(Number(e.target.value));
              reset();
            }}
          >
            {[0, 1, 2].map((index) => (
              <option key={index} value={index}>
                u{index}
              </option>
            ))}
          </select>
        </label>
        <label>
          Target G-character χ
          <select
            value={target}
            onChange={(e) => {
              setTarget(e.target.value as TargetCharacter);
              reset();
            }}
          >
            <option value="trivial">trivial</option>
            <option value="sign">sign</option>
            <option value="standard">standard</option>
          </select>
        </label>
      </div>
      <label className="prediction-prompt">
        Predict g·uᵢ, the induced trace, and both Hom-space dimensions before
        revealing them.
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
          <h3>Coset, trace and reciprocity evidence</h3>
          <p>
            {element}·u{basis}={state.coefficient === -1 ? "−" : ""}u
            {state.targetBasis}. The subgroup correction is {state.correction};
            for s it contributes φ(s)={character === "sign" ? "−1" : "1"}.
            Omitting that correction gives the wrong induced sign trace.
          </p>
          <p>
            Generator matrices on (u₀,u₁,u₂): R=[{matrixText(state.generatorR)}
            ], S=[{matrixText(state.generatorS)}]. The selected matrix is [
            {matrixText(state.matrix)}].
          </p>
          <p>
            On (e, transpositions, 3-cycles), χ_Ind=(
            {state.inducedValues.join(", ")}); χ_{target}=(
            {state.targetRow.join(", ")}). Its trace at {element} is
            {element === "e"
              ? state.inducedValues[0]
              : element === "s"
                ? state.inducedValues[1]
                : state.inducedValues[2]}
            .
          </p>
          <p>
            dim Hom_G(Ind φ,{target})={state.innerProduct}; dim Hom_H(φ,Res{" "}
            {target})={state.restrictedHomDimension}. Both sides agree. The
            double cosets are {state.doubleCosets.join(" and ")}.
          </p>
          {failure && (
            <p role="status">
              Failure witness: treating the sign-induced s matrix as an unsigned
              permutation changes its trace from −1 to +1, falsely replacing
              Ind(sign_H)=sign_G⊕Std by Ind(trivial_H)=trivial_G⊕Std.
            </p>
          )}
          <table>
            <caption>Induced character and Hom dimensions by target</caption>
            <thead>
              <tr>
                <th scope="col">G target</th>
                <th scope="col">trivial</th>
                <th scope="col">sign</th>
                <th scope="col">standard</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">dim Hom_G(Ind φ, target)</th>
                {(["trivial", "sign", "standard"] as TargetCharacter[]).map(
                  (name) => (
                    <td key={name}>
                      {
                        inducedState(character, element, basis, name)
                          .innerProduct
                      }
                    </td>
                  ),
                )}
              </tr>
              <tr>
                <th scope="row">dim Hom_H(φ, Res target)</th>
                {(["trivial", "sign", "standard"] as TargetCharacter[]).map(
                  (name) => (
                    <td key={name}>
                      {
                        inducedState(character, element, basis, name)
                          .restrictedHomDimension
                      }
                    </td>
                  ),
                )}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setCharacter("sign");
          setElement("s");
          setBasis(1);
          setTarget("sign");
          setPrediction(
            "Ignoring the subgroup sign would give the wrong trace.",
          );
          setRevealed(true);
          setFailure(true);
        }}
      >
        Try forgetting the subgroup correction
      </button>
      <div className="laboratory-debrief">
        <h3>Theorem debrief and proof boundary</h3>
        <p>
          The coset calculation gives every matrix entry in this
          three-dimensional S₃ example. A fixed coset contributes to the induced
          trace only after its H-correction is evaluated. Frobenius reciprocity
          is a natural Hom-space isomorphism; the matching dimensions here
          verify this one example but do not prove the general theorem. The
          separate character table lesson proves its own inflation and
          orthogonality boundaries.
        </p>
        <p>
          {lesson.title} keeps the transversal and subgroup correction visible.
        </p>
      </div>
    </div>
  );
}
