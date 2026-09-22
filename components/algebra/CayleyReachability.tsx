"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import {
  cyclicReachability,
  integerGcd,
  residue,
} from "@/lib/algebra/foundation-labs";
import { Math as M } from "./Math";
export function CayleyReachability({ lesson }: { lesson: Lesson }) {
  const [size, setSize] = useState(12),
    [generator, setGenerator] = useState(
      Number(lesson.parameters?.generator ?? 4),
    ),
    [word, setWord] = useState<number[]>([]);
  const model = cyclicReachability(size, [generator, -generator]);
  const current = residue(
    word.reduce((sum, value) => sum + value, 0),
    size,
  );
  const position = (element: number) => ({
    x: 180 + 135 * Math.cos((2 * Math.PI * element) / size - Math.PI / 2),
    y: 165 + 135 * Math.sin((2 * Math.PI * element) / size - Math.PI / 2),
  });
  return (
    <div className="foundation-lab">
      <M
        block
      >{`\\langle[${generator}]\\rangle\\le\\mathbb Z/${size}\\mathbb Z,\\qquad o([${generator}])=${size / integerGcd(size, generator)}`}</M>
      <p>
        Work additively in C{size}=Z/{size}Z. A word applies its listed steps in
        order; each step adds the selected generator or its inverse.
      </p>
      <label>
        Group order n
        <select
          value={size}
          onChange={(event) => {
            setSize(Number(event.target.value));
            setGenerator(1);
            setWord([]);
          }}
        >
          {[6, 8, 12].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label>
        Generator g
        <select
          value={generator}
          onChange={(event) => {
            setGenerator(Number(event.target.value));
            setWord([]);
          }}
        >
          {Array.from({ length: size }, (_, n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <button onClick={() => setWord([...word, generator])}>
        Apply +{generator}
      </button>
      <button onClick={() => setWord([...word, -generator])}>
        Apply −{generator}
      </button>
      <button onClick={() => setWord([])}>Clear word</button>
      <div className="live-mathematics" aria-live="polite">
        <p>
          Word: {word.length ? word.join(" + ") : "empty (identity)"}. Current
          element: {current}.
        </p>
        <p>
          Generated subgroup: {"{"}
          {model.reachable.join(", ")}
          {"}"}.
        </p>
        <p>
          Order of g = {size}/gcd({size},{generator}) ={" "}
          {size / integerGcd(size, generator)}.{" "}
          {size / integerGcd(size, generator)} copies return to zero.
        </p>
        <p>
          {model.reachable.length === size
            ? "This element generates the whole group."
            : "Nonexample: a nonzero element need not generate the whole group."}
        </p>
      </div>
      <svg
        viewBox="0 0 360 330"
        role="img"
        aria-label={`Cayley graph of C${size}, with edges adding ${generator}; current vertex ${current}. Reachability and words are listed in the table.`}
      >
        <defs>
          <marker
            id="cayley-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#526680" />
          </marker>
        </defs>
        {Array.from({ length: size }, (_, element) => {
          const from = position(element),
            to = position(residue(element + generator, size));
          const distance = Math.hypot(to.x - from.x, to.y - from.y);
          return distance === 0 ? (
            <circle
              key={element}
              cx={from.x + 13}
              cy={from.y - 13}
              r="12"
              fill="none"
              stroke="#526680"
            />
          ) : (
            <line
              key={element}
              x1={from.x + (19 * (to.x - from.x)) / distance}
              y1={from.y + (19 * (to.y - from.y)) / distance}
              x2={to.x - (21 * (to.x - from.x)) / distance}
              y2={to.y - (21 * (to.y - from.y)) / distance}
              stroke="#526680"
              markerEnd="url(#cayley-arrow)"
            />
          );
        })}
        {Array.from({ length: size }, (_, element) => {
          const { x, y } = position(element);
          return (
            <g key={element}>
              <circle
                cx={x}
                cy={y}
                r="18"
                fill={element === current ? "#243d70" : "#f4f6fb"}
                stroke="#243d70"
                strokeWidth={model.words.has(element) ? 3 : 1}
                strokeDasharray={model.words.has(element) ? undefined : "3 2"}
              />
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                fill={element === current ? "white" : "#243d70"}
              >
                {element}
              </text>
            </g>
          );
        })}
      </svg>
      <p>
        Arrows add g. Thick outlines mark reachable vertices; dashed outlines
        mark unreachable vertices. The filled vertex is the current word
        endpoint.
      </p>
      <table>
        <caption>Reachability and shortest words</caption>
        <thead>
          <tr>
            <th scope="col">Element</th>
            <th scope="col">Shortest word from 0</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: size }, (_, element) => (
            <tr key={element}>
              <th scope="row">{element}</th>
              <td>
                {model.words.has(element)
                  ? model.words.get(element)!.join(" + ") || "empty word"
                  : "unreachable"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={() => {
          setSize(12);
          setGenerator(4);
          setWord([]);
        }}
      >
        Try a proper generated subgroup
      </button>
      <p>
        The table searches this finite Cayley graph. The general reason is
        divisibility: kg=0 modulo n exactly when n divides kg, so the first
        return is n/gcd(n,g). A list of observed relations does not establish a
        complete presentation in a different group.
      </p>
    </div>
  );
}
