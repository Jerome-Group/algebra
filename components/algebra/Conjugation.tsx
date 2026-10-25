"use client";
import { groupPresentation, type GroupAction } from "./GroupPresentation";

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
    [mode, setMode] = useState<GroupAction>("conjugation"),
    [actor, setActor] = useState(1),
    [a, setA] = useState(1);
  const g = group(type, type === "S" ? 3 : n),
    presentation = groupPresentation({
      type,
      n: type === "S" ? 3 : n,
      labels: g.labels,
    }),
    action = presentation.action(mode),
    labels = presentation.elements.map((element) => element.tex),
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
            {
              value: "D",
              presentation: `$D_{${n}}$ · $${2 * n}$ elements`,
              speech: `Dihedral group D ${n}, ${2 * n} elements`,
            },
            {
              value: "S",
              presentation: "$S_3$ · $6$ elements",
              speech: "Symmetric group S 3, 6 elements",
            },
            {
              value: "Q",
              presentation: "$Q_8$ · $8$ elements",
              speech: "Quaternion group Q 8, 8 elements",
            },
            {
              value: "C",
              presentation: `$C_{${n}}$ · $${n}$ elements`,
              speech: `Cyclic group C ${n}, ${n} elements`,
            },
          ]}
        />
        <Choice
          label="Action on group"
          value={mode}
          onChange={setMode}
          options={[
            {
              value: "conjugation",
              ...presentation.action("conjugation"),
            },
            {
              value: "regular",
              ...presentation.action("regular"),
            },
          ]}
        />
      </div>
      {(type === "D" || type === "C") && (
        <div className="lab-controls">
          <Range
            label="Group parameter $n$"
            accessibleLabel="Group parameter n"
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
          options={presentation.elements.map((element) => ({
            value: element.value,
            presentation: `$${element.tex}$`,
            speech: element.speech,
          }))}
        />
      </div>
      <div className="conjugacy-orbits">
        {orbits.map((o, i) => (
          <div key={i} style={{ borderColor: palette[i] }}>
            <label>
              Orbit · <M focusable={false}>{String(o.length)}</M>{" "}
              {o.length === 1 ? "element" : "elements"}
            </label>
            <div>
              {o.map((y) => (
                <button
                  key={y}
                  onClick={() => setA(y)}
                  className={x === y ? "selected" : ""}
                  aria-label={`Select orbit element ${presentation.elements[y].speech}`}
                >
                  <M focusable={false}>{labels[y]}</M>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="lab-controls">
        <M
          block
        >{`\\left(${labels[actor % N]}\\right)\\cdot\\left(${labels[x]}\\right)=${labels[act(actor % N, x)]}`}</M>
        <M
          block
        >{`|G|=${N}=|\\operatorname{Orb}(${labels[x]})|\\,|\\operatorname{Stab}(${labels[x]})|=${orbit.length}\\cdot${stabilizer.length}`}</M>
        <M
          block
        >{`\\operatorname{Stab}(${labels[x]})=\\{${stabilizer.map((h) => labels[h]).join(",")}\\}`}</M>
        <p>
          <Prose>{action.explanation}</Prose>
        </p>
        <M block>{`G\\curvearrowright G,\\quad ${action.definition}`}</M>
        {mode === "conjugation" && (
          <M block>{`|G|=${orbits.map((o) => o.length).join("+")}`}</M>
        )}
        {presentation.convention && <M block>{presentation.convention}</M>}
        <p>
          Changing the action changes both the orbit partition and the
          stabilizers—even though the group and underlying set stay the same.
        </p>
      </div>
    </div>
  );
}
