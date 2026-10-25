"use client";
import { Choice } from "./Groups";

import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import { Math as M, Prose } from "./Math";
import {
  representationState,
  type ActingGroup,
  type FieldChoice,
  type LineChoice,
  type MapChoice,
} from "@/lib/algebra/invariant-intertwiner";

const matrixTex = (matrix: readonly (readonly number[])[]) =>
  String.raw`\begin{pmatrix}${matrix.map((row) => row.join(" & ")).join(String.raw`\\`)}\end{pmatrix}`;

const lessonFocus: Record<string, { question: string; evidence: string }> = {
  "foundations-linear-algebra": {
    question: "What do the columns of the quarter-turn matrix do?",
    evidence: String.raw`$Re_1=e_2$ and $Re_2=-e_1$. Thus $\ker R=0$, $\operatorname{im}R=\mathbb F^2$ and $0+2=2$ by rank–nullity; $\operatorname{tr}R=0$.`,
  },
  "ureca-linear-action": {
    question: String.raw`Why do the two generator matrices define a left $D_8$ action?`,
    evidence: String.raw`$R^4=S^2=I$ and $SRS=R^{-1}$. On column vectors $\rho(gh)v=\rho(g)(\rho(h)v)$; inverse group elements give inverse matrices.`,
  },
  "ureca-permutation-module": {
    question: "How is a permutation of points extended to a linear map?",
    evidence: String.raw`For the cycle $(123)$, $e_1\to e_2\to e_3\to e_1$ and $2e_1-e_3\mapsto2e_2-e_1$. Eight independent cube-vertex labels give an eight-dimensional permutation module, even though the cube sits in $\mathbb R^3$.`,
  },
  "ureca-invariant-subspaces": {
    question: String.raw`Does one eigenline survive every $D_8$ generator?`,
    evidence: String.raw`Over characteristic $\ne3$, the three-point permutation module splits using $p_C(x,y,z)=\frac{x+y+z}{3}(1,1,1)$; the sum-zero plane is its complementary invariant image. In characteristic $3$ the division and direct sum fail.`,
  },
  "ureca-intertwiners": {
    question: "Can one fixed matrix intertwine both generators?",
    evidence: String.raw`$T=S$ is invertible and satisfies $TR=R^{-1}T$ and $TS=ST$. The equivariant projection $q:V\oplus\mathbb F\to\mathbb F$ has invariant kernel $V\oplus0$ and image $\mathbb F$ but is not an equivalence.`,
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
        <Prose>{String.raw`Which subspaces survive the action, and which one fixed linear map intertwines two representations? This is the standard left action of $D_8=\langle r,s\mid r^4=s^2=1,\ srs=r^{-1}\rangle$ on column vectors in $\mathbb F^2$. The matrix of $r$ is $R=\begin{pmatrix}0&-1\\1&0\end{pmatrix}$ and of $s$ is $S=\operatorname{diag}(1,-1)$. The generator selector changes the subspace question; the map is tested against both $D_8$ generators throughout.`}</Prose>
      </p>
      <M block>
        {
          "R=\\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix},\\quad S=\\begin{pmatrix}1&0\\\\0&-1\\end{pmatrix}"
        }
      </M>
      <p>
        <Prose>{focus.question}</Prose>
      </p>
      <div className="lab-controls">
        {lesson.id === "ureca-permutation-module" && (
          <label>
            Coefficient <M focusable={false}>{"a"}</M> in{" "}
            <M focusable={false}>{"ae_1-e_3"}</M>
            <Choice
              label="Coefficient a in a e₁−e₃"
              value={coefficient}
              onChange={(value) => {
                setCoefficient(value);
                reset();
              }}
              options={[1, 2, 3].map((a) => ({
                value: a,
                presentation: `$${a}$`,
                speech: String(a),
              }))}
            />
          </label>
        )}
        <label>
          Scalar field <M focusable={false}>{String.raw`\mathbb F`}</M>
          <Choice
            label="Scalar field 𝔽"
            value={field}
            onChange={(value) => {
              setField(value);
              reset();
            }}
            options={[
              {
                value: "R",
                presentation: "$\\mathbb R$",
                speech: "real numbers",
              },
              {
                value: "C",
                presentation: "$\\mathbb C$",
                speech: "complex numbers",
              },
            ]}
          />
        </label>
        <label>
          Acting generators
          <Choice
            label={"Acting generators"}
            value={group}
            onChange={(value) => {
              setGroup(value);
              reset();
            }}
            options={[
              {
                value: "rotation",
                presentation: "$\\langle r\\rangle\\cong C_4$",
                speech:
                  "Group generated by r, isomorphic to the cyclic group of order 4",
              },
              {
                value: "dihedral",
                presentation: "$D_8=\\langle r,s\\rangle$",
                speech: "Dihedral group of order 8, generated by r and s",
              },
            ]}
          />
        </label>
        <label>
          Candidate subspace <M focusable={false}>{String.raw`W`}</M>
          <Choice
            label="Candidate subspace W"
            value={line}
            onChange={(value) => {
              setLine(value);
              reset();
            }}
            options={[
              {
                value: "real-axis",
                presentation: "$\\mathbb F e_1$",
                speech: "Span of e subscript 1 over the scalar field",
              },
              {
                value: "complex-eigenline",
                presentation: "$\\mathbb F(e_1+i e_2)$",
                speech: "Span of e subscript 1 plus i times e subscript 2",
              },
              {
                value: "whole",
                presentation: "$\\mathbb F^2$",
                speech: "Whole two dimensional vector space",
              },
            ]}
          />
        </label>
        <label>
          Candidate{" "}
          <M focusable={false}>{String.raw`T:\rho\to\rho^{\prime}`}</M>
          <Choice
            label="Candidate T:ρ→ρ′"
            value={map}
            onChange={(value) => {
              setMap(value);
              reset();
            }}
            options={[
              {
                value: "basis-change",
                presentation: "$S=\\operatorname{diag}(1,-1)$",
                speech: "S equals diagonal matrix 1, minus 1",
              },
              {
                value: "identity",
                presentation: "$I$",
                speech: "identity matrix",
              },
              {
                value: "singular",
                presentation: "$\\operatorname{diag}(1,0)$",
                speech: "diagonal matrix 1, 0",
              },
            ]}
          />
        </label>
      </div>
      <label className="prediction-prompt">
        Predict whether <M focusable={false}>{"W"}</M> is invariant and{" "}
        <M focusable={false}>{"T"}</M> intertwines both generators before
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
          <p>
            <Prose>{focus.evidence}</Prose>
          </p>
          {lesson.id === "ureca-permutation-module" && (
            <p>
              <Prose>{String.raw`For the $3$-cycle $(123)$, $${coefficient}e_1-e_3$ maps to $${coefficient}e_2-e_1$. For cube vertices labelled by three sign bits $0,\ldots,7$, a half-turn about the $x$-axis acts on the eight basis vectors by $(0\ 3)(1\ 2)(4\ 7)(5\ 6)$.`}</Prose>
            </p>
          )}
          <p>
            <Prose>{String.raw`${line === "real-axis" ? String.raw`$Re_1=e_2$, so $\mathbb Fe_1$ fails under $r$. $Se_1=e_1$.` : line === "complex-eigenline" ? String.raw`$R(e_1+ie_2)=-i(e_1+ie_2)$, while $S(e_1+ie_2)=e_1-ie_2$.` : String.raw`Every matrix sends $\mathbb F^2$ into itself.`}${!state.lineDefined ? String.raw` The complex eigenline is not a subspace of $\mathbb R^2$.` : ""}`}</Prose>
          </p>
          <p>
            <M>{"W"}</M> is {state.invariant ? "invariant" : "not invariant"}{" "}
            for the selected field and generators. Rotation stability:{" "}
            {state.rotationStable ? "yes" : "no"}; reflection stability:{" "}
            {state.reflectionStable ? "yes" : "no"}.
          </p>
          <p>
            <Prose>{String.raw`Let $\rho^{\prime}(r)=R^{-1}$ and $\rho^{\prime}(s)=S$. For the single selected $T=${matrixTex(state.candidate)}$, $TR=${matrixTex(state.leftRotation)}$ and $R^{-1}T=${matrixTex(state.rightRotation)}$; $TS=${matrixTex(state.leftReflection)}$ and $ST=${matrixTex(state.rightReflection)}$. $T$ ${state.intertwines ? "intertwines both generators" : "fails the intertwiner equation"}.`}</Prose>
          </p>
          <table>
            <caption>
              Exact generator checks for the selected subspace and map
            </caption>
            <thead>
              <tr>
                <th scope="col">Generator</th>
                <th scope="col">
                  Subspace <M>{"W"}</M> stable
                </th>
                <th scope="col">
                  Intertwiner equation{" "}
                  <M>{String.raw`T\rho(g)=\rho^{\prime}(g)T`}</M>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  <M>{"r"}</M>
                </th>
                <td>{state.rotationStable ? "yes" : "no"}</td>
                <td>{state.rotationIntertwines ? "yes" : "no"}</td>
              </tr>
              <tr>
                <th scope="row">
                  <M>{"s"}</M>
                </th>
                <td>{state.reflectionStable ? "yes" : "no"}</td>
                <td>{state.reflectionIntertwines ? "yes" : "no"}</td>
              </tr>
            </tbody>
          </table>
          <p>
            <Prose>{String.raw`A noninvertible equivariant projection also exists: $V\oplus\mathbb F$ with $V=\mathbb F^2$ carrying $\rho$ and $\mathbb F$ trivial; $q(x,y,z)=z$, $\ker q=V\oplus0$, $\operatorname{im}q=\mathbb F$. For $r$ and $s$, $q((\rho(g)v,z))=z=g\cdot q(v,z)$.`}</Prose>
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
          <Prose>{String.raw`Stability under each generator proves stability under every group word. The same fixed $T$ must satisfy the equation on each generator; separate conjugators for individual elements do not prove equivalence. Kernel and image of an intertwiner are invariant subspaces. This finite generator check proves only the displayed $D_8$ example. Schur’s lemma additionally assumes irreducibility and a suitable field.`}</Prose>
        </p>
        <p>
          <Prose>{lesson.title}</Prose>:{" "}
          <Prose>{String.raw`over $\mathbb R$, the quarter-turn has no real eigenline; over $\mathbb C$ it has two eigenlines, but the reflection swaps them. The full two-dimensional $D_8$ representation remains irreducible over both fields.`}</Prose>
        </p>
      </div>
    </div>
  );
}
