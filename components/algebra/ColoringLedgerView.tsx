"use client";
import { dihedralElementSpeech } from "./ChoiceSpeech";
import { Choice } from "./Groups";

import type {
  ColoringConfig,
  ColoringLedger,
} from "@/lib/algebra/fixed-colorings";
import { Math as M, Prose } from "./Math";
import { matrixTex } from "@/lib/algebra/engine";
import { ColoringAxisDiagram } from "./ColoringAxisDiagram";
import { coloringCycleTypeTex, coloringElementTex } from "./ColoringLedgerText";

export function ColoringLedgerView({
  config,
  ledger,
  selected,
  setSelected,
}: {
  config: ColoringConfig;
  ledger: ColoringLedger;
  selected: number;
  setSelected: (value: number) => void;
}) {
  const active = ledger.rows[Math.min(selected, ledger.rows.length - 1)];
  const activeTex = coloringElementTex(
    config,
    Math.min(selected, ledger.rows.length - 1),
  );
  const classReadings = ledger.groups.map((group) => {
    const members = ledger.rows.flatMap((row, index) =>
      row.classId === group.classId
        ? [{ row, tex: coloringElementTex(config, index) }]
        : [],
    );
    return {
      group,
      elements: members.map(({ tex }) => tex).join(", "),
      cycleType: coloringCycleTypeTex(members[0].row.cycles),
    };
  });
  const positionName = config.kind === "cube" ? config.feature : "beads";
  return (
    <>
      <label>
        Inspect group element, currently <M focusable={false}>{activeTex}</M>
        <Choice
          label="Inspect group element"
          value={Math.min(selected, ledger.rows.length - 1)}
          onChange={(value) => setSelected(value)}
          options={ledger.rows.map((row, index) => ({
            value: index,
            presentation: `$${coloringElementTex(config, index)}$ · ${row.family}`,
            speech: `${config.kind === "cube" ? `Q subscript ${index}` : dihedralElementSpeech(index, config.size)}. ${row.family}`,
          }))}
        />
      </label>
      <div className="live-mathematics" aria-live="polite">
        <p>
          <Prose>{String.raw`$${activeTex}$ has $${active.fixedPositions}$ fixed ${positionName} but $${active.cycles.length}$ cycles, so it fixes $${config.colors}^{${active.cycles.length}}=${active.fixedColorings}$ colorings.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`Cycles on labeled positions: $${active.cycles.map((cycle) => `(${cycle.map((point) => point + 1).join(" ")})`).join(" ")}$.`}</Prose>
        </p>
        {active.matrix && (
          <p>
            <Prose>{String.raw`$${activeTex}$ is the signed-permutation matrix $${matrixTex(active.matrix!)}$.`}</Prose>
          </p>
        )}
        <p>
          <Prose>{String.raw`Fixed-coloring sum $${ledger.total}$ divided by group order $${ledger.rows.length}$ gives $${ledger.total}/${ledger.rows.length}=${ledger.orbits}$ orbits.${ledger.inventory !== null && config.kind === "polygon" ? ` With exactly $${Math.min(config.firstColorCount, config.size)}$ beads of the first color, the coefficient of $x^{${Math.min(config.firstColorCount, config.size)}}y^{${config.size - Math.min(config.firstColorCount, config.size)}}$ gives $${ledger.inventory}$ orbits.` : ""}`}</Prose>
        </p>
      </div>
      <p>
        Complete conjugacy-class fixed-point table below. Scroll the table
        horizontally at narrow widths.
      </p>
      <div className="math-table-scroll">
        <table>
          <caption>
            <Prose>
              {
                "Every conjugacy class is listed before averaging; each element fixes $q$ raised to its cycle count colorings."
              }
            </Prose>
          </caption>
          <thead>
            <tr>
              {config.kind === "cube" && <th scope="col">Rotation axis</th>}
              <th scope="col">Conjugacy class</th>
              <th scope="col">Class size</th>
              <th scope="col">Cycle type</th>
              <th scope="col">Fixed positions</th>
              <th scope="col">Fixed colorings each</th>
              <th scope="col">Class contribution</th>
            </tr>
          </thead>
          <tbody>
            {classReadings.map(({ group, elements, cycleType }) => (
              <tr key={group.classId}>
                {config.kind === "cube" && (
                  <td>
                    <ColoringAxisDiagram family={group.family} />
                    {group.family}
                  </td>
                )}
                <th scope="row">
                  <M>{elements}</M>
                </th>
                <td>
                  <M>{String(group.elements.length)}</M>
                </td>
                <td>
                  <M>{cycleType}</M>
                </td>
                <td>
                  <M>{String(group.fixedPositions)}</M>
                </td>
                <td>
                  <Prose>{String.raw`$${config.colors}^{${group.cycles}}=${group.fixedColorings}$`}</Prose>
                </td>
                <td>
                  <M>{String(group.elements.length * group.fixedColorings)}</M>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={config.kind === "cube" ? 2 : 1}>
                Total before averaging
              </th>
              <td>
                <M>{String(ledger.rows.length)}</M>
              </td>
              <td colSpan={2} />
              <td colSpan={2}>
                <M>{String(ledger.total)}</M>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
