"use client";

import { useState } from "react";
import { Choice } from "./Groups";
import { Math as M } from "./Math";
import type { Lesson } from "@/lib/algebra/engine";
import {
  actionIsHomomorphism,
  allSubgroups,
  elements,
  isNormal,
  multiply,
  type Pair,
} from "@/lib/algebra/semidirect-product";

const label = ([a, b]: Pair) => `(${a},${b})`;

export function SemidirectLab({ lesson }: { lesson: Lesson }) {
  const [action, setAction] = useState(
    lesson.id === "mh2220-direct-product" ? "trivial" : "inversion",
  );
  const [left, setLeft] = useState("0,1");
  const [right, setRight] = useState("1,0");
  const [prediction, setPrediction] = useState("");
  const multiplier = action === "inversion" ? 2 : action === "trivial" ? 1 : 0;
  const valid = actionIsHomomorphism(multiplier);
  const parse = (value: string): Pair =>
    value.split(",").map(Number) as unknown as Pair;
  const lhs = parse(left);
  const rhs = parse(right);
  const product = valid ? multiply(lhs, rhs, multiplier) : null;
  const reverse = valid ? multiply(rhs, lhs, multiplier) : null;
  const subgroups = valid ? allSubgroups(multiplier) : [];

  return (
    <section aria-label="Semidirect product constructor">
      <h3>Can two factors produce different groups?</h3>
      <p>
        Predict whether (0,1)(1,0) equals (1,0)(0,1), then choose the action
        α:C₂→Aut(C₃). The second coordinate acts on the first on the left;
        products apply the right pair first.
      </p>
      <div className="lab-toolbar">
        <Choice
          label="Prediction: do the displayed pairs commute?"
          value={prediction}
          onChange={setPrediction}
          options={[
            ["", "Choose a prediction"],
            ["yes", "Yes"],
            ["no", "No"],
          ]}
        />
        <Choice
          label="Action α(s) on C₃"
          value={action}
          onChange={setAction}
          options={[
            ["inversion", "Inversion: x ↦ −x"],
            ["trivial", "Trivial: x ↦ x"],
            ["invalid", "Invalid: x ↦ 0"],
          ]}
        />
      </div>
      <div className="lab-controls">
        <Choice
          label="Left factor (a,b)"
          value={left}
          onChange={setLeft}
          options={elements.map((e) => [e.join(","), label(e)])}
        />
        <Choice
          label="Right factor (c,d)"
          value={right}
          onChange={setRight}
          options={elements.map((e) => [e.join(","), label(e)])}
        />
      </div>
      {!valid ? (
        <p role="status">
          Rejected action: α(s)(x)=0 is not an automorphism of C₃. It also fails
          α(s)²=id, so this choice cannot define C₃⋊C₂.
        </p>
      ) : (
        <>
          <p role="status">
            α(s)²=id: {multiplier}² ≡ 1 (mod 3). Thus α is a homomorphism.{" "}
            {prediction &&
              `Your prediction is ${prediction === (label(product!) === label(reverse!) ? "yes" : "no") ? "correct" : "incorrect"}.`}
          </p>
          <M
            block
          >{`(a,b)(c,d)=(${multiplier === 2 ? "a+(-1)^bc" : "a+c"}\\pmod 3,\\;b+d\\pmod 2)`}</M>
          <p>
            Here {label(lhs)}·{label(rhs)}={label(product!)}; reversing the
            factors gives {label(reverse!)}.
          </p>
          <p>
            N=C₃×&#123;0&#125; is normal. H=&#123;0&#125;×C₂ is a complement:
            N∩H=&#123;e&#125; and NH=G.
          </p>
          <h4>Split extension diagram</h4>
          <M
            block
          >{`1\\longrightarrow C_3\\xrightarrow{a\\mapsto(a,0)} ${multiplier === 2 ? "S_3" : "C_6"}\\xrightarrow{(a,b)\\mapsto b} C_2\\longrightarrow 1`}</M>
          <p>Its section is b↦(0,b). The composite C₂→G→C₂ is the identity.</p>
          <p>
            {multiplier === 2
              ? "Inversion yields S₃: three distinct reflection subgroups and one rotation subgroup. H is not normal."
              : "The trivial action yields C₆: H is normal and all coordinates commute."}
          </p>
          <h4>Multiplication table</h4>
          <div className="table-scroll">
            <table>
              <caption>
                Rows multiply columns; all six elements of{" "}
                {multiplier === 2 ? "S₃" : "C₆"}
              </caption>
              <thead>
                <tr>
                  <th scope="col">·</th>
                  {elements.map((e) => (
                    <th scope="col" key={label(e)}>
                      {label(e)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {elements.map((row) => (
                  <tr key={label(row)}>
                    <th scope="row">{label(row)}</th>
                    {elements.map((col) => (
                      <td key={label(col)}>
                        {label(multiply(row, col, multiplier))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h4>Subgroup structure</h4>
          <div className="table-scroll">
            <table>
              <caption>
                Distinct subgroups generated by at most two elements
              </caption>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Elements</th>
                  <th scope="col">Normal?</th>
                </tr>
              </thead>
              <tbody>
                {subgroups.map((group) => (
                  <tr key={group.map(label).join(";")}>
                    <td>{group.length}</td>
                    <td>{group.map(label).join(", ")}</td>
                    <td>{isNormal(group, multiplier) ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p>
        <strong>Proof boundary.</strong> The table verifies these six-element
        examples. Generally, α(hk)=α(h)α(k) proves associativity of
        (n,h)(n′,k)=(nα(h)(n′),hk). Conversely, if N◁G, H≤G, N∩H=&#123;e&#125;
        and NH=G, conjugation by H recovers α and unique factorisation gives
        G≅N⋊H. A split extension need not be direct: H must also act trivially.
        The extension 1→C₂→C₄→C₂→1 is nonsplit: C₄ has no order-two complement
        distinct from its kernel.
      </p>
    </section>
  );
}
