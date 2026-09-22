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
import { Math as M } from "./Math";
import { CayleyReachability } from "./CayleyReachability";

const wordLabel = (word: S3Letter[]) =>
  word.length
    ? word.map((letter) => (letter === "rInverse" ? "r⁻¹" : letter)).join(" · ")
    : "e";

export function S3RelationLab() {
  const [word, setWord] = useState<S3Letter[]>([]);
  const model = s3WordModel(word);
  return (
    <div className="foundation-lab s3-relation-lab">
      <p>
        Work in S₃ with r=(123), s=(12). Products act right factor first:
        appending s to the written word r gives rs, which applies s first to a
        point. Shortest words use the alphabet r, r⁻¹, s.
      </p>
      <div className="lab-controls">
        {s3Letters.map((letter) => (
          <button key={letter} onClick={() => setWord([...word, letter])}>
            Append {s3LetterLabel[letter]}
          </button>
        ))}
        <button onClick={() => setWord([])}>Clear word</button>
        <button onClick={() => setWord(["r", "r", "r"])}>Try r³=e</button>
        <button onClick={() => setWord(["s", "r", "s"])}>Try srs=r⁻¹</button>
      </div>
      <div className="live-mathematics" aria-live="polite">
        <p>
          Written word {wordLabel(word)} evaluates to{" "}
          {permutationNames[model.current]}. Shortest word length for this
          element: {model.shortestWords.get(model.current)?.length}.
        </p>
        <p>
          {word.length > 0 && model.current === 0
            ? "This word is an identity relation in S₃. One observed relation alone does not prove a presentation complete."
            : "The current word is not an identity relation; compare two words by their evaluated permutation."}
        </p>
        <M block>{String.raw`r^3=e,\qquad s^2=e,\qquad srs=r^{-1}`}</M>
      </div>
      <table>
        <caption>Shortest right-multiplication words in S₃</caption>
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
                  <th scope="row">{permutationNames[element]}</th>
                  <td>{wordLabel(shortest)}</td>
                  <td>{shortest.length}</td>
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
            <th scope="col">Its S₃ permutation</th>
          </tr>
        </thead>
        <tbody>
          {model.normalForms.map((form) => (
            <tr key={form.name}>
              <th scope="row">{form.name}</th>
              <td>{permutationNames[form.element]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Each defining relation checks true in S₃:{" "}
        {model.relations
          .map(
            (relation) =>
              `${relation.name} ${relation.holds ? "holds" : "fails"}`,
          )
          .join("; ")}
        .
      </p>
      <p>
        This presentation is complete for S₃ for a separate reason. The
        relations let us replace sr by r⁻¹s, move every s to the right, and
        reduce powers modulo 3 and 2. Every word becomes one of rⁱsʲ with
        0≤i&lt;3 and 0≤j&lt;2, so the presented group has at most six elements.
        The six normal forms above give distinct permutations in S₃, so the map
        onto S₃ is also injective. A relation list in another group needs its
        own normal-form or cardinality argument.
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
        <button aria-pressed={group === "s3"} onClick={() => setGroup("s3")}>
          S₃ words and relations
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
