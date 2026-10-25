"use client";
import { Diagram } from "./Diagram";
import { PrimeChainComparison } from "./PrimeChainComparison";
import { TetrahedralDisplacements } from "./TetrahedralDisplacements";
import { WorkedObjectView } from "./WorkedObjectView";
import { laboratoryPresentation } from "@/lib/algebra/laboratory-presentations";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { Range, Choice } from "./Groups";
import { gcd, type Lesson } from "@/lib/algebra/engine";
import { z } from "zod";

const endpoint = z.union([z.string().min(1), z.number().int().nonnegative()]);
const structureNode = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    text: z.boolean().optional(),
  })
  .strict();
const structureEdge = z.tuple([endpoint, endpoint, z.string().min(1)]);
const parameters = z
  .object({
    mode: z.string().optional(),
    diagram: z.string().optional(),
    nodes: z.array(structureNode).min(1).optional(),
    edges: z.array(structureEdge).optional(),
    a: z.number().optional(),
    b: z.number().optional(),
    p: z.number().optional(),
  })
  .strict();

export function IdealChain({
  ascending,
  step,
}: {
  ascending: boolean;
  step: number;
}) {
  const terms = Array.from({ length: step + 1 }, (_, i) =>
    ascending
      ? `(${Array.from({ length: i + 1 }, (_, j) => `X_{${j + 1}}`).join(",")})`
      : i === 0
        ? "R"
        : i === 1
          ? "(t)"
          : `(t^{${i}})`,
  );
  return <M block>{terms.join(ascending ? "\\subsetneq" : "\\supsetneq")}</M>;
}

export function StructureLab({ lesson }: { lesson: Lesson }) {
  const params = parameters.parse(lesson.parameters || {}),
    mode = String(params.mode || params.diagram || "");
  const [selected, setSelected] = useState(0),
    [step, setStep] = useState(3),
    [a, setA] = useState(mode === "euclidean" ? (params.a ?? 84) : 84),
    [b, setB] = useState(mode === "euclidean" ? (params.b ?? 30) : 30),
    [prime, setPrime] = useState(3);
  const divisions: {
    dividend: number;
    divisor: number;
    quotient: number;
    remainder: number;
  }[] = [];
  for (let x = a, y = b; y !== 0;) {
    const remainder = x % y;
    divisions.push({
      dividend: x,
      divisor: y,
      quotient: Math.floor(x / y),
      remainder,
    });
    x = y;
    y = remainder;
  }
  let nodes: z.infer<typeof structureNode>[] = params.nodes || [],
    edges: z.infer<typeof structureEdge>[] = params.edges || [];
  if (mode === "euclidean") {
    nodes = [
      ...divisions.map(({ dividend, divisor }, i) => ({
        id: String(i),
        label: `\\langle ${dividend},${divisor}\\rangle_{\\mathbb Z}`,
      })),
      {
        id: String(divisions.length),
        label: `\\langle ${gcd(a, b)}\\rangle_{\\mathbb Z}`,
      },
    ];
    edges = divisions.map(({ dividend, divisor, quotient, remainder }, i) => [
      i,
      i + 1,
      `$${dividend}=${quotient}\\cdot${divisor}+${remainder}$ preserves the ideal`,
    ]);
  }
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
      throw Error(`Missing mathematical diagram for ${lesson.id}`);
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
  if (new Set(nodes.map(({ id }) => id)).size !== nodes.length)
    throw Error(`Duplicate mathematical object in ${lesson.id}`);
  const normEdges = edges.map((edge): [number, number, string] => {
    const from =
      typeof edge[0] === "number"
        ? edge[0]
        : nodes.findIndex((node) => node.id === edge[0]);
    const to =
      typeof edge[1] === "number"
        ? edge[1]
        : nodes.findIndex((node) => node.id === edge[1]);
    if (from < 0 || from >= nodes.length || to < 0 || to >= nodes.length)
      throw Error(`Unknown mathematical arrow endpoint in ${lesson.id}`);
    return [from, to, edge[2]];
  });
  const active = selected % Math.max(1, normEdges.length),
    current = normEdges[active];
  if (laboratoryPresentation(lesson.id) === "worked-example")
    return <WorkedObjectView lesson={lesson} />;
  if (
    [
      "ureca-theory-tetrahedron-rigid-motions",
      "ureca-theory-tetrahedron-spring-model",
      "ureca-theory-tetrahedron-affine-coordinates",
    ].includes(lesson.id)
  )
    return <TetrahedralDisplacements />;
  if (mode === "prime-chain") return <PrimeChainComparison />;
  return (
    <div>
      <div className="structure-map">
        <Diagram
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
                stroke={active === i ? "#dc5632" : "#7e7770"}
                strokeWidth={active === i ? 3 : 1.5}
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
        </Diagram>
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
                  className={active === i ? "active" : ""}
                  aria-pressed={active === i}
                  aria-label={`Follow relationship ${i + 1}`}
                >
                  {i + 1}. <Prose focusable={false}>{String(e[2])}</Prose>
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
            <IdealChain ascending={mode === "ascending-chain"} step={step} />
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
                accessibleLabel="Numerator a"
                min={-12}
                max={12}
                value={a > 12 ? 1 : a}
                onChange={setA}
              />
              <Range
                label={"Denominator $b$"}
                accessibleLabel="Denominator b"
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
                {
                  value: "2",
                  presentation: "Localise at $(2)$",
                  speech: "Localise at ideal generated by 2",
                },
                {
                  value: "3",
                  presentation: "Localise at $(3)$",
                  speech: "Localise at ideal generated by 3",
                },
                {
                  value: "5",
                  presentation: "Localise at $(5)$",
                  speech: "Localise at ideal generated by 5",
                },
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
              {divisions.map(
                ({ dividend, divisor, quotient, remainder }, i) => (
                  <M key={i} block>
                    {`${dividend}=${quotient}\\cdot ${divisor}+${remainder}`}
                  </M>
                ),
              )}
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
