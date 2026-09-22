"use client";
import { useState } from "react";
import { fixedColoringLedger } from "@/lib/algebra/fixed-colorings";
import { ColoringLedgerView } from "./ColoringLedgerView";

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
        The acting group permutes {size} bead positions. A coloring is fixed
        exactly when it is constant on each permutation cycle. Colors are
        labeled and may be unused.
      </p>
      <div className="lab-controls">
        <label>
          Bead positions n, currently {size}
          <select
            value={size}
            onChange={(event) => {
              setSize(Number(event.target.value));
              setSelected(0);
            }}
          >
            {[3, 4, 5, 6, 8].map((value) => (
              <option key={value} value={value}>
                {value} beads
              </option>
            ))}
          </select>
        </label>
        <label>
          Equivalence group, currently{" "}
          {reflections ? "rotations and reflections" : "rotations"}
          <select
            value={reflections ? "dihedral" : "cyclic"}
            onChange={(event) => {
              setReflections(event.target.value === "dihedral");
              setSelected(0);
            }}
          >
            <option value="cyclic">Rotations Cₙ · necklaces</option>
            <option value="dihedral">
              Rotations and reflections Dₙ · bracelets
            </option>
          </select>
        </label>
        <label>
          Labeled colors q, currently {colors}
          <select
            value={colors}
            onChange={(event) => setColors(Number(event.target.value))}
          >
            {[2, 3, 4].map((value) => (
              <option key={value} value={value}>
                {value} colors
              </option>
            ))}
          </select>
        </label>
        {colors === 2 && (
          <label>
            Inventory: beads of first color, currently{" "}
            {Math.min(firstColorCount, size)}
            <select
              value={Math.min(firstColorCount, size)}
              onChange={(event) =>
                setFirstColorCount(Number(event.target.value))
              }
            >
              {Array.from({ length: size + 1 }, (_, value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
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
        A nonidentity rotation may fix no bead and still fix colorings: assign
        one color per cycle. Naive division by the group order assumes every
        coloring orbit has full size. The table verifies this finite action;
        double-counting (g, coloring) proves the general formula.
      </p>
    </>
  );
}
