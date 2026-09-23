"use client";
import { useState } from "react";
import {
  chainExamples,
  chainReading,
  type ChainExample,
} from "@/lib/algebra/ideal-chains";
import { Math as M } from "./Math";

export function IdealChainExplorer() {
  const [example, setExample] = useState<ChainExample>("integerAscending");
  const [stage, setStage] = useState(2);
  const [prediction, setPrediction] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [failure, setFailure] = useState(false);
  const context = chainExamples[example];
  const reading = chainReading(example, stage);
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
          Stage n
          <select
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
        Context: {context.context}. Inspect stage {stage}.
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
              At stage {stage}: Iₙ={reading.ideal}. Generators:{" "}
              {reading.generators.join(", ")}.
            </p>
            <p>{reading.witness}</p>
            <p>
              Selected chain:{" "}
              {reading.stable ? "stabilized here" : "not stabilized here"}.
              Global condition: {context.condition}.
            </p>
          </div>
          <table>
            <caption>
              Ideal chain and generator evidence in {context.context}
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
                const row = chainReading(example, i + 1);
                return (
                  <tr key={i}>
                    <th scope="row">{i + 1}</th>
                    <td>{row.ideal}</td>
                    <td>{row.generators.join(", ")}</td>
                    <td>{row.witness}</td>
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
              ℤ has infinitely many elements, yet every ideal is principal and
              ascending chains stabilize. In F[X₁,X₂,…], the chain
              (X₁)⊊(X₁,X₂)⊊⋯ never stabilizes because each fresh variable is
              outside the previous ideal.
            </p>
          )}
          <p>
            Proof boundary: {reading.theorem} ACC is equivalent to finite
            generation of every ideal in this ring; DCC is a distinct Artinian
            condition. Hilbert’s basis theorem requires a Noetherian base and
            finitely many adjoined variables. Prime-ideal chains and Krull
            dimension require their own hypotheses; this finite display does not
            prove a dimension claim.
          </p>
        </>
      )}
    </div>
  );
}
