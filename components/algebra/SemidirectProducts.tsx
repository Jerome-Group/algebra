"use client";
import { SvgMath } from "./SvgMath";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { Range, Choice } from "./Groups";
import { mod } from "@/lib/algebra/engine";
export function SemidirectLab() {
  const [n, setN] = useState(5),
    [a, setA] = useState(1),
    [b, setB] = useState(1),
    [c, setC] = useState(2),
    [d, setD] = useState(0),
    [twisted, setTwisted] = useState(true),
    x = mod(a + (twisted && b ? -c : c), n),
    y = mod(b + d, 2),
    rx = mod(c + (twisted && d ? -a : a), n);
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label="Product type"
          value={twisted ? "semi" : "direct"}
          onChange={(v) => setTwisted(v === "semi")}
          options={[
            ["semi", "$C_n\\rtimes C_2$ · inversion action"],
            ["direct", "$C_n\\times C_2$ · trivial action"],
          ]}
        />
      </div>
      <svg
        className="math-svg"
        viewBox="0 0 560 330"
        role="img"
        aria-label="Two layers of a semidirect product"
      >
        {[0, 1].map((layer) =>
          Array.from({ length: n }, (_, i) => (
            <g key={`${layer}-${i}`}>
              <circle
                cx={65 + (i * 430) / (n - 1)}
                cy={90 + layer * 150}
                r="22"
                fill={
                  i === x && layer === y
                    ? "#69dbca"
                    : layer
                      ? "#3d3862"
                      : "#294552"
                }
              />
              <SvgMath
                x={65 + (i * 430) / (n - 1)}
                y={95 + layer * 150}
                textAnchor="middle"
                fill={i === x && layer === y ? "#102e32" : "#becdd9"}
              >
                {i},{layer}
              </SvgMath>
            </g>
          )),
        )}
      </svg>
      <div className="lab-controls">
        <Range
          label={"Cyclic modulus $n$"}
          min={3}
          max={8}
          value={n}
          onChange={(v) => {
            setN(v);
            setA(1);
            setC(2);
          }}
        />
        <div className="two-cols">
          <Range label={"$a$"} min={0} max={n - 1} value={a} onChange={setA} />
          <Range label={"$b$"} min={0} max={1} value={b} onChange={setB} />
          <Range label={"$c$"} min={0} max={n - 1} value={c} onChange={setC} />
          <Range label={"$d$"} min={0} max={1} value={d} onChange={setD} />
        </div>
        <M
          block
        >{`(a,b)(c,d)=(a+${twisted ? "(-1)^b" : ""}c,b+d)=(${x},${y})`}</M>
        <M block>{`(c,d)(a,b)=(${rx},${y})`}</M>
        <p>
          <Prose>
            {twisted
              ? "When $b=1$, the left factor reverses the direction of the second move. The products need not agree. This is $D_n$, of order $2n$."
              : "With a trivial action, both coordinates add independently and the product is abelian."}
          </Prose>
        </p>
      </div>
    </div>
  );
}
