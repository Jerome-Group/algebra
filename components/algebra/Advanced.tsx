"use client";
import { SvgMath } from "./SvgMath";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { Range, Choice } from "./Groups";
import { CubeScene } from "./Cube";
import {
  mod,
  gcd,
  matrixTex,
  cycleTex,
  divisors,
  palette,
  type Lesson,
} from "@/lib/algebra/engine";
export function QuadraticLab() {
  const [D, setD] = useState(-3),
    [a, setA] = useState(1),
    [b, setB] = useState(1),
    [full, setFull] = useState(true);
  const half = mod(D, 4) === 1 && full,
    wx = half ? 0.5 : 0,
    wy = Math.sqrt(-D) / (half ? 2 : 1),
    re = a + b * wx,
    im = b * wy,
    norm = a * a + (half ? a * b + ((1 - D) * b * b) / 4 : -D * b * b),
    trace = 2 * a + (half ? b : 0),
    scale = Math.min(29, 155 / Math.max(1, Math.abs(im)));
  const omega = half ? `\\frac{1+\\sqrt{${D}}}{2}` : `\\sqrt{${D}}`;
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label={"Quadratic radicand $D$"}
          value={String(D)}
          onChange={(v) => setD(+v)}
          options={[-1, -2, -3, -5, -7].map((d) => [String(d), `$D = ${d}$`])}
        />
        <Choice
          label="Lattice ring"
          value={full ? "integers" : "naive"}
          onChange={(v) => setFull(v === "integers")}
          options={[
            ["integers", "Full ring of integers"],
            ["naive", "$\\mathbb Z[\\sqrt D]$ comparison"],
          ]}
        />
      </div>
      <svg
        className="math-svg"
        viewBox="0 0 560 400"
        role="img"
        aria-label="Imaginary quadratic integer lattice"
      >
        <line x1="20" y1="200" x2="540" y2="200" stroke="#466173" />
        <line x1="280" y1="20" x2="280" y2="380" stroke="#466173" />
        {Array.from({ length: 17 }, (_, i) =>
          Array.from({ length: 13 }, (_, j) => {
            const x = i - 8,
              y = j - 6,
              px = 280 + (x + y * wx) * scale,
              py = 200 - y * wy * scale;
            if (px < 15 || px > 545 || py < 20 || py > 380) return null;
            return (
              <circle
                key={`${i}-${j}`}
                cx={px}
                cy={py}
                r="3"
                fill={half && y % 2 !== 0 ? "#a7a1ff" : "#628f9d"}
              />
            );
          }),
        )}
        <line
          x1="280"
          y1="200"
          x2={280 + re * scale}
          y2={200 - im * scale}
          stroke="#69dbca"
          strokeWidth="3"
        />
        <circle
          cx={280 + re * scale}
          cy={200 - im * scale}
          r="8"
          fill="#69dbca"
        />
        <SvgMath x={292 + re * scale} y={194 - im * scale} fill="#69dbca">
          z
        </SvgMath>
        <circle
          cx={280 + re * scale}
          cy={200 + im * scale}
          r="6"
          fill="#e2bd78"
        />
        <SvgMath x={292 + re * scale} y={214 + im * scale} fill="#e2bd78">
          {"\\bar z"}
        </SvgMath>
      </svg>
      <div className="lab-controls">
        <div className="two-cols">
          <Range
            label={"Coefficient $a$"}
            min={-3}
            max={3}
            value={a}
            onChange={setA}
          />
          <Range
            label={"Coefficient $b$"}
            min={-3}
            max={3}
            value={b}
            onChange={setB}
          />
        </div>
        <M block>{`z=a+b\\omega,\\quad\\omega=${omega}`}</M>
        <M block>{`\\operatorname{Tr}(z)=${trace},\\qquad N(z)=${norm}`}</M>
        <p>
          <Prose>
            {half
              ? "Alternate rows shift by half a unit. The purple points are algebraic integers missing from $\\mathbb Z[\\sqrt D]$."
              : "These points are integer combinations of $1$ and $\\sqrt D$."}
          </Prose>
          <Prose>
            {
              " For squarefree $D\\equiv1\\pmod4$, use $\\omega=(1+\\sqrt D)/2$; otherwise use $\\sqrt D$. The picture covers imaginary quadratic fields, $D<0$."
            }
          </Prose>
        </p>
      </div>
    </div>
  );
}
export function CyclicLab() {
  const [n, setN] = useState(4),
    [power, setPower] = useState(1),
    t = (2 * Math.PI * power) / n,
    c = Math.cos(t),
    s = Math.sin(t),
    m = [
      [c, -s, 0],
      [s, c, 0],
      [0, 0, 1],
    ];
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label="Cyclic group order"
          value={String(n)}
          onChange={(v) => {
            setN(+v);
            setPower(1);
          }}
          options={[3, 4, 5, 6, 8].map((n) => [
            String(n),
            `$C_{${n}}$ on $\\mathbb R^3$`,
          ])}
        />
        <span className="lab-tag">Axis and rotation plane</span>
      </div>
      <CubeScene matrix={m} set="vertices" selected={0} onSelect={() => {}} />
      <div className="lab-controls">
        <Range
          label={"Exponent $k$ in $r^k$"}
          value={power}
          min={0}
          max={n - 1}
          onChange={setPower}
        />
        <M block>{`\\rho(r^{${power}})\\approx${matrixTex(m)}`}</M>
        <M
          block
        >{`\\operatorname{Spec}_{\\mathbb C}(\\rho(r^{${power}}))=\\{1,e^{2\\pi i ${power}/${n}},e^{-2\\pi i ${power}/${n}}\\}`}</M>
        <M
          block
        >{`\\chi(r^{${power}})=1+2\\cos(2\\pi ${power}/${n})\\approx ${(1 + 2 * c).toFixed(4)}`}</M>
        <p>
          <Prose>
            {
              " The z-axis is fixed pointwise. The xy-plane is invariant and rotates. Over $\\mathbb C$, that plane splits into two eigenlines with eigenvalues on the unit circle. The generator has no real eigenline in the plane for $n\\ge 3$. "
            }
          </Prose>
        </p>
        <div className="cyclic-spectrum">
          {Array.from({ length: n }, (_, k) => (
            <button
              key={k}
              className={power === k ? "active" : ""}
              onClick={() => setPower(k)}
            >
              <span>
                <Prose>{" $r$"}</Prose>
                <sup>{k}</sup>
              </span>
              <strong>
                {Number((1 + 2 * Math.cos((2 * Math.PI * k) / n)).toFixed(3))}
              </strong>
            </button>
          ))}
        </div>
        <p>
          <Prose>
            {
              " The numbers are the character values (rounded when necessary). For $C_{4}$, they are exactly ($3,1,-1,1$). The cube serves as a frame showing the ambient linear action; these angles are not all cube symmetries. "
            }
          </Prose>
        </p>
      </div>
    </div>
  );
}
export function MatrixFiniteLab() {
  const mats = Array.from({ length: 16 }, (_, i) => [
      [i & 1, (i >> 1) & 1],
      [(i >> 2) & 1, (i >> 3) & 1],
    ]).filter((m) => mod(m[0][0] * m[1][1] - m[0][1] * m[1][0], 2) === 1),
    v = [
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [index, setIndex] = useState(0),
    m = mats[index],
    p = v.map((x) =>
      v.findIndex((y) =>
        y.every((z, i) => z === mod(m[i][0] * x[0] + m[i][1] * x[1], 2)),
      ),
    ),
    pos = [
      [130, 290],
      [280, 90],
      [430, 290],
    ];
  return (
    <div>
      <div className="lab-controls">
        <M block>{"|\\mathrm{GL}_2(\\mathbb F_2)|=(2^2-1)(2^2-2)=6"}</M>
        <p>
          Choose a nonzero first column (3 choices), then a second column
          outside its span (2 choices). Act on the three nonzero vectors.
        </p>
      </div>
      <svg
        className="math-svg"
        viewBox="0 0 560 380"
        role="img"
        aria-label="GL2 over F2 acting on three nonzero vectors"
      >
        <polygon
          points="130,290 280,90 430,290"
          fill="#69dbca10"
          stroke="#3c5f70"
        />
        {v.map((x, i) => (
          <g key={i}>
            <circle
              cx={pos[p[i]][0]}
              cy={pos[p[i]][1]}
              r="25"
              fill={palette[i]}
            />
            <SvgMath
              x={pos[p[i]][0]}
              y={pos[p[i]][1] + 5}
              textAnchor="middle"
              fill="#132e3a"
            >
              {x.join(",")}
            </SvgMath>
          </g>
        ))}
      </svg>
      <div className="lab-controls">
        <div className="finite-matrices">
          {mats.map((m, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={index === i ? "active" : ""}
            >
              <M>{matrixTex(m)}</M>
            </button>
          ))}
        </div>
        <M block>{`A=${matrixTex(m)},\\quad\\pi(A)=${cycleTex(p)}`}</M>
        <p>
          <Prose>
            {
              " Only the identity fixes all three nonzero vectors, so this action is faithful. Both $\\operatorname{GL}_{2}(\\mathbb F _{2})$ and $S_{3}$ have six elements; the resulting injection is an isomorphism. "
            }
          </Prose>
        </p>
      </div>
    </div>
  );
}
export function SylowCalculator() {
  const [N, setN] = useState(30),
    [p, setP] = useState(5);
  let q = 1;
  while (N % (q * p) === 0) q *= p;
  const candidates = q === 1 ? [1] : divisors(N / q).filter((d) => d % p === 1);
  return (
    <div className="lab-controls sylow-calculator">
      <label className="note-label">
        Sylow arithmetic for any proposed order
      </label>
      <Range
        label={"Group order $|G|$"}
        value={N}
        min={2}
        max={120}
        onChange={setN}
      />
      <Choice
        label={"Prime $p$"}
        value={String(p)}
        onChange={(v) => setP(+v)}
        options={[2, 3, 5, 7, 11].map((x) => [String(x), `$p = ${x}$`])}
      />
      <M block>{`|G|=${q}\\cdot${N / q},\\quad |P|=${q}`}</M>
      <M block>{`n_${p}\\mid ${N / q},\\quad n_${p}\\equiv1\\pmod{${p}}`}</M>
      <p>
        Necessary candidates for the number of Sylow {p}-subgroups:{" "}
        <b>{candidates.join(", ")}</b>.{" "}
        {q === 1
          ? "Since p does not divide |G|, the only Sylow p-subgroup is the trivial group."
          : candidates.length === 1
            ? "The subgroup is unique and therefore normal."
            : "These arithmetic constraints are necessary, not sufficient to construct a group or realize every candidate."}
      </p>
    </div>
  );
}
export function SemidirectLab() {
  const [n, setN] = useState(5),
    [a, setA] = useState(1),
    [b, setB] = useState(1),
    [c, setC] = useState(2),
    [d, setD] = useState(0),
    [twisted, setTwisted] = useState(true),
    x = mod(a + (twisted && b ? -c : c), n),
    y = mod(b + d, 2),
    rx = mod(c + (twisted && d ? -a : a), n);
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label="Product type"
          value={twisted ? "semi" : "direct"}
          onChange={(v) => setTwisted(v === "semi")}
          options={[
            ["semi", "Cₙ ⋊ C₂ · inversion action"],
            ["direct", "Cₙ × C₂ · trivial action"],
          ]}
        />
      </div>
      <svg
        className="math-svg"
        viewBox="0 0 560 330"
        role="img"
        aria-label="Two layers of a semidirect product"
      >
        {[0, 1].map((layer) =>
          Array.from({ length: n }, (_, i) => (
            <g key={`${layer}-${i}`}>
              <circle
                cx={65 + (i * 430) / (n - 1)}
                cy={90 + layer * 150}
                r="22"
                fill={
                  i === x && layer === y
                    ? "#69dbca"
                    : layer
                      ? "#3d3862"
                      : "#294552"
                }
              />
              <SvgMath
                x={65 + (i * 430) / (n - 1)}
                y={95 + layer * 150}
                textAnchor="middle"
                fill={i === x && layer === y ? "#102e32" : "#becdd9"}
              >
                {i},{layer}
              </SvgMath>
            </g>
          )),
        )}
      </svg>
      <div className="lab-controls">
        <Range
          label={"Cyclic modulus $n$"}
          min={3}
          max={8}
          value={n}
          onChange={(v) => {
            setN(v);
            setA(1);
            setC(2);
          }}
        />
        <div className="two-cols">
          <Range label={"$a$"} min={0} max={n - 1} value={a} onChange={setA} />
          <Range label={"$b$"} min={0} max={1} value={b} onChange={setB} />
          <Range label={"$c$"} min={0} max={n - 1} value={c} onChange={setC} />
          <Range label={"$d$"} min={0} max={1} value={d} onChange={setD} />
        </div>
        <M
          block
        >{`(a,b)(c,d)=(a+${twisted ? "(-1)^b" : ""}c,b+d)=(${x},${y})`}</M>
        <M block>{`(c,d)(a,b)=(${rx},${y})`}</M>
        <p>
          {twisted
            ? "When b=1, the left factor reverses the direction of the second move. The two products above need not agree. This is the dihedral group Dₙ of order 2n."
            : "With a trivial action, both coordinates add independently and the product is abelian."}
        </p>
      </div>
    </div>
  );
}
export function ModuleLab() {
  const [a, setA] = useState(2),
    [b, setB] = useState(1),
    [x, setX] = useState(2),
    [y, setY] = useState(1),
    [off, setOff] = useState(0);
  const m = [
      [a, off],
      [0, b],
    ],
    v = [x, y],
    w = [a * x + off * y, b * y],
    scale = Math.min(42, 175 / Math.max(4, ...w.map(Math.abs))),
    pos = (v: number[]) => [220 + v[0] * scale, 160 - v[1] * scale];
  return (
    <div>
      <div className="lab-intro">
        <M block>
          {"R=\\mathbb R[t],\\quad V=\\mathbb R^2,\\quad t\\cdot v=Tv"}
        </M>
        <p>
          <Prose>
            {
              " A polynomial acts by substitution: $f(t)\\cdot v=f(T)v$. $T$ need not be invertible. This is a ring module, even when $T$ is not a group action. "
            }
          </Prose>
        </p>
      </div>
      <svg
        className="math-svg"
        viewBox="0 0 440 320"
        role="img"
        aria-label="An upper triangular operator preserves the horizontal line; the quotient remembers height"
      >
        {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
          <g key={k}>
            <line
              x1={220 + k * scale}
              y1="20"
              x2={220 + k * scale}
              y2="300"
              stroke="#e2dfd8"
            />
            <line
              x1="20"
              y1={160 + k * scale}
              x2="420"
              y2={160 + k * scale}
              stroke="#e2dfd8"
            />
            {k !== 0 && (
              <SvgMath
                x={220 + k * scale}
                y="184"
                textAnchor="middle"
                fontSize={13}
              >
                {k}
              </SvgMath>
            )}
          </g>
        ))}
        <line
          x1="20"
          y1="160"
          x2="420"
          y2="160"
          stroke="#8858d1"
          strokeWidth="2"
        />
        <line x1="220" y1="20" x2="220" y2="300" stroke="#77727c" />
        <SvgMath x="270" y="212" fontSize={15}>
          {"W=\\operatorname{span}(1,0)"}
        </SvgMath>
        {[v, w].map((p, i) => (
          <g key={i}>
            <line
              x1="220"
              y1="160"
              x2={pos(p)[0]}
              y2={pos(p)[1]}
              stroke={i ? "#ee502e" : "#171827"}
              strokeWidth="3"
            />
            <circle
              cx={pos(p)[0]}
              cy={pos(p)[1]}
              r="5"
              fill={i ? "#ee502e" : "#171827"}
            />
            <SvgMath
              x={Math.min(pos(p)[0] + 8, 410)}
              y={pos(p)[1] + (i ? 30 : -14)}
              fontSize={20}
              textAnchor={pos(p)[0] > 310 ? "end" : "start"}
            >{`${i ? "Tv" : "v"}=(${p.join(",")})`}</SvgMath>
          </g>
        ))}
      </svg>
      <div className="lab-controls">
        <div className="three-cols">
          <Range
            label={"$T_{11}$"}
            min={-2}
            max={2}
            value={a}
            onChange={setA}
          />
          <Range
            label={"$T_{12}$"}
            min={-2}
            max={2}
            value={off}
            onChange={setOff}
          />
          <Range
            label={"$T_{22}$"}
            min={-2}
            max={2}
            value={b}
            onChange={setB}
          />
        </div>
        <div className="two-cols">
          <Range
            label={"Vector $x$"}
            min={-2}
            max={2}
            value={x}
            onChange={setX}
          />
          <Range
            label={"Vector $y$"}
            min={-2}
            max={2}
            value={y}
            onChange={setY}
          />
        </div>
        <M
          block
        >{`T=${matrixTex(m)},\\quad Tv=${matrixTex(w.map((x) => [x]))}`}</M>
        <p>
          <Prose>
            {
              " The x-axis $W$ is invariant because $T(x,0)=(ax,0)$. A quotient class modulo $W$ remembers only $y$; the induced operator on $V/W$ is multiplication by "
            }
          </Prose>
          {b}
          <Prose>
            {
              ". Change $T_{12}$: it changes the horizontal output while leaving the quotient action unchanged. "
            }
          </Prose>
        </p>
      </div>
    </div>
  );
}
export function SquareModesLab() {
  const [r, setR] = useState(1),
    [s, setS] = useState(0),
    [v, setV] = useState([3, 1, -1, 1]),
    [component, setComponent] = useState("all");
  const mean = v.reduce((a, b) => a + b, 0) / 4,
    alt = (v[0] - v[1] + v[2] - v[3]) / 4,
    u = (v[0] - v[2]) / 2,
    w = (v[1] - v[3]) / 2,
    parts = {
      constant: [mean, mean, mean, mean],
      alternating: [alt, -alt, alt, -alt],
      contrast: [u, w, -u, -w],
      all: v,
    },
    input = parts[component as keyof typeof parts],
    p = Array.from({ length: 4 }, (_, i) => mod(r + (s ? -i : i), 4)),
    out = [0, 0, 0, 0];
  input.forEach((x, i) => (out[p[i]] = x));
  const pos = [
    [160, 80],
    [400, 80],
    [400, 320],
    [160, 320],
  ];
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label="Invariant component"
          value={component}
          onChange={setComponent}
          options={[
            ["all", "Full vector"],
            ["constant", "Constant line"],
            ["alternating", "Alternating line"],
            ["contrast", "Opposite contrasts"],
          ]}
        />
        <button onClick={() => setR(mod(r + 1, 4))}>
          <Prose>{"Apply $r$"}</Prose>
        </button>
        <button
          onClick={() => {
            setR(mod(-r, 4));
            setS(1 - s);
          }}
        >
          <Prose>{" Apply $s$ "}</Prose>
        </button>
      </div>
      <svg
        className="math-svg"
        viewBox="0 0 560 400"
        role="img"
        aria-label="Invariant patterns on four square vertices"
      >
        <polygon
          points="160,80 400,80 400,320 160,320"
          fill="#69dbca08"
          stroke="#507281"
        />
        {pos.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="22" fill={palette[i]} />
            <SvgMath x={p[0]} y={p[1] + 5} textAnchor="middle" fill="#102d38">
              {out[i]}
            </SvgMath>
            <SvgMath x={p[0]} y={p[1] + 45} textAnchor="middle" fill="#91b2c2">
              {`\\text{vertex }${i + 1}`}
            </SvgMath>
          </g>
        ))}
      </svg>
      <div className="lab-controls">
        <div className="two-cols">
          {v.map((x, i) => (
            <Range
              key={i}
              label={`Coefficient v${i + 1}`}
              value={x}
              min={-3}
              max={3}
              onChange={(x) => setV((v) => v.map((y, j) => (i === j ? x : y)))}
            />
          ))}
        </div>
        <M
          block
        >{`v=${mean}(1,1,1,1)+${alt}(1,-1,1,-1)+(${u},${w},${-u},${-w})`}</M>
        <p>
          The first line is fixed. The alternating line may change sign but
          stays a line. The two-dimensional contrast pattern changes within its
          plane. All three are invariant under every rotation and reflection,
          not merely the currently selected element.
        </p>
        <M block>
          {
            "\\mathbb R^4=V_{\\rm constant}\\oplus V_{\\rm alternating}\\oplus V_{\\rm contrast}"
          }
        </M>
        <p>
          Averaging a vector over all eight group elements projects it onto the
          constant line. The mean {mean} is unchanged by every permutation.
        </p>
      </div>
    </div>
  );
}
