"use client";
import { useState } from "react";
import { regularActionModel } from "@/lib/algebra/cayley-words";
import { Math as M } from "./Math";

export function CayleyEmbeddingLab() {
  const [first, setFirst] = useState(4);
  const [second, setSecond] = useState(1);
  const model = regularActionModel(first, second);
  const permutationText = (images: number[]) =>
    images.map((image) => model.names[image]).join(", ");
  return (
    <div className="foundation-lab cayley-embedding-lab">
      <p>
        S₃ acts on its own six elements by left multiplication λg(x)=gx.
        Composition λgλh applies λh first, matching gh. This constructs an
        embedding into S₆; it does not claim six is the smallest degree.
      </p>
      <div className="lab-controls">
        <label>
          First factor g, currently {model.names[first]}
          <select
            value={first}
            onChange={(event) => setFirst(Number(event.target.value))}
          >
            {model.elements.map((element) => (
              <option key={element} value={element}>
                {model.names[element]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Second factor h, currently {model.names[second]}
          <select
            value={second}
            onChange={(event) => setSecond(Number(event.target.value))}
          >
            {model.elements.map((element) => (
              <option key={element} value={element}>
                {model.names[element]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="live-mathematics" aria-live="polite">
        <M
          block
        >{String.raw`\lambda_g(x)=gx,\qquad\lambda_g\circ\lambda_h=\lambda_{gh}`}</M>
        <p>
          gh={model.names[model.product]}. Images of λg in the fixed element
          order: {permutationText(model.firstPermutation)}.
        </p>
        <p>
          Images of λh: {permutationText(model.secondPermutation)}. Images of
          λgh: {permutationText(model.productPermutation)}.
        </p>
        <p>
          All six images of λg∘λh agree with λgh:{" "}
          {model.composedPermutation.every(
            (image, i) => image === model.productPermutation[i],
          )
            ? "yes"
            : "no"}
          .
        </p>
        <p>
          λg(e)=g={model.names[first]}. Distinct g have distinct images of e, so
          the embedding is injective.
        </p>
      </div>
      <table>
        <caption>
          Left-regular embedding S₃→S₆: each row is one permutation
        </caption>
        <thead>
          <tr>
            <th scope="col">g</th>
            <th scope="col">Images of e, (12), (23), (13), (123), (132)</th>
            <th scope="col">λg(e)</th>
          </tr>
        </thead>
        <tbody>
          {model.allPermutations.map((images, g) => (
            <tr key={g}>
              <th scope="row">{model.names[g]}</th>
              <td>{permutationText(images)}</td>
              <td>{model.names[images[0]]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <caption>Composition check for every x in S₃</caption>
        <thead>
          <tr>
            <th scope="col">x</th>
            <th scope="col">λg(λh(x))</th>
            <th scope="col">λgh(x)</th>
          </tr>
        </thead>
        <tbody>
          {model.elements.map((x) => (
            <tr key={x}>
              <th scope="row">{model.names[x]}</th>
              <td>{model.names[model.composedPermutation[x]]}</td>
              <td>{model.names[model.productPermutation[x]]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        The table exhausts this six-element example. In an arbitrary group, left
        multiplication is bijective with inverse λg⁻¹, and λgλh(x)=g(hx)=(gh)x
        by associativity. Evaluating at e proves injectivity. Minimal
        permutation degree is a different question.
      </p>
    </div>
  );
}
