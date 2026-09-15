"use client";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { Range, Choice } from "./Groups";
import { gcd, type Lesson } from "@/lib/algebra/engine";
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
        { id: "end", label: "V" },
      ];
      edges = [["start", "end", "linear map $\\rho(g):V\\to V$"]];
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
          return [i % 2 === 0 ? 135 : 425, 65 + 140 * Math.floor(i / 2)];
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
          viewBox={`0 0 560 ${Math.max(410, 140 * Math.ceil(nodes.length / 2))}`}
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
