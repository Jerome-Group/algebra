"use client";
import { Choice } from "./Groups";

import { useState } from "react";
import { fixedColoringLedger } from "@/lib/algebra/fixed-colorings";
import { ColoringLedgerView } from "./ColoringLedgerView";
import { Math as M, Prose } from "./Math";

export function PolygonColoringLab({ lessonId }: { lessonId: string }) {
  const [size, setSize] = useState(
    lessonId === "mh2220-burnside" || lessonId === "mh2220-cycle-index" ? 3 : 6,
  );
  const [colors, setColors] = useState(2);
  const [reflections, setReflections] = useState(
    lessonId === "mh2220-necklaces",
  );
  const [firstColorCount, setFirstColorCount] = useState(2);
  const [selected, setSelected] = useState(0);
  const config = {
    kind: "polygon" as const,
    size,
    colors,
    reflections,
    firstColorCount,
  };
  const ledger = fixedColoringLedger(config);
  return (
    <>
      <p>
        <Prose>{`The acting group permutes $${size}$ bead positions. A coloring is fixed exactly when it is constant on each permutation cycle. Colors are labeled and may be unused.`}</Prose>
      </p>
      <div className="lab-controls">
        <label>
          <Prose
            focusable={false}
          >{`Bead positions $n$, currently $${size}$`}</Prose>
          <Choice
            label="Bead positions n"
            value={size}
            onChange={(value) => {
              setSize(value);
              setSelected(0);
            }}
            options={[3, 4, 5, 6, 8].map((value) => ({
              value: value,
              presentation: `$${value}$ beads`,
              speech: `${value} beads`,
            }))}
          />
        </label>
        <label>
          Equivalence group, currently{" "}
          {reflections ? "rotations and reflections" : "rotations"}{" "}
          <M focusable={false}>{`${reflections ? "D" : "C"}_{${size}}`}</M>
          <Choice
            label={"Equivalence group"}
            value={reflections ? "dihedral" : "cyclic"}
            onChange={(value) => {
              setReflections(value === "dihedral");
              setSelected(0);
            }}
            options={[
              {
                value: "cyclic",
                presentation: "Rotations $C_n$ · necklaces",
                speech: "Rotations, cyclic group C n, necklaces",
              },
              {
                value: "dihedral",
                presentation: "Rotations and reflections $D_n$ · bracelets",
                speech:
                  "Rotations and reflections, dihedral group D n, bracelets",
              },
            ]}
          />
        </label>
        <label>
          <Prose
            focusable={false}
          >{`Labeled colors $q$, currently $${colors}$`}</Prose>
          <Choice
            label="Labeled colors q"
            value={colors}
            onChange={(value) => setColors(value)}
            options={[2, 3, 4].map((value) => ({
              value: value,
              presentation: `$${value}$ colors`,
              speech: `${value} colors`,
            }))}
          />
        </label>
        {colors === 2 && (
          <label>
            Inventory: beads of first color, currently{" "}
            <M focusable={false}>{String(Math.min(firstColorCount, size))}</M>
            <Choice
              label={"Inventory: beads of first color"}
              value={Math.min(firstColorCount, size)}
              onChange={(value) => setFirstColorCount(value)}
              options={Array.from(
                { length: size + 1 },
                (_, value) => value,
              ).map((value) => ({
                value: value,
                presentation: `$${value}$`,
                speech: String(value),
              }))}
            />
          </label>
        )}
      </div>
      <ColoringLedgerView
        config={config}
        ledger={ledger}
        selected={selected}
        setSelected={setSelected}
      />
      <button
        onClick={() => {
          setSize(6);
          setReflections(false);
          setSelected(1);
        }}
      >
        Show a motion with no fixed positions but fixed colorings
      </button>
      <p>
        <Prose>{String.raw`A nonidentity rotation may fix no bead and still fix colorings: assign one color per cycle. Naive division by the group order assumes every coloring orbit has full size. The table verifies this finite action; double-counting $(g,\text{coloring})$ proves the general formula.`}</Prose>
      </p>
    </>
  );
}
