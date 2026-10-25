"use client";
import { Choice } from "./Groups";

import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import {
  operationModel,
  type OperationKind,
} from "@/lib/algebra/foundation-labs";
import { Math as M, Prose } from "./Math";
export function OperationChecker({ lesson }: { lesson: Lesson }) {
  const [size, setSize] = useState(3);
  const [kind, setKind] = useState<OperationKind>(
    (lesson.parameters?.operation as OperationKind) || "addition",
  );
  const model = operationModel(size, kind);
  const failure = model.associativityWitness;
  return (
    <div className="foundation-lab">
      <M
        block
      >{`G=\\{${model.elements.join(",")}\\},\\qquad (a\\star b)\\star c\\stackrel{?}{=}a\\star(b\\star c)`}</M>
      <p>
        <Prose>{String.raw`The set is $\{${model.elements.join(", ")}\}$. Row $a$ and column $b$ contain $a\star b$. Associativity is checked on every triple, independently of how the table looks.`}</Prose>
      </p>
      <label>
        Number of elements
        <Choice
          label={"Number of elements"}
          value={size}
          onChange={(value) => setSize(value)}
          options={[3, 4, 5, 6].map((n) => ({
            value: n,
            presentation: `$${n}$`,
            speech: String(n),
          }))}
        />
      </label>
      <label>
        Operation <M focusable={false}>{String.raw`\star`}</M>
        <Choice
          label="Operation ⋆"
          value={kind}
          onChange={(value) => setKind(value)}
          options={[
            {
              value: "addition",
              presentation: "Addition modulo $n$",
              speech: "Addition modulo n",
            },
            {
              value: "multiplication",
              presentation: "Multiplication modulo $n$",
              speech: "Multiplication modulo n",
            },
            {
              value: "subtraction",
              presentation: "Subtraction modulo $n$",
              speech: "Subtraction modulo n",
            },
            {
              value: "unbounded-addition",
              presentation: "Ordinary addition (no reduction)",
              speech: "Ordinary addition, no reduction",
            },
          ]}
        />
      </label>
      <div className="math-table-scroll">
        <table>
          <caption>Complete operation table</caption>
          <thead>
            <tr>
              <th scope="col">
                Product <M>{String.raw`a\star b`}</M>
              </th>
              {model.elements.map((b) => (
                <th scope="col" key={b}>
                  <M>{String(b)}</M>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.table.map((row, a) => (
              <tr key={a}>
                <th scope="row">
                  <M>{String(a)}</M>
                </th>
                {row.map((value, b) => (
                  <td key={b}>
                    <M>{String(value)}</M>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="live-mathematics" aria-live="polite">
        <p>
          <Prose>{String.raw`Closure: ${model.closureWitness ? String.raw`fails: $${model.closureWitness.a}\star${model.closureWitness.b}=${model.closureWitness.value}$ is outside the set` : "passes for every pair"}.`}</Prose>
        </p>
        <p>
          Two-sided identity:{" "}
          {model.closureWitness ? (
            "not evaluated outside a closed operation"
          ) : model.identity === undefined ? (
            "none"
          ) : (
            <M>{String(model.identity)}</M>
          )}
          .
        </p>
        <p>
          Two-sided inverses:{" "}
          {model.identity === undefined ? (
            "requires an identity"
          ) : model.missingInverse === undefined ? (
            "every element has one"
          ) : (
            <Prose>{`$${model.missingInverse}$ has no inverse`}</Prose>
          )}
          .
        </p>
        <p>
          <Prose>{String.raw`Associativity: ${model.closureWitness ? "requires closure before nesting the operation" : failure ? String.raw`fails: $(${failure.a}\star${failure.b})\star${failure.c}=${failure.left}$, but $${failure.a}\star(${failure.b}\star${failure.c})=${failure.right}$` : `passes all $${size ** 3}$ triples`}.`}</Prose>
        </p>
        <p>
          <strong>
            {model.isGroup
              ? "This finite operation is a group."
              : "This operation is not a group."}
          </strong>
        </p>
      </div>
      <button onClick={() => setKind("subtraction")}>
        Find an associativity failure
      </button>
      <p>
        Exhaustively checking a finite operation certifies these axioms for this
        table. It does not prove that every operation of this form on an
        arbitrary set is a group; that needs an algebraic argument.
      </p>
    </div>
  );
}
