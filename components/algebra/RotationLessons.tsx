"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import { matrixTex, permutation } from "@/lib/algebra/engine";
import { cubeSymmetryMatch } from "@/lib/algebra/orthogonal-geometry";
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
  const [axis, setAxis] = useState<number[]>(
    config.kind === "axis-angle" ? config.axis : [1, 1, 1],
  );
  if (config.kind !== "axis-angle")
    throw new Error("Expected axis-angle configuration");
  const validAxis = axis.every(Number.isFinite) && Math.hypot(...axis) > 0;
  const validAngle = Number.isFinite(angle) && angle >= 0 && angle <= 360;
  const valid = validAxis && validAngle;
  const matrix = valid ? axisRotation(axis, angle) : null;
  const matched = matrix ? cubeSymmetryMatch(matrix) : undefined;
  const images = matched ? permutation(matched.matrix, "vertices") : null;
  const normalized = valid
    ? axis.map((value) => (value / Math.hypot(...axis)).toFixed(3))
    : [];
  return (
    <div className="axis-angle-lab">
      <div className="lab-toolbar">
        <span className="lab-tag">
          Arbitrary nonzero axis · continuous spatial rotation
        </span>
      </div>
      {matrix && (
        <CubeScene matrix={matrix} set="vertices" selected={0} axis={axis} />
      )}
      <div className="lab-controls">
        <p>
          Choose any nonzero real axis vector. The dashed line shows the axis;
          the cube moves under the resulting right-handed rotation.
        </p>
        {axis.map((value, index) => (
          <label key={index}>
            Axis {"xyz"[index]} component, currently {value}
            <input
              type="number"
              step="any"
              value={value}
              onChange={(event) =>
                setAxis(
                  axis.map((item, i) =>
                    i === index ? Number(event.target.value) : item,
                  ),
                )
              }
            />
          </label>
        ))}
        <button onClick={() => setAxis([1, 1, 1])}>
          Use cube body diagonal (1,1,1)
        </button>
        <button onClick={() => setAxis([1, 0, 0])}>
          Use face axis (1,0,0)
        </button>
        {!validAxis && <p role="alert">Enter a nonzero finite axis vector.</p>}
        {!validAngle && <p role="alert">Enter an angle from 0° to 360°.</p>}
        <Range
          label="Rotation angle in degrees"
          min={0}
          max={360}
          value={angle}
          onChange={setAngle}
        />
        <label>
          Exact angle in degrees, currently {angle}
          <input
            type="number"
            min={0}
            max={360}
            step="any"
            value={angle}
            onChange={(event) => setAngle(Number(event.target.value))}
          />
        </label>
        {matrix && (
          <div className="live-mathematics" aria-live="polite">
            <p>
              Normalized axis: ({normalized.join(", ")}). Rodrigues rotation at{" "}
              {angle}°.
            </p>
            <M block>{String.raw`R\approx${matrixTex(matrix)}`}</M>
            <M
              block
            >{String.raw`Rn=n,\quad\operatorname{tr}(R)=1+2\cos(${angle}^\circ)`}</M>
            <p>
              {matched
                ? `Cube symmetry: yes. Vertex permutation (images of 1–8): ${images!.map((index) => index + 1).join(", ")}. Generator word: ${matched.word.join(" ") || "I"}.`
                : "Cube symmetry: no. This is a rotation of space, but it has no permutation or generator word in the cube symmetry group."}
            </p>
            <p>
              {Math.abs(angle) < 1e-9 || Math.abs(angle - 360) < 1e-9
                ? "At the identity rotation every axis is possible; the axis is not uniquely determined."
                : Math.abs(angle - 180) < 1e-9
                  ? "At 180° the axis line is determined, but n and −n describe the same rotation."
                  : "Away from 0° and 180°, reversing the axis reverses the signed angle."}
            </p>
            <p>
              Along (1,1,1), exactly 0°, 120°, 240° and 360° preserve the cube.
              Other angles remain valid spatial rotations.
            </p>
          </div>
        )}
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
