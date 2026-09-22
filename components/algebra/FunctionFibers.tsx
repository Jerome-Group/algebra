"use client";
import { useState } from "react";
import { fiberModel } from "@/lib/algebra/foundation-labs";
import type { Lesson } from "@/lib/algebra/engine";
import { Math as M } from "./Math";

export function FunctionFiberLab({ lesson }: { lesson: Lesson }) {
  const [outputs, setOutputs] = useState([0, 1, 2, 0, 1, 2]);
  const [modulus, setModulus] = useState(
    Number(lesson.parameters?.classModulus ?? 3),
  );
  const model = fiberModel(outputs, 3, modulus);
  return (
    <div className="foundation-lab">
      <M block>
        {"f:X\\longrightarrow Y,\\qquad x\\sim x'\\iff x\\equiv x'\\pmod m"}
      </M>
      <p>
        X={"{0,1,2,3,4,5}"}, Y={"{0,1,2}"}. Each row assigns exactly one output
        to an input. The proposed quotient identifies inputs modulo {modulus}.
      </p>
      <label>
        Input equivalence modulus
        <select
          value={modulus}
          onChange={(event) => setModulus(Number(event.target.value))}
        >
          <option value={2}>2 (parity classes)</option>
          <option value={3}>3 (remainder classes)</option>
        </select>
      </label>
      <svg
        viewBox="0 0 360 260"
        role="img"
        aria-label="Function arrows from six labelled inputs to three labelled outputs; the same values appear in the table"
      >
        {outputs.map((value, input) => (
          <g key={input}>
            <line
              x1="55"
              y1={25 + input * 40}
              x2="295"
              y2={45 + value * 80}
              stroke="#667a99"
            />
            <circle
              cx="45"
              cy={25 + input * 40}
              r="15"
              fill="#eef1fa"
              stroke="#304d87"
            />
            <text x="45" y={30 + input * 40} textAnchor="middle" fill="#172645">
              {input}
            </text>
          </g>
        ))}
        {[0, 1, 2].map((value) => (
          <g key={value}>
            <circle
              cx="310"
              cy={45 + value * 80}
              r="18"
              fill="#f1eaf7"
              stroke="#72548a"
            />
            <text
              x="310"
              y={50 + value * 80}
              textAnchor="middle"
              fill="#39204d"
            >
              {value}
            </text>
          </g>
        ))}
      </svg>
      <table>
        <caption>Function values and equivalence classes</caption>
        <thead>
          <tr>
            <th scope="col">Input x</th>
            <th scope="col">Output f(x)</th>
            <th scope="col">Input class</th>
          </tr>
        </thead>
        <tbody>
          {outputs.map((value, input) => (
            <tr key={input}>
              <th scope="row">{input}</th>
              <td>
                <select
                  aria-label={`Output f(${input}), currently ${value}`}
                  value={value}
                  onChange={(event) =>
                    setOutputs(
                      outputs.map((entry, index) =>
                        index === input ? Number(event.target.value) : entry,
                      ),
                    )
                  }
                >
                  {[0, 1, 2].map((target) => (
                    <option key={target}>{target}</option>
                  ))}
                </select>
              </td>
              <td>[{input % modulus}]</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="live-mathematics" aria-live="polite">
        {model.fibers.map((fiber, value) => (
          <p key={value}>
            Fiber f⁻¹({"{"}
            {value}
            {"}"}) = {"{"}
            {fiber.join(", ")}
            {"}"}
          </p>
        ))}
        <p>
          Injective: {model.injective ? "yes" : "no"}. Surjective onto Y:{" "}
          {model.surjective ? "yes" : "no"}.
        </p>
        <p>
          Proposed rule X/~ → Y, [x] ↦ f(x):{" "}
          <strong>
            {model.wellDefined ? "well-defined" : "not well-defined"}
          </strong>
          .
        </p>
        {model.witness && (
          <p>
            Witness: {model.witness[0]} and {model.witness[1]} are in the same
            input class, but their outputs are {outputs[model.witness[0]]} and{" "}
            {outputs[model.witness[1]]}.
          </p>
        )}
      </div>
      <button
        onClick={() => {
          setModulus(2);
          setOutputs([0, 1, 2, 0, 1, 2]);
        }}
      >
        Try incompatible representatives
      </button>
      <button
        onClick={() => {
          setModulus(3);
          setOutputs([0, 1, 2, 0, 1, 2]);
        }}
      >
        Restore a valid quotient rule
      </button>
      <p>
        Invariant for {lesson.navTitle}: a descended rule exists exactly when f
        is constant on each chosen input class. The table is a complete check
        for these six inputs; the general proof quantifies over every pair of
        equivalent inputs.
      </p>
    </div>
  );
}
