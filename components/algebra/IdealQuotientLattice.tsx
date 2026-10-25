"use client";
import { Choice } from "./Groups";

import { useState } from "react";
import {
  integerIdealQuotient,
  polynomialIdealQuotient,
  quotientElementNames,
  type PolynomialIdeal,
} from "@/lib/algebra/ideal-quotients";
import { Math as M, Prose } from "./Math";

type RingExample = "integers" | "polynomials";
const setLabel = (values: number[], names: string[] = []) =>
  String.raw`\{${values.map((value) => names[value] ?? value).join(", ")}\}`;

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
        <Prose>{String.raw`Choose a two-sided ideal $I$ of $R$. The quotient $R/I$ identifies elements whose difference lies in $I$. Multiplication of classes is then representative-independent.`}</Prose>
      </p>
      <div className="lab-controls">
        <label>
          Source ring
          <Choice
            label={"Source ring"}
            value={example}
            onChange={(value) => {
              setExample(value);
              setRevealed(false);
              setPrediction("");
              setFailure(false);
            }}
            options={[
              {
                value: "integers",
                presentation: "$R=\\mathbb Z/12\\mathbb Z$",
                speech: "R equals the integers modulo 12",
              },
              {
                value: "polynomials",
                presentation: "$R=\\mathbb F_2[X]$",
                speech: "R equals polynomials over the field with 2 elements",
              },
            ]}
          />
        </label>
        {example === "integers" ? (
          <label>
            Ideal{" "}
            <M focusable={false}>{String.raw`I=d\mathbb Z/12\mathbb Z`}</M>;
            choose <M focusable={false}>{"d"}</M>
            <Choice
              label="Ideal I=dℤ/12ℤ; choose d"
              value={idealGenerator}
              onChange={(value) => {
                setIdealGenerator(value);
                setRevealed(false);
                setPrediction("");
              }}
              options={[1, 2, 3, 4, 6, 12].map((d) => ({
                value: d,
                presentation: `$${d}$`,
                speech: String(d),
              }))}
            />
          </label>
        ) : (
          <label>
            Ideal <M focusable={false}>{"I=(q)"}</M>; choose{" "}
            <M focusable={false}>{String.raw`q\in\mathbb F_2[X]`}</M>
            <Choice
              label="Ideal I=(q); choose q∈F₂[X]"
              value={polynomial}
              onChange={(value) => {
                setPolynomial(value);
                setRevealed(false);
                setPrediction("");
              }}
              options={[
                {
                  value: "irreducible",
                  presentation: "$X^2+X+1$",
                  speech: "X squared plus X plus 1",
                },
                {
                  value: "double",
                  presentation: "$X^2+1=(X+1)^2$",
                  speech:
                    "X squared plus 1 equals the square of the quantity X plus 1",
                },
                {
                  value: "split",
                  presentation: "$X^2+X=X(X+1)$",
                  speech:
                    "X squared plus X equals X times the quantity X plus 1",
                },
              ]}
            />
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
                <p>
                  <Prose>{String.raw`Selected source ideal: $${setLabel(integers.sourceIdeal)}$.`}</Prose>
                </p>
                <p>
                  <Prose>{String.raw`Quotient classes: $${setLabel(integers.elements)}$.${idealGenerator === 1 ? " This is the zero ring, with $0=1$." : ""}`}</Prose>
                </p>
              </>
            ) : (
              <>
                <M
                  block
                >{String.raw`R=\mathbb F_2[X],\quad I=(q),\quad R/I=\mathbb F_2[X]/(q)`}</M>
                <p>
                  <Prose>{String.raw`$q=${polynomial === "irreducible" ? "X^2+X+1" : polynomial === "double" ? "X^2+1=(X+1)^2" : "X^2+X=X(X+1)"}$; quotient reduction rule $X^2=${polynomial === "irreducible" ? "1+X" : polynomial === "double" ? "1" : "X"}$.`}</Prose>
                </p>
                <p>
                  <Prose>{String.raw`Quotient classes: $${setLabel(quadratic.elements, quotientElementNames)}$.`}</Prose>
                </p>
              </>
            )}
            <p>
              <Prose>{String.raw`Units: $${setLabel(selected.units, quotientNames)}$.`}</Prose>
            </p>
            <p>
              <Prose>{String.raw`Nonzero zero divisors: $${setLabel(selected.zeroDivisors, quotientNames)}$.`}</Prose>
            </p>
            {failure && (
              <p role="status">
                <Prose>{String.raw`$H=\{0,1\}\subset\mathbb F_2[X]$ is an additive subgroup but not an ideal: $X\cdot1=X$ lies outside $H$. $X$ and $X+1$ differ by $1\in H$, yet $X\cdot X=X^2$ and $(X+1)\cdot X=X^2+X$ differ by $X\notin H$. Multiplication of these proposed classes depends on the representative.`}</Prose>
              </p>
            )}
          </div>
          {example === "polynomials" && (
            <table>
              <caption>
                <Prose>{String.raw`Multiplication in $\mathbb F_2[X]/(q)$, using the selected reduction rule`}</Prose>
              </caption>
              <thead>
                <tr>
                  <th scope="col">Multiply</th>
                  {quadratic.elements.map((element) => (
                    <th scope="col" key={element}>
                      Class <M>{quotientElementNames[element]}</M>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quadratic.elements.map((a) => (
                  <tr key={a}>
                    <th scope="row">
                      Class <M>{quotientElementNames[a]}</M>
                    </th>
                    {quadratic.elements.map((b) => (
                      <td key={b}>
                        <M>{quotientElementNames[quadratic.multiply(a, b)]}</M>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <table>
            <caption>
              <Prose>{String.raw`Ideal correspondence: $J\supseteq I$ corresponds to $J/I$`}</Prose>
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  Source ideal <M>{"J"}</M>
                </th>
                <th scope="col">
                  Quotient ideal <M>{"J/I"}</M>
                </th>
                <th scope="col">
                  Ideals containing <M>{"J"}</M>
                </th>
              </tr>
            </thead>
            <tbody>
              {example === "integers"
                ? integers.correspondence.map((row) => (
                    <tr key={row.generator}>
                      <th scope="row">
                        Ideal{" "}
                        <M>{String.raw`${row.generator}\mathbb Z/12\mathbb Z`}</M>
                      </th>
                      <td>
                        <M>{setLabel(row.quotientIdeal)}</M>
                      </td>
                      <td>
                        <M>
                          {row.containedIn
                            .map((d) => String.raw`${d}\mathbb Z/12\mathbb Z`)
                            .join(", ")}
                        </M>
                      </td>
                    </tr>
                  ))
                : quadratic.correspondence.map((row) => (
                    <tr key={row.generator}>
                      <th scope="row">
                        Ideal{" "}
                        <M>{`(${row.generator === "X²+X+1" ? "X^2+X+1" : row.generator === "X²+1" ? "X^2+1" : row.generator === "X²+X" ? "X^2+X" : row.generator})`}</M>
                      </th>
                      <td>
                        <M>
                          {setLabel(row.quotientIdeal, quotientElementNames)}
                        </M>
                      </td>
                      <td>
                        <M>
                          {row.containedIn
                            .map(
                              (generator) =>
                                `(${generator === "X²+X+1" ? "X^2+X+1" : generator === "X²+1" ? "X^2+1" : generator === "X²+X" ? "X^2+X" : generator})`,
                            )
                            .join(", ")}
                        </M>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          <p>
            <Prose>{String.raw`Ideal correspondence sends $J\supseteq I$ to $J/I$ and preserves inclusion. This finite table checks the selected example. In general, two-sided absorption proves quotient multiplication well-defined, and the preimage of an ideal under the quotient map proves the correspondence.`}</Prose>
          </p>
        </>
      )}
    </div>
  );
}
