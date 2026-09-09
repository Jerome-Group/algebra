"use client";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { Choice, Range } from "./Groups";
import { linearQuotient, quadraticQuotient } from "@/lib/algebra/quotients";
import { matrixTex, palette } from "@/lib/algebra/engine";
export function LinearQuotientLab() {
  const [prime, setPrime] = useState(3),
    [a, setA] = useState(1),
    [b, setB] = useState(1),
    [c, setC] = useState(0),
    [d, setD] = useState(0),
    [selected, setSelected] = useState(0);
  const model = linearQuotient(prime, [a, b, c, d]);
  const x = selected % (prime * prime),
    target = model.images[x],
    fiber = model.points.flatMap((_, i) =>
      model.images[i] === target ? [i] : [],
    );
  return (
    <div>
      <div className="fiber-board">
        <section>
          <h3>Domain · select a vector</h3>
          <div
            className="vector-grid"
            style={{ gridTemplateColumns: `repeat(${prime},1fr)` }}
          >
            {model.points.map((point, i) => (
              <button
                key={i}
                aria-label={`Domain vector (${point.join(",")})`}
                aria-pressed={x === i}
                className={fiber.includes(i) ? "fiber-selected" : ""}
                style={{
                  borderColor:
                    palette[
                      model.image.indexOf(model.images[i]) % palette.length
                    ],
                }}
                onClick={() => setSelected(i)}
              >
                <M>{`(${point.join(",")})`}</M>
              </button>
            ))}
          </div>
        </section>
        <div className="fiber-map-symbol">
          <M>{"\\xrightarrow{\\ T\\ }"}</M>
        </div>
        <section>
          <h3>Image · one point per fiber</h3>
          <div
            className="vector-grid"
            style={{ gridTemplateColumns: `repeat(${prime},1fr)` }}
          >
            {model.points.map((point, i) => (
              <div
                key={i}
                className={`${model.image.includes(i) ? "image-member" : "image-absent"} ${target === i ? "fiber-selected" : ""}`}
              >
                <M>{`(${point.join(",")})`}</M>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="lab-controls">
        <Choice
          label="Scalar field"
          value={String(prime)}
          onChange={(v) => {
            setPrime(+v);
            setA(1);
            setB(1);
            setC(0);
            setD(0);
            setSelected(0);
          }}
          options={[2, 3, 5].map((p) => [String(p), `$\\mathbb F_${p}$`])}
        />
        <div className="matrix-controls">
          {[
            ["a", a, setA],
            ["b", b, setB],
            ["c", c, setC],
            ["d", d, setD],
          ].map(([label, value, set]) => (
            <Range
              key={String(label)}
              label={`Matrix entry $${label}$`}
              min={0}
              max={prime - 1}
              value={value as number}
              onChange={set as (v: number) => void}
            />
          ))}
        </div>
        <M block>{`T(v)=${matrixTex([
          [a, b],
          [c, d],
        ])}v,\\quad V=\\mathbb F_${prime}^2`}</M>
      </div>
      <div className="lab-controls">
        <M
          block
        >{`T(${model.points[x].join(",")})=(${model.points[target].join(",")}),\\quad T^{-1}(T(v))=v+\\ker T`}</M>
        <M
          block
        >{`|V|=${prime * prime}=|\\ker T|\\,|\\operatorname{im}T|=${model.kernel.length}\\cdot${model.image.length}`}</M>
        <p>
          <Prose>{`The highlighted vectors form one coset of the kernel. Every fiber has $${model.kernel.length}$ elements. Collapsing each fiber gives the image, so $V/\\ker T\\cong\\operatorname{im}T$. Try the zero matrix, a projection, and an invertible matrix.`}</Prose>
        </p>
      </div>
    </div>
  );
}
export function QuadraticQuotientLab() {
  const [prime, setPrime] = useState(2),
    [linear, setLinear] = useState(1),
    [constant, setConstant] = useState(1),
    [a, setA] = useState(2),
    [b, setB] = useState(3);
  const ring = quadraticQuotient(prime, linear, constant),
    N = prime * prime;
  const x = a % N,
    y = b % N,
    inv = ring.inverse(x),
    killers = ring.annihilators(x);
  return (
    <div>
      <div className="lab-controls">
        <Choice
          label="Base field"
          value={String(prime)}
          onChange={(v) => {
            setPrime(+v);
            setLinear(1);
            setConstant(1);
            setA(2);
            setB(3);
          }}
          options={[2, 3, 5].map((p) => [String(p), `$\\mathbb F_${p}$`])}
        />
        <div className="two-cols">
          <Range
            label="Linear coefficient $b$"
            value={linear}
            min={0}
            max={prime - 1}
            onChange={setLinear}
          />
          <Range
            label="Constant coefficient $c$"
            value={constant}
            min={0}
            max={prime - 1}
            onChange={setConstant}
          />
        </div>
        <div className="expression-preview" aria-live="polite">
          <span>Polynomial being imposed</span>
          <M
            block
          >{`f(X)=X^2+${linear}X+${constant},\\quad R=\\mathbb F_${prime}[X]/(f)`}</M>
          <M>{`\\alpha^2=${(prime - linear) % prime}\\alpha+${(prime - constant) % prime}`}</M>
        </div>
        <p>
          <Prose>
            {ring.roots.length
              ? `The polynomial has ${ring.roots.length === 1 ? "a repeated root" : "two distinct roots"} in $\\mathbb F_${prime}$. This quotient has $${N}$ elements but is not a field.`
              : `The quadratic has no root in $\\mathbb F_${prime}$, so it is irreducible. This quotient is a field with $${N}$ elements.`}
          </Prose>
        </p>
        <div className="two-cols">
          <Choice
            label="First quotient element"
            value={String(x)}
            onChange={(v) => setA(+v)}
            options={ring.elements.map((_, i) => [
              String(i),
              `$${ring.label(i)}$`,
            ])}
          />
          <Choice
            label="Second quotient element"
            value={String(y)}
            onChange={(v) => setB(+v)}
            options={ring.elements.map((_, i) => [
              String(i),
              `$${ring.label(i)}$`,
            ])}
          />
        </div>
      </div>
      <div
        className="quotient-elements"
        style={{ gridTemplateColumns: `repeat(${prime},minmax(0,1fr))` }}
      >
        {ring.elements.map((_, i) => (
          <button
            key={i}
            aria-label={`Select quotient element ${i}`}
            aria-pressed={x === i}
            className={`${ring.inverse(i) !== -1 ? "is-unit" : "is-nonunit"} ${x === i ? "fiber-selected" : ""}`}
            onClick={() => setA(i)}
          >
            <M>{ring.label(i)}</M>
            <small>
              {i === 0
                ? "zero"
                : ring.inverse(i) !== -1
                  ? "unit"
                  : "zero divisor"}
            </small>
          </button>
        ))}
      </div>
      <div className="lab-controls">
        <M
          block
        >{`(${ring.label(x)})+(${ring.label(y)})=${ring.label(ring.add(x, y))}`}</M>
        <M
          block
        >{`(${ring.label(x)})(${ring.label(y)})=${ring.label(ring.multiply(x, y))}`}</M>
        {inv !== -1 ? (
          <M block>{`(${ring.label(x)})^{-1}=${ring.label(inv)}`}</M>
        ) : x !== 0 && killers.length ? (
          <M block>{`(${ring.label(x)})(${ring.label(killers[0])})=0`}</M>
        ) : (
          <p>Zero has no multiplicative inverse.</p>
        )}
        <p>
          <Prose>
            {
              "Every element is uniquely $a+b\\alpha$. Multiplication expands first, then replaces $\\alpha^2$ using the defining equation. The two coordinates stay the same size while changing the polynomial can change units into zero divisors."
            }
          </Prose>
        </p>
      </div>
    </div>
  );
}
