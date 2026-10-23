"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import { permutationNames } from "@/lib/algebra/foundation-labs";
import {
  s3LetterLabel,
  s3Letters,
  s3WordModel,
  type S3Letter,
} from "@/lib/algebra/cayley-words";
import { Math as M, Prose } from "./Math";
import { CayleyReachability } from "./CayleyReachability";

const wordLabel = (word: S3Letter[]) =>
  word.length
    ? word
        .map((letter) => (letter === "rInverse" ? "r^{-1}" : letter))
        .join(String.raw`\cdot `)
    : "e";

export function S3RelationLab() {
  const [word, setWord] = useState<S3Letter[]>([]);
  const model = s3WordModel(word);
  return (
    <div className="foundation-lab s3-relation-lab">
      <p>
        <Prose>{String.raw`Work in $S_3$ with $r=(123)$, $s=(12)$. Products act right factor first: appending $s$ to the written word $r$ gives $rs$, which applies $s$ first to a point. Shortest words use the alphabet $r$, $r^{-1}$, $s$.`}</Prose>
      </p>
      <div className="lab-controls">
        {s3Letters.map((letter) => (
          <button
            key={letter}
            aria-label={`Append ${s3LetterLabel[letter]}`}
            onClick={() => setWord([...word, letter])}
          >
            Append{" "}
            <M focusable={false}>{letter === "rInverse" ? "r^{-1}" : letter}</M>
          </button>
        ))}
        <button onClick={() => setWord([])}>Clear word</button>
        <button aria-label="Try r³=e" onClick={() => setWord(["r", "r", "r"])}>
          Try <M focusable={false}>{"r^3=e"}</M>
        </button>
        <button
          aria-label="Try srs=r⁻¹"
          onClick={() => setWord(["s", "r", "s"])}
        >
          Try <M focusable={false}>{"srs=r^{-1}"}</M>
        </button>
      </div>
      <div className="live-mathematics" aria-live="polite">
        <p>
          <Prose>{String.raw`Written word $${wordLabel(word)}$ evaluates to $${permutationNames[model.current]}$. Shortest word length for this element: ${model.shortestWords.get(model.current)?.length}.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`${word.length > 0 && model.current === 0 ? "This word is an identity relation in $S_3$. One observed relation alone does not prove a presentation complete." : "The current word is not an identity relation; compare two words by their evaluated permutation."}`}</Prose>
        </p>
        <M block>{String.raw`r^3=e,\qquad s^2=e,\qquad srs=r^{-1}`}</M>
      </div>
      <table>
        <caption>
          <Prose>{String.raw`Shortest right-multiplication words in $S_3$`}</Prose>
        </caption>
        <thead>
          <tr>
            <th scope="col">Element</th>
            <th scope="col">Shortest word</th>
            <th scope="col">Length</th>
          </tr>
        </thead>
        <tbody>
          {model.shortestWords.size === 6 &&
            [...model.shortestWords.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([element, shortest]) => (
                <tr key={element}>
                  <th scope="row">
                    Element <M>{permutationNames[element]}</M>
                  </th>
                  <td>
                    <M>{wordLabel(shortest)}</M>
                  </td>
                  <td>
                    <M>{String(shortest.length)}</M>
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
      <table>
        <caption>
          Six distinct normal forms for the claimed presentation
        </caption>
        <thead>
          <tr>
            <th scope="col">Normal form</th>
            <th scope="col">
              Its <M>{"S_3"}</M> permutation
            </th>
          </tr>
        </thead>
        <tbody>
          {model.normalForms.map((form, index) => (
            <tr key={form.name}>
              <th scope="row">
                Form <M>{["e", "r", "r^2", "s", "rs", "r^2s"][index]}</M>
              </th>
              <td>
                <M>{permutationNames[form.element]}</M>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <Prose>{String.raw`Each defining relation checks true in $S_3$: $r^3=e$ ${model.relations[0].holds ? "holds" : "fails"}; $s^2=e$ ${model.relations[1].holds ? "holds" : "fails"}; $srs=r^{-1}$ ${model.relations[2].holds ? "holds" : "fails"}.`}</Prose>
      </p>
      <p>
        <Prose>{String.raw`This presentation is complete for $S_3$ for a separate reason. The relations let us replace $sr$ by $r^{-1}s$, move every $s$ to the right, and reduce powers modulo $3$ and $2$. Every word becomes one of $r^i s^j$ with $0\le i<3$ and $0\le j<2$, so the presented group has at most six elements. The six normal forms above give distinct permutations in $S_3$, so the map onto $S_3$ is also injective. A relation list in another group needs its own normal-form or cardinality argument.`}</Prose>
      </p>
    </div>
  );
}

export function GeneratorRelationLab({ lesson }: { lesson: Lesson }) {
  const [group, setGroup] = useState<"cyclic" | "s3">("cyclic");
  return (
    <div>
      <div className="lab-controls">
        <button
          aria-pressed={group === "cyclic"}
          onClick={() => setGroup("cyclic")}
        >
          Cyclic reachability and subgroups
        </button>
        <button
          aria-label="S₃ words and relations"
          aria-pressed={group === "s3"}
          onClick={() => setGroup("s3")}
        >
          <M focusable={false}>{"S_3"}</M> words and relations
        </button>
      </div>
      {group === "cyclic" ? (
        <CayleyReachability lesson={lesson} />
      ) : (
        <S3RelationLab />
      )}
    </div>
  );
}
