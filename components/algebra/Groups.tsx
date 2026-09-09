"use client";
import { SvgMath } from "./SvgMath";
import { useId, useMemo, useState } from "react";
import {
  group,
  closure,
  cosets,
  order,
  inverse,
  subgroups,
  normal,
  palette,
  mod,
  gcd,
  cycles,
  cycleTex,
  type Lesson,
} from "@/lib/algebra/engine";
import { Math as M, Prose } from "./Math";
import { useLaboratoryControl } from "./LaboratoryControls";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  const id = useId();
  useLaboratoryControl(id, { label, value, options, set: onChange });
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, t]) => (
          <SelectItem key={v} value={v}>
            <Prose>{t}</Prose>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Range({
  label,
  value,
  min,
  max,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  const id = useId();
  useLaboratoryControl(id, {
    label,
    value,
    min,
    max,
    step,
    set: (v) => onChange(Number(v)),
  });
  return (
    <div className="range-control">
      <label>
        <Prose>{label}</Prose>
        <strong>
          <M>{String(value)}</M>
        </strong>
      </label>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}
const ringPoints = (n: number, r = 155, cx = 280, cy = 210) =>
  Array.from({ length: n }, (_, i) => [
    cx + r * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / n),
    cy + r * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / n),
  ]);
export function GroupLab({ lesson }: { lesson: Lesson }) {
  const mode = lesson.machine;
  const configured = String(lesson.parameters?.group || "");
  const startType =
    configured === "units"
      ? "U"
      : configured.startsWith("S")
        ? "S"
        : configured.startsWith("D")
          ? "D"
          : configured.startsWith("Q")
            ? "Q"
            : configured.startsWith("V")
              ? "V"
              : configured.startsWith("C")
                ? "C"
                : mode === "sylow"
                  ? "D"
                  : "C";
  const startN =
    Number(configured.match(/\d+/)?.[0]) ||
    Number(lesson.parameters?.n) ||
    (mode === "sylow" ? 3 : 6);
  const [type, setType] = useState(startType),
    [n, setN] = useState(startN),
    [a, setA] = useState(
      lesson.parameters?.subgroup === "reflection" ? startN : 1,
    ),
    [b, setB] = useState(2),
    [tab, setTab] = useState("graph"),
    [right, setRight] = useState(false),
    [both, setBoth] = useState(false);
  const g = useMemo(() => group(type, n), [type, n]),
    N = g.labels.length,
    x = mod(a, N),
    y = mod(b, N),
    H = closure(g, both ? [x, y] : [x]),
    cs = cosets(g, H, right),
    pos = ringPoints(N),
    sg = useMemo(() => subgroups(g), [g]);
  const [above, setAbove] = useState(false);
  const K = closure(g, [y]);
  const double = lesson.parameters?.mode === "double";
  const doubles: number[][] = [];
  if (double) {
    const unseen = new Set(g.labels.map((_, i) => i));
    while (unseen.size) {
      const a = [...unseen][0],
        c = [
          ...new Set(H.flatMap((h) => K.map((k) => g.mul(g.mul(h, a), k)))),
        ].sort((a, b) => a - b);
      doubles.push(c);
      c.forEach((z) => unseen.delete(z));
    }
  }
  const quotientView = above && normal(g, H);
  const shownSg = quotientView
    ? sg.filter((k) => H.every((x) => k.includes(x)))
    : sg;
  const conjugate = H.map((h) => g.mul(g.mul(y, h), inverse(g, y))).sort(
    (a, b) => a - b,
  );
  const centralizer = g.labels
    .map((_, a) => a)
    .filter((a) => H.every((h) => g.mul(a, h) === g.mul(h, a)));
  const normalizer = g.labels
    .map((_, a) => a)
    .filter((a) =>
      H.every((h) => H.includes(g.mul(g.mul(a, h), inverse(g, a)))),
    );
  const pr = g.mul(x, y);
  const which = (i: number) => cs.findIndex((c) => c.includes(i));
  return (
    <div className="generic-lab">
      <div className="lab-toolbar">
        <Choice
          label="Finite group"
          value={type}
          onChange={(v) => {
            setType(v);
            if (v === "S") setN(3);
            setA(1);
            setB(2);
          }}
          options={[
            ["C", "Cyclic $C_n$"],
            ["D", "Dihedral $D_n$"],
            ["V", "Klein four $V_4$"],
            ["Q", "Quaternion $Q_8$"],
            ["S", "Symmetric $S_n$"],
            ["U", "Units modulo $n$"],
          ]}
        />
        {(type === "C" || type === "D" || type === "U" || type === "S") && (
          <Choice
            label={"Parameter $n$"}
            value={String(n)}
            onChange={(v) => {
              setN(+v);
              setA(1);
            }}
            options={(type === "S" ? [3, 4] : [3, 4, 5, 6, 8, 10, 12, 24]).map(
              (i) => [String(i), `$n = ${i}$`],
            )}
          />
        )}
        <span className="lab-tag">{N} elements</span>
      </div>
      {mode === "subgroups" || mode === "sylow" ? (
        <svg
          className="math-svg"
          viewBox="0 0 560 430"
          role="img"
          aria-label="Subgroup inclusion lattice"
        >
          <SvgMath x="24" y="30" className="svg-caption">
            SUBGROUP INCLUSION · EDGES ARE COVERS
          </SvgMath>
          {(() => {
            const sizes = [...new Set(shownSg.map((h) => h.length))],
              xy = shownSg.map((h, i) => {
                const layer = shownSg.filter((k) => k.length === h.length),
                  j = layer.indexOf(h);
                return [
                  (560 * (j + 1)) / (layer.length + 1),
                  365 -
                    (sizes.indexOf(h.length) * 290) / (sizes.length - 1 || 1),
                ];
              });
            return (
              <>
                {shownSg.flatMap((h, i) =>
                  shownSg.map((k, j) => {
                    const inc =
                      h.length < k.length && h.every((x) => k.includes(x));
                    const intermediate = sg.some(
                      (l) =>
                        h.length < l.length &&
                        l.length < k.length &&
                        h.every((x) => l.includes(x)) &&
                        l.every((x) => k.includes(x)),
                    );
                    return inc && !intermediate ? (
                      <line
                        key={`${i}-${j}`}
                        x1={xy[i][0]}
                        y1={xy[i][1]}
                        x2={xy[j][0]}
                        y2={xy[j][1]}
                        stroke="#425a70"
                      />
                    ) : null;
                  }),
                )}
                {shownSg.map((h, i) => (
                  <g key={i}>
                    <circle
                      cx={xy[i][0]}
                      cy={xy[i][1]}
                      r={18}
                      fill={normal(g, h) ? "#69dbca" : "#a7a1ff"}
                    />
                    <SvgMath
                      x={xy[i][0]}
                      y={xy[i][1] + 5}
                      textAnchor="middle"
                      fill="#102331"
                    >
                      {quotientView ? h.length / H.length : h.length}
                    </SvgMath>
                    <SvgMath
                      x={xy[i][0]}
                      y={xy[i][1] + 34}
                      textAnchor="middle"
                      className="svg-tiny"
                    >
                      {h.length === N
                        ? quotientView
                          ? "G/H"
                          : "G"
                        : quotientView && h.length === H.length
                          ? "H/H=1"
                          : h.length === 1
                            ? "1"
                            : quotientView
                              ? `H${i + 1}/H`
                              : `H${i + 1}`}
                    </SvgMath>
                  </g>
                ))}
              </>
            );
          })()}
        </svg>
      ) : mode === "cosets" ? (
        <div className="coset-map">
          <p className="visual-kicker">
            Each color is one {double ? "double" : right ? "right" : "left"}{" "}
            coset
          </p>
          {(double ? doubles : cs).map((c, i) => (
            <div
              className="coset-bin"
              key={i}
              style={{ borderColor: palette[i % 12] }}
            >
              <M>{`${double ? "H" + g.labels[c[0]] + "K" : right ? "H" + g.labels[c[0]] : g.labels[c[0]] + "H"}`}</M>
              <div>
                {c.map((v) => (
                  <button
                    key={v}
                    onClick={() => setB(v)}
                    style={{ color: palette[i % 12] }}
                  >
                    <M>{g.labels[v]}</M>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : tab === "table" ? (
        <div className="cayley-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <M>{"ab"}</M>
                </TableHead>
                {g.labels.map((l, i) => (
                  <TableHead key={i}>
                    <M>{l}</M>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {g.labels.map((l, i) => (
                <TableRow key={i}>
                  <TableHead>
                    <M>{l}</M>
                  </TableHead>
                  {g.labels.map((_, j) => (
                    <TableCell
                      onClick={() => {
                        setA(i);
                        setB(j);
                      }}
                      key={j}
                      style={{
                        background: palette[which(g.mul(i, j)) % 12] + "22",
                        color: palette[which(g.mul(i, j)) % 12],
                      }}
                    >
                      <M>{g.labels[g.mul(i, j)]}</M>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <svg
          className="math-svg"
          viewBox="0 0 560 430"
          role="img"
          aria-label="Finite group multiplication graph"
        >
          <defs>
            <marker
              id="arrow"
              markerWidth="7"
              markerHeight="7"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L7,3 L0,6" fill="#7bddcf" />
            </marker>
          </defs>
          <SvgMath x="24" y="30" className="svg-caption">
            RIGHT MULTIPLICATION BY THE SELECTED ELEMENT
          </SvgMath>
          {pos.map((p, i) => {
            const j = g.mul(i, x),
              q = pos[j],
              dx = q[0] - p[0],
              dy = q[1] - p[1],
              d = Math.hypot(dx, dy) || 1;
            return i !== j ? (
              <line
                key={i}
                x1={p[0] + (dx * 22) / d}
                y1={p[1] + (dy * 22) / d}
                x2={q[0] - (dx * 24) / d}
                y2={q[1] - (dy * 24) / d}
                stroke={H.includes(i) ? "#69dbca" : "#425a70"}
                strokeWidth={H.includes(i) ? 2 : 1}
                markerEnd="url(#arrow)"
              />
            ) : (
              <circle
                key={i}
                cx={p[0] + 13}
                cy={p[1] - 17}
                r="15"
                stroke="#69dbca"
                fill="none"
              />
            );
          })}
          {pos.map((p, i) => (
            <g
              key={i}
              onClick={() => setA(i)}
              role="button"
              tabIndex={0}
              aria-label={`Select ${g.labels[i]}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setA(i);
              }}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={p[0]}
                cy={p[1]}
                r="21"
                fill={palette[which(i) % 12]}
                opacity={i === x ? 1 : 0.65}
                stroke={i === x ? "#fff" : "none"}
                strokeWidth="3"
              />
              <SvgMath
                x={p[0]}
                y={p[1] + 5}
                textAnchor="middle"
                fill="#102331"
                fontSize="13"
              >
                {g.labels[i]}
              </SvgMath>
            </g>
          ))}
        </svg>
      )}
      <div className="lab-controls">
        <button className="quotient-toggle" onClick={() => setBoth(!both)}>
          {both ? "Generate H using a only" : "Generate H using both a and b"}
        </button>
        {mode === "subgroups" && (
          <button
            className="quotient-toggle"
            disabled={!normal(g, H)}
            onClick={() => setAbove(!above)}
          >
            {above
              ? "Show full subgroup lattice"
              : "Show subgroups above H, labeled as K/H"}
          </button>
        )}
        <div className="two-cols">
          <Choice
            label={"Element $a$"}
            value={String(x)}
            onChange={(v) => setA(+v)}
            options={g.labels.map((l, i) => [String(i), `$a = ${l}$`])}
          />
          <Choice
            label={"Element $b$"}
            value={String(y)}
            onChange={(v) => setB(+v)}
            options={g.labels.map((l, i) => [String(i), `$b = ${l}$`])}
          />
        </div>
        <div className="stat-strip">
          <div>
            <strong>{order(g, x)}</strong>
            <M>{"\\operatorname{ord}(a)"}</M>
          </div>
          <div>
            <strong>{H.length}</strong>
            <M>{"|H|"}</M>
          </div>
          <div>
            <strong>{cs.length}</strong>
            <span>
              <Prose>{"index [$G$:H]"}</Prose>
            </span>
          </div>
          <div>
            <strong>{sg.length}</strong>
            <span>subgroups</span>
          </div>
        </div>
        <M
          block
        >{`a b=${g.labels[pr]},\\quad b a=${g.labels[g.mul(y, x)]},\\quad a^{-1}=${g.labels[inverse(g, x)]}`}</M>
        {double && (
          <p className="lab-explain">
            <Prose>
              {
                " $H=\\langle a\\rangle$ and $K=\\langle b\\rangle$. A double coset HgK lets $H$ act on the left and $K$ on the right; unlike ordinary cosets, double cosets can have different sizes. Here the sizes are "
              }
            </Prose>
            {doubles.map((c) => c.length).join(", ")}.
          </p>
        )}
        <p className="lab-explain">
          The selected generated subgroup is{" "}
          <M>{`H=\\{${H.map((i) => g.labels[i]).join(",")}\\}`}</M>. Following
          multiplication arrows returns to the identity after {order(g, x)}{" "}
          <Prose>{" steps. Cosets partition $G$ into "}</Prose>
          {cs.length} equal pieces of size {H.length}.
        </p>
        <details open={/normal|centralizer/.test(lesson.id)}>
          <summary>Conjugation, centralizer and normalizer</summary>
          <M
            block
          >{`bHb^{-1}=\\{${conjugate.map((i) => g.labels[i]).join(",")}\\}`}</M>
          <p>
            <Prose>{" Conjugation by $b$"}</Prose>{" "}
            {conjugate.every((h) => H.includes(h)) ? "preserves" : "changes"}
            <Prose>{" $H$ as a set. The centralizer has size "}</Prose>
            <M>{`|C_G(H)|=${centralizer.length}`}</M>
            <Prose>
              {
                " and fixes each member under conjugation. The normalizer has size "
              }
            </Prose>
            <M>{`|N_G(H)|=${normalizer.length}`}</M>
            <Prose>
              {
                " and preserves $H$ as a set. $H$ is normal precisely when its normalizer is all of $G$. "
              }
            </Prose>
          </p>
        </details>
        {lesson.id === "mh2220-simple-composition" && (
          <details open>
            <summary>
              <Prose>{"A composition series for $S_{4}$"}</Prose>
            </summary>
            <M block>
              {
                "S_4\\triangleright A_4\\triangleright V_4\\triangleright C_2\\triangleright 1"
              }
            </M>
            <p>
              <Prose>
                {
                  " Each subgroup is normal in the preceding one; the factors have orders 2,3,2,2 and are cyclic of prime order. $C_{2}$ here is generated by a double transposition. Compare $C_{24}$, whose composition factors have the same prime orders but whose group structure is different. "
                }
              </Prose>
            </p>
          </details>
        )}
        <p className="lab-explain">
          {normal(g, H)
            ? "H is normal: its cosets form a quotient group."
            : "H is not normal: left and right cosets can differ, and coset multiplication is not well-defined."}
        </p>
        <div className="filter-row">
          {mode === "cosets" ? (
            <button onClick={() => setRight(!right)}>
              Show {right ? "left" : "right"} cosets
            </button>
          ) : (
            <>
              <button
                onClick={() => setTab("graph")}
                className={tab === "graph" ? "active" : ""}
              >
                Cayley graph
              </button>
              <button
                onClick={() => setTab("table")}
                className={tab === "table" ? "active" : ""}
              >
                Multiplication table
              </button>
            </>
          )}
        </div>
        {(mode === "subgroups" || mode === "sylow") && (
          <p className="lab-explain">
            <Prose>
              {quotientView
                ? "Nodes contain $H$; labels give quotient orders $|K/H|$."
                : "Node labels give subgroup orders."}
            </Prose>{" "}
            Teal nodes are normal; violet nodes are not.{" "}
            {mode === "sylow" && (
              <Prose>
                {
                  "For $D_3$ (order $6$), there are three subgroups of order $2$ and one of order $3$; the latter is normal."
                }
              </Prose>
            )}
          </p>
        )}
        <details>
          <summary>Conventions and scope</summary>
          <p>
            <Prose>
              {
                " These machines enumerate actual finite groups, not arbitrary operation tables. $D_n$ has order $2n$ and elements $r^as^b$, with $sr = r^{-1}s$. The graph uses right multiplication. $C_{n}$ is written additively; its identity is 0. $Q_8$ uses $i^2=j^2=k^2=ijk=-1$. A finite example illustrates a theorem but does not prove the general case. "
              }
            </Prose>
          </p>
        </details>
      </div>
    </div>
  );
}
export function PolygonLab() {
  const [n, setN] = useState(5),
    [r, setR] = useState(0),
    [s, setS] = useState(0);
  const pos = ringPoints(n, 142, 280, 205),
    p = Array.from({ length: n }, (_, i) => mod(r + (s ? -i : i), n));
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label="Polygon sides"
          value={String(n)}
          onChange={(v) => {
            setN(+v);
            setR(0);
            setS(0);
          }}
          options={[3, 4, 5, 6, 8, 10, 12].map((i) => [String(i), `${i}-gon`])}
        />
        <button
          onClick={() => {
            setR(mod(r + 1, n));
          }}
        >
          <Prose>{" Rotate $r$ "}</Prose>
        </button>
        <button
          onClick={() => {
            setR(mod(-r, n));
            setS(1 - s);
          }}
        >
          <Prose>{" Reflect $s$ "}</Prose>
        </button>
        <button
          onClick={() => {
            setR(0);
            setS(0);
          }}
        >
          Reset
        </button>
      </div>
      <svg
        viewBox="0 0 560 420"
        className="math-svg"
        role="img"
        aria-label="Dihedral action on labeled polygon"
      >
        <circle
          cx="280"
          cy="205"
          r="142"
          stroke="#34495e"
          strokeDasharray="4 7"
          fill="none"
        />
        <polygon
          points={pos.map((p) => p.join(",")).join(" ")}
          fill="#69dbca13"
          stroke="#69dbca"
          strokeWidth="2"
        />
        {s === 1 && (
          <line
            x1={280 - 180 * Math.cos(-Math.PI / 2 + (Math.PI * r) / n)}
            y1={205 - 180 * Math.sin(-Math.PI / 2 + (Math.PI * r) / n)}
            x2={280 + 180 * Math.cos(-Math.PI / 2 + (Math.PI * r) / n)}
            y2={205 + 180 * Math.sin(-Math.PI / 2 + (Math.PI * r) / n)}
            stroke="#a7a1ff"
            strokeDasharray="6 5"
          />
        )}
        {pos.map((v, i) => (
          <g key={i}>
            <SvgMath
              x={v[0] * 1.12 - 33.6}
              y={v[1] * 1.12 - 24.6}
              textAnchor="middle"
              fill="#8094aa"
            >
              {i + 1}
            </SvgMath>
            <circle
              cx={pos[p[i]][0]}
              cy={pos[p[i]][1]}
              r="20"
              fill={palette[i % 12]}
            />
            <SvgMath
              x={pos[p[i]][0]}
              y={pos[p[i]][1] + 5}
              textAnchor="middle"
              fill="#112535"
            >
              {i + 1}
            </SvgMath>
          </g>
        ))}
      </svg>
      <div className="lab-controls">
        <M
          block
        >{`g=r^{${r}}s^{${s}},\\quad g(i)=${r}+(-1)^{${s}}i\\pmod{${n}}`}</M>
        <M block>{`\\pi(g)=${cycleTex(p)},\\quad |D_{${n}}|=${2 * n}`}</M>
        <p>
          <Prose>
            {
              " Gray labels mark the original positions; colored labels travel with their vertices. Apply $r$ then $s$, reset, and apply $s$ then $r$. The destinations differ because reflection reverses the direction of rotation. "
            }
          </Prose>
        </p>
        <M block>{"srs=r^{-1},\\qquad r^n=s^2=e"}</M>
        <p>
          <Prose>
            {
              " Positions in the formula are numbered 0 through $n-1$; the drawing numbers them 1 through $n$. A reflection is an orientation-reversing symmetry, not a rotation in the plane. "
            }
          </Prose>
        </p>
      </div>
    </div>
  );
}
export function HomomorphismLab({ lesson }: { lesson?: Lesson }) {
  const ring = lesson?.id === "m3220-ring-hom";
  const [n, setN] = useState(12),
    [m, setM] = useState(4),
    [k, setK] = useState(1);
  const valid = mod(n * k, m) === 0,
    ringValid = valid && mod(k * k - k, m) === 0,
    ker = Array.from({ length: n }, (_, i) => i).filter(
      (i) => mod(k * i, m) === 0,
    ),
    im = [...new Set(Array.from({ length: n }, (_, i) => mod(k * i, m)))];
  return (
    <div className="generic-lab">
      <div className="lab-controls">
        <Range
          label={"Domain modulus $n$"}
          value={n}
          min={2}
          max={16}
          onChange={setN}
        />
        <Range
          label={"Codomain modulus $m$"}
          value={m}
          min={2}
          max={12}
          onChange={setM}
        />
        <Range
          label={"Multiplier $k$"}
          value={k}
          min={0}
          max={12}
          onChange={setK}
        />
      </div>
      <svg
        viewBox="0 0 560 400"
        className="math-svg"
        aria-label="Fibers of a cyclic group map"
        role="img"
      >
        {Array.from({ length: n }, (_, i) => {
          const y = 45 + (i * 305) / (n - 1);
          const j = mod(k * i, m),
            z = 45 + (j * 305) / (m - 1);
          return (
            <g key={i}>
              <path
                d={`M120,${y} C260,${y} 300,${z} 420,${z}`}
                stroke={valid ? palette[j % 12] : "#ff8b9e"}
                opacity=".6"
                fill="none"
              />
              <circle cx="120" cy={y} r="10" fill={palette[j % 12]} />
              <SvgMath x="96" y={y + 5} textAnchor="end" fill="#c4d6e4">
                {i}
              </SvgMath>
            </g>
          );
        })}
        {Array.from({ length: m }, (_, i) => (
          <g key={i}>
            <circle
              cx="420"
              cy={45 + (i * 305) / (m - 1)}
              r="10"
              fill={palette[i % 12]}
            />
            <SvgMath x="443" y={50 + (i * 305) / (m - 1)} fill="#c4d6e4">
              {i}
            </SvgMath>
          </g>
        ))}
      </svg>
      <div className="lab-controls">
        <M
          block
        >{`\\varphi:\\mathbb Z/${n}\\to\\mathbb Z/${m},\\quad [x]\\mapsto[${k}x]`}</M>
        <p className={valid ? "success-note" : "error-note"}>
          {valid
            ? ring
              ? ringValid
                ? "Well-defined ring homomorphism."
                : "An additive homomorphism, but multiplication is not preserved."
              : "Well-defined group homomorphism."
            : `Not well-defined on residue classes: 0 and ${n} represent the same input but map to different residues.`}
        </p>
        {valid && (
          <>
            <M
              block
            >{`|\\ker\\varphi|=${ker.length},\\quad |\\operatorname{im}\\varphi|=${im.length},\\quad ${n}=${ker.length}\\cdot${im.length}`}</M>
            <p>
              Every color is a fiber: a coset of the kernel. Collapsing each
              fiber gives the image. Surjective:{" "}
              {im.length === m ? "yes" : "no"}; injective:{" "}
              {ker.length === 1 ? "yes" : "no"}.
            </p>
          </>
        )}
        {ring && (
          <p>
            <Prose>
              {
                " Preserving multiplication also requires $k^{2} \\equiv  k$ (mod m); preserving the multiplicative identity requires $k \\equiv  1$ (mod m). Unital:"
              }
            </Prose>{" "}
            {ringValid && mod(k - 1, m) === 0 ? "yes" : "no"}.
          </p>
        )}
        <p>
          The necessary and sufficient condition for the additive group map is{" "}
          <M>{"m\\mid kn"}</M>
          <Prose>
            {", since the relation $n\\cdot [1]=0$ must be preserved. "}
          </Prose>
        </p>
      </div>
    </div>
  );
}
