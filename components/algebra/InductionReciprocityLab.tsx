"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import { Math as M, Prose } from "./Math";
import {
  inducedState,
  type HCharacter,
  type S3Element,
  type TargetCharacter,
} from "@/lib/algebra/induction-restriction";

const matrixText = (matrix: number[][]) =>
  String.raw`\begin{pmatrix}${matrix.map((row) => row.join(" & ")).join(String.raw`\\`)}\end{pmatrix}`;

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
        <Prose>{String.raw`How does induction from $H=\langle s=(12)\rangle\cong C_2$ to $S_3$ move one vector across coset copies? Choose the one-dimensional $H$-character $\varphi$ and the transversal $t_0=e$, $t_1=r=(123)$, $t_2=r^2$. In $\operatorname{Ind}_H^G\varphi$, the coset basis vectors $u_i=t_i\otimes1$ span a space of dimension $[G:H]\dim\varphi=3$.`}</Prose>
      </p>
      <M block>
        {
          "g t_i=t_j h,\\quad g\\cdot u_i=\\varphi(h)u_j,\\qquad \\langle\\operatorname{Ind}_H^G\\varphi,\\chi\\rangle_G=\\langle\\varphi,\\operatorname{Res}_H^G\\chi\\rangle_H"
        }
      </M>
      <div className="lab-controls">
        <label>
          Inducing <M focusable={false}>{"H"}</M>-character{" "}
          <M focusable={false}>{String.raw`\varphi`}</M>
          <select
            aria-label="Inducing H-character φ"
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
          Acting element <M focusable={false}>{String.raw`g`}</M>
          <select
            aria-label="Acting element g"
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
          Coset basis vector <M focusable={false}>{"u_i"}</M>
          <select
            aria-label="Coset basis vector uᵢ"
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
          Target <M focusable={false}>{"G"}</M>-character{" "}
          <M focusable={false}>{String.raw`\chi`}</M>
          <select
            aria-label="Target G-character χ"
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
        Predict <M focusable={false}>{String.raw`g\cdot u_i`}</M>, the induced
        trace, and both Hom-space dimensions before revealing them.
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
            <Prose>{String.raw`$${element}\cdot u_{${basis}}=${state.coefficient === -1 ? "-" : ""}u_{${state.targetBasis}}$. The subgroup correction is $${state.correction}$; for $s$ it contributes $\varphi(s)=${character === "sign" ? "-1" : "1"}$. Omitting that correction gives the wrong induced sign trace.`}</Prose>
          </p>
          <p>
            <Prose>{String.raw`Generator matrices on $(u_0,u_1,u_2)$: $R=${matrixText(state.generatorR)}$, $S=${matrixText(state.generatorS)}$. The selected matrix is $${matrixText(state.matrix)}$.`}</Prose>
          </p>
          <p>
            <Prose>{String.raw`On the classes of $e$, transpositions, and $3$-cycles, $\chi_{\mathrm{Ind}}=(${state.inducedValues.join(", ")})$; $\chi_{\mathrm{${target}}}=(${state.targetRow.join(", ")})$. Its trace at $${element}$ is $${element === "e" ? state.inducedValues[0] : element === "s" ? state.inducedValues[1] : state.inducedValues[2]}$.`}</Prose>
          </p>
          <p>
            <Prose>{String.raw`$\dim\operatorname{Hom}_G(\operatorname{Ind}\varphi,\mathrm{${target}})=${state.innerProduct}$; $\dim\operatorname{Hom}_H(\varphi,\operatorname{Res}\mathrm{${target}})=${state.restrictedHomDimension}$. Both sides agree. The double cosets are $H$ and $HrH$.`}</Prose>
          </p>
          {failure && (
            <p role="status">
              <Prose>{String.raw`Failure witness: treating the sign-induced $s$ matrix as an unsigned permutation changes its trace from $-1$ to $+1$, falsely replacing $\operatorname{Ind}(\mathrm{sign}_H)=\mathrm{sign}_G\oplus\mathrm{Std}$ by $\operatorname{Ind}(\mathrm{trivial}_H)=\mathrm{trivial}_G\oplus\mathrm{Std}$.`}</Prose>
            </p>
          )}
          <table>
            <caption>Induced character and Hom dimensions by target</caption>
            <thead>
              <tr>
                <th scope="col">
                  <M>{"G"}</M> target
                </th>
                <th scope="col">trivial</th>
                <th scope="col">sign</th>
                <th scope="col">standard</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  Induced Hom dimension{" "}
                  <M>{String.raw`\dim\operatorname{Hom}_G(\operatorname{Ind}\varphi,\text{target})`}</M>
                </th>
                {(["trivial", "sign", "standard"] as TargetCharacter[]).map(
                  (name) => (
                    <td key={name}>
                      <M>
                        {String(
                          inducedState(character, element, basis, name)
                            .innerProduct,
                        )}
                      </M>
                    </td>
                  ),
                )}
              </tr>
              <tr>
                <th scope="row">
                  Restricted Hom dimension{" "}
                  <M>{String.raw`\dim\operatorname{Hom}_H(\varphi,\operatorname{Res}\text{target})`}</M>
                </th>
                {(["trivial", "sign", "standard"] as TargetCharacter[]).map(
                  (name) => (
                    <td key={name}>
                      <M>
                        {String(
                          inducedState(character, element, basis, name)
                            .restrictedHomDimension,
                        )}
                      </M>
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
          <Prose>{String.raw`The coset calculation gives every matrix entry in this three-dimensional $S_3$ example. A fixed coset contributes to the induced trace only after its $H$-correction is evaluated. Frobenius reciprocity is a natural Hom-space isomorphism; the matching dimensions here verify this one example but do not prove the general theorem. The separate character table lesson proves its own inflation and orthogonality boundaries.`}</Prose>
        </p>
        <p>
          <Prose>{lesson.title}</Prose> keeps the transversal and subgroup
          correction visible.
        </p>
      </div>
    </div>
  );
}
