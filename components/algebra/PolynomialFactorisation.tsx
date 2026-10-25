"use client";
import { Choice } from "./Groups";

import { useState } from "react";
import {
  polynomialCases,
  polynomialReading,
  type CoefficientField,
  type PolynomialCase,
} from "@/lib/algebra/polynomial-factorisation";
import { Math as M, Prose } from "./Math";

import {
  fieldTex,
  polynomialTex,
  polynomialReadings,
} from "./PolynomialFactorisationText";

export function PolynomialFactorisation() {
  const [example, setExample] = useState<PolynomialCase>("quadratic");
  const [field, setField] = useState<CoefficientField>("Q");
  const [prediction, setPrediction] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [failure, setFailure] = useState(false);
  const result = polynomialReading(example, field);
  const display = polynomialReadings[example][field];
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
          <Choice
            label={"Worked polynomial"}
            value={example}
            onChange={(value) => {
              setExample(value);
              reset();
            }}
            options={[
              {
                value: "quadratic",
                presentation: `$${polynomialTex.quadratic}$ · ${polynomialCases.quadratic.name}`,
                speech: "X squared plus 1. Quadratic comparison",
              },
              {
                value: "shifted",
                presentation: `$${polynomialTex.shifted}$ · ${polynomialCases.shifted.name}`,
                speech: "X to power 4 plus 1. Shifted Eisenstein",
              },
              {
                value: "rootless",
                presentation: `$${polynomialTex.rootless}$ · ${polynomialCases.rootless.name}`,
                speech:
                  "X to power 4 plus 3 X squared plus 2. Rootless quartic",
              },
              {
                value: "content",
                presentation: `$${polynomialTex.content}$ · ${polynomialCases.content.name}`,
                speech: "2 X squared plus 2 X plus 2. Content and reduction",
              },
            ]}
          />
        </label>
        <label>
          Coefficient field
          <Choice
            label={"Coefficient field"}
            value={field}
            onChange={(value) => {
              setField(value);
              reset();
            }}
            options={[
              {
                value: "Q",
                presentation: "$\\mathbb Q$",
                speech: "Rational numbers",
              },
              {
                value: "R",
                presentation: "$\\mathbb R$",
                speech: "Real numbers",
              },
              {
                value: "C",
                presentation: "$\\mathbb C$",
                speech: "Complex numbers",
              },
              {
                value: "F2",
                presentation: "$\\mathbb F_2$",
                speech: "Field with 2 elements",
              },
            ]}
          />
        </label>
      </div>
      <p>
        <Prose>{String.raw`Selected input: $${polynomialTex[example]}$ over $${fieldTex[field]}$. Integer content before changing field: $${result.content}$.`}</Prose>
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
              <Prose>{String.raw`Factorisation equation over $${fieldTex[field]}$: $${polynomialTex[example]}=${display.equation}$.`}</Prose>
            </p>
            <p>
              Roots: <Prose>{display.roots}</Prose>
            </p>
            <p>
              Certificate: <Prose>{display.certificate}</Prose>
            </p>
            <p>
              <Prose>{String.raw`Verdict: ${result.verdict} over $${fieldTex[field]}$.`}</Prose>
            </p>
          </div>
          <button onClick={() => setFailure(!failure)} aria-pressed={failure}>
            {failure ? "Hide" : "Try"} a failed-test counterexample
          </button>
          {failure && (
            <p role="status">
              <Prose>{String.raw`$X^4+3X^2+2$ has no rational roots, yet equals $(X^2+1)(X^2+2)$ over $\mathbb Q$. A failed root test in degree four is inconclusive. Likewise, a failed Eisenstein test does not prove reducibility.`}</Prose>
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
            <caption>
              <Prose>{String.raw`Selected polynomial evidence in $${fieldTex[field]}[X]$`}</Prose>
            </caption>
            <tbody>
              <tr>
                <th scope="row">Factors</th>
                <td>
                  <M>{display.equation}</M>
                </td>
              </tr>
              <tr>
                <th scope="row">Roots</th>
                <td>
                  <Prose>{display.roots}</Prose>
                </td>
              </tr>
              <tr>
                <th scope="row">
                  Content in <M>{String.raw`\mathbb Z[X]`}</M>
                </th>
                <td>
                  <M>{String(result.content)}</M>
                </td>
              </tr>
              <tr>
                <th scope="row">Proof certificate</th>
                <td>
                  <Prose>{display.certificate}</Prose>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
