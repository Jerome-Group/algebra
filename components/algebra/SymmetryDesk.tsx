import { useState } from "react";
import { Math as M } from "./Math";

const names = ["A", "B", "C", "D"];
const positions = [
  [75, 45],
  [225, 45],
  [225, 195],
  [75, 195],
];
export function SymmetryDesk({ open }: { open: (id: string) => void }) {
  const [rotation, setRotation] = useState(0);
  const [reflection, setReflection] = useState(false);
  const [word, setWord] = useState<string[]>([]);
  const images = names.map(
    (_, i) => ((reflection ? 1 - i : i) + rotation + 4) % 4,
  );
  const act = (move: "r" | "s") => {
    if (move === "r") setRotation((rotation + 1) % 4);
    else {
      setRotation((4 - rotation) % 4);
      setReflection(!reflection);
    }
    setWord([...word, move].slice(-12));
  };
  const element =
    `${rotation ? `r^{${rotation}}` : ""}${reflection ? "s" : ""}` || "e";
  return (
    <section
      className="symmetry-desk"
      aria-label="Square symmetry investigation"
    >
      <div className="desk-heading">
        <p className="section-kicker">TRY A SYMMETRY</p>
        <span>Same square · eight possible moves</span>
      </div>
      <h2>Does order matter?</h2>
      <p>
        Rotate, then reflect. Reset and reverse the order. Track the labelled
        vertices.
      </p>
      <svg
        viewBox="0 0 300 245"
        role="img"
        aria-label={`Square vertex images: ${names.map((name, i) => `${name} goes to position ${names[images[i]]}`).join(", ")}`}
      >
        <path
          d="M75 45H225V195H75Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M150 25V215"
          stroke="currentColor"
          strokeDasharray="4 5"
          opacity=".35"
        />
        {names.map((name, i) => {
          const [x, y] = positions[images[i]];
          return (
            <g key={name}>
              <circle cx={x} cy={y} r="19" className={`vertex-${i}`} />
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                fill="white"
                fontSize="16"
                fontWeight="700"
              >
                {name}
              </text>
            </g>
          );
        })}
        <text
          x="150"
          y="240"
          textAnchor="middle"
          fontSize="13"
          fill="currentColor"
        >
          Dashed line: the reflection axis
        </text>
      </svg>
      <div className="desk-moves">
        <button onClick={() => act("r")}>Rotate 90° clockwise</button>
        <button onClick={() => act("s")}>Reflect across vertical axis</button>
        <button
          onClick={() => {
            setRotation(0);
            setReflection(false);
            setWord([]);
          }}
        >
          Reset square
        </button>
      </div>
      <div className="desk-output" role="status">
        <span>Current transformation</span>
        <M>{element}</M>
        <span>
          Vertex images:{" "}
          {names.map((name, i) => `${name} ↦ ${names[images[i]]}`).join(" · ")}
        </span>
        <span>Recent moves in time order: {word.join(", ") || "none"}</span>
      </div>
      <p className="desk-invariant">
        <M>{"r^4=s^2=e,\\qquad sr=r^{-1}s"}</M>
        <br />
        All moves preserve adjacency and distances. Composition applies the
        rightmost factor first; the move list records time order. Testing these
        eight symmetries illustrates the relations; the lesson justifies them.
      </p>
      <button
        className="studio-primary"
        onClick={() => open("mh2220-dihedral")}
      >
        Explain the square’s group
      </button>
    </section>
  );
}
