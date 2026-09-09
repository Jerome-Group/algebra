"use client";
import { SvgMath } from "./SvgMath";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { Range, Choice } from "./Groups";
import { mod } from "@/lib/algebra/engine";
export function QuadraticLab() {
  const [D, setD] = useState(-3),
    [a, setA] = useState(1),
    [b, setB] = useState(1),
    [full, setFull] = useState(true);
  const half = mod(D, 4) === 1 && full,
    wx = half ? 0.5 : 0,
    wy = Math.sqrt(-D) / (half ? 2 : 1),
    re = a + b * wx,
    im = b * wy,
    norm = a * a + (half ? a * b + ((1 - D) * b * b) / 4 : -D * b * b),
    trace = 2 * a + (half ? b : 0),
    scale = Math.min(29, 155 / Math.max(1, Math.abs(im)));
  const omega = half ? `\\frac{1+\\sqrt{${D}}}{2}` : `\\sqrt{${D}}`;
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label={"Quadratic radicand $D$"}
          value={String(D)}
          onChange={(v) => setD(+v)}
          options={[-1, -2, -3, -5, -7].map((d) => [String(d), `$D = ${d}$`])}
        />
        <Choice
          label="Lattice ring"
          value={full ? "integers" : "naive"}
          onChange={(v) => setFull(v === "integers")}
          options={[
            ["integers", "Full ring of integers"],
            ["naive", "$\\mathbb Z[\\sqrt D]$ comparison"],
          ]}
        />
      </div>
      <svg
        className="math-svg"
        viewBox="0 0 560 400"
        role="img"
        aria-label="Imaginary quadratic integer lattice"
      >
        <line x1="20" y1="200" x2="540" y2="200" stroke="#466173" />
        <line x1="280" y1="20" x2="280" y2="380" stroke="#466173" />
        {Array.from({ length: 17 }, (_, i) =>
          Array.from({ length: 13 }, (_, j) => {
            const x = i - 8,
              y = j - 6,
              px = 280 + (x + y * wx) * scale,
              py = 200 - y * wy * scale;
            if (px < 15 || px > 545 || py < 20 || py > 380) return null;
            return (
              <circle
                key={`${i}-${j}`}
                cx={px}
                cy={py}
                r="3"
                fill={half && y % 2 !== 0 ? "#a7a1ff" : "#628f9d"}
              />
            );
          }),
        )}
        <line
          x1="280"
          y1="200"
          x2={280 + re * scale}
          y2={200 - im * scale}
          stroke="#69dbca"
          strokeWidth="3"
        />
        <circle
          cx={280 + re * scale}
          cy={200 - im * scale}
          r="8"
          fill="#69dbca"
        />
        <SvgMath x={292 + re * scale} y={194 - im * scale} fill="#69dbca">
          z
        </SvgMath>
        <circle
          cx={280 + re * scale}
          cy={200 + im * scale}
          r="6"
          fill="#e2bd78"
        />
        <SvgMath x={292 + re * scale} y={214 + im * scale} fill="#e2bd78">
          {"\\bar z"}
        </SvgMath>
      </svg>
      <div className="lab-controls">
        <div className="two-cols">
          <Range
            label={"Coefficient $a$"}
            min={-3}
            max={3}
            value={a}
            onChange={setA}
          />
          <Range
            label={"Coefficient $b$"}
            min={-3}
            max={3}
            value={b}
            onChange={setB}
          />
        </div>
        <M block>{`z=a+b\\omega,\\quad\\omega=${omega}`}</M>
        <M block>{`\\operatorname{Tr}(z)=${trace},\\qquad N(z)=${norm}`}</M>
        <p>
          <Prose>
            {half
              ? "Alternate rows shift by half a unit. The purple points are algebraic integers missing from $\\mathbb Z[\\sqrt D]$."
              : "These points are integer combinations of $1$ and $\\sqrt D$."}
          </Prose>
          <Prose>
            {
              " For squarefree $D\\equiv1\\pmod4$, use $\\omega=(1+\\sqrt D)/2$; otherwise use $\\sqrt D$. The picture covers imaginary quadratic fields, $D<0$."
            }
          </Prose>
        </p>
      </div>
    </div>
  );
}
