"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import {
  operationModel,
  type OperationKind,
} from "@/lib/algebra/foundation-labs";
import { Math as M } from "./Math";
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
        The set is {"{"}
        {model.elements.join(", ")}
        {"}"}. Row a and column b contain a⋆b. Associativity is checked on every
        triple, independently of how the table looks.
      </p>
      <label>
        Number of elements
        <select
          value={size}
          onChange={(event) => setSize(Number(event.target.value))}
        >
          {[3, 4, 5, 6].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label>
        Operation ⋆
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as OperationKind)}
        >
          <option value="addition">Addition modulo n</option>
          <option value="multiplication">Multiplication modulo n</option>
          <option value="subtraction">Subtraction modulo n</option>
          <option value="unbounded-addition">
            Ordinary addition (no reduction)
          </option>
        </select>
      </label>
      <div className="math-table-scroll">
        <table>
          <caption>Complete operation table</caption>
          <thead>
            <tr>
              <th scope="col">a⋆b</th>
              {model.elements.map((b) => (
                <th scope="col" key={b}>
                  {b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.table.map((row, a) => (
              <tr key={a}>
                <th scope="row">{a}</th>
                {row.map((value, b) => (
                  <td key={b}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="live-mathematics" aria-live="polite">
        <p>
          Closure:{" "}
          {model.closureWitness
            ? `fails: ${model.closureWitness.a}⋆${model.closureWitness.b}=${model.closureWitness.value} is outside the set`
            : "passes for every pair"}
          .
        </p>
        <p>
          Two-sided identity:{" "}
          {model.closureWitness
            ? "not evaluated outside a closed operation"
            : model.identity === undefined
              ? "none"
              : model.identity}
          .
        </p>
        <p>
          Two-sided inverses:{" "}
          {model.identity === undefined
            ? "requires an identity"
            : model.missingInverse === undefined
              ? "every element has one"
              : `${model.missingInverse} has no inverse`}
          .
        </p>
        <p>
          Associativity:{" "}
          {model.closureWitness
            ? "requires closure before nesting the operation"
            : failure
              ? `fails: (${failure.a}⋆${failure.b})⋆${failure.c}=${failure.left}, but ${failure.a}⋆(${failure.b}⋆${failure.c})=${failure.right}`
              : `passes all ${size ** 3} triples`}
          .
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
