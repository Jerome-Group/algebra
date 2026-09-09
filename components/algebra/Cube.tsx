"use client";
import { useEffect, useRef, useState } from "react";
import {
  cube,
  I,
  mm,
  mv,
  det,
  permutation,
  cycles,
  cycleTex,
  matrixTex,
  points,
  vertices,
  edges,
  palette,
  type Mat,
  type ActionSet,
  type Lesson,
} from "@/lib/algebra/engine";
import { Math as M } from "./Math";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Move3D } from "lucide-react";
export function CubeScene({
  matrix,
  set,
  selected,
  onSelect,
}: {
  matrix: Mat;
  set: ActionSet;
  selected: number;
  onSelect: (i: number) => void;
}) {
  const [yaw, setYaw] = useState(0.62),
    [pitch, setPitch] = useState(-0.38),
    [zoom, setZoom] = useState(1);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const rotate = (v: number[]) => {
    const x = Math.cos(yaw) * v[0] + Math.sin(yaw) * v[2],
      z = -Math.sin(yaw) * v[0] + Math.cos(yaw) * v[2];
    return [
      x,
      Math.cos(pitch) * v[1] - Math.sin(pitch) * z,
      Math.sin(pitch) * v[1] + Math.cos(pitch) * z,
    ];
  };
  const project = (v: number[]) => {
    const q = rotate(v),
      scale = (650 * zoom) / (7 - q[2]);
    return [280 + scale * q[0], 192 - scale * q[1], q[2]];
  };
  const transformed = vertices.map((v) => mv(matrix, v));
  const faceIndices = [
    [0, 1, 3, 2],
    [4, 6, 7, 5],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 5, 7, 3],
  ];
  const faceColors = [
    "#3f93aa",
    "#71deba",
    "#5393a3",
    "#86d6c5",
    "#6eb5c2",
    "#3c8999",
  ];
  const line = (
    v: number[],
    w: number[],
    color: string,
    dash = false,
    key?: number | string,
  ) => {
    const p = project(v),
      q = project(w);
    return (
      <line
        key={key}
        x1={p[0]}
        y1={p[1]}
        x2={q[0]}
        y2={q[1]}
        stroke={color}
        strokeWidth={dash ? 1 : 1.5}
        strokeDasharray={dash ? "4 5" : undefined}
      />
    );
  };
  return (
    <div className="cube-scene vector-scene">
      <svg
        viewBox="0 0 560 400"
        role="img"
        aria-label="Interactive three-dimensional cube projection. Drag to orbit the camera."
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, px: yaw, py: pitch };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current) {
            setYaw(drag.current.px + (e.clientX - drag.current.x) * 0.008);
            setPitch(
              Math.max(
                -1.4,
                Math.min(
                  1.4,
                  drag.current.py + (e.clientY - drag.current.y) * 0.006,
                ),
              ),
            );
          }
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        style={{ touchAction: "none", cursor: "grab" }}
      >
        <defs>
          <radialGradient id="scene-glow">
            <stop offset="0" stopColor="#1e3c4a" />
            <stop offset="1" stopColor="#111e2b" />
          </radialGradient>
        </defs>
        <rect width="560" height="400" fill="url(#scene-glow)" />
        {Array.from({ length: 15 }, (_, i) => {
          const x = (i - 7) * 0.5;
          return (
            <g key={i}>
              {line([x, -1.6, -3.5], [x, -1.6, 3.5], "#29414f")}
              {line([-3.5, -1.6, x], [3.5, -1.6, x], "#29414f")}
            </g>
          );
        })}
        {[
          [2.2, 0, 0],
          [0, 2.2, 0],
          [0, 0, 2.2],
        ].map((v, i) => {
          const p = project(v);
          return (
            <g key={i}>
              {line([0, 0, 0], v, ["#98696e", "#6b947b", "#65879b"][i])}
              <text
                x={p[0] + 7}
                y={p[1] - 3}
                fill={["#b9888d", "#83b598", "#79a1b8"][i]}
                fontSize="12"
              >
                {["x", "y", "z"][i]}
              </text>
            </g>
          );
        })}
        {edges.map((e, i) => line(e.v, e.w, "#486775", true, i))}
        {faceIndices
          .map((f, i) => ({
            f,
            i,
            z: f.reduce((s, j) => s + project(transformed[j])[2], 0) / 4,
          }))
          .sort((a, b) => a.z - b.z)
          .map(({ f, i }) => (
            <polygon
              key={i}
              points={f
                .map((j) => project(transformed[j]).slice(0, 2).join(","))
                .join(" ")}
              fill={faceColors[i]}
              fillOpacity=".12"
              stroke="#88d8c6"
              strokeWidth="1.4"
            />
          ))}
        {set === "diagonals" &&
          points.diagonals.map((v, i) => {
            const p = mv(matrix, v);
            return (
              <g key={i} opacity={selected === i ? 1 : 0.48}>
                {line(
                  p,
                  p.map((x) => -x),
                  palette[i],
                )}
              </g>
            );
          })}
        {points[set]
          .map((v, i) => ({
            v:
              set === "diagonals"
                ? points.diagonals[permutation(matrix, "diagonals")[i]]
                : mv(matrix, v),
            i,
          }))
          .sort((a, b) => project(a.v)[2] - project(b.v)[2])
          .map(({ v, i }) => {
            const p = project(v),
              q = project(v.map((x) => x * 1.16));
            return (
              <g
                key={i}
                role="button"
                tabIndex={0}
                aria-label={`Follow ${set} ${i + 1}`}
                onClick={() => onSelect(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelect(i);
                }}
              >
                <circle
                  cx={p[0]}
                  cy={p[1]}
                  r={i === selected ? 8 : 5.5}
                  fill={palette[i % 12]}
                  stroke={i === selected ? "#edfff8" : "#17333b"}
                  strokeWidth="2"
                />
                <text
                  x={q[0]}
                  y={q[1] + 5}
                  fill={palette[i % 12]}
                  textAnchor="middle"
                  fontWeight="600"
                  fontSize="14"
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
      </svg>
      <span className="scene-hint">
        <Move3D size={14} /> Drag to orbit · select a label
      </span>
      <div className="camera-controls">
        <button
          title="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.55, z - 0.15))}
        >
          −
        </button>
        <button
          title="Reset camera"
          onClick={() => {
            setYaw(0.62);
            setPitch(-0.38);
            setZoom(1);
          }}
        >
          <RotateCcw size={12} />
        </button>
        <button
          title="Zoom in"
          onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
        >
          +
        </button>
      </div>
    </div>
  );
}
export default function Cube({ lesson }: { lesson: Lesson }) {
  const [index, setIndex] = useState(0),
    [set, setSet] = useState<ActionSet>(
      (lesson.parameters?.object as ActionSet) || "vertices",
    ),
    [selected, setSelected] = useState(0),
    [rotOnly, setRotOnly] = useState(
      lesson.parameters?.orientation === "rotations",
    ),
    [view, setView] = useState("all"),
    [colors, setColors] = useState(3);
  const el = cube[index],
    p = permutation(el.matrix, set),
    G = cube.filter((x) => !rotOnly || det(x.matrix) === 1),
    stab = G.filter((x) => permutation(x.matrix, set)[selected] === selected),
    kernel = G.filter((x) =>
      permutation(x.matrix, set).every((y, i) => y === i),
    );
  const orb = [...new Set(G.map((g) => permutation(g.matrix, set)[selected]))];
  const cts = new Map<number, number>();
  for (const g of G) {
    const c = cycles(permutation(g.matrix, set)).length;
    cts.set(c, (cts.get(c) || 0) + 1);
  }
  const colorings =
    G.reduce(
      (a, g) => a + colors ** cycles(permutation(g.matrix, set)).length,
      0,
    ) / G.length;
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setIndex(d.element);
      setSet(d.set);
      if (det(cube[d.element].matrix) < 0) setRotOnly(false);
      setSelected(0);
    };
    window.addEventListener("algebra-cube-config", handler);
    return () => window.removeEventListener("algebra-cube-config", handler);
  }, []);
  const apply = (name: string) => {
    const g = cube.find((c) => c.word.length === 1 && c.word[0] === name)!;
    setIndex(
      cube.findIndex(
        (c) =>
          JSON.stringify(c.matrix) === JSON.stringify(mm(g.matrix, el.matrix)),
      ),
    );
  };
  return (
    <div className="cube-lab">
      <div className="lab-toolbar">
        <Select
          value={set}
          onValueChange={(v) => {
            setSet(v as ActionSet);
            setSelected(0);
          }}
        >
          <SelectTrigger aria-label="Action set">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(points).map((k) => (
              <SelectItem key={k} value={k}>
                {points[k as ActionSet].length}{" "}
                {k === "mixed" ? "vertices + faces" : k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={rotOnly ? "rotations" : "full"}
          onValueChange={(v) => {
            setRotOnly(v === "rotations");
            setIndex(0);
          }}
        >
          <SelectTrigger aria-label="Cube group">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Full group · 48</SelectItem>
            <SelectItem value="rotations">Rotations · 24</SelectItem>
          </SelectContent>
        </Select>
        <button
          className="icon-button"
          title="Reset transformation"
          onClick={() => setIndex(0)}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <CubeScene
        matrix={el.matrix}
        set={set}
        selected={selected}
        onSelect={setSelected}
      />
      <div className="cube-under">
        <div className="generator-row">
          <span>Apply generator</span>
          {["A", "B", ...(!rotOnly ? ["J"] : [])].map((g) => (
            <button key={g} onClick={() => apply(g)}>
              {g === "A"
                ? "A · rotate x"
                : g === "B"
                  ? "B · rotate z"
                  : "J · invert"}
            </button>
          ))}
        </div>
        <div className="exact-row">
          <div>
            <label>Current transformation</label>
            <M
              block
            >{`Q=${el.word.join("\\,") || "I"}=${matrixTex(el.matrix)}`}</M>
          </div>
          <div>
            <label>Induced permutation</label>
            <M block>{`\\pi_X(Q)=${cycleTex(p)}`}</M>
            <span>
              det Q = {det(el.matrix)} · {cycles(p).length} cycles
            </span>
          </div>
        </div>
        <div className="point-row">
          <label>Follow point</label>
          {points[set].map((_, i) => (
            <button
              key={i}
              className={selected === i ? "selected" : ""}
              style={
                { "--point-color": palette[i % 12] } as React.CSSProperties
              }
              onClick={() => setSelected(i)}
            >
              {i + 1}
              <span>→{p[i] + 1}</span>
            </button>
          ))}
        </div>
        <div className="stat-strip">
          <div>
            <strong>{G.length}</strong>
            <span>|G|</span>
          </div>
          <div>
            <strong>{orb.length}</strong>
            <span>|Orb({selected + 1})|</span>
          </div>
          <div>
            <strong>{stab.length}</strong>
            <span>|Stab({selected + 1})|</span>
          </div>
          <div>
            <strong>{kernel.length}</strong>
            <span>|ker π|</span>
          </div>
        </div>
        <p className="lab-explain">
          {set === "mixed"
            ? `The selected point lies in an orbit of size ${orb.length}. Vertices and faces form two separate orbits, so the action is faithful but not transitive.`
            : `Every ${set === "diagonals" ? "unoriented diagonal" : set.slice(0, -1)} is reachable.`}{" "}
          Each destination in this orbit is reached by exactly {stab.length}{" "}
          group elements:{" "}
          <M>{`${G.length}=${orb.length}\\cdot ${stab.length}`}</M>.{" "}
          {set === "diagonals" && !rotOnly
            ? "Inversion fixes all four diagonal lines, so the kernel is {I, −I}."
            : "Only the identity fixes every point simultaneously."}
        </p>
        <div className="filter-row">
          <span>Explore the elements</span>
          {["all", "stabilizer", "kernel"].map((x) => (
            <button
              key={x}
              onClick={() => setView(x)}
              className={view === x ? "active" : ""}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="element-grid">
          {cube.map((x, i) => {
            const activeG = G.includes(x);
            if (!activeG) return null;
            const active =
              view === "all" ||
              (view === "stabilizer" ? stab : kernel).includes(x);
            return (
              <button
                key={i}
                disabled={!active}
                className={index === i ? "active" : ""}
                onClick={() => setIndex(i)}
                title={`${x.word.join(" ") || "I"}, determinant ${det(x.matrix)}`}
              >
                {x.word.join("") || "I"}
              </button>
            );
          })}
        </div>
        <details>
          <summary>Count colorings with Burnside’s lemma</summary>
          <label className="slider-label">
            Labeled colors k <b>{colors}</b>
          </label>
          <Slider
            aria-label="Number of colors"
            min={1}
            max={6}
            step={1}
            value={[colors]}
            onValueChange={(v) => setColors(v[0])}
          />
          <M
            block
          >{`\\#(\\{1,\\ldots,k\\}^X/G)=\\frac{1}{${G.length}}\\sum_{g\\in G}k^{c(g)}`}</M>
          <p>
            For {colors} colors on {set}, there are{" "}
            <strong>{colorings.toLocaleString()} inequivalent colorings</strong>
            . Repeated colors are allowed. A coloring fixed by g must be
            constant on every cycle.
          </p>
          <div className="cycle-distribution">
            {[...cts]
              .sort((a, b) => b[0] - a[0])
              .map(([c, n]) => (
                <span key={c}>
                  {n} elements × {c} cycles
                </span>
              ))}
          </div>
        </details>
        <details open={lesson.id === "representations-actions-modules"}>
          <summary>From this action to a permutation representation</summary>
          <p>
            Attach one basis vector eᵢ to each object. The action permutes
            coefficients by <M>{"P_Qe_i=e_{\\pi(Q)(i)}"}</M>. This
            representation has dimension {p.length}; the geometric matrix Q has
            dimension 3.
          </p>
          <M
            block
          >{`P_Q=${matrixTex(p.map((_, i) => p.map((j) => (j === i ? 1 : 0))))}`}</M>
          <M
            block
          >{`\\chi_{\\rm perm}(Q)=\\#\\operatorname{Fix}_X(Q)=${p.filter((x, i) => x === i).length},\\quad\\operatorname{tr}Q=${el.matrix[0][0] + el.matrix[1][1] + el.matrix[2][2]}`}</M>
          <p>
            These are different representations of the same group. A permutation
            character counts fixed basis labels; the geometric trace measures
            the action on ambient coordinates.
          </p>
        </details>
        <details>
          <summary>Generators and composition convention</summary>
          <p>
            Column vectors; AB applies B first. Every button left-multiplies Q.
            The matrix product is exact; camera movement is independent of the
            group action.
          </p>
          <M block>{`A=${matrixTex([
            [1, 0, 0],
            [0, 0, -1],
            [0, 1, 0],
          ])},\\quad B=${matrixTex([
            [0, -1, 0],
            [1, 0, 0],
            [0, 0, 1],
          ])}`}</M>
          <M block>{"J=-I_3,\\qquad A^4=B^4=J^2=I,\\quad JQ=QJ"}</M>
          <p>
            A and B generate all 24 rotations. Adjoining J yields 48 symmetries.
            Determinant −1 includes inversion and rotoreflections, not only
            plane reflections.
          </p>
        </details>
      </div>
    </div>
  );
}
