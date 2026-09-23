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
import { Math as M } from "./Math";

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
          Fraction a/b
          <select
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
          Compare with c/d
          <select
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
          Set to invert in ℤ
          <select
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
        the target. Are the two fractions equal, and can ℤ→
        {localRingNames[ring]} factor through the chosen localization?
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
              {fraction.label} reduces to {reading.numerator}/
              {reading.denominator} and is {reading.status} in {reading.ring}.
            </p>
            {reading.maximalIdeal && (
              <p>
                The nonunits of {reading.ring} form its unique maximal ideal{" "}
                {reading.maximalIdeal}.
              </p>
            )}
            <p>Surviving prime ideals: {reading.survivingPrimes}.</p>
            {ring === "atThree" && reading.status !== "absent" && (
              <p>
                Discrete valuation v₃({fraction.label})=
                {reading.valuationAtThree === Infinity
                  ? "∞"
                  : reading.valuationAtThree}
                ; units have value 0, nonzero nonunits have positive value.
              </p>
            )}
            <p>
              Cross products: {fraction.a}·{comparison.b}={relation.leftCross},{" "}
              {fraction.b}·{comparison.a}={relation.rightCross}. The fractions
              are {relation.equivalent ? "equivalent" : "different"} in ℚ.
            </p>
            <p>
              Inverted set: {factor.inverted}. With inclusion ψ:ℤ→
              {factor.target}, the route ℤ→{factor.source}→{factor.target}{" "}
              {factor.exists
                ? "has an induced factor map because all selected denominators become units"
                : `has no induced factor map: ${factor.obstruction}`}
              .
            </p>
            {factor.exists && (
              <p>
                The factor map {factor.source}→{factor.target} is given by{" "}
                {factor.formula}; it sends {factor.sample} to {factor.sample}{" "}
                under the displayed inclusion. Its existence does not assert
                that the canonical map ℤ→{factor.source} is injective.
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
                <th scope="col">Status of {fraction.label}</th>
                <th scope="col">Inverted denominators</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">ℤ₍₃₎</th>
                <td>
                  {fractionReading(fraction.a, fraction.b, "atThree").status}
                </td>
                <td>Integers prime to 3</td>
              </tr>
              <tr>
                <th scope="row">ℤ[1/3]</th>
                <td>
                  {
                    fractionReading(fraction.a, fraction.b, "invertThree")
                      .status
                  }
                </td>
                <td>Powers of 3</td>
              </tr>
              <tr>
                <th scope="row">ℚ</th>
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
              In ℤ/6ℤ with S={"{1,2,4}"}, 1/1 and 4/1 become equivalent because
              2(1−4)=0. Direct cross multiplication says 1≠4, so it is too
              strict when S contains zero divisors. The canonical map sends
              nonzero 3 to zero because 2·3=0.
            </p>
          )}
          <p>
            Proof boundary: regular denominators permit direct cross
            multiplication and cancellation. For general S, equality means some
            u∈S annihilates the cross-product difference. A map out of S⁻¹R
            exists uniquely when the target makes S units; injectivity of R→S⁻¹R
            requires a separate regularity check.
          </p>
        </>
      )}
    </div>
  );
}
