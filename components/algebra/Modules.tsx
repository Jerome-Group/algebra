"use client";
import { SvgMath } from "./SvgMath";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { Range } from "./Groups";
import { matrixTex } from "@/lib/algebra/engine";
export function ModuleLab() {
  const [a, setA] = useState(2),
    [b, setB] = useState(1),
    [x, setX] = useState(2),
    [y, setY] = useState(1),
    [off, setOff] = useState(0);
  const m = [
      [a, off],
      [0, b],
    ],
    v = [x, y],
    w = [a * x + off * y, b * y],
    scale = Math.min(42, 175 / Math.max(4, ...w.map(Math.abs))),
    pos = (v: number[]) => [220 + v[0] * scale, 160 - v[1] * scale];
  return (
    <div>
      <div className="lab-intro">
        <M block>
          {"R=\\mathbb R[t],\\quad V=\\mathbb R^2,\\quad t\\cdot v=Tv"}
        </M>
        <p>
          <Prose>
            {
              " A polynomial acts by substitution: $f(t)\\cdot v=f(T)v$. $T$ need not be invertible. This is a ring module, even when $T$ is not a group action. "
            }
          </Prose>
        </p>
      </div>
      <svg
        className="math-svg"
        viewBox="0 0 440 320"
        role="img"
        aria-label="An upper triangular operator preserves the horizontal line; the quotient remembers height"
      >
        {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
          <g key={k}>
            <line
              x1={220 + k * scale}
              y1="20"
              x2={220 + k * scale}
              y2="300"
              stroke="#e2dfd8"
            />
            <line
              x1="20"
              y1={160 + k * scale}
              x2="420"
              y2={160 + k * scale}
              stroke="#e2dfd8"
            />
            {k !== 0 && (
              <SvgMath
                x={220 + k * scale}
                y="184"
                textAnchor="middle"
                fontSize={13}
              >
                {k}
              </SvgMath>
            )}
          </g>
        ))}
        <line
          x1="20"
          y1="160"
          x2="420"
          y2="160"
          stroke="#8858d1"
          strokeWidth="2"
        />
        <line x1="220" y1="20" x2="220" y2="300" stroke="#77727c" />
        <SvgMath x="270" y="212" fontSize={15}>
          {"W=\\operatorname{span}(1,0)"}
        </SvgMath>
        {[v, w].map((p, i) => (
          <g key={i}>
            <line
              x1="220"
              y1="160"
              x2={pos(p)[0]}
              y2={pos(p)[1]}
              stroke={i ? "#ee502e" : "#171827"}
              strokeWidth="3"
            />
            <circle
              cx={pos(p)[0]}
              cy={pos(p)[1]}
              r="5"
              fill={i ? "#ee502e" : "#171827"}
            />
            <SvgMath
              x={Math.min(pos(p)[0] + 8, 410)}
              y={pos(p)[1] + (i ? 30 : -14)}
              fontSize={20}
              textAnchor={pos(p)[0] > 310 ? "end" : "start"}
            >{`${i ? "Tv" : "v"}=(${p.join(",")})`}</SvgMath>
          </g>
        ))}
      </svg>
      <div className="lab-controls">
        <div className="three-cols">
          <Range
            label={"$T_{11}$"}
            min={-2}
            max={2}
            value={a}
            onChange={setA}
          />
          <Range
            label={"$T_{12}$"}
            min={-2}
            max={2}
            value={off}
            onChange={setOff}
          />
          <Range
            label={"$T_{22}$"}
            min={-2}
            max={2}
            value={b}
            onChange={setB}
          />
        </div>
        <div className="two-cols">
          <Range
            label={"Vector $x$"}
            min={-2}
            max={2}
            value={x}
            onChange={setX}
          />
          <Range
            label={"Vector $y$"}
            min={-2}
            max={2}
            value={y}
            onChange={setY}
          />
        </div>
        <M
          block
        >{`T=${matrixTex(m)},\\quad Tv=${matrixTex(w.map((x) => [x]))}`}</M>
        <p>
          <Prose>
            {
              " The x-axis $W$ is invariant because $T(x,0)=(ax,0)$. A quotient class modulo $W$ remembers only $y$; the induced operator on $V/W$ is multiplication by "
            }
          </Prose>
          {b}
          <Prose>
            {
              ". Change $T_{12}$: it changes the horizontal output while leaving the quotient action unchanged. "
            }
          </Prose>
        </p>
      </div>
    </div>
  );
}
