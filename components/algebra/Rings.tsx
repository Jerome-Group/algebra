"use client";
import { useState } from "react";
import { mod, gcd, divisors, palette, type Lesson } from "@/lib/algebra/engine";
import { Math as M } from "./Math";
import { Range, Choice } from "./Groups";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
export function RingLab({ lesson }: { lesson: Lesson }) {
  const [n, setN] = useState(Number(lesson.parameters?.n) || 12),
    [a, setA] = useState(2),
    [b, setB] = useState(3),
    [op, setOp] = useState("multiply"),
    [d, setD] = useState(2);
  const x = mod(a, n),
    y = mod(b, n),
    ds = divisors(n),
    idealD = ds.includes(d) ? d : 1,
    ideal = Array.from({ length: n / idealD }, (_, i) => i * idealD),
    units = Array.from({ length: n }, (_, i) => i).filter(
      (i) => gcd(i, n) === 1,
    ),
    powers: number[] = [];
  let power = 1;
  for (let i = 0; i < 12; i++) {
    power = mod(power * x, n);
    powers.push(power);
  }
  const nil = powers.includes(0),
    rad = ds
      .filter((p) => p > 1 && divisors(p).length === 2)
      .reduce((a, p) => a * p, 1);
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label="Ring modulus"
          value={String(n)}
          onChange={(v) => {
            setN(+v);
            setD(1);
          }}
          options={[4, 5, 6, 7, 8, 9, 10, 12, 16, 18].map((i) => [
            String(i),
            `ℤ / ${i}ℤ`,
          ])}
        />
        <Choice
          label="Operation"
          value={op}
          onChange={setOp}
          options={[
            ["multiply", "Multiplication"],
            ["add", "Addition"],
          ]}
        />
        <span className="lab-tag">Exact residues</span>
      </div>
      <div className="ring-map">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{op === "add" ? "+" : "×"}</TableHead>
              {Array.from({ length: n }, (_, i) => (
                <TableHead key={i}>{i}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: n }, (_, i) => (
              <TableRow key={i}>
                <TableHead>{i}</TableHead>
                {Array.from({ length: n }, (_, j) => {
                  const z = mod(op === "add" ? i + j : i * j, n);
                  return (
                    <TableCell
                      key={j}
                      onClick={() => {
                        setA(i);
                        setB(j);
                      }}
                      className={i === x && j === y ? "chosen" : ""}
                      style={{
                        background:
                          palette[z % 12] + (ideal.includes(z) ? "4d" : "15"),
                        color: z === 0 ? "#fff" : palette[z % 12],
                      }}
                    >
                      {z}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="lab-controls">
        <div className="two-cols">
          <Range
            label="Element a"
            value={x}
            min={0}
            max={n - 1}
            onChange={setA}
          />
          <Range
            label="Element b"
            value={y}
            min={0}
            max={n - 1}
            onChange={setB}
          />
        </div>
        <M
          block
        >{`[${x}]${op === "add" ? "+" : "\\cdot"}[${y}]=[${mod(op === "add" ? x + y : x * y, n)}]\\quad\\text{in }\\mathbb Z/${n}\\mathbb Z`}</M>
        <div className="stat-strip">
          <div>
            <strong>{gcd(x, n) === 1 ? "yes" : "no"}</strong>
            <span>a is a unit</span>
          </div>
          <div>
            <strong>{x !== 0 && gcd(x, n) > 1 ? "yes" : "no"}</strong>
            <span>a is a zero divisor</span>
          </div>
          <div>
            <strong>{nil ? "yes" : "no"}</strong>
            <span>a is nilpotent</span>
          </div>
        </div>
        <p>
          Units: {units.join(", ")}. A unit has an inverse because{" "}
          <M>{`\\gcd(a,${n})=1`}</M>. A nonzero zero divisor has a nonzero
          multiplier whose product is 0.
        </p>
        <label>Successive powers of a</label>
        <div className="power-chain">
          {powers.map((p, i) => (
            <span key={i} className={p === 0 ? "zero" : ""}>
              <small>{i + 1}</small>
              {p}
            </span>
          ))}
        </div>
        <Choice
          label="Principal ideal"
          value={String(idealD)}
          onChange={(v) => setD(+v)}
          options={ds.map((i) => [
            String(i),
            `Ideal (${i}) · ${n / i} elements`,
          ])}
        />
        <M
          block
        >{`(${idealD})=\\{${ideal.join(",")}\\},\\quad (\\mathbb Z/${n}\\mathbb Z)/(${idealD})\\cong\\mathbb Z/${idealD}\\mathbb Z`}</M>
        <p>
          The brighter cells land in this ideal. Multiplying any element of the
          ideal by any ring element stays inside it.{" "}
          {idealD > 1 && divisors(idealD).length === 2
            ? "This ideal is both maximal and prime; its quotient is a field."
            : "This ideal is neither maximal nor prime (the quotient is not a domain, or the ideal is the whole ring)."}{" "}
          The Jacobson radical and nilradical of this finite ring are both the
          ideal ({rad}).
        </p>
        <details>
          <summary>Ideal arithmetic and chains</summary>
          <p>
            For divisors d,e of n, (d)+(e)=(gcd(d,e)), (d)∩(e)=(lcm(d,e)), and
            (d)(e)=(gcd(de,n)). Inclusion reverses divisibility. Every chain
            stabilizes in a finite ring; this does not test an arbitrary
            infinite ring.
          </p>
          <M
            block
          >{`(${gcd(x, n)})+(${gcd(y, n)})=(${gcd(gcd(x, y), n)}),\\quad (${x})(${y})=(${gcd(x * y, n)})`}</M>
        </details>
      </div>
    </div>
  );
}
export function ProductLab({ lesson }: { lesson: Lesson }) {
  const [m, setM] = useState(Number(lesson.parameters?.m) || 3),
    [n, setN] = useState(Number(lesson.parameters?.n) || 4),
    [a, setA] = useState(0),
    [twist, setTwist] = useState(lesson.parameters?.mode === "semidirect");
  const good = gcd(m, n) === 1,
    L = m * n,
    seq = Array.from({ length: L }, (_, i) => [i % m, i % n]),
    seen = new Set(seq.map((x) => x.join(",")));
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label="First modulus"
          value={String(m)}
          onChange={(v) => {
            setM(+v);
            setA(0);
          }}
          options={[2, 3, 4, 5, 6].map((x) => [
            String(x),
            `First modulus ${x}`,
          ])}
        />
        <Choice
          label="Second modulus"
          value={String(n)}
          onChange={(v) => {
            setN(+v);
            setA(0);
          }}
          options={[2, 3, 4, 5, 6].map((x) => [
            String(x),
            `Second modulus ${x}`,
          ])}
        />
      </div>
      <svg
        className="math-svg"
        viewBox="0 0 560 430"
        aria-label="Product group grid"
        role="img"
      >
        {Array.from({ length: m }, (_, x) =>
          Array.from({ length: n }, (_, y) => {
            const active = seq[a % L][0] === x && seq[a % L][1] === y;
            return (
              <g
                key={`${x}-${y}`}
                onClick={() => {
                  const i = seq.findIndex((p) => p[0] === x && p[1] === y);
                  if (i >= 0) setA(i);
                }}
              >
                <rect
                  x={70 + (x * 420) / m}
                  y={50 + (y * 310) / n}
                  width={360 / m}
                  height={260 / n}
                  rx="9"
                  fill={
                    active
                      ? "#69dbca"
                      : seen.has(`${x},${y}`)
                        ? "#294151"
                        : "#182632"
                  }
                  stroke={active ? "#b6fff0" : "#3c5366"}
                />
                <text
                  x={70 + (x * 420) / m + 180 / m}
                  y={50 + (y * 310) / n + 130 / n + 5}
                  textAnchor="middle"
                  fill={active ? "#102331" : "#c5d6e3"}
                >
                  {x}, {y}
                </text>
              </g>
            );
          }),
        )}
      </svg>
      <div className="lab-controls">
        <Range
          label="Integer / diagonal step a"
          value={a % L}
          min={0}
          max={L - 1}
          onChange={setA}
        />
        <M
          block
        >{`[${a % L}]_{${L}}\\longmapsto ([${a % m}]_{${m}},[${a % n}]_{${n}})`}</M>
        <p>
          The diagonal step (1,1) visits {seen.size} of {L} points before
          repeating.{" "}
          {good
            ? "The moduli are coprime, so this map is both a group and a unital ring isomorphism."
            : "The moduli share a factor, so the map is not an isomorphism: some pairs cannot occur."}
        </p>
        <M
          block
        >{`\\operatorname{ord}(1,1)=\\operatorname{lcm}(${m},${n})=${L / gcd(m, n)}`}</M>
        <details open={twist}>
          <summary onClick={() => setTwist(!twist)}>
            What a semidirect product changes
          </summary>
          <p>
            In a direct product, the first coordinate always adds normally. In
            Dₘ = Cₘ ⋊ C₂, the second coordinate reverses that addition when it
            equals 1:
          </p>
          <M block>{"(a,b)(c,d)=(a+(-1)^b c,\\ b+d)"}</M>
          <p>
            Here a,c are modulo m and b,d modulo 2. For m&gt;2,
            (0,1)(1,0)=(−1,1) whereas (1,0)(0,1)=(1,1). Explore these products
            in the dihedral group machine.
          </p>
        </details>
      </div>
    </div>
  );
}
const polyText = (a: number[]) =>
  a
    .map((c, i) =>
      c === 0
        ? ""
        : `${c < 0 ? "-" : "+"}${Math.abs(c) === 1 && i > 0 ? "" : Math.abs(c)}${i === 0 ? "" : i === 1 ? "X" : `X^{${i}}`}`,
    )
    .reverse()
    .join("")
    .replace(/^\+/, "") || "0";
const trim = (a: number[]) => {
  while (a.length > 1 && a.at(-1) === 0) a.pop();
  return a;
};
const mul = (a: number[], b: number[]) => {
  const c = Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (c[i + j] += x * y)));
  return trim(c);
};
export function PolynomialLab({ lesson }: { lesson: Lesson }) {
  const [raw, setRaw] = useState(
      ((lesson.parameters?.coefficients as number[]) || [1, 2, 1]).join(","),
    ),
    [rawB, setRawB] = useState(
      (
        (lesson.parameters?.other as number[]) ||
        (lesson.parameters?.modulus as number[]) || [1, 1]
      ).join(","),
    ),
    [p, setP] = useState(0),
    [shift, setShift] = useState(1),
    [prime, setPrime] = useState(2);
  const parse = (s: string) => s.split(",").map((x) => Number(x.trim()));
  let a = parse(raw),
    b = parse(rawB),
    valid =
      a.length <= 9 &&
      b.length <= 9 &&
      a.every(Number.isFinite) &&
      b.every(Number.isFinite) &&
      a.every(Number.isInteger) &&
      b.every(Number.isInteger) &&
      a.every((x) => Math.abs(x) <= 100) &&
      b.every((x) => Math.abs(x) <= 100);
  if (!valid) {
    a = [0];
    b = [0];
  }
  if (p) {
    a = a.map((x) => mod(x, p));
    b = b.map((x) => mod(x, p));
  }
  const c = mul(a, b).map((x) => (p ? mod(x, p) : x)),
    roots = p
      ? Array.from({ length: p }, (_, i) => i).filter(
          (x) =>
            mod(
              a.reduce((s, v, i) => s + v * x ** i, 0),
              p,
            ) === 0,
        )
      : [];
  const content = a.reduce((s, x) => gcd(s, x), 0);
  a = trim(a);
  b = trim(b);
  const degreeA = a.length - 1,
    leading = b.at(-1)!;
  const invertible = p ? gcd(leading, p) === 1 : Math.abs(leading) === 1;
  let divisionSafe = true;
  let quotient = [0],
    remainder = [...a],
    steps: string[] = [];
  if (invertible && b.some(Boolean)) {
    quotient = Array(Math.max(1, a.length - b.length + 1)).fill(0);
    let limit = 20;
    const inv = p
      ? Array.from({ length: p }, (_, i) => i).find(
          (i) => mod(i * leading, p) === 1,
        )!
      : 1 / leading;
    while (remainder.some(Boolean) && remainder.length >= b.length && limit--) {
      const power = remainder.length - b.length,
        coeff = p ? mod(remainder.at(-1)! * inv, p) : remainder.at(-1)! * inv;
      if (!Number.isSafeInteger(coeff)) divisionSafe = false;
      quotient[power] = coeff;
      steps.push(`${coeff}X^{${power}}`);
      b.forEach((x, i) => {
        remainder[i + power] -= coeff * x;
        if (!Number.isSafeInteger(remainder[i + power])) divisionSafe = false;
        if (p) remainder[i + power] = mod(remainder[i + power], p);
      });
      trim(remainder);
    }
    trim(quotient);
  }
  const choose = (n: number, k: number) => {
    let a = 1;
    for (let j = 1; j <= k; j++) a = (a * (n - j + 1)) / j;
    return a;
  };
  const shifted = a.map((_, j) =>
    a.reduce(
      (sum, c, i) => (i >= j ? sum + c * choose(i, j) * shift ** (i - j) : sum),
      0,
    ),
  );
  const eisenstein = (f: number[]) =>
    f.length > 1 &&
    mod(f.at(-1)!, prime) !== 0 &&
    f.slice(0, -1).every((x) => mod(x, prime) === 0) &&
    mod(f[0], prime * prime) !== 0;
  return (
    <div>
      <div className="lab-controls">
        <label>Coefficients of f, constant term first</label>
        <input
          aria-label="Polynomial f coefficients"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="1,2,1"
        />
        <label>Coefficients of g, constant term first</label>
        <input
          aria-label="Polynomial g coefficients"
          value={rawB}
          onChange={(e) => setRawB(e.target.value)}
        />
        <Choice
          label="Coefficient ring"
          value={String(p)}
          onChange={(v) => setP(+v)}
          options={[
            ["0", "Integer coefficients ℤ"],
            ["2", "Finite field 𝔽₂"],
            ["3", "Finite field 𝔽₃"],
            ["5", "Finite field 𝔽₅"],
            ["7", "Finite field 𝔽₇"],
            ["4", "Residue ring ℤ/4ℤ"],
          ]}
        />
        {!valid && (
          <p className="error-note">
            Enter 1–9 integer coefficients, each between −100 and 100, separated
            by commas.
          </p>
        )}
        <M block>{`f=${polyText(a)},\\quad g=${polyText(b)}`}</M>
      </div>
      <div
        className="convolution-grid"
        style={{
          gridTemplateColumns: `repeat(${b.length + 1},minmax(42px,1fr))`,
        }}
      >
        <span>×</span>
        {b.map((v, i) => (
          <span key={i}>
            <M>{polyText(Array(i).fill(0).concat([v]))}</M>
          </span>
        ))}
        {a.map((v, i) => (
          <div className="contents" key={i}>
            <span>
              <M>{polyText(Array(i).fill(0).concat([v]))}</M>
            </span>
            {b.map((w, j) => (
              <span
                key={j}
                style={{
                  color: palette[(i + j) % 12],
                  background: palette[(i + j) % 12] + "19",
                }}
              >
                <M>
                  {polyText(
                    Array(i + j)
                      .fill(0)
                      .concat([p ? mod(v * w, p) : v * w]),
                  )}
                </M>
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="lab-controls">
        <M block>{`fg=${polyText(c)}`}</M>
        <p>
          Terms with the same color contribute to the same coefficient.
          Multiplication is convolution:{" "}
          <M>{"[X^k](fg)=\\sum_{i+j=k}a_i b_j"}</M>.
        </p>
        {p ? (
          <p>
            Roots of f {p === 4 ? "modulo 4" : `in 𝔽${p}`} :{" "}
            {roots.length ? roots.join(", ") : "none"}.{" "}
            {p === 4
              ? "This coefficient ring has zero divisors: root bounds and field irreducibility tests need not hold. Try f=2X."
              : "For degree 2 or 3, no root is equivalent to irreducibility over this field. For higher degree it is not enough."}
          </p>
        ) : (
          <p>
            The content of f is {content}.{" "}
            {content > 1
              ? `Dividing all coefficients by ${content} produces its primitive part.`
              : "A nonzero integer polynomial with content 1 is primitive."}
          </p>
        )}
        <details
          open={["divide", "quotient", "roots"].includes(
            String(lesson.parameters?.mode),
          )}
        >
          <summary>Divide f by g / reduce modulo g</summary>
          {b.every((x) => x === 0) ? (
            <p className="error-note">
              The zero polynomial cannot be a divisor.
            </p>
          ) : invertible && !divisionSafe ? (
            <p className="error-note">
              These coefficients exceed the exact integer range during division.
              Use smaller integer coefficients or a finite coefficient ring.
            </p>
          ) : invertible ? (
            <>
              <M
                block
              >{`f=(${polyText(quotient)})g+(${polyText(remainder)})`}</M>
              <p>
                The quotient is <M>{polyText(quotient)}</M>, and the remainder
                is <M>{polyText(remainder)}</M>. Each step cancels the current
                leading term. Thus f has the same residue class as this
                remainder modulo (g).
              </p>
              <div className="division-terms">
                {steps.map((t, i) => (
                  <span key={i}>
                    Step {i + 1}: subtract <M>{`(${t})g`}</M>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="error-note">
              The divisor's leading coefficient is not a unit in this ring. This
              machine performs the usual degree-reducing division only when that
              coefficient is invertible. Over ℤ, choose a monic or
              negative-monic divisor.
            </p>
          )}
        </details>
        <details open={lesson.parameters?.mode === "eisenstein"}>
          <summary>Irreducibility: use hypotheses, not appearance</summary>
          <p>
            Eisenstein: let f be a positive-degree integer polynomial. For a
            prime p not dividing the leading coefficient, dividing all lower
            coefficients, and with p² not dividing the constant coefficient, f
            is irreducible over ℚ. The polynomial X⁴+1 fails this direct test,
            but f(X+1)=X⁴+4X³+6X²+4X+2 passes for p=2. Translation is a ring
            automorphism, so irreducibility is preserved.
          </p>
          {p === 0 && (
            <>
              <Range
                label="Translate X by h"
                value={shift}
                min={-3}
                max={3}
                onChange={setShift}
              />
              <Choice
                label="Prime for Eisenstein test"
                value={String(prime)}
                onChange={(v) => setPrime(+v)}
                options={[
                  ["2", "p = 2"],
                  ["3", "p = 3"],
                  ["5", "p = 5"],
                  ["7", "p = 7"],
                ]}
              />
              <M block>{`f(X+${shift})=${polyText(shifted)}`}</M>
              <p>
                Direct criterion: {eisenstein(a) ? "passes" : "does not apply"}.
                After translation:{" "}
                {eisenstein(trim(shifted))
                  ? "passes; f is irreducible over ℚ"
                  : "does not apply; this alone says nothing about irreducibility"}
                .
              </p>
            </>
          )}
        </details>
        <details>
          <summary>Division and quotient example</summary>
          <M block>{"X^3+1=X(X^2+1)+(1-X)"}</M>
          <p>
            Thus X³+1 and 1−X represent the same element modulo X²+1. Division
            by a monic polynomial works over any commutative unital coefficient
            ring. Over a field, divide by any nonzero polynomial.
          </p>
        </details>
      </div>
    </div>
  );
}
export function FieldLab({ lesson }: { lesson: Lesson }) {
  const mode = String(lesson.parameters?.mode || "finite-field");
  const finite = ["finite-field", "characteristic"].includes(mode);
  const [a, setA] = useState(7),
    [b, setB] = useState(5),
    [u, setU] = useState(3),
    [v, setV] = useState(2),
    [x, setX] = useState(2),
    [y, setY] = useState(3);
  const labels = ["0", "1", "\\alpha", "1+\\alpha"];
  const fm = (a: number, b: number) => {
    let c = 0;
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++)
        if ((a >> i) & 1 && (b >> j) & 1) c ^= 1 << (i + j);
    if (c & 4) c ^= 7;
    return c;
  };
  const d = u * u + v * v,
    qr = d ? Math.round((a * u + b * v) / d) : 0,
    qi = d ? Math.round((b * u - a * v) / d) : 0,
    rr = a - (qr * u - qi * v),
    ri = b - (qr * v + qi * u);
  return (
    <div>
      {finite ? (
        <>
          <div className="lab-controls">
            <M block>
              {
                "\\mathbb F_4=\\mathbb F_2[X]/(X^2+X+1),\\quad\\alpha^2=\\alpha+1"
              }
            </M>
            <div className="two-cols">
              <Choice
                label="First F4 element"
                value={String(x)}
                onChange={(z) => setX(+z)}
                options={labels.map((l, i) => [
                  String(i),
                  ["0", "1", "α", "1+α"][i],
                ])}
              />
              <Choice
                label="Second F4 element"
                value={String(y)}
                onChange={(z) => setY(+z)}
                options={labels.map((l, i) => [
                  String(i),
                  ["0", "1", "α", "1+α"][i],
                ])}
              />
            </div>
          </div>
          <div className="field-four">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>×</TableHead>
                  {labels.map((l) => (
                    <TableHead key={l}>
                      <M>{l}</M>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {labels.map((l, i) => (
                  <TableRow key={i}>
                    <TableHead>
                      <M>{l}</M>
                    </TableHead>
                    {labels.map((_, j) => (
                      <TableCell key={j} style={{ color: palette[fm(i, j)] }}>
                        <M>{labels[fm(i, j)]}</M>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="lab-controls">
            <M
              block
            >{`(${labels[x]})+(${labels[y]})=${labels[x ^ y]},\\quad(${labels[x]})(${labels[y]})=${labels[fm(x, y)]}`}</M>
            <p>
              Addition is coefficient-wise modulo 2. Multiplication first
              expands and then replaces α² by α+1. Every nonzero row permutes
              the three nonzero entries: every nonzero element is invertible.
            </p>
            <p>
              There are four elements but the characteristic is 2. This field is
              not ℤ/4ℤ, where 2·2=0.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="lab-controls">
            <div className="two-cols">
              <Range
                label="Real part a of z"
                min={-8}
                max={8}
                value={a}
                onChange={setA}
              />
              <Range
                label="Imaginary part b of z"
                min={-8}
                max={8}
                value={b}
                onChange={setB}
              />
              <Range
                label="Real part u of w"
                min={-4}
                max={4}
                value={u}
                onChange={setU}
              />
              <Range
                label="Imaginary part v of w"
                min={-4}
                max={4}
                value={v}
                onChange={setV}
              />
            </div>
          </div>
          <svg
            viewBox="0 0 560 400"
            className="math-svg"
            role="img"
            aria-label="Gaussian integer lattice and conjugation"
          >
            {Array.from({ length: 19 }, (_, i) =>
              Array.from({ length: 13 }, (_, j) => (
                <circle
                  key={`${i}-${j}`}
                  cx={127 + i * 17}
                  cy={98 + j * 17}
                  r="1.6"
                  fill="#506278"
                />
              )),
            )}
            <line x1="20" y1="200" x2="540" y2="200" stroke="#5d7487" />
            <line x1="280" y1="20" x2="280" y2="380" stroke="#5d7487" />
            <circle
              cx="280"
              cy="200"
              r={Math.sqrt(a * a + b * b) * 17}
              fill="none"
              stroke="#69dbca"
              opacity=".35"
            />
            <line
              x1="280"
              y1="200"
              x2={280 + a * 17}
              y2={200 - b * 17}
              stroke="#69dbca"
              strokeWidth="3"
            />
            <circle cx={280 + a * 17} cy={200 - b * 17} r="7" fill="#69dbca" />
            <text x={290 + a * 17} y={195 - b * 17} fill="#69dbca">
              z
            </text>
            <circle cx={280 + a * 17} cy={200 + b * 17} r="7" fill="#a7a1ff" />
            <text x={290 + a * 17} y={215 + b * 17} fill="#a7a1ff">
              z̄
            </text>
          </svg>
          <div className="lab-controls">
            <M
              block
            >{`z=${a}+(${b})i,\\quad N(z)=${a * a + b * b},\\quad\\operatorname{Tr}(z)=${2 * a}`}</M>
            <p>
              Conjugation reflects across the real axis. The norm is squared
              distance from 0, and N(zw)=N(z)N(w). The picture uses the Gaussian
              lattice ℤ[i]; quadratic integer lattices can be shifted, as the
              lesson explains.
            </p>
            {d ? (
              <>
                <M
                  block
                >{`z=qw+r,\\quad q=${qr}+(${qi})i,\\quad r=${rr}+(${ri})i`}</M>
                <p>
                  Round both coordinates of z/w to the nearest integer. N(r)=
                  {rr * rr + ri * ri} &lt; N(w)={d}, so Euclidean division
                  decreases the norm.
                </p>
              </>
            ) : (
              <p className="error-note">
                Choose nonzero w; division by zero is undefined.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
