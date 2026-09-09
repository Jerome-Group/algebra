"use client";
import { SvgMath } from "./SvgMath";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { Range, Choice } from "./Groups";
import { mod, palette } from "@/lib/algebra/engine";
export function SquareModesLab() {
  const [r, setR] = useState(1),
    [s, setS] = useState(0),
    [v, setV] = useState([3, 1, -1, 1]),
    [component, setComponent] = useState("all");
  const mean = v.reduce((a, b) => a + b, 0) / 4,
    alt = (v[0] - v[1] + v[2] - v[3]) / 4,
    u = (v[0] - v[2]) / 2,
    w = (v[1] - v[3]) / 2,
    parts = {
      constant: [mean, mean, mean, mean],
      alternating: [alt, -alt, alt, -alt],
      contrast: [u, w, -u, -w],
      all: v,
    },
    input = parts[component as keyof typeof parts],
    p = Array.from({ length: 4 }, (_, i) => mod(r + (s ? -i : i), 4)),
    out = [0, 0, 0, 0];
  input.forEach((x, i) => (out[p[i]] = x));
  const pos = [
    [160, 80],
    [400, 80],
    [400, 320],
    [160, 320],
  ];
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label="Invariant component"
          value={component}
          onChange={setComponent}
          options={[
            ["all", "Full vector"],
            ["constant", "Constant line"],
            ["alternating", "Alternating line"],
            ["contrast", "Opposite contrasts"],
          ]}
        />
        <button onClick={() => setR(mod(r + 1, 4))}>
          <Prose>{"Apply $r$"}</Prose>
        </button>
        <button
          onClick={() => {
            setR(mod(-r, 4));
            setS(1 - s);
          }}
        >
          <Prose>{" Apply $s$ "}</Prose>
        </button>
      </div>
      <svg
        className="math-svg"
        viewBox="0 0 560 400"
        role="img"
        aria-label="Invariant patterns on four square vertices"
      >
        <polygon
          points="160,80 400,80 400,320 160,320"
          fill="#69dbca08"
          stroke="#507281"
        />
        {pos.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="22" fill={palette[i]} />
            <SvgMath x={p[0]} y={p[1] + 5} textAnchor="middle" fill="#102d38">
              {out[i]}
            </SvgMath>
            <SvgMath x={p[0]} y={p[1] + 45} textAnchor="middle" fill="#91b2c2">
              {`\\text{vertex }${i + 1}`}
            </SvgMath>
          </g>
        ))}
      </svg>
      <div className="lab-controls">
        <div className="two-cols">
          {v.map((x, i) => (
            <Range
              key={i}
              label={`Coefficient v${i + 1}`}
              value={x}
              min={-3}
              max={3}
              onChange={(x) => setV((v) => v.map((y, j) => (i === j ? x : y)))}
            />
          ))}
        </div>
        <M
          block
        >{`v=${mean}(1,1,1,1)+${alt}(1,-1,1,-1)+(${u},${w},${-u},${-w})`}</M>
        <p>
          The first line is fixed. The alternating line may change sign but
          stays a line. The two-dimensional contrast pattern changes within its
          plane. All three are invariant under every rotation and reflection,
          not merely the currently selected element.
        </p>
        <M block>
          {
            "\\mathbb R^4=V_{\\rm constant}\\oplus V_{\\rm alternating}\\oplus V_{\\rm contrast}"
          }
        </M>
        <p>
          Averaging a vector over all eight group elements projects it onto the
          constant line. The mean {mean} is unchanged by every permutation.
        </p>
      </div>
    </div>
  );
}
