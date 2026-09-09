"use client";
import { SvgMath } from "./SvgMath";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { Range, Choice } from "./Groups";
import {
  gcd,
  mod,
  palette,
  type Lesson,
  group,
  inverse,
  closure,
  cosets,
} from "@/lib/algebra/engine";
export function StructureLab({ lesson }: { lesson: Lesson }) {
  const [selected, setSelected] = useState(0),
    [step, setStep] = useState(3),
    [a, setA] = useState(84),
    [b, setB] = useState(30),
    [prime, setPrime] = useState(3);
  const params = lesson.parameters || {},
    mode = String(params.mode || params.diagram || "");
  let nodes: any[] = (params.nodes as any[]) || [],
    edges: any[] = (params.edges as any[]) || [];
  if (nodes.length && typeof nodes[0] === "string")
    nodes = nodes.map((label, i) => ({ id: String(i), label, text: true }));
  if (!nodes.length) {
    if (mode === "second-isomorphism") {
      nodes = [
        { id: "A", label: "H\\cap N" },
        { id: "B", label: "H" },
        { id: "C", label: "N" },
        { id: "D", label: "HN" },
      ];
      edges = [
        ["A", "B", "inclusion"],
        ["A", "C", "inclusion"],
        ["B", "D", "inclusion"],
        ["C", "D", "inclusion"],
      ];
    } else if (mode === "third-isomorphism") {
      nodes = [
        { id: "G", label: "G" },
        { id: "GN", label: "G/N" },
        { id: "GM", label: "G/M" },
        { id: "Q", label: "(G/N)/(M/N)" },
      ];
      edges = [
        ["G", "GN", "quotient by $N$"],
        ["GN", "Q", "quotient by $M/N$"],
        ["G", "GM", "quotient by $M$"],
        ["Q", "GM", "isomorphism"],
      ];
    } else {
      nodes = [
        { id: "start", label: "V" },
        { id: "action", label: "\\rho(g)" },
        { id: "end", label: "V" },
      ];
      edges = [
        ["start", "action", "representation"],
        ["action", "end", "linear action"],
      ];
    }
  }
  const rows =
    nodes.length <= 3
      ? nodes.map((_, i) => [280, 65 + i * 125])
      : nodes.map((_, i) => {
          if (nodes.length === 4)
            return [
              [280, 50],
              [120, 195],
              [440, 195],
              [280, 340],
            ][i];
          return [
            [100, 65],
            [400, 65],
            [280, 205],
            [100, 345],
            [440, 345],
            [280, 430],
          ][i % 6];
        });
  const normEdges = edges
    .map((e) => [
      typeof e[0] === "number" ? e[0] : nodes.findIndex((n) => n.id === e[0]),
      typeof e[1] === "number" ? e[1] : nodes.findIndex((n) => n.id === e[1]),
      e[2],
    ])
    .filter((e) => e[0] >= 0 && e[1] >= 0);
  const current = normEdges[selected % Math.max(1, normEdges.length)];
  return (
    <div>
      <div className="structure-map">
        <svg
          viewBox={`0 0 560 ${nodes.length > 5 ? 490 : 410}`}
          role="img"
          aria-label="Mathematical structure relationships"
        >
          <defs>
            <marker
              id="struct-arrow"
              markerWidth="8"
              markerHeight="7"
              refX="7"
              refY="3.5"
              orient="auto"
            >
              <path d="M0 0L8 3.5L0 7" fill="#d96240" />
            </marker>
          </defs>
          {normEdges.map((e, i) => {
            const p = rows[e[0]],
              q = rows[e[1]],
              dx = q[0] - p[0],
              dy = q[1] - p[1],
              d = Math.hypot(dx, dy) || 1;
            return (
              <line
                key={i}
                x1={p[0] + (dx * 36) / d}
                y1={p[1] + (dy * 36) / d}
                x2={q[0] - (dx * 38) / d}
                y2={q[1] - (dy * 38) / d}
                stroke={selected === i ? "#dc5632" : "#7e7770"}
                strokeWidth={selected === i ? 3 : 1.5}
                markerEnd="url(#struct-arrow)"
              />
            );
          })}
          {nodes.map((n, i) => (
            <foreignObject
              key={i}
              x={rows[i][0] - 105}
              y={rows[i][1] - 28}
              width="210"
              height="64"
            >
              <div
                className="structure-node"
                style={{
                  fontSize:
                    n.label.replace(/\\[a-zA-Z]+/g, "").length > 24 ? 15 : 24,
                }}
              >
                {n.text ? <Prose>{n.label}</Prose> : <M>{n.label}</M>}
              </div>
            </foreignObject>
          ))}
        </svg>
      </div>
      <div className="lab-controls">
        {normEdges.length > 0 && (
          <>
            <label>Follow a relationship</label>
            <div className="relationship-steps">
              {normEdges.map((e, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={selected === i ? "active" : ""}
                >
                  {i + 1}. <Prose>{String(e[2])}</Prose>
                </button>
              ))}
            </div>
            {current && (
              <div className="relationship-readout">
                {nodes[current[0]].text ? (
                  <Prose>{nodes[current[0]].label}</Prose>
                ) : (
                  <M>{nodes[current[0]].label}</M>
                )}
                <span>
                  <Prose>{String(current[2])}</Prose>
                </span>
                {nodes[current[1]].text ? (
                  <Prose>{nodes[current[1]].label}</Prose>
                ) : (
                  <M>{nodes[current[1]].label}</M>
                )}
              </div>
            )}
          </>
        )}
        {["ascending-chain", "descending-chain", "valuation"].includes(
          mode,
        ) && (
          <>
            <Range
              label="Number of steps to inspect"
              min={1}
              max={7}
              value={step}
              onChange={setStep}
            />
            <M block>
              {mode === "ascending-chain"
                ? `(X_1)\\subsetneq(X_1,X_2)\\subsetneq\\cdots\\subsetneq(X_1,\\ldots,X_{${step + 1}})`
                : `R\\supsetneq(t)\\supsetneq\\cdots\\supsetneq(t^{${step}})`}
            </M>
            <p>
              {mode === "ascending-chain"
                ? "The polynomial ring with infinitely many independent variables has no finite generating stage for this ideal. Each new variable is outside the previous ideal."
                : "In a discrete valuation ring, powers of a nonunit uniformizer form a strictly descending infinite chain. The DVR is Noetherian but not Artinian. Compare the finite quotient example in the lesson, where a power becomes zero."}
            </p>
          </>
        )}
        {["fractions", "localization", "local-ring"].includes(mode) && (
          <>
            <div className="two-cols">
              <Range
                label={"Numerator $a$"}
                min={-12}
                max={12}
                value={a > 12 ? 1 : a}
                onChange={setA}
              />
              <Range
                label={"Denominator $b$"}
                min={1}
                max={12}
                value={b > 12 ? 2 : b}
                onChange={setB}
              />
            </div>
            <Choice
              label="Prime for local ring"
              value={String(prime)}
              onChange={(v) => setPrime(+v)}
              options={[
                ["2", "Localise at (2)"],
                ["3", "Localise at (3)"],
                ["5", "Localise at (5)"],
              ]}
            />
            {(() => {
              const aa = a > 12 ? 1 : a,
                bb = b > 12 ? 2 : b,
                d = gcd(aa, bb),
                num = aa / d,
                den = bb / d;
              return (
                <>
                  <M block>{`\\frac{${aa}}{${bb}}=\\frac{${num}}{${den}}`}</M>
                  <p>
                    {den % prime
                      ? "This rational belongs"
                      : "This rational does not belong"}{" "}
                    to <M>{`\\mathbb Z_{(${prime})}`}</M>: in lowest terms its
                    denominator is {den % prime ? "not divisible" : "divisible"}{" "}
                    by <M>{String(prime)}</M>.
                    <Prose>
                      {
                        " In $\\mathbb Q$ every nonzero integer denominator is allowed. Reduce before testing: "
                      }
                    </Prose>
                    <M>{`${prime}/${prime}=1`}</M> is allowed.
                  </p>
                </>
              );
            })()}
          </>
        )}
        {mode === "euclidean" && (
          <>
            <Range
              label="First positive integer"
              min={1}
              max={120}
              value={a}
              onChange={setA}
            />
            <Range
              label="Second positive integer"
              min={1}
              max={60}
              value={b}
              onChange={setB}
            />
            <div className="euclid-steps">
              {(() => {
                let x = a,
                  y = b,
                  out = [];
                while (y) {
                  const r = x % y;
                  out.push(`${x}=${Math.floor(x / y)}\\cdot ${y}+${r}`);
                  x = y;
                  y = r;
                }
                return out.map((s, i) => (
                  <M key={i} block>
                    {s}
                  </M>
                ));
              })()}
            </div>
            <p>
              Last nonzero remainder: <M>{`\\gcd(${a},${b})=${gcd(a, b)}`}</M>.
              At each step the generated ideal is unchanged while the nonzero
              remainder decreases.
            </p>
          </>
        )}
        <p className="map-caption">
          Read each arrow with its displayed condition. The definition and proof
          explain why the relation holds; proximity in the drawing does not add
          a mathematical relation.
        </p>
      </div>
    </div>
  );
}
export function ConjugationLab() {
  const [type, setType] = useState("D"),
    [n, setN] = useState(4),
    [mode, setMode] = useState("conjugation"),
    [a, setA] = useState(1);
  const g = group(type, n),
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
            ["D", "D₄ · 8 elements"],
            ["Q", "Q₈ · 8 elements"],
            ["C", "C₄ · 4 elements"],
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
        >{`|G|=${N}=|\\operatorname{Orb}(${g.labels[x]})|\\,|\\operatorname{Stab}(${g.labels[x]})|=${orbit.length}\\cdot${stabilizer.length}`}</M>
        <M
          block
        >{`\\operatorname{Stab}(${g.labels[x]})=\\{${stabilizer.map((h) => g.labels[h]).join(",")}\\}`}</M>
        <p>
          {mode === "regular"
            ? "Left translation is transitive and free. Only the identity can fix x, because hx=x implies h=e."
            : "Conjugation remembers internal structure. The stabilizer is the centralizer C_G(x); singleton orbits are exactly the central elements."}
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
export function ColoringLab() {
  const [n, setN] = useState(6),
    [k, setK] = useState(2),
    [ref, setRef] = useState(false),
    [bits, setBits] = useState<number[]>(Array(12).fill(0));
  const perms = Array.from({ length: ref ? 2 * n : n }, (_, a) =>
    Array.from({ length: n }, (_, i) => mod((a % n) + (a >= n ? -i : i), n)),
  );
  const cyc = (p: number[]) => {
    let c = 0,
      seen = new Set<number>();
    for (let i = 0; i < n; i++)
      if (!seen.has(i)) {
        c++;
        let j = i;
        while (!seen.has(j)) {
          seen.add(j);
          j = p[j];
        }
      }
    return c;
  };
  const sum = perms.reduce((s, p) => s + k ** cyc(p), 0),
    orb = new Set(perms.map((p) => p.map((i) => bits[i] % k).join(","))),
    st = perms.filter((p) =>
      p.every((j, i) => bits[j] % k === bits[i] % k),
    ).length;
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label="Coloring equivalence"
          value={ref ? "bracelet" : "necklace"}
          onChange={(v) => setRef(v === "bracelet")}
          options={[
            ["necklace", "Necklaces · rotations"],
            ["bracelet", "Bracelets · rotations + reflections"],
          ]}
        />
      </div>
      <svg
        viewBox="0 0 560 400"
        className="math-svg"
        role="img"
        aria-label="Interactive colored necklace"
      >
        <circle cx="280" cy="195" r="132" fill="none" stroke="#496379" />
        {Array.from({ length: n }, (_, i) => {
          const t = -Math.PI / 2 + (i * 2 * Math.PI) / n;
          return (
            <g
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`Change bead ${i + 1} color`}
              onClick={() =>
                setBits((b) => b.map((x, j) => (i === j ? (x + 1) % k : x)))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  setBits((b) => b.map((x, j) => (i === j ? (x + 1) % k : x)));
              }}
            >
              <circle
                cx={280 + 132 * Math.cos(t)}
                cy={195 + 132 * Math.sin(t)}
                r="22"
                fill={palette[bits[i] % k]}
                stroke="#bfdde2"
              />
              <SvgMath
                x={280 + 170 * Math.cos(t)}
                y={200 + 170 * Math.sin(t)}
                textAnchor="middle"
                fill="#98adbd"
              >
                {i + 1}
              </SvgMath>
            </g>
          );
        })}
      </svg>
      <div className="lab-controls">
        <div className="two-cols">
          <Range
            label={"Beads $n$"}
            min={3}
            max={10}
            value={n}
            onChange={setN}
          />
          <Range
            label={"Labeled colors $k$"}
            min={2}
            max={5}
            value={k}
            onChange={setK}
          />
        </div>
        <p>
          Click a bead to change its color. This coloring has {orb.size}{" "}
          distinct labeled arrangements in its orbit and a stabilizer of size{" "}
          {st}.
        </p>
        <M
          block
        >{`${perms.length}=${orb.size}\\cdot${st},\\qquad\\#\\text{coloring orbits}=\\frac{${sum}}{${perms.length}}=${sum / perms.length}`}</M>
        <p>
          <Prose>
            {
              " The orbit–stabilizer equation concerns this single coloring. Burnside’$s$ average counts all inequivalent colorings using $k$ labeled colors, with repetition allowed. It counts fixed colorings by $k$ to the number of bead cycles, not by the number of fixed beads. "
            }
          </Prose>
        </p>
      </div>
    </div>
  );
}
