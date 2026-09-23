"use client";
import { useState } from "react";
import {
  fieldLabels,
  polynomialCases,
  polynomialReading,
  type CoefficientField,
  type PolynomialCase,
} from "@/lib/algebra/polynomial-factorisation";
import { Math as M } from "./Math";

export function PolynomialFactorisation() {
  const [example, setExample] = useState<PolynomialCase>("quadratic");
  const [field, setField] = useState<CoefficientField>("Q");
  const [prediction, setPrediction] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [failure, setFailure] = useState(false);
  const result = polynomialReading(example, field);
  function reset() {
    setPrediction("");
    setRevealed(false);
    setFailure(false);
  }
  return (
    <div className="foundation-lab">
      <p>
        Choose a polynomial and coefficient field. Compare factorisation in{" "}
        <M>{"K[X]"}</M>, not merely a root search.
      </p>
      <div className="lab-controls">
        <label>
          Worked polynomial
          <select
            value={example}
            onChange={(event) => {
              setExample(event.target.value as PolynomialCase);
              reset();
            }}
          >
            {Object.entries(polynomialCases).map(([id, item]) => (
              <option value={id} key={id}>
                {item.label} — {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Coefficient field
          <select
            value={field}
            onChange={(event) => {
              setField(event.target.value as CoefficientField);
              reset();
            }}
          >
            {Object.entries(fieldLabels).map(([id, label]) => (
              <option value={id} key={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        Selected input: {result.label} over {result.field}. Integer content
        before changing field: {result.content}.
      </p>
      <label className="prediction-prompt">
        Predict factors and roots in the selected field. State whether your
        evidence certifies irreducibility, reducibility, or neither.
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
              Factorisation equation over {result.field}: {result.label} ={" "}
              {result.equation}.
            </p>
            <p>Roots: {result.roots}</p>
            <p>Certificate: {result.certificate}</p>
            <p>
              Verdict: {result.verdict} over {result.field}.
            </p>
          </div>
          <button onClick={() => setFailure(!failure)} aria-pressed={failure}>
            {failure ? "Hide" : "Try"} a failed-test counterexample
          </button>
          {failure && (
            <p role="status">
              X⁴+3X²+2 has no rational roots, yet equals (X²+1)(X²+2) over ℚ. A
              failed root test in degree four is inconclusive. Likewise, a
              failed Eisenstein test does not prove reducibility.
            </p>
          )}
          <p>
            Proof boundary: the displayed factors certify reducibility by
            multiplication. An irreducibility verdict needs its stated field and
            a valid degree-two root argument or the shifted Eisenstein
            certificate. A failed sufficient test is inconclusive, and reducing
            all coefficients to zero changes the polynomial degree.
          </p>
          <table>
            <caption>Selected polynomial evidence in {result.field}[X]</caption>
            <tbody>
              <tr>
                <th scope="row">Factors</th>
                <td>{result.equation}</td>
              </tr>
              <tr>
                <th scope="row">Roots</th>
                <td>{result.roots}</td>
              </tr>
              <tr>
                <th scope="row">Content in ℤ[X]</th>
                <td>{result.content}</td>
              </tr>
              <tr>
                <th scope="row">Proof certificate</th>
                <td>{result.certificate}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
