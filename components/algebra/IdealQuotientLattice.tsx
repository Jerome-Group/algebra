"use client";
import { useState } from "react";
import {
  integerIdealQuotient,
  polynomialIdealQuotient,
  quotientElementNames,
  type PolynomialIdeal,
} from "@/lib/algebra/ideal-quotients";
import { Math as M } from "./Math";

type RingExample = "integers" | "polynomials";
const setLabel = (values: number[], names: string[] = []) =>
  `{${values.map((value) => names[value] ?? value).join(", ")}}`;

export function IdealQuotientLattice() {
  const [example, setExample] = useState<RingExample>("integers");
  const [idealGenerator, setIdealGenerator] = useState(6);
  const [polynomial, setPolynomial] = useState<PolynomialIdeal>("irreducible");
  const [failure, setFailure] = useState(false);
  const [prediction, setPrediction] = useState("");
  const [revealed, setRevealed] = useState(false);
  const integers = integerIdealQuotient(idealGenerator);
  const quadratic = polynomialIdealQuotient(polynomial);
  const selected = example === "integers" ? integers : quadratic;
  const quotientNames = example === "integers" ? [] : quotientElementNames;
  return (
    <div className="foundation-lab">
      <p>
        Choose a two-sided ideal I of R. The quotient <M>{"R/I"}</M> identifies
        elements whose difference lies in I. Multiplication of classes is then
        representative-independent.
      </p>
      <div className="lab-controls">
        <label>
          Source ring
          <select
            value={example}
            onChange={(event) => {
              setExample(event.target.value as RingExample);
              setRevealed(false);
              setPrediction("");
              setFailure(false);
            }}
          >
            <option value="integers">R=ℤ/12ℤ</option>
            <option value="polynomials">R=F₂[X]</option>
          </select>
        </label>
        {example === "integers" ? (
          <label>
            Ideal I=dℤ/12ℤ; choose d
            <select
              value={idealGenerator}
              onChange={(event) => {
                setIdealGenerator(Number(event.target.value));
                setRevealed(false);
                setPrediction("");
              }}
            >
              {[1, 2, 3, 4, 6, 12].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            Ideal I=(q); choose q∈F₂[X]
            <select
              value={polynomial}
              onChange={(event) => {
                setPolynomial(event.target.value as PolynomialIdeal);
                setRevealed(false);
                setPrediction("");
              }}
            >
              <option value="irreducible">X²+X+1</option>
              <option value="double">X²+1=(X+1)²</option>
              <option value="split">X²+X=X(X+1)</option>
            </select>
          </label>
        )}
      </div>
      <label className="prediction-prompt">
        Predict the quotient classes, units and nonzero zero divisors for the
        selected ideal. Which source ideals contain it?
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
          <button onClick={() => setFailure(!failure)} aria-pressed={failure}>
            {failure ? "Hide" : "Try"} a non-ideal failure
          </button>
          <div className="live-mathematics" aria-live="polite">
            {example === "integers" ? (
              <>
                <M
                  block
                >{`R=\\mathbb Z/12\\mathbb Z,\\quad I=${idealGenerator}\\mathbb Z/12\\mathbb Z,\\quad R/I\\cong\\mathbb Z/${idealGenerator}\\mathbb Z`}</M>
                <p>Selected source ideal: {setLabel(integers.sourceIdeal)}.</p>
                <p>
                  Quotient classes: {setLabel(integers.elements)}.
                  {idealGenerator === 1 && " This is the zero ring, with 0=1."}
                </p>
              </>
            ) : (
              <>
                <M
                  block
                >{String.raw`R=\mathbb F_2[X],\quad I=(q),\quad R/I=\mathbb F_2[X]/(q)`}</M>
                <p>
                  q={quadratic.label}; quotient reduction rule{" "}
                  {quadratic.relation}.
                </p>
                <p>
                  Quotient classes:{" "}
                  {setLabel(quadratic.elements, quotientElementNames)}.
                </p>
              </>
            )}
            <p>Units: {setLabel(selected.units, quotientNames)}.</p>
            <p>
              Nonzero zero divisors:{" "}
              {setLabel(selected.zeroDivisors, quotientNames)}.
            </p>
            {failure && (
              <p role="status">
                {quadratic.nonIdealWitness.subgroup} is an additive subgroup but
                not an ideal: X·1=X lies outside H.{" "}
                {quadratic.nonIdealWitness.equivalent}, yet{" "}
                {quadratic.nonIdealWitness.products}. Multiplication of these
                proposed classes depends on the representative.
              </p>
            )}
          </div>
          {example === "polynomials" && (
            <table>
              <caption>
                Multiplication in F₂[X]/(q), using the selected reduction rule
              </caption>
              <thead>
                <tr>
                  <th scope="col">·</th>
                  {quadratic.elements.map((element) => (
                    <th scope="col" key={element}>
                      {quotientElementNames[element]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quadratic.elements.map((a) => (
                  <tr key={a}>
                    <th scope="row">{quotientElementNames[a]}</th>
                    {quadratic.elements.map((b) => (
                      <td key={b}>
                        {quotientElementNames[quadratic.multiply(a, b)]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <table>
            <caption>
              Ideal correspondence: J containing I corresponds to J/I
            </caption>
            <thead>
              <tr>
                <th scope="col">Source ideal J</th>
                <th scope="col">Quotient ideal J/I</th>
                <th scope="col">Ideals containing J</th>
              </tr>
            </thead>
            <tbody>
              {example === "integers"
                ? integers.correspondence.map((row) => (
                    <tr key={row.generator}>
                      <th scope="row">{row.generator}ℤ/12ℤ</th>
                      <td>{setLabel(row.quotientIdeal)}</td>
                      <td>
                        {row.containedIn.map((d) => `${d}ℤ/12ℤ`).join(", ")}
                      </td>
                    </tr>
                  ))
                : quadratic.correspondence.map((row) => (
                    <tr key={row.generator}>
                      <th scope="row">({row.generator})</th>
                      <td>
                        {setLabel(row.quotientIdeal, quotientElementNames)}
                      </td>
                      <td>
                        {row.containedIn
                          .map((generator) => `(${generator})`)
                          .join(", ")}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          <p>
            Ideal correspondence sends J⊇I to J/I and preserves inclusion. This
            finite table checks the selected example. In general, two-sided
            absorption proves quotient multiplication well-defined, and the
            preimage of an ideal under the quotient map proves the
            correspondence.
          </p>
        </>
      )}
    </div>
  );
}
