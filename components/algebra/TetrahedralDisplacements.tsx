"use client";
import { useId, useState } from "react";
import {
  tetrahedralDisplacement,
  type DisplacementKind,
  type SpatialVector,
} from "@/lib/algebra/tetrahedral-displacements";
import { Diagram } from "./Diagram";
import { Math as M, Prose } from "./Math";
import { SvgMath } from "./SvgMath";

const choices: readonly {
  kind: DisplacementKind;
  label: string;
  formula: string;
}[] = [
  { kind: "translation", label: "Translate", formula: String.raw`u_i=(1,0,0)` },
  {
    kind: "rotation",
    label: "Infinitesimal rotation",
    formula: String.raw`u_i=(1,0,0)\times r_i`,
  },
  {
    kind: "breathing",
    label: "Uniform breathing strain",
    formula: String.raw`u_i=r_i`,
  },
  {
    kind: "shear",
    label: "Symmetric shear strain",
    formula: String.raw`u_i=(r_{iy},r_{ix},0)`,
  },
];
const project = ([x, y, z]: SpatialVector) => [
  280 + 100 * (x - 0.45 * y),
  250 + 70 * (0.5 * x + y - 0.8 * z),
];

export function TetrahedralDisplacements() {
  const [kind, setKind] = useState<DisplacementKind>("translation");
  const state = tetrahedralDisplacement(kind);
  const formula =
    choices.find((choice) => choice.kind === kind)?.formula ??
    choices[0].formula;
  return (
    <section
      className="tetrahedral-displacements"
      aria-label="Tetrahedral displacement and edge-extension model"
    >
      <h3>Move the masses, then inspect every spring</h3>
      <p>
        <Prose>
          {
            "These are the source tetrahedron's actual vertices, using $a=1$. A displacement assigns one vector $u_i$ to each vertex $r_i$."
          }
        </Prose>
      </p>
      <div
        className="lab-toolbar"
        role="group"
        aria-label="Displacement pattern"
      >
        {choices.map((choice) => (
          <button
            key={choice.kind}
            aria-pressed={kind === choice.kind}
            onClick={() => setKind(choice.kind)}
          >
            {choice.label}
          </button>
        ))}
      </div>
      <M block>{formula}</M>
      <div className="two-cols">
        <figure>
          <TetrahedralDisplacementDrawing kind={kind} />
          <figcaption>
            <Prose>
              {
                "Grey lines are the equilibrium edges. Rust arrows show $0.35u_i$ in this projection. This is a displacement drawing, not a time simulation."
              }
            </Prose>
          </figcaption>
        </figure>
        <div>
          <table aria-label="Actual vertex coordinates and displacement vectors">
            <thead>
              <tr>
                <th scope="col">Vertex</th>
                <th scope="col" aria-label="Equilibrium position">
                  <M focusable={false}>{"r_i"}</M>
                </th>
                <th scope="col" aria-label="Displacement">
                  <M focusable={false}>{"u_i"}</M>
                </th>
              </tr>
            </thead>
            <tbody>
              {state.vertices.map((r, i) => (
                <tr key={i}>
                  <th scope="row" aria-label={`Vertex ${i + 1}`}>
                    <M focusable={false}>{`r_{${i + 1}}`}</M>
                  </th>
                  <td>
                    <M focusable={false}>{`(${r.join(",")})`}</M>
                  </td>
                  <td>
                    <M focusable={false}>{`(${state.vectors[i].join(",")})`}</M>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <M
            block
          >{String.raw`e_{ij}=\frac{(r_j-r_i)\cdot(u_j-u_i)}{2\sqrt2}`}</M>
          <table aria-label="First-order spring extensions">
            <thead>
              <tr>
                <th scope="col">Edge</th>
                <th scope="col">First-order extension</th>
              </tr>
            </thead>
            <tbody>
              {state.edges.map(({ i, j, numerator }) => (
                <tr key={`${i}-${j}`}>
                  <th scope="row" aria-label={`Edge ${i + 1} to ${j + 1}`}>
                    <M focusable={false}>{`${i + 1},${j + 1}`}</M>
                  </th>
                  <td>
                    <M focusable={false}>
                      {numerator === 0 ? "0" : `\\frac{${numerator}}{2\\sqrt2}`}
                    </M>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="live-mathematics" aria-live="polite">
        <p>
          {state.edges.every(({ numerator }) => numerator === 0)
            ? "Every first-order extension vanishes for this rigid displacement."
            : "Some first-order extensions are nonzero. This strain is outside the rigid-motion kernel."}
        </p>
        <M
          block
        >{String.raw`\underbrace{\mathcal D}_{12}=\underbrace{\mathcal T}_{3}\oplus\underbrace{\mathcal R}_{3}\oplus\underbrace{\mathcal I}_{6}`}</M>
        <p>
          The reading proves the decomposition and the absence of extra zero
          modes. These selected patterns illustrate that proof for equal masses,
          identical central springs, free boundaries and zero prestress.
        </p>
      </div>
    </section>
  );
}

export function TetrahedralDisplacementDrawing({
  kind,
}: {
  kind: DisplacementKind;
}) {
  const state = tetrahedralDisplacement(kind);
  const arrow = useId();
  return (
    <Diagram
      viewBox="0 0 560 420"
      role="img"
      aria-label="Tetrahedron with selected displacement arrows"
    >
      <defs>
        <marker
          id={arrow}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M0 0L8 4L0 8Z" fill="#a43c1f" />
        </marker>
      </defs>
      {state.edges.map(({ i, j }) => {
        const p = project(state.vertices[i]),
          q = project(state.vertices[j]);
        return (
          <line
            key={`${i}-${j}`}
            x1={p[0]}
            y1={p[1]}
            x2={q[0]}
            y2={q[1]}
            stroke="#8b8177"
            strokeWidth="2"
          />
        );
      })}
      {state.vertices.map((r, i) => {
        const p = project(r),
          u = state.vectors[i];
        const moved: SpatialVector = [
          r[0] + 0.35 * u[0],
          r[1] + 0.35 * u[1],
          r[2] + 0.35 * u[2],
        ];
        const q = project(moved);
        return (
          <g key={i}>
            <line
              x1={p[0]}
              y1={p[1]}
              x2={q[0]}
              y2={q[1]}
              stroke="#a43c1f"
              strokeWidth="3"
              markerEnd={`url(#${arrow})`}
            />
            <circle cx={p[0]} cy={p[1]} r="8" fill="#252b40" />
            <SvgMath
              x={p[0]}
              y={p[1] + 33}
              textAnchor="middle"
            >{`r_{${i + 1}}`}</SvgMath>
          </g>
        );
      })}
    </Diagram>
  );
}
