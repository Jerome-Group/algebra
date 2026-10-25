"use client";
import { symmetricElementSpeech } from "./ChoiceSpeech";
import { Choice } from "./Groups";

import { useState } from "react";
import { regularActionModel } from "@/lib/algebra/cayley-words";
import { Math as M, Prose } from "./Math";

export function CayleyEmbeddingLab() {
  const [first, setFirst] = useState(4);
  const [second, setSecond] = useState(1);
  const model = regularActionModel(first, second);
  const permutationText = (images: number[]) =>
    images.map((image) => model.names[image]).join(", ");
  return (
    <div className="foundation-lab cayley-embedding-lab">
      <p>
        <Prose>{String.raw`$S_3$ acts on its own six elements by left multiplication $\lambda_g(x)=gx$. Composition $\lambda_g\lambda_h$ applies $\lambda_h$ first, matching $gh$. This constructs an embedding into $S_6$; it does not claim six is the smallest degree.`}</Prose>
      </p>
      <div className="lab-controls">
        <label>
          First factor <M focusable={false}>{"g"}</M>, currently{" "}
          <M focusable={false}>{model.names[first]}</M>
          <Choice
            label={`First factor g, currently ${model.names[first]}`}
            value={first}
            onChange={(value) => setFirst(value)}
            options={model.elements.map((element) => ({
              value: element,
              presentation: `$${model.names[element]}$`,
              speech: symmetricElementSpeech[element],
            }))}
          />
        </label>
        <label>
          Second factor <M focusable={false}>{"h"}</M>, currently{" "}
          <M focusable={false}>{model.names[second]}</M>
          <Choice
            label={`Second factor h, currently ${model.names[second]}`}
            value={second}
            onChange={(value) => setSecond(value)}
            options={model.elements.map((element) => ({
              value: element,
              presentation: `$${model.names[element]}$`,
              speech: symmetricElementSpeech[element],
            }))}
          />
        </label>
      </div>
      <div className="live-mathematics" aria-live="polite">
        <M
          block
        >{String.raw`\lambda_g(x)=gx,\qquad\lambda_g\circ\lambda_h=\lambda_{gh}`}</M>
        <p>
          <Prose>{String.raw`$gh=${model.names[model.product]}$. Images of $\lambda_g$ in the fixed element order: $(${permutationText(model.firstPermutation)})$.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`Images of $\lambda_h$: $(${permutationText(model.secondPermutation)})$. Images of $\lambda_{gh}$: $(${permutationText(model.productPermutation)})$.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`All six images of $\lambda_g\circ\lambda_h$ agree with $\lambda_{gh}$: ${model.composedPermutation.every((image, i) => image === model.productPermutation[i]) ? "yes" : "no"}.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`$\lambda_g(e)=g=${model.names[first]}$. Distinct $g$ have distinct images of $e$, so the embedding is injective.`}</Prose>
        </p>
      </div>
      <table>
        <caption>
          <Prose>{String.raw`Left-regular embedding $S_3\to S_6$: each row is one permutation`}</Prose>
        </caption>
        <thead>
          <tr>
            <th scope="col">
              Element <M>{"g"}</M>
            </th>
            <th scope="col">
              <Prose>{String.raw`Images of $e$, $(12)$, $(23)$, $(13)$, $(123)$, $(132)$`}</Prose>
            </th>
            <th scope="col">
              Identity image <M>{String.raw`\lambda_g(e)`}</M>
            </th>
          </tr>
        </thead>
        <tbody>
          {model.allPermutations.map((images, g) => (
            <tr key={g}>
              <th scope="row">
                Element <M>{model.names[g]}</M>
              </th>
              <td>
                <M>{`(${permutationText(images)})`}</M>
              </td>
              <td>
                <M>{model.names[images[0]]}</M>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <caption>
          <Prose>{String.raw`Composition check for every $x\in S_3$`}</Prose>
        </caption>
        <thead>
          <tr>
            <th scope="col">
              Input <M>{"x"}</M>
            </th>
            <th scope="col">
              Composite image <M>{String.raw`\lambda_g(\lambda_h(x))`}</M>
            </th>
            <th scope="col">
              Product image <M>{String.raw`\lambda_{gh}(x)`}</M>
            </th>
          </tr>
        </thead>
        <tbody>
          {model.elements.map((x) => (
            <tr key={x}>
              <th scope="row">
                Input <M>{model.names[x]}</M>
              </th>
              <td>
                <M>{model.names[model.composedPermutation[x]]}</M>
              </td>
              <td>
                <M>{model.names[model.productPermutation[x]]}</M>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <Prose>{String.raw`The table exhausts this six-element example. In an arbitrary group, left multiplication is bijective with inverse $\lambda_{g^{-1}}$, and $\lambda_g\lambda_h(x)=g(hx)=(gh)x$ by associativity. Evaluating at $e$ proves injectivity. Minimal permutation degree is a different question.`}</Prose>
      </p>
    </div>
  );
}
