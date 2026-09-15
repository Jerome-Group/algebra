"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import { matrixTex } from "@/lib/algebra/engine";
import { rotationConfig } from "@/lib/algebra/rotation-config";
import { axisRotation, planeRotation } from "@/lib/algebra/rotations";
import { Math as M, Prose } from "./Math";
import { Range, Choice } from "./Groups";
import { CubeScene } from "./Cube";

export function AxisAngleLab({ lesson }: { lesson: Lesson }) {
  const config = rotationConfig(lesson.parameters);
  const [angle, setAngle] = useState(
    config.kind === "axis-angle" ? config.angle : 0,
  );
  if (config.kind !== "axis-angle")
    throw new Error("Expected axis-angle configuration");
  const axis = config.axis;
  const matrix = axisRotation(axis, angle);
  return (
    <div>
      <div className="lab-toolbar">
        <span className="lab-tag">Body diagonal · continuous rotation</span>
      </div>
      <CubeScene
        matrix={matrix}
        set="vertices"
        selected={0}
        onSelect={() => {}}
      />
      <div className="lab-controls">
        <Range
          label="Rotation angle in degrees"
          min={0}
          max={360}
          value={angle}
          onChange={setAngle}
        />
        <M
          block
        >{String.raw`n=\frac{1}{\sqrt3}(1,1,1),\quad R\approx${matrixTex(matrix)}`}</M>
        <M
          block
        >{String.raw`Rn=n,\quad\operatorname{tr}(R)=1+2\cos(${angle}^\circ)`}</M>
        <p>
          The diagonal stays fixed. The cube returns to its vertex set at 0°,
          120°, 240° and 360°. Intermediate angles are rotations of space, but
          not symmetries of the cube.
        </p>
      </div>
    </div>
  );
}

export function PlaneRepresentationLab({ lesson }: { lesson: Lesson }) {
  const config = rotationConfig(lesson.parameters);
  const [field, setField] = useState<string>(
      config.kind === "plane-representation" ? config.field : "real",
    ),
    [power, setPower] = useState(1);
  if (config.kind !== "plane-representation")
    throw new Error("Expected plane-representation configuration");
  const matrix = planeRotation((2 * Math.PI * power) / 3);
  const x = 200 + 120 * matrix[0][0],
    y = 170 - 120 * matrix[1][0];
  return (
    <div>
      <div className="lab-toolbar">
        <Choice
          label="Scalar field"
          value={field}
          onChange={setField}
          options={[
            ["real", "Real numbers · dimension 2"],
            ["complex", "Complex numbers · dimension 2"],
          ]}
        />
        <span className="lab-tag">Same C₃ action · no fixed extra axis</span>
      </div>
      <svg
        className="math-svg"
        viewBox="0 0 400 340"
        role="img"
        aria-label={`Two-dimensional rotation of the first basis vector by ${120 * power} degrees`}
      >
        <circle cx="200" cy="170" r="120" fill="none" stroke="#94908b" />
        <path d="M40 170H360M200 20V320" stroke="#94908b" />
        <line
          x1="200"
          y1="170"
          x2="320"
          y2="170"
          stroke="#94908b"
          strokeDasharray="5 5"
        />
        <line
          x1="200"
          y1="170"
          x2={x}
          y2={y}
          stroke="#d65332"
          strokeWidth="3"
        />
        <circle cx={x} cy={y} r="7" fill="#d65332" />
      </svg>
      <div className="lab-controls">
        <Range
          label="Generator power"
          value={power}
          min={0}
          max={2}
          onChange={setPower}
        />
        <M
          block
        >{String.raw`\rho(r^{${power}})\approx${matrixTex(matrix)},\quad\chi(r^{${power}})=${power === 0 ? 2 : -1}`}</M>
        <p>
          <Prose>
            {field === "real"
              ? String.raw`The generator has characteristic polynomial $t^2+t+1$, with no real root. A proper nonzero subspace of $\mathbb R^2$ is a line, so the representation is irreducible over $\mathbb R$. The identity power alone fixes every line; irreducibility concerns the entire group.`
              : String.raw`Let $\omega=e^{2\pi i/3}$. The vectors $(1,-i)$ and $(1,i)$ span complex eigenlines with generator eigenvalues $\omega$ and $\omega^{-1}$. They form a basis of $\mathbb C^2$, so the complex representation splits. The picture shows real vectors only; these eigenlines are not lines in the real plane.`}
          </Prose>
        </p>
      </div>
    </div>
  );
}
