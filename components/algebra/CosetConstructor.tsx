"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import {
  cosetModel,
  permutationNames,
  symmetricProduct,
  symmetricInverse,
} from "@/lib/algebra/foundation-labs";
import { Math as M, Prose } from "./Math";
const subgroups = [
  { name: "{e,(12)} — not normal", elements: [0, 1] },
  { name: "A3={e,(123),(132)} — normal", elements: [0, 4, 5] },
  { name: "{e} — normal", elements: [0] },
  { name: "S3 — normal", elements: [0, 1, 2, 3, 4, 5] },
];
const names = (elements: number[]) =>
  String.raw`\{${elements.map((element) => permutationNames[element]).join(", ")}\}`;
export function CosetConstructor({ lesson }: { lesson: Lesson }) {
  const [selection, setSelection] = useState(
      Number(lesson.parameters?.subgroup ?? 0),
    ),
    [representative, setRepresentative] = useState(
      Number(lesson.parameters?.representative ?? 4),
    );
  const subgroup = subgroups[selection],
    model = cosetModel(subgroup.elements),
    witness = model.witness;
  return (
    <div className="foundation-lab">
      <M block>
        {"G=S_3,\\quad aH=\\{ah:h\\in H\\},\\quad Ha=\\{ha:h\\in H\\}"}
      </M>
      <p>
        <Prose>{String.raw`Permutations act on the left; $ab$ applies $b$ first. Cosets are whole subsets. The tiles show a partition, not elements deleted from $S_3$.`}</Prose>
      </p>
      <label>
        Subgroup <M focusable={false}>{String.raw`H`}</M>
        <select
          aria-label="Subgroup H"
          value={selection}
          onChange={(event) => setSelection(Number(event.target.value))}
        >
          {subgroups.map((group, index) => (
            <option key={group.name} value={index}>
              {group.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Representative <M focusable={false}>{String.raw`a`}</M>
        <select
          aria-label="Representative a"
          value={representative}
          onChange={(event) => setRepresentative(Number(event.target.value))}
        >
          {permutationNames.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <div className="coset-tiles">
        {model.cosets.map((coset, index) => (
          <section key={index}>
            <h3>
              <Prose>{String.raw`Class ${index}: $${permutationNames[coset[0]]}H$`}</Prose>
            </h3>
            {coset.map((element) => (
              <span key={element}>
                <M>{permutationNames[element]}</M>
              </span>
            ))}
          </section>
        ))}
      </div>
      <div className="live-mathematics" aria-live="polite">
        <p>
          <Prose>{String.raw`$aH=${names(model.left(representative))}$; $Ha=${names(model.right(representative))}$.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`$aHa^{-1}=${names(subgroup.elements.map((h) => symmetricProduct(symmetricProduct(representative, h), symmetricInverse(representative))))}$.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`$6=${model.cosets.length}\times${subgroup.elements.length}$, counting cosets times elements per coset.`}</Prose>
        </p>
        <p>
          <M>{"H"}</M> is{" "}
          {model.normal
            ? "normal: all left/right cosets agree"
            : "not normal: quotient multiplication is rejected"}
          .
        </p>
        {witness && (
          <p>
            <Prose>{String.raw`Failure witness: $${permutationNames[witness.first]}H=${permutationNames[witness.replacement]}H$, but multiplying by $${permutationNames[witness.second]}H$ gives class ${witness.originalClass} using the first representative and class ${witness.changedClass} using the replacement.`}</Prose>
          </p>
        )}
      </div>
      {model.quotientTable && (
        <table>
          <caption>
            Well-defined quotient multiplication (class numbers)
          </caption>
          <thead>
            <tr>
              <th scope="col">Product</th>
              {model.cosets.map((_, i) => (
                <th key={i} scope="col">
                  <M>{String(i)}</M>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.quotientTable.map((row, i) => (
              <tr key={i}>
                <th scope="row">
                  <M>{String(i)}</M>
                </th>
                {row.map((value, j) => (
                  <td key={j}>
                    <M>{String(value)}</M>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button onClick={() => setSelection(0)}>
        Try the nonnormal subgroup
      </button>
      <button
        aria-label="Form the quotient S3/A3"
        onClick={() => setSelection(1)}
      >
        Form the quotient <M focusable={false}>{"S_3/A_3"}</M>
      </button>
      <p>
        <Prose>{String.raw`Why the law works: for $a^{\prime}=an$ and $b^{\prime}=bm$, $a^{\prime}b^{\prime}=ab(b^{-1}nb)m$. The output stays in $abH$ precisely when conjugation preserves $H$. The table checks $S_3$; this argument proves the general normal-subgroup construction.`}</Prose>
      </p>
    </div>
  );
}
