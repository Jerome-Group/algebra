"use client";
import { useState } from "react";
import { chainExamples, type ChainExample } from "@/lib/algebra/ideal-chains";
import { Math as M, Prose } from "./Math";

import { chainText, chainContext } from "./IdealChainText";

export function IdealChainExplorer() {
  const [example, setExample] = useState<ChainExample>("integerAscending");
  const [stage, setStage] = useState(2);
  const [prediction, setPrediction] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [failure, setFailure] = useState(false);
  const context = chainExamples[example];
  const reading = chainText(example, stage);
  function reset() {
    setPrediction("");
    setRevealed(false);
    setFailure(false);
  }
  return (
    <div className="foundation-lab">
      <p>
        Inspect ideal chains in <M>{"R"}</M>. A ring can be infinite and still
        satisfy ACC.
      </p>
      <div className="lab-controls">
        <label>
          Ring and chain
          <select
            value={example}
            onChange={(event) => {
              setExample(event.target.value as ChainExample);
              reset();
            }}
          >
            {Object.entries(chainExamples).map(([id, item]) => (
              <option key={id} value={id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stage <M focusable={false}>{"n"}</M>
          <select
            aria-label="Stage n"
            value={stage}
            onChange={(event) => {
              setStage(Number(event.target.value));
              reset();
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        <Prose>{String.raw`Context: ${chainContext[example]}. Inspect stage $${stage}$.`}</Prose>
      </p>
      <label className="prediction-prompt">
        Predict the ideal, a generator or strictness witness, and whether the
        chain stabilizes. Which theorem hypothesis applies?
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
            <p>
              <Prose>{String.raw`At stage $${stage}$: $I_{${stage}}=${reading.ideal}$. Generators: $${reading.generators.length ? reading.generators.join(", ") : String.raw`\varnothing`}$.`}</Prose>
            </p>
            <p>
              <Prose>{reading.witness}</Prose>
            </p>
            <p>
              Selected chain:{" "}
              {reading.stable ? "stabilized here" : "not stabilized here"}.
              Global condition: {context.condition}.
            </p>
          </div>
          <table>
            <caption>
              <Prose>{String.raw`Ideal chain and generator evidence in ${chainContext[example]}`}</Prose>
            </caption>
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col">Ideal</th>
                <th scope="col">Generators</th>
                <th scope="col">Strictness or stabilization</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: stage }, (_, i) => {
                const row = chainText(example, i + 1);
                return (
                  <tr key={i}>
                    <th scope="row">
                      <M>{String(i + 1)}</M>
                    </th>
                    <td>
                      <M>{row.ideal}</M>
                    </td>
                    <td>
                      <M>
                        {row.generators.length
                          ? row.generators.join(", ")
                          : String.raw`\varnothing`}
                      </M>
                    </td>
                    <td>
                      <Prose>{row.witness}</Prose>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button onClick={() => setFailure(!failure)} aria-pressed={failure}>
            {failure ? "Hide" : "Try"} a finite-cardinality fallacy
          </button>
          {failure && (
            <p role="status">
              <Prose>{String.raw`$\mathbb Z$ has infinitely many elements, yet every ideal is principal and ascending chains stabilize. In $F[X_1,X_2,\ldots]$, the chain $(X_1)\subsetneq(X_1,X_2)\subsetneq\cdots$ never stabilizes because each fresh variable is outside the previous ideal.`}</Prose>
            </p>
          )}
          <p>
            Proof boundary: <Prose>{reading.theorem}</Prose> ACC is equivalent
            to finite generation of every ideal in this ring; DCC is a distinct
            Artinian condition. Hilbert’s basis theorem requires a Noetherian
            base and finitely many adjoined variables. Prime-ideal chains and
            Krull dimension require their own hypotheses; this finite display
            does not prove a dimension claim.
          </p>
        </>
      )}
    </div>
  );
}
