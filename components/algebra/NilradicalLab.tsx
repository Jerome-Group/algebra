"use client";

import { useState } from "react";
import {
  nilradicalElements,
  powerSequence,
  radicalPowers,
} from "@/lib/algebra/nilradical";
import { Math as M } from "./Math";

export function NilradicalLab() {
  const [ring, setRing] = useState("8");
  const [element, setElement] = useState(2);
  const modulus = ring === "6" ? 6 : 8;
  const matrix = ring === "matrix";
  const powers = matrix ? [] : powerSequence(element % modulus, modulus);
  const nil = matrix ? [] : nilradicalElements(modulus);
  const ideals = matrix ? [] : radicalPowers(modulus);
  return (
    <section aria-label="Nilradical hypothesis checker">
      <h3>When do nilpotent elements form the radical?</h3>
      <p>
        Predict the powers of a chosen element. The prime-intersection and
        Artinian-radical theorems here require a commutative unital ring; finite
        quotient rings meet those hypotheses.
      </p>
      <M block>
        {
          "\\operatorname{Nil}(R)=\\bigcap_{P\\text{ prime}}P\\quad(R\\text{ commutative unital})"
        }
      </M>
      <label>
        Ring and hypotheses
        <select
          value={ring}
          onChange={(event) => {
            setRing(event.target.value);
            setElement(2);
          }}
        >
          <option value="8">ℤ/8ℤ — commutative, unital, Artinian</option>
          <option value="6">ℤ/6ℤ — commutative, unital, Artinian</option>
          <option value="matrix">
            M₂(F₂) — unital, Artinian, noncommutative
          </option>
        </select>
      </label>
      {matrix ? (
        <>
          <p role="status">
            E₁₂²=0 in M₂(F₂), yet J(M₂(F₂))=0. Nilpotent elements need not form
            the Jacobson radical without commutativity.
          </p>
          <table>
            <caption>Noncommutative failure state</caption>
            <thead>
              <tr>
                <th scope="col">Matrix</th>
                <th scope="col">Square</th>
                <th scope="col">In J?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">E₁₂</th>
                <td>0</td>
                <td>No</td>
              </tr>
            </tbody>
          </table>
        </>
      ) : (
        <>
          <label>
            Element x∈ℤ/{modulus}ℤ
            <select
              value={element % modulus}
              onChange={(event) => setElement(Number(event.target.value))}
            >
              {Array.from({ length: modulus }, (_, value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <p role="status">
            {element % modulus} is{" "}
            {powers.includes(0) ? "nilpotent" : "not nilpotent"} in ℤ/{modulus}
            ℤ. Nil(R)=J(R)=&#123;{nil.join(", ")}&#125;.
          </p>
          <table>
            <caption>
              Element powers and successive radical ideals in ℤ/{modulus}ℤ
            </caption>
            <thead>
              <tr>
                <th scope="col">Exponent</th>
                <th scope="col">xᵏ</th>
                <th scope="col">Jᵏ</th>
              </tr>
            </thead>
            <tbody>
              {ideals.map((ideal, index) => (
                <tr key={index}>
                  <th scope="row">{index + 1}</th>
                  <td>{powers[index] ?? powers.at(-1)}</td>
                  <td>&#123;{ideal.join(", ")}&#125;</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            {modulus === 8
              ? "J=(2), J²=(4), J³=0: one exponent kills every triple product of radical elements."
              : "J=0: the ring is reduced despite having zero divisors."}
          </p>
        </>
      )}
      <p>
        <strong>Proof boundary.</strong> In a commutative unital ring,
        nilpotents lie in every prime ideal; the reverse inclusion requires a
        prime disjoint from a nonnilpotent element’s powers. Artinianity
        supplies a uniform nilpotence exponent for J. Without it, every element
        of a nil ideal may be nilpotent while the ideal itself is not nilpotent.
        The matrix state rejects any extension of the commutative claim.
      </p>
    </section>
  );
}
