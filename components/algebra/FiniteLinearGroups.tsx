"use client";
import { SvgMath } from "./SvgMath";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { mod, matrixTex, cycleTex, palette } from "@/lib/algebra/engine";
export function MatrixFiniteLab() {
  const mats = Array.from({ length: 16 }, (_, i) => [
      [i & 1, (i >> 1) & 1],
      [(i >> 2) & 1, (i >> 3) & 1],
    ]).filter((m) => mod(m[0][0] * m[1][1] - m[0][1] * m[1][0], 2) === 1),
    v = [
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [index, setIndex] = useState(0),
    m = mats[index],
    p = v.map((x) =>
      v.findIndex((y) =>
        y.every((z, i) => z === mod(m[i][0] * x[0] + m[i][1] * x[1], 2)),
      ),
    ),
    pos = [
      [130, 290],
      [280, 90],
      [430, 290],
    ];
  return (
    <div>
      <div className="lab-controls">
        <M block>{"|\\mathrm{GL}_2(\\mathbb F_2)|=(2^2-1)(2^2-2)=6"}</M>
        <p>
          Choose a nonzero first column (3 choices), then a second column
          outside its span (2 choices). Act on the three nonzero vectors.
        </p>
      </div>
      <svg
        className="math-svg"
        viewBox="0 0 560 380"
        role="img"
        aria-label="GL2 over F2 acting on three nonzero vectors"
      >
        <polygon
          points="130,290 280,90 430,290"
          fill="#69dbca10"
          stroke="#3c5f70"
        />
        {v.map((x, i) => (
          <g key={i}>
            <circle
              cx={pos[p[i]][0]}
              cy={pos[p[i]][1]}
              r="25"
              fill={palette[i]}
            />
            <SvgMath
              x={pos[p[i]][0]}
              y={pos[p[i]][1] + 5}
              textAnchor="middle"
              fill="#132e3a"
            >
              {x.join(",")}
            </SvgMath>
          </g>
        ))}
      </svg>
      <div className="lab-controls">
        <div className="finite-matrices">
          {mats.map((m, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={index === i ? "active" : ""}
            >
              <M>{matrixTex(m)}</M>
            </button>
          ))}
        </div>
        <M block>{`A=${matrixTex(m)},\\quad\\pi(A)=${cycleTex(p)}`}</M>
        <p>
          <Prose>
            {
              " Only the identity fixes all three nonzero vectors, so this action is faithful. Both $\\operatorname{GL}_{2}(\\mathbb F _{2})$ and $S_{3}$ have six elements; the resulting injection is an isomorphism. "
            }
          </Prose>
        </p>
      </div>
    </div>
  );
}
