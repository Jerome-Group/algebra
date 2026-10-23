"use client";
import { useState } from "react";
import {
  equivalentFractions,
  factorMapReading,
  fractionReading,
  invertedSetNames,
  localRingNames,
  type InvertedSet,
  type LocalRing,
} from "@/lib/algebra/localisation-model";
import { Math as M, Prose } from "./Math";

const ringTex: Record<LocalRing, string> = {
  atThree: String.raw`\mathbb Z_{(3)}`,
  invertThree: String.raw`\mathbb Z[1/3]`,
  rationals: String.raw`\mathbb Q`,
};
const examples = [
  { label: "1/2", a: 1, b: 2 },
  { label: "3/2", a: 3, b: 2 },
  { label: "1/3", a: 1, b: 3 },
  { label: "3/6", a: 3, b: 6 },
  { label: "0/1", a: 0, b: 1 },
] as const;

export function LocalisationMicroscope() {
  const [ring, setRing] = useState<LocalRing>("atThree");
  const [fractionIndex, setFractionIndex] = useState(0);
  const [comparisonIndex, setComparisonIndex] = useState(3);
  const [inverted, setInverted] = useState<InvertedSet>("outsideThree");
  const [prediction, setPrediction] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [failure, setFailure] = useState(false);
  const fraction = examples[fractionIndex];
  const comparison = examples[comparisonIndex];
  const reading = fractionReading(fraction.a, fraction.b, ring);
  const relation = equivalentFractions(
    fraction.a,
    fraction.b,
    comparison.a,
    comparison.b,
  );
  const factor = factorMapReading(inverted, ring);
  function reset() {
    setPrediction("");
    setRevealed(false);
    setFailure(false);
  }
  return (
    <div className="foundation-lab">
      <p>
        Choose which denominators become units in <M>{"S^{-1}R"}</M>. Reduce a
        fraction before testing membership.
      </p>
      <div className="lab-controls">
        <label>
          Target ring
          <select
            value={ring}
            onChange={(event) => {
              setRing(event.target.value as LocalRing);
              reset();
            }}
          >
            {Object.entries(localRingNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fraction <M focusable={false}>{String.raw`\frac ab`}</M>
          <select
            aria-label="Fraction a/b"
            value={fractionIndex}
            onChange={(event) => {
              setFractionIndex(Number(event.target.value));
              reset();
            }}
          >
            {examples.map((item, index) => (
              <option key={index} value={index}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Compare with <M focusable={false}>{String.raw`\frac cd`}</M>
          <select
            aria-label="Compare with c/d"
            value={comparisonIndex}
            onChange={(event) => {
              setComparisonIndex(Number(event.target.value));
              reset();
            }}
          >
            {examples.map((item, index) => (
              <option key={index} value={index}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Set to invert in <M focusable={false}>{String.raw`\mathbb Z`}</M>
          <select
            aria-label="Set to invert in ℤ"
            value={inverted}
            onChange={(event) => {
              setInverted(event.target.value as InvertedSet);
              reset();
            }}
          >
            {Object.entries(invertedSetNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="prediction-prompt">
        Predict whether the selected fraction is absent, a unit or a nonunit in
        the target. Are the two fractions equal, and can{" "}
        <M focusable={false}>{String.raw`\mathbb Z\to${ringTex[ring]}`}</M>{" "}
        factor through the chosen localization?
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
              <Prose>{String.raw`$\frac{${fraction.a}}{${fraction.b}}$ reduces to $\frac{${reading.numerator}}{${reading.denominator}}$ and is ${reading.status} in $${ringTex[ring]}$.`}</Prose>
            </p>
            {reading.maximalIdeal && (
              <p>
                <Prose>{String.raw`The nonunits of $${ringTex[ring]}$ form its unique maximal ideal $3\mathbb Z_{(3)}$.`}</Prose>
              </p>
            )}
            <p>
              <Prose>{String.raw`Surviving prime ideals: ${ring === "atThree" ? String.raw`$(0)$ and $3\mathbb Z_{(3)}$` : ring === "invertThree" ? String.raw`$(0)$ and $(p)$ for primes $p\ne3$` : "$(0)$ only"}.`}</Prose>
            </p>
            {ring === "atThree" && reading.status !== "absent" && (
              <p>
                <Prose>{String.raw`Discrete valuation $v_3(\frac{${fraction.a}}{${fraction.b}})=${reading.valuationAtThree === Infinity ? String.raw`\infty` : reading.valuationAtThree}$; units have value $0$, nonzero nonunits have positive value.`}</Prose>
              </p>
            )}
            <p>
              <Prose>{String.raw`Cross products: $${fraction.a}\cdot${comparison.b}=${relation.leftCross}$, $${fraction.b}\cdot${comparison.a}=${relation.rightCross}$. The fractions are ${relation.equivalent ? "equivalent" : "different"} in $\mathbb Q$.`}</Prose>
            </p>
            <p>
              <Prose>{String.raw`Inverted set: $${inverted === "powersThree" ? String.raw`S=\{3^n:n\ge0\}` : String.raw`S=\{n\in\mathbb Z:3\nmid n\}`}$. With inclusion $\psi:\mathbb Z\to${ringTex[ring]}$, the route $\mathbb Z\to${inverted === "powersThree" ? ringTex.invertThree : ringTex.atThree}\to${ringTex[ring]}$ ${factor.exists ? "has an induced factor map because all selected denominators become units" : inverted === "powersThree" ? String.raw`has no induced factor map: $3$ is not a unit in $\mathbb Z_{(3)}$` : String.raw`has no induced factor map: $2$ is not a unit in $\mathbb Z[1/3]$`}.`}</Prose>
            </p>
            {factor.exists && (
              <p>
                <Prose>{String.raw`The factor map $${inverted === "powersThree" ? ringTex.invertThree : ringTex.atThree}\to${ringTex[ring]}$ is given by $\overline\psi(a/s)=\psi(a)\psi(s)^{-1}$; it sends $${inverted === "powersThree" ? "5/9" : "5/2"}$ to $${inverted === "powersThree" ? "5/9" : "5/2"}$ under the displayed inclusion. Its existence does not assert that the canonical map $\mathbb Z\to${inverted === "powersThree" ? ringTex.invertThree : ringTex.atThree}$ is injective.`}</Prose>
              </p>
            )}
          </div>
          <table>
            <caption>
              Reduced-fraction classification across three localizations
            </caption>
            <thead>
              <tr>
                <th scope="col">Ring</th>
                <th scope="col">
                  Status of{" "}
                  <M>{String.raw`\frac{${fraction.a}}{${fraction.b}}`}</M>
                </th>
                <th scope="col">Inverted denominators</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  Ring <M>{String.raw`\mathbb Z_{(3)}`}</M>
                </th>
                <td>
                  {fractionReading(fraction.a, fraction.b, "atThree").status}
                </td>
                <td>Integers prime to 3</td>
              </tr>
              <tr>
                <th scope="row">
                  Ring <M>{String.raw`\mathbb Z[1/3]`}</M>
                </th>
                <td>
                  {
                    fractionReading(fraction.a, fraction.b, "invertThree")
                      .status
                  }
                </td>
                <td>Powers of 3</td>
              </tr>
              <tr>
                <th scope="row">
                  Ring <M>{String.raw`\mathbb Q`}</M>
                </th>
                <td>
                  {fractionReading(fraction.a, fraction.b, "rationals").status}
                </td>
                <td>All nonzero integers</td>
              </tr>
            </tbody>
          </table>
          <button onClick={() => setFailure(!failure)} aria-pressed={failure}>
            {failure ? "Hide" : "Try"} a zero-divisor failure
          </button>
          {failure && (
            <p role="status">
              <Prose>{String.raw`In $\mathbb Z/6\mathbb Z$ with $S=\{1,2,4\}$, $1/1$ and $4/1$ become equivalent because $2(1-4)=0$. Direct cross multiplication says $1\ne4$, so it is too strict when $S$ contains zero divisors. The canonical map sends nonzero $3$ to zero because $2\cdot3=0$.`}</Prose>
            </p>
          )}
          <p>
            <Prose>{String.raw`Proof boundary: regular denominators permit direct cross multiplication and cancellation. For general $S$, equality means some $u\in S$ annihilates the cross-product difference. A map out of $S^{-1}R$ exists uniquely when the target makes $S$ units; injectivity of $R\to S^{-1}R$ requires a separate regularity check.`}</Prose>
          </p>
        </>
      )}
    </div>
  );
}
