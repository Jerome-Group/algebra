"use client";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { Range, Choice } from "./Groups";
import { divisors } from "@/lib/algebra/engine";
export function SylowCalculator() {
  const [N, setN] = useState(30),
    [p, setP] = useState(5);
  let q = 1;
  while (N % (q * p) === 0) q *= p;
  const candidates = q === 1 ? [1] : divisors(N / q).filter((d) => d % p === 1);
  return (
    <div className="lab-controls sylow-calculator">
      <label className="note-label">
        Sylow arithmetic for any proposed order
      </label>
      <Range
        label={"Group order $|G|$"}
        value={N}
        min={2}
        max={120}
        onChange={setN}
      />
      <Choice
        label={"Prime $p$"}
        value={String(p)}
        onChange={(v) => setP(+v)}
        options={[2, 3, 5, 7, 11].map((x) => [String(x), `$p = ${x}$`])}
      />
      <M block>{`|G|=${q}\\cdot${N / q},\\quad |P|=${q}`}</M>
      <M block>{`n_${p}\\mid ${N / q},\\quad n_${p}\\equiv1\\pmod{${p}}`}</M>
      <p>
        Necessary candidates for the number of Sylow {p}-subgroups:{" "}
        <b>{candidates.join(", ")}</b>.{" "}
        <Prose>
          {q === 1
            ? "Since $p$ does not divide $|G|$, the only Sylow $p$-subgroup is the trivial group."
            : candidates.length === 1
              ? "The subgroup is unique and therefore normal."
              : "These arithmetic constraints are necessary, not sufficient to construct a group or realize every candidate."}
        </Prose>
      </p>
    </div>
  );
}
