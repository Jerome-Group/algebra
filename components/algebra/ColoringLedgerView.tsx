"use client";
import type {
  ColoringConfig,
  ColoringLedger,
} from "@/lib/algebra/fixed-colorings";
import { ColoringAxisDiagram } from "./ColoringAxisDiagram";

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
  const positionName = config.kind === "cube" ? config.feature : "beads";
  return (
    <>
      <label>
        Inspect group element, currently {active.label}
        <select
          value={Math.min(selected, ledger.rows.length - 1)}
          onChange={(event) => setSelected(Number(event.target.value))}
        >
          {ledger.rows.map((row, index) => (
            <option key={index} value={index}>
              {row.label} · {row.family}
            </option>
          ))}
        </select>
      </label>
      <div className="live-mathematics" aria-live="polite">
        <p>
          {active.label} has {active.fixedPositions} fixed {positionName} but{" "}
          {active.cycles.length} cycles, so it fixes {config.colors}^
          {active.cycles.length}={active.fixedColorings} colorings.
        </p>
        <p>
          Cycles on labeled positions:{" "}
          {active.cycles
            .map((cycle) => `(${cycle.map((point) => point + 1).join(" ")})`)
            .join(" ")}
          .
        </p>
        {active.matrix && (
          <p>
            {active.label} is the signed-permutation matrix [
            {active.matrix.map((row) => row.join(", ")).join("; ")}].
          </p>
        )}
        <p>
          Fixed-coloring sum {ledger.total} ÷ group order {ledger.rows.length} ={" "}
          {ledger.orbits} orbits.
          {ledger.inventory !== null &&
            config.kind === "polygon" &&
            ` With exactly ${Math.min(config.firstColorCount, config.size)} beads of the first color, the coefficient of x^${Math.min(config.firstColorCount, config.size)}y^${config.size - Math.min(config.firstColorCount, config.size)} gives ${ledger.inventory} orbits.`}
        </p>
      </div>
      <p>
        Complete conjugacy-class fixed-point table below. Scroll the table
        horizontally at narrow widths.
      </p>
      <div className="math-table-scroll">
        <table>
          <caption>
            Every conjugacy class is listed before averaging; each element fixes
            q raised to its cycle count colorings.
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
            {ledger.groups.map((group) => (
              <tr key={group.classId}>
                {config.kind === "cube" && (
                  <td>
                    <ColoringAxisDiagram family={group.family} />
                    {group.family}
                  </td>
                )}
                <th scope="row">{group.elements.join(", ")}</th>
                <td>{group.elements.length}</td>
                <td>{group.signature}</td>
                <td>{group.fixedPositions}</td>
                <td>
                  {config.colors}^{group.cycles} = {group.fixedColorings}
                </td>
                <td>{group.elements.length * group.fixedColorings}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={config.kind === "cube" ? 2 : 1}>
                Total before averaging
              </th>
              <td>{ledger.rows.length}</td>
              <td colSpan={2} />
              <td colSpan={2}>{ledger.total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
