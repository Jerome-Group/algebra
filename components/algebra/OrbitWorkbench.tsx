"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import {
  actionModel,
  actionPropertyGrid,
  permutationNames,
  type SymmetricAction,
} from "@/lib/algebra/foundation-labs";
import { Math as M } from "./Math";
export function OrbitWorkbench({ lesson }: { lesson: Lesson }) {
  const [action, setAction] = useState<SymmetricAction>(
      (lesson.parameters?.action as SymmetricAction) || "letters",
    ),
    [point, setPoint] = useState(Number(lesson.parameters?.point ?? 0)),
    [element, setElement] = useState(1);
  const model = actionModel(action, point);
  const label = (x: number) =>
    action === "letters" ? String(x + 1) : permutationNames[x];
  const groupSet = (entries: number[]) =>
    `{${entries.map((g) => permutationNames[g]).join(", ")}}`;
  const properties = actionPropertyGrid();
  return (
    <div className="foundation-lab">
      <M
        block
      >{`G=S_3,\\quad |G\\cdot x|\\,|G_x|=${model.orbit.length}\\cdot${model.stabilizer.length}=6`}</M>
      <label>
        Left action
        <select
          value={action}
          onChange={(event) => {
            setAction(event.target.value as SymmetricAction);
            setPoint(0);
          }}
        >
          <option value="letters">Natural action on {"{1,2,3}"}</option>
          <option value="regular">Regular action on S3: g·x=gx</option>
          <option value="conjugation">Conjugation on S3: g·x=gxg⁻¹</option>
        </select>
      </label>
      <label>
        Point x
        <select
          value={point}
          onChange={(event) => setPoint(Number(event.target.value))}
        >
          {model.points.map((x) => (
            <option key={x} value={x}>
              {label(x)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Acting element g
        <select
          value={element}
          onChange={(event) => setElement(Number(event.target.value))}
        >
          {permutationNames.map((name, g) => (
            <option key={g} value={g}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <div className="action-state" aria-label="Selected action state">
        <span>Input x: {label(point)}</span>
        <span aria-hidden="true">→</span>
        <span>Apply {permutationNames[element]}</span>
        <span aria-hidden="true">→</span>
        <span>Output g·x: {label(model.apply(element, point))}</span>
      </div>
      <div className="live-mathematics" aria-live="polite">
        <p>
          Orbit: {"{"}
          {model.orbit.map(label).join(", ")}
          {"}"}.
        </p>
        <p>Point stabilizer Gₓ: {groupSet(model.stabilizer)}.</p>
        <p>Kernel on the whole action set: {groupSet(model.kernel)}.</p>
        <p>Core of this point stabilizer: {groupSet(model.core)}.</p>
        <p>
          {model.orbit.length === model.points.length
            ? "This action is transitive."
            : "The selected orbit is smaller than the whole action set."}{" "}
          {model.kernel.length === 1
            ? "The action is faithful."
            : "The action is not faithful."}
        </p>
      </div>
      <table>
        <caption>All six elements acting on the selected point</caption>
        <thead>
          <tr>
            <th scope="col">g</th>
            <th scope="col">g·x</th>
            <th scope="col">Fixes x?</th>
          </tr>
        </thead>
        <tbody>
          {model.group.map((g) => (
            <tr key={g}>
              <th scope="row">{permutationNames[g]}</th>
              <td>{label(model.apply(g, point))}</td>
              <td>{model.apply(g, point) === point ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <caption>Same group S₃, different action properties</caption>
        <thead>
          <tr>
            <th scope="col">Action</th>
            <th scope="col">Faithful</th>
            <th scope="col">Transitive</th>
            <th scope="col">Free</th>
            <th scope="col">Regular</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((row) => (
            <tr key={row.action}>
              <th scope="row">{row.action}</th>
              {[row.faithful, row.transitive, row.free, row.regular].map(
                (holds, index) => (
                  <td key={index}>{holds ? "yes" : "no"}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={() => {
          setAction("conjugation");
          setPoint(0);
        }}
      >
        Try a fixed point with a faithful action
      </button>
      <p>
        For conjugation at identity, the stabilizer and its core are all of S3
        while the kernel on all of S3 is its trivial center. The core equals the
        kernel on the selected orbit; only for a transitive action must that be
        the kernel on the entire set. Orbit–stabilizer follows from the
        bijection gGₓ ↦ g·x.
      </p>
    </div>
  );
}
