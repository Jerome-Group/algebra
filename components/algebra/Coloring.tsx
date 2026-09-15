"use client";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { Range, Choice } from "./Groups";
import { SvgMath } from "./SvgMath";
import { mod, palette } from "@/lib/algebra/engine";
export function ColoringLab() {
  const [n, setN] = useState(6),
    [k, setK] = useState(2),
    [ref, setRef] = useState(false),
    [bits, setBits] = useState<number[]>(Array(12).fill(0));
  const perms = Array.from({ length: ref ? 2 * n : n }, (_, a) =>
    Array.from({ length: n }, (_, i) => mod((a % n) + (a >= n ? -i : i), n)),
  );
  const cyc = (p: number[]) => {
    let c = 0;
    const seen = new Set<number>();
    for (let i = 0; i < n; i++)
      if (!seen.has(i)) {
        c++;
        let j = i;
        while (!seen.has(j)) {
          seen.add(j);
          j = p[j];
        }
      }
    return c;
  };
  const sum = perms.reduce((s, p) => s + k ** cyc(p), 0),
    orb = new Set(perms.map((p) => p.map((i) => bits[i] % k).join(","))),
    st = perms.filter((p) =>
      p.every((j, i) => bits[j] % k === bits[i] % k),
    ).length;
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label="Coloring equivalence"
          value={ref ? "bracelet" : "necklace"}
          onChange={(v) => setRef(v === "bracelet")}
          options={[
            ["necklace", "Necklaces · rotations"],
            ["bracelet", "Bracelets · rotations + reflections"],
          ]}
        />
      </div>
      <svg
        viewBox="0 0 560 400"
        className="math-svg"
        role="group"
        aria-label="Interactive colored necklace"
      >
        <circle cx="280" cy="195" r="132" fill="none" stroke="#496379" />
        {Array.from({ length: n }, (_, i) => {
          const t = -Math.PI / 2 + (i * 2 * Math.PI) / n;
          return (
            <g
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`Bead ${i + 1}, color ${(bits[i] % k) + 1}; change color`}
              onClick={() =>
                setBits((b) => b.map((x, j) => (i === j ? (x + 1) % k : x)))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setBits((b) => b.map((x, j) => (i === j ? (x + 1) % k : x)));
                }
              }}
            >
              <circle
                cx={280 + 132 * Math.cos(t)}
                cy={195 + 132 * Math.sin(t)}
                r="22"
                fill={palette[bits[i] % k]}
                stroke="#bfdde2"
              />
              <SvgMath
                x={280 + 170 * Math.cos(t)}
                y={200 + 170 * Math.sin(t)}
                textAnchor="middle"
                fill="#98adbd"
              >
                {i + 1}
              </SvgMath>
            </g>
          );
        })}
      </svg>
      <div className="lab-controls">
        <div className="two-cols">
          <Range
            label={"Beads $n$"}
            min={3}
            max={10}
            value={n}
            onChange={setN}
          />
          <Range
            label={"Labeled colors $k$"}
            min={2}
            max={5}
            value={k}
            onChange={setK}
          />
        </div>
        <p>
          Click a bead to change its color. This coloring has {orb.size}{" "}
          distinct labeled arrangements in its orbit and a stabilizer of size{" "}
          {st}.
        </p>
        <M
          block
        >{`${perms.length}=${orb.size}\\cdot${st},\\qquad\\#\\text{coloring orbits}=\\frac{${sum}}{${perms.length}}=${sum / perms.length}`}</M>
        <p>
          <Prose>
            {
              " The orbit–stabilizer equation concerns this single coloring. Burnside’s average counts all inequivalent colorings using $k$ labeled colors, with repetition allowed. It counts fixed colorings by $k$ to the number of bead cycles, not by the number of fixed beads. "
            }
          </Prose>
        </p>
      </div>
    </div>
  );
}
