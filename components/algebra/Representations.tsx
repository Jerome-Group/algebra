"use client";
import { SvgMath } from "./SvgMath";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { Range, Choice } from "./Groups";
import { CubeScene } from "./Cube";
import {
  matrixTex,
  det,
  cycleTex,
  cycles,
  palette,
  mod,
  type Mat,
  type Lesson,
} from "@/lib/algebra/engine";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
export function OrthogonalLab() {
  const [angle, setAngle] = useState(45),
    [reflect, setReflect] = useState(false),
    [dim, setDim] = useState("2"),
    [axis, setAxis] = useState("z");
  const t = (angle * Math.PI) / 180,
    c = Math.cos(t),
    s = Math.sin(t),
    e = reflect ? -1 : 1;
  let m: Mat =
    axis === "x"
      ? [
          [1, 0, 0],
          [0, c, -s],
          [0, s, c],
        ]
      : axis === "y"
        ? [
            [c, 0, s],
            [0, 1, 0],
            [-s, 0, c],
          ]
        : [
            [c, -s, 0],
            [s, c, 0],
            [0, 0, 1],
          ];
  m = m.map((r) => r.map((v, i) => (i === 0 ? v * e : v)));
  const f = (x: number, y: number) => [
    280 + 130 * (e * c * x - s * y),
    210 - 130 * (e * s * x + c * y),
  ];
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label="Orthogonal dimension"
          value={dim}
          onChange={setDim}
          options={[
            ["2", "Plane · O(2)"],
            ["3", "Space · O(3)"],
          ]}
        />
        <Choice
          label="Orientation"
          value={reflect ? "reverse" : "preserve"}
          onChange={(v) => setReflect(v === "reverse")}
          options={[
            ["preserve", "Preserve orientation"],
            ["reverse", "Reverse orientation"],
          ]}
        />
        {dim === "3" && (
          <Choice
            label="Rotation axis"
            value={axis}
            onChange={setAxis}
            options={[
              ["x", "x-axis"],
              ["y", "y-axis"],
              ["z", "z-axis"],
            ]}
          />
        )}
      </div>
      {dim === "3" ? (
        <CubeScene matrix={m} set="vertices" selected={0} onSelect={() => {}} />
      ) : (
        <svg
          className="math-svg"
          viewBox="0 0 560 420"
          role="img"
          aria-label="Orthogonal frame on unit circle"
        >
          <circle cx="280" cy="210" r="130" fill="#69dbca08" stroke="#3b5266" />
          <line x1="80" y1="210" x2="480" y2="210" stroke="#3b5266" />
          <line x1="280" y1="30" x2="280" y2="390" stroke="#3b5266" />
          {Array.from({ length: 24 }, (_, i) => {
            const q = f(
              Math.cos((i * Math.PI) / 12),
              Math.sin((i * Math.PI) / 12),
            );
            return <circle key={i} cx={q[0]} cy={q[1]} r="3" fill="#5f788c" />;
          })}
          <polygon
            points={[
              [0, 0],
              [1, 0],
              [0, 1],
            ]
              .map((p) => f(p[0], p[1]).join(","))
              .join(" ")}
            fill="#69dbca20"
            stroke="#69dbca"
          />
          {[
            [1, 0],
            [0, 1],
          ].map((v, i) => (
            <g key={i}>
              <line
                x1="280"
                y1="210"
                x2={f(v[0], v[1])[0]}
                y2={f(v[0], v[1])[1]}
                stroke={palette[i]}
                strokeWidth="4"
              />
              <circle
                cx={f(v[0], v[1])[0]}
                cy={f(v[0], v[1])[1]}
                r="7"
                fill={palette[i]}
              />
              <SvgMath
                x={f(v[0], v[1])[0] + 12}
                y={f(v[0], v[1])[1] - 10}
                fill={palette[i]}
              >
                {`Qe_{${i + 1}}`}
              </SvgMath>
            </g>
          ))}
        </svg>
      )}
      <div className="lab-controls">
        <Range
          label={"Angle $\\theta$ in degrees"}
          value={angle}
          min={0}
          max={360}
          onChange={setAngle}
        />
        <M block>{`Q\\approx${matrixTex(
          dim === "2"
            ? [
                [e * c, -s],
                [e * s, c],
              ]
            : m,
        )}`}</M>
        <M block>{`Q^TQ=I,\\quad\\det Q=${e}`}</M>
        <p>
          The columns remain orthonormal: their lengths and angle never change.
          The orientation-preserving component is{" "}
          <M>{`\\operatorname{SO}(${dim})`}</M>.{" "}
          {dim === "3" ? (
            "An arbitrary angle rotates the cube to a new position in space; only certain angles and axes return its vertex set to itself."
          ) : (
            <Prose>
              {"Rotations form a circle: angles add modulo $2\\pi$."}
            </Prose>
          )}
        </p>
        <p>
          <Prose>
            {
              " Changing the orientation selector jumps between components. There is no continuous path from $determinant +1$ to $-1$ inside an orthogonal group. Displayed decimal entries are approximations; the construction uses sine and cosine. "
            }
          </Prose>
        </p>
      </div>
    </div>
  );
}
export function PermutationLab() {
  const [raw, setRaw] = useState("2,3,1,5,4"),
    [rawB, setRawB] = useState("1,2,3,4,5");
  const parse = (r: string) => r.split(",").map((x) => Number(x) - 1),
    p = parse(raw),
    q = parse(rawB),
    n = p.length,
    ok =
      n >= 2 &&
      n <= 8 &&
      new Set(p).size === n &&
      p.every((x) => Number.isInteger(x) && x >= 0 && x < n),
    okQ =
      q.length === n &&
      new Set(q).size === n &&
      q.every((x) => Number.isInteger(x) && x >= 0 && x < n),
    pp = ok ? p : [0, 1],
    comp = ok && okQ ? q.map((x) => p[x]) : pp;
  const x = (i: number, N: number) => 70 + (i * 420) / (N - 1);
  return (
    <div>
      <div className="lab-controls">
        <label>
          <Prose>{"Permutation $p$, images of 1,2,…"}</Prose>
        </label>
        <input
          aria-label="Permutation p"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <label>
          <Prose>{"Permutation $q$"}</Prose>
        </label>
        <input
          aria-label="Permutation q"
          value={rawB}
          onChange={(e) => setRawB(e.target.value)}
        />
        {(!ok || !okQ) && (
          <p className="error-note">
            <Prose>
              {
                " Use each integer 1 to $n$ once ($2 \\le  n \\le  8$), with the same $n$ in both rows. "
              }
            </Prose>
          </p>
        )}
      </div>
      <svg
        className="math-svg"
        viewBox="0 0 560 330"
        role="img"
        aria-label="Permutation strands"
      >
        {pp.map((v, i) => (
          <g key={i}>
            <path
              d={`M${x(i, pp.length)},55 C${x(i, pp.length)},150 ${x(v, pp.length)},170 ${x(v, pp.length)},265`}
              stroke={palette[i]}
              fill="none"
              strokeWidth="3"
            />
            <circle cx={x(i, pp.length)} cy="55" r="17" fill={palette[i]} />
            <SvgMath
              x={x(i, pp.length)}
              y="60"
              textAnchor="middle"
              fill="#102331"
            >
              {i + 1}
            </SvgMath>
            <circle cx={x(v, pp.length)} cy="265" r="17" fill={palette[i]} />
            <SvgMath
              x={x(v, pp.length)}
              y="270"
              textAnchor="middle"
              fill="#102331"
            >
              {v + 1}
            </SvgMath>
          </g>
        ))}
      </svg>
      {ok && (
        <div className="lab-controls">
          <M
            block
          >{`p=${cycleTex(p)},\\quad\\operatorname{sgn}(p)=(-1)^{${n}-${cycles(p).length}}=${(n - cycles(p).length) % 2 ? -1 : 1}`}</M>
          {okQ && (
            <M block>{`pq=${cycleTex(comp)}\\quad\\text{(apply q first)}`}</M>
          )}
          <M
            block
          >{`P_p=${matrixTex(p.map((_, i) => p.map((v) => (v === i ? 1 : 0))))}`}</M>
          <p>
            <Prose>
              {
                " Column $j$ is $e_{p(j)}$. Matrix multiplication follows composition: $P_{p}Pq = P_{p}q$. The order is the least common multiple of the cycle lengths, including fixed points. "
              }
            </Prose>
          </p>
        </div>
      )}
    </div>
  );
}
export function RepresentationLab({ lesson }: { lesson: Lesson }) {
  const [mode, setMode] = useState("permutation"),
    [a, setA] = useState(2),
    [b, setB] = useState(-1),
    [c, setC] = useState(1),
    [perm, setPerm] = useState(0);
  const v = [a, b, c],
    perms = [
      [0, 1, 2],
      [1, 2, 0],
      [2, 0, 1],
      [1, 0, 2],
      [2, 1, 0],
      [0, 2, 1],
    ],
    p = perms[perm],
    mean = (a + b + c) / 3,
    w = [0, 0, 0];
  v.forEach((x, i) => (w[p[i]] = x));
  const pos = [
      [150, 110],
      [410, 110],
      [280, 310],
    ],
    bar = (x: number) => x * 23;
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label="Permutation action"
          value={String(perm)}
          onChange={(x) => setPerm(+x)}
          options={perms.map((p, i) => [
            String(i),
            `Apply ${cycleTex(p).replaceAll("\\,", " ")}`,
          ])}
        />
        <span className="lab-tag">
          <Prose>{"Permutation module $\\mathbb R ^{3}$"}</Prose>
        </span>
      </div>
      <svg
        className="math-svg"
        viewBox="0 0 560 410"
        role="img"
        aria-label="Permutation representation on coordinates"
      >
        <polygon
          points="150,110 410,110 280,310"
          fill="#69dbca09"
          stroke="#4b657a"
        />
        {pos.map((q, i) => (
          <g key={i}>
            <circle cx={q[0]} cy={q[1]} r="22" fill={palette[i]} />
            <SvgMath x={q[0]} y={q[1] + 5} textAnchor="middle" fill="#102331">
              {i + 1}
            </SvgMath>
            <rect
              x={q[0] - 18}
              y={Math.min(q[1] - 30, q[1] - 30 - bar(w[i]))}
              width="36"
              height={Math.max(2, Math.abs(bar(w[i])))}
              fill={palette[i]}
              opacity=".55"
            />
            <SvgMath x={q[0] + 35} y={q[1] + 5} fill={palette[i]}>
              {w[i]}
            </SvgMath>
          </g>
        ))}
      </svg>
      <div className="lab-controls">
        <div className="three-cols">
          {[
            [a, setA],
            [b, setB],
            [c, setC],
          ].map(([z, fn], i) => (
            <Range
              key={i}
              label={`v${i + 1}`}
              min={-4}
              max={4}
              value={z as number}
              onChange={fn as any}
            />
          ))}
        </div>
        <M
          block
        >{`v=${matrixTex(v.map((x) => [x]))},\\quad\\rho(g)v=${matrixTex(w.map((x) => [x]))}`}</M>
        <M
          block
        >{`v\\approx\\underbrace{${Number(mean.toFixed(2))}(1,1,1)}_{\\text{constant component}}+\\underbrace{(${v.map((x) => Number((x - mean).toFixed(2))).join(",")})}_{\\text{sum-zero component}}`}</M>
        <p>
          The permutation moves coordinates but preserves their sum. The
          constant line is fixed pointwise; the sum-zero plane maps to itself.
          These invariant pieces give{" "}
          <M>{"\\mathbb R^3=\\mathbb R(1,1,1)\\oplus\\{x_1+x_2+x_3=0\\}"}</M>.
          Decimals above are rounded.
        </p>
        <details>
          <summary>Why averaging produces an invariant projection</summary>
          <M block>
            {
              "P=\\frac1{|G|}\\sum_{g\\in G}\\rho(g),\\quad P(v)=\\overline v(1,1,1)"
            }
          </M>
          <p>
            <Prose>
              {
                " For this transitive permutation representation, averaging redistributes every coordinate equally. $P$ commutes with each $\\rho (g)$, $P^{2}=P$, and its image is the fixed subspace. Maschke’$s$ more general complement proof averages a projection onto a chosen invariant subspace, with $\\rho (g)P_{0}\\rho (g)^{-1}$. "
              }
            </Prose>
          </p>
        </details>
        <details>
          <summary>Real versus complex: a cyclic rotation</summary>
          <M block>
            {
              "R_{2\\pi/3}:\\mathbb R^2\\to\\mathbb R^2,\\quad\\lambda=e^{\\pm2\\pi i/3}"
            }
          </M>
          <p>
            <Prose>
              {
                " A 120° rotation has no invariant real line. Over $\\mathbb C$ it has two eigenlines, so it is irreducible over $\\mathbb R$ but reducible after complexification. Change to the orthogonal machine to see the rotation. "
              }
            </Prose>
          </p>
        </details>
      </div>
    </div>
  );
}
export function CharacterLab({ lesson }: { lesson: Lesson }) {
  const useS4 = lesson.parameters?.group === "S4",
    rows = useS4
      ? [
          [1, 1, 1, 1, 1],
          [1, -1, 1, 1, -1],
          [3, 1, -1, 0, -1],
          [3, -1, -1, 0, 1],
          [2, 0, 2, -1, 0],
        ]
      : [
          [1, 1, 1],
          [1, -1, 1],
          [2, 0, -1],
        ],
    names = useS4
      ? [
          "1",
          "\\operatorname{sgn}",
          "\\operatorname{Std}",
          "\\operatorname{Std}\\otimes\\operatorname{sgn}",
          "V_2",
        ]
      : ["1", "\\operatorname{sgn}", "\\operatorname{Std}"],
    sizes = useS4 ? [1, 6, 3, 8, 6] : [1, 3, 2],
    classes = useS4
      ? ["e", "(12)", "(12)(34)", "(123)", "(1234)"]
      : ["e", "(12)", "(123)"],
    N = sizes.reduce((a, b) => a + b, 0);
  const [a, setA] = useState(2),
    [b, setB] = useState(2),
    prod = rows[a].map((x, i) => x * rows[b][i]),
    mult = rows.map(
      (r) => r.reduce((s, x, i) => s + sizes[i] * x * prod[i], 0) / N,
    );
  return (
    <div>
      <div className="lab-controls">
        <p>
          Finite group <M>{useS4 ? "S_4" : "S_3"}</M>
          <Prose>
            {
              "; representations over $\\mathbb C$. Columns are conjugacy classes, not individual elements. "
            }
          </Prose>
        </p>
      </div>
      <div className="character-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Prose>{"$\\chi$"}</Prose>
              </TableHead>
              {classes.map((x, i) => (
                <TableHead key={x}>
                  <M>{x}</M>
                  <small>size {sizes[i]}</small>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableHead>
                  <M>{names[i]}</M>
                </TableHead>
                {r.map((x, j) => (
                  <TableCell key={j} style={{ color: palette[i] }}>
                    {x}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="lab-controls">
        <div className="two-cols">
          <Choice
            label="First character"
            value={String(a)}
            onChange={(v) => setA(+v)}
            options={names.map((n, i) => [String(i), `$${n}$`])}
          />
          <Choice
            label="Second character"
            value={String(b)}
            onChange={(v) => setB(+v)}
            options={names.map((n, i) => [String(i), `$${n}$`])}
          />
        </div>
        <M block>{`\\chi_{V\\otimes W}=\\chi_V\\chi_W=(${prod.join(",")})`}</M>
        <div className="multiplicities">
          {mult.map((m, i) => (
            <div key={i}>
              <div
                style={{ height: `${24 + m * 36}px`, background: palette[i] }}
              />
              <strong>{m}</strong>
              <M>{names[i]}</M>
            </div>
          ))}
        </div>
        <M
          block
        >{`\\langle\\chi,\\psi\\rangle=\\frac1{${N}}\\sum_C |C|\\chi(C)\\overline{\\psi(C)}`}</M>
        <p>
          <Prose>
            {
              " The bars show exact irreducible multiplicities. Weight by class size; treating all columns equally gives the wrong answer. For $S_{3}$, $Std\\otimes \\operatorname{Std} = 1\\oplus sgn\\oplus \\operatorname{Std}$. "
            }
          </Prose>
        </p>
        {useS4 && (
          <p>
            <Prose>
              {
                " Cube rotations give the character ($3,-1,-1,0,1$), the sign twist of the standard $S_{4}$ representation. The four-diagonal permutation module instead splits as $1\\oplus \\operatorname{Std}$. "
              }
            </Prose>
          </p>
        )}
      </div>
    </div>
  );
}
