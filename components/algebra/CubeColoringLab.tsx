"use client";
import { useState } from "react";
import {
  fixedColoringLedger,
  type CubeFeature,
} from "@/lib/algebra/fixed-colorings";
import { ColoringLedgerView } from "./ColoringLedgerView";

const cubeFeatures: CubeFeature[] = ["vertices", "faces", "edges"];
export function CubeColoringLab() {
  const [feature, setFeature] = useState<CubeFeature>("vertices");
  const [colors, setColors] = useState(2);
  const [selected, setSelected] = useState(0);
  const config = { kind: "cube" as const, feature, colors };
  const ledger = fixedColoringLedger(config);
  return (
    <>
      <p>
        Twenty-four proper cube rotations act separately on vertices, face
        centers and edge midpoints. The chosen set is colored with labeled
        colors; repetition and unused colors are allowed.
      </p>
      <div className="lab-controls">
        <label>
          Cube feature set, currently {feature}
          <select
            value={feature}
            onChange={(event) => {
              setFeature(event.target.value as CubeFeature);
              setSelected(0);
            }}
          >
            {cubeFeatures.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
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
      </div>
      <ColoringLedgerView
        config={config}
        ledger={ledger}
        selected={selected}
        setSelected={setSelected}
      />
      <button
        onClick={() => {
          setFeature("vertices");
          setSelected(1);
        }}
      >
        Show a motion with no fixed positions but fixed colorings
      </button>
      <p>
        A face-axis rotation may fix no vertex and still fix many vertex
        colorings. The axis class table yields (q⁸+17q⁴+6q²)/24 for vertices;
        face and edge actions have different cycle ledgers. The table verifies
        finite counts; double-counting (g, coloring) proves Burnside’s lemma.
      </p>
    </>
  );
}
