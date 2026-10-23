"use client";

import { useState } from "react";
import {
  nilradicalElements,
  powerSequence,
  radicalPowers,
} from "@/lib/algebra/nilradical";
import { Math as M, Prose } from "./Math";

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
            <Prose>{String.raw`$E_{12}^2=0$ in $M_2(\mathbb F_2)$, yet $J(M_2(\mathbb F_2))=0$. Nilpotent elements need not form the Jacobson radical without commutativity.`}</Prose>
          </p>
          <table>
            <caption>Noncommutative failure state</caption>
            <thead>
              <tr>
                <th scope="col">Matrix</th>
                <th scope="col">Square</th>
                <th scope="col">
                  In radical <M>{"J"}</M>?
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  Matrix unit <M>{"E_{12}"}</M>
                </th>
                <td>
                  <M>{"0"}</M>
                </td>
                <td>No</td>
              </tr>
            </tbody>
          </table>
        </>
      ) : (
        <>
          <label>
            Element{" "}
            <M
              focusable={false}
            >{String.raw`x\in\mathbb Z/${modulus}\mathbb Z`}</M>
            <select
              aria-label={`Element x∈ℤ/${modulus}ℤ`}
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
            <Prose>{String.raw`$${element % modulus}$ is ${powers.includes(0) ? "nilpotent" : "not nilpotent"} in $\mathbb Z/${modulus}\mathbb Z$. $\operatorname{Nil}(R)=J(R)=\{${nil.join(", ")}\}$.`}</Prose>
          </p>
          <table>
            <caption>
              <Prose>{String.raw`Element powers and successive radical ideals in $\mathbb Z/${modulus}\mathbb Z$`}</Prose>
            </caption>
            <thead>
              <tr>
                <th scope="col">Exponent</th>
                <th scope="col">
                  Element power <M>{"x^k"}</M>
                </th>
                <th scope="col">
                  Ideal power <M>{"J^k"}</M>
                </th>
              </tr>
            </thead>
            <tbody>
              {ideals.map((ideal, index) => (
                <tr key={index}>
                  <th scope="row">
                    <M>{String(index + 1)}</M>
                  </th>
                  <td>
                    <M>{String(powers[index] ?? powers.at(-1))}</M>
                  </td>
                  <td>
                    <M>{String.raw`\{${ideal.join(", ")}\}`}</M>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <Prose>{String.raw`${modulus === 8 ? "$J=(2)$, $J^2=(4)$, $J^3=0$: one exponent kills every triple product of radical elements." : "$J=0$: the ring is reduced despite having zero divisors."}`}</Prose>
          </p>
        </>
      )}
      <p>
        <Prose>{String.raw`Proof boundary. In a commutative unital ring, nilpotents lie in every prime ideal; the reverse inclusion requires a prime disjoint from a nonnilpotent element’s powers. Artinianity supplies a uniform nilpotence exponent for $J$. Without it, every element of a nil ideal may be nilpotent while the ideal itself is not nilpotent. The matrix state rejects any extension of the commutative claim.`}</Prose>
      </p>
    </section>
  );
}
