"use client";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { Range, Choice } from "./Groups";
import { group, inverse, palette, type Lesson } from "@/lib/algebra/engine";
export function ConjugationLab({ lesson }: { lesson: Lesson }) {
  const [type, setType] = useState(
      String(lesson.parameters?.group || "D").charAt(0),
    ),
    [n, setN] = useState(
      Number(
        lesson.parameters?.n ||
          String(lesson.parameters?.group || "").slice(1) ||
          4,
      ),
    ),
    [mode, setMode] = useState("conjugation"),
    [actor, setActor] = useState(1),
    [a, setA] = useState(1);
  const g = group(type, type === "S" ? 3 : n),
    N = g.labels.length,
    x = a % N,
    act = (h: number, y: number) =>
      mode === "regular" ? g.mul(h, y) : g.mul(g.mul(h, y), inverse(g, h));
  const seen = new Set<number>(),
    orbits: number[][] = [];
  for (let i = 0; i < N; i++)
    if (!seen.has(i)) {
      const orbit = [...new Set(g.labels.map((_, h) => act(h, i)))];
      orbit.forEach((x) => seen.add(x));
      orbits.push(orbit);
    }
  const stabilizer = g.labels.map((_, h) => h).filter((h) => act(h, x) === x),
    orbit = orbits.find((o) => o.includes(x))!;
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label="Group acting on itself"
          value={type}
          onChange={(v) => {
            setType(v);
            setA(1);
          }}
          options={[
            ["D", `$D_{${n}}$ · ${2 * n} elements`],
            ["S", "$S_3$ · 6 elements"],
            ["Q", "$Q_8$ · 8 elements"],
            ["C", `$C_{${n}}$ · ${n} elements`],
          ]}
        />
        <Choice
          label="Action on group"
          value={mode}
          onChange={setMode}
          options={[
            ["conjugation", "Conjugation hxh⁻¹"],
            ["regular", "Left translation hx"],
          ]}
        />
      </div>
      {(type === "D" || type === "C") && (
        <div className="lab-controls">
          <Range
            label="Group parameter n"
            min={3}
            max={8}
            value={n}
            onChange={setN}
          />
        </div>
      )}
      <div className="lab-toolbar">
        <Choice
          label="Acting element"
          value={String(actor % N)}
          onChange={(value) => setActor(Number(value))}
          options={g.labels.map((label, index) => [
            String(index),
            `$${label}$`,
          ])}
        />
      </div>
      <div className="conjugacy-orbits">
        {orbits.map((o, i) => (
          <div key={i} style={{ borderColor: palette[i] }}>
            <label>
              Orbit · {o.length} {o.length === 1 ? "element" : "elements"}
            </label>
            <div>
              {o.map((y) => (
                <button
                  key={y}
                  onClick={() => setA(y)}
                  className={x === y ? "selected" : ""}
                >
                  <M>{g.labels[y]}</M>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="lab-controls">
        <M
          block
        >{`${g.labels[actor % N]}\\cdot ${g.labels[x]}=${g.labels[act(actor % N, x)]}`}</M>
        <M
          block
        >{`|G|=${N}=|\\operatorname{Orb}(${g.labels[x]})|\\,|\\operatorname{Stab}(${g.labels[x]})|=${orbit.length}\\cdot${stabilizer.length}`}</M>
        <M
          block
        >{`\\operatorname{Stab}(${g.labels[x]})=\\{${stabilizer.map((h) => g.labels[h]).join(",")}\\}`}</M>
        <p>
          <Prose>
            {mode === "regular"
              ? "Left translation is transitive and free. Only the identity fixes $x$, since $hx=x$ implies $h=e$."
              : "Under conjugation the stabilizer is $C_G(x)$; singleton orbits are exactly the central elements."}
          </Prose>
        </p>
        <M block>
          {mode === "regular"
            ? "G\\curvearrowright G,\\quad h\\cdot x=hx"
            : `|G|=${orbits.map((o) => o.length).join("+")}`}
        </M>
        <p>
          Changing the action changes both the orbit partition and the
          stabilizers—even though the group and underlying set stay the same.
        </p>
      </div>
    </div>
  );
}
