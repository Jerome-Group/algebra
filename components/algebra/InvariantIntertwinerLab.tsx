"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import { Math as M } from "./Math";
import {
  matrixText,
  representationState,
  type ActingGroup,
  type FieldChoice,
  type LineChoice,
  type MapChoice,
} from "@/lib/algebra/invariant-intertwiner";

const lessonFocus: Record<string, { question: string; evidence: string }> = {
  "foundations-linear-algebra": {
    question: "What do the columns of the quarter-turn matrix do?",
    evidence:
      "R e₁=e₂ and R e₂=−e₁. Thus ker R=0, im R=𝔽² and 0+2=2 by rank–nullity; tr R=0.",
  },
  "ureca-linear-action": {
    question: "Why do the two generator matrices define a left D₈ action?",
    evidence:
      "R⁴=S²=I and SRS=R⁻¹. On column vectors ρ(gh)v=ρ(g)(ρ(h)v); inverse group elements give inverse matrices.",
  },
  "ureca-permutation-module": {
    question: "How is a permutation of points extended to a linear map?",
    evidence:
      "For the cycle (123), e₁→e₂→e₃→e₁ and 2e₁−e₃→2e₂−e₁. Eight independent cube-vertex labels give an eight-dimensional permutation module, even though the cube sits in ℝ³.",
  },
  "ureca-invariant-subspaces": {
    question: "Does one eigenline survive every D₈ generator?",
    evidence:
      "Over characteristic ≠3, the three-point permutation module splits using p_C(x,y,z)=((x+y+z)/3)(1,1,1); the sum-zero plane is its complementary invariant image. In characteristic 3 the division and direct sum fail.",
  },
  "ureca-intertwiners": {
    question: "Can one fixed matrix intertwine both generators?",
    evidence:
      "T=S is invertible and satisfies TR=R⁻¹T and TS=ST. The equivariant projection q:V⊕𝔽→𝔽 has invariant kernel V⊕0 and image 𝔽 but is not an equivalence.",
  },
};

export function InvariantIntertwinerLab({ lesson }: { lesson: Lesson }) {
  const [field, setField] = useState<FieldChoice>("R");
  const [group, setGroup] = useState<ActingGroup>("dihedral");
  const [line, setLine] = useState<LineChoice>("real-axis");
  const [map, setMap] = useState<MapChoice>("basis-change");
  const [coefficient, setCoefficient] = useState(2);
  const [prediction, setPrediction] = useState("");
  const [revealed, setRevealed] = useState(false);
  const state = representationState(field, group, line, map);
  const focus = lessonFocus[lesson.id];
  const reset = () => {
    setPrediction("");
    setRevealed(false);
  };
  return (
    <div className="foundation-lab">
      <p>
        Which subspaces survive the action, and which one fixed linear map
        intertwines two representations? This is the standard left action of
        D₈=⟨r,s | r⁴=s²=1, srs=r⁻¹⟩ on column vectors in 𝔽². The matrix of r is
        R=[[0,−1],[1,0]] and of s is S=diag(1,−1). The generator selector
        changes the subspace question; the map is tested against both D₈
        generators throughout.
      </p>
      <M block>
        {
          "R=\\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix},\\quad S=\\begin{pmatrix}1&0\\\\0&-1\\end{pmatrix}"
        }
      </M>
      <p>{focus.question}</p>
      <div className="lab-controls">
        {lesson.id === "ureca-permutation-module" && (
          <label>
            Coefficient a in a e₁−e₃
            <select
              value={coefficient}
              onChange={(e) => {
                setCoefficient(Number(e.target.value));
                reset();
              }}
            >
              {[1, 2, 3].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Scalar field 𝔽
          <select
            value={field}
            onChange={(e) => {
              setField(e.target.value as FieldChoice);
              reset();
            }}
          >
            <option value="R">ℝ</option>
            <option value="C">ℂ</option>
          </select>
        </label>
        <label>
          Acting generators
          <select
            value={group}
            onChange={(e) => {
              setGroup(e.target.value as ActingGroup);
              reset();
            }}
          >
            <option value="rotation">⟨r⟩≅C₄</option>
            <option value="dihedral">D₈=⟨r,s⟩</option>
          </select>
        </label>
        <label>
          Candidate subspace W
          <select
            value={line}
            onChange={(e) => {
              setLine(e.target.value as LineChoice);
              reset();
            }}
          >
            <option value="real-axis">𝔽e₁</option>
            <option value="complex-eigenline">𝔽(e₁+i e₂)</option>
            <option value="whole">𝔽²</option>
          </select>
        </label>
        <label>
          Candidate T:ρ→ρ′
          <select
            value={map}
            onChange={(e) => {
              setMap(e.target.value as MapChoice);
              reset();
            }}
          >
            <option value="basis-change">S=diag(1,−1)</option>
            <option value="identity">I</option>
            <option value="singular">diag(1,0)</option>
          </select>
        </label>
      </div>
      <label className="prediction-prompt">
        Predict whether W is invariant and T intertwines both generators before
        revealing the equations.
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
          <h3>Invariant subspace and intertwiner evidence</h3>
          <p>{focus.evidence}</p>
          {lesson.id === "ureca-permutation-module" && (
            <p>
              For the 3-cycle (123), {coefficient}e₁−e₃ maps to {coefficient}
              e₂−e₁. For cube vertices labelled by three sign bits 0,…,7, a
              half-turn about the x-axis acts on the eight basis vectors by (0
              3)(1 2)(4 7)(5 6).
            </p>
          )}
          <p>
            {line === "real-axis"
              ? "R e₁=e₂, so 𝔽e₁ fails under r. S e₁=e₁."
              : line === "complex-eigenline"
                ? "R(e₁+i e₂)=−i(e₁+i e₂), while S(e₁+i e₂)=e₁−i e₂."
                : "Every matrix sends 𝔽² into itself."}
            {!state.lineDefined &&
              " The complex eigenline is not a subspace of ℝ²."}
          </p>
          <p>
            W is {state.invariant ? "invariant" : "not invariant"} for the
            selected field and generators. Rotation stability:{" "}
            {state.rotationStable ? "yes" : "no"}; reflection stability:{" "}
            {state.reflectionStable ? "yes" : "no"}.
          </p>
          <p>
            Let ρ′(r)=R⁻¹ and ρ′(s)=S. For the single selected T=
            {matrixText(state.candidate)}, TR={matrixText(state.leftRotation)}{" "}
            and R⁻¹T={matrixText(state.rightRotation)}; TS=
            {matrixText(state.leftReflection)} and ST=
            {matrixText(state.rightReflection)}. T{" "}
            {state.intertwines
              ? "intertwines both generators"
              : "fails the intertwiner equation"}
            .
          </p>
          <table>
            <caption>
              Exact generator checks for the selected subspace and map
            </caption>
            <thead>
              <tr>
                <th scope="col">Generator</th>
                <th scope="col">W stable</th>
                <th scope="col">Tρ(g)=ρ′(g)T</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">r</th>
                <td>{state.rotationStable ? "yes" : "no"}</td>
                <td>{state.rotationIntertwines ? "yes" : "no"}</td>
              </tr>
              <tr>
                <th scope="row">s</th>
                <td>{state.reflectionStable ? "yes" : "no"}</td>
                <td>{state.reflectionIntertwines ? "yes" : "no"}</td>
              </tr>
            </tbody>
          </table>
          <p>
            A noninvertible equivariant projection also exists:{" "}
            {state.projection.source}; {state.projection.formula}, ker q=
            {state.projection.kernel}, im q={state.projection.image}.{" "}
            {state.projection.equation}.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setField("C");
          setGroup("dihedral");
          setLine("complex-eigenline");
          setMap("identity");
          setPrediction(
            "The rotation eigenline fails under reflection and I fails to intertwine r.",
          );
          setRevealed(true);
        }}
      >
        Try the complex-line and identity-map failure
      </button>
      <div className="laboratory-debrief">
        <h3>Theorem debrief and proof boundary</h3>
        <p>
          Stability under each generator proves stability under every group
          word. The same fixed T must satisfy the equation on each generator;
          separate conjugators for individual elements do not prove equivalence.
          Kernel and image of an intertwiner are invariant subspaces. This
          finite generator check proves only the displayed D₈ example. Schur’s
          lemma additionally assumes irreducibility and a suitable field.
        </p>
        <p>
          {lesson.title}: over ℝ, the quarter-turn has no real eigenline; over ℂ
          it has two eigenlines, but the reflection swaps them. The full
          two-dimensional D₈ representation remains irreducible over both
          fields.
        </p>
      </div>
    </div>
  );
}
