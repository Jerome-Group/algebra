"use client";
import { useState } from "react";
import { Math as M, Prose } from "./Math";
import { Range, Choice } from "./Groups";
import { CubeScene } from "./Cube";
import { matrixTex } from "@/lib/algebra/engine";
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
