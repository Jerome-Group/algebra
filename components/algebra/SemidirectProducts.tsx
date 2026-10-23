"use client";

import { useState } from "react";
import { Choice } from "./Groups";
import { Math as M, Prose } from "./Math";
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
        <Prose>{String.raw`Predict whether $(0,1)(1,0)$ equals $(1,0)(0,1)$, then choose the action $\alpha:C_2\to\operatorname{Aut}(C_3)$. The second coordinate acts on the first on the left; products apply the right pair first.`}</Prose>
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
            ["inversion", String.raw`Inversion: $x\mapsto-x$`],
            ["trivial", String.raw`Trivial: $x\mapsto x$`],
            ["invalid", String.raw`Invalid: $x\mapsto0$`],
          ]}
        />
      </div>
      <div className="lab-controls">
        <Choice
          label="Left factor (a,b)"
          value={left}
          onChange={setLeft}
          options={elements.map((e) => [e.join(","), `$${label(e)}$`])}
        />
        <Choice
          label="Right factor (c,d)"
          value={right}
          onChange={setRight}
          options={elements.map((e) => [e.join(","), `$${label(e)}$`])}
        />
      </div>
      {!valid ? (
        <p role="status">
          <Prose>{String.raw`Rejected action: $\alpha(s)(x)=0$ is not an automorphism of $C_3$. It also fails $\alpha(s)^2=\operatorname{id}$, so this choice cannot define $C_3\rtimes C_2$.`}</Prose>
        </p>
      ) : (
        <>
          <p role="status">
            <Prose>{String.raw`$\alpha(s)^2=\operatorname{id}$: $${multiplier}^2\equiv1\pmod3$. Thus $\alpha$ is a homomorphism.${prediction ? ` Your prediction is ${prediction === (label(product!) === label(reverse!) ? "yes" : "no") ? "correct" : "incorrect"}.` : ""}`}</Prose>
          </p>
          <M
            block
          >{`(a,b)(c,d)=(${multiplier === 2 ? "a+(-1)^bc" : "a+c"}\\pmod 3,\\;b+d\\pmod 2)`}</M>
          <p>
            <Prose>{String.raw`Here $${label(lhs)}\cdot${label(rhs)}=${label(product!)}$; reversing the factors gives $${label(reverse!)}$.`}</Prose>
          </p>
          <p>
            <Prose>{String.raw`$N=C_3\times\{0\}$ is normal. $H=\{0\}\times C_2$ is a complement: $N\cap H=\{e\}$ and $NH=G$.`}</Prose>
          </p>
          <h4>Split extension diagram</h4>
          <M
            block
          >{`1\\longrightarrow C_3\\xrightarrow{a\\mapsto(a,0)} ${multiplier === 2 ? "S_3" : "C_6"}\\xrightarrow{(a,b)\\mapsto b} C_2\\longrightarrow 1`}</M>
          <p>
            <Prose>{String.raw`Its section is $b\mapsto(0,b)$. The composite $C_2\to G\to C_2$ is the identity.`}</Prose>
          </p>
          <p>
            <Prose>{String.raw`${multiplier === 2 ? "Inversion yields $S_3$: three distinct reflection subgroups and one rotation subgroup. $H$ is not normal." : "The trivial action yields $C_6$: $H$ is normal and all coordinates commute."}`}</Prose>
          </p>
          <h4>Multiplication table</h4>
          <div className="table-scroll">
            <table>
              <caption>
                <Prose>{String.raw`Rows multiply columns; all six elements of $${multiplier === 2 ? "S_3" : "C_6"}$`}</Prose>
              </caption>
              <thead>
                <tr>
                  <th scope="col">Multiply</th>
                  {elements.map((e) => (
                    <th scope="col" key={label(e)}>
                      Pair <M>{label(e)}</M>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {elements.map((row) => (
                  <tr key={label(row)}>
                    <th scope="row">
                      Pair <M>{label(row)}</M>
                    </th>
                    {elements.map((col) => (
                      <td key={label(col)}>
                        <M>{label(multiply(row, col, multiplier))}</M>
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
                    <td>
                      <M>{String(group.length)}</M>
                    </td>
                    <td>
                      <M>{String.raw`\{${group.map(label).join(", ")}\}`}</M>
                    </td>
                    <td>{isNormal(group, multiplier) ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p>
        <Prose>{String.raw`Proof boundary. The table verifies these six-element examples. Generally, $\alpha(hk)=\alpha(h)\alpha(k)$ proves associativity of $(n,h)(n^{\prime},k)=(n\alpha(h)(n^{\prime}),hk)$. Conversely, if $N\trianglelefteq G$, $H\le G$, $N\cap H=\{e\}$ and $NH=G$, conjugation by $H$ recovers $\alpha$ and unique factorisation gives $G\cong N\rtimes H$. A split extension need not be direct: $H$ must also act trivially. The extension $1\to C_2\to C_4\to C_2\to1$ is nonsplit: $C_4$ has no order-two complement distinct from its kernel.`}</Prose>
      </p>
    </section>
  );
}
