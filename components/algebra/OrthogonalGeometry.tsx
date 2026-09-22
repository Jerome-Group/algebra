"use client";
import { useState } from "react";
import { matrixTex, type Mat } from "@/lib/algebra/engine";
import {
  metricOrientationModel,
  planeReflectionModel,
  rounded,
  type CoordinateNormal,
  type MetricState,
  type PlaneProduct,
} from "@/lib/algebra/orthogonal-geometry";
import { Math as M } from "./Math";
import { CubeScene } from "./Cube";
import { Range } from "./Groups";

export function PlaneReflectionLab() {
  const [angle, setAngle] = useState(45);
  const [product, setProduct] = useState<PlaneProduct>("RF");
  const { right, left, matrix, lineDegrees, image } = planeReflectionModel(
    angle,
    product,
  );
  const lineRadians = (lineDegrees * Math.PI) / 180;
  const line = (scale: number) => [
    200 + scale * Math.cos(lineRadians),
    170 - scale * Math.sin(lineRadians),
  ];
  return (
    <div className="foundation-lab plane-reflection-lab">
      <p>
        Columns act on the left; AB applies B first. Fix F=diag(1,−1),
        reflection across the horizontal x-axis. The two products use the same F
        and Rθ.
      </p>
      <div className="lab-controls">
        <Range
          label="Plane angle θ in degrees"
          value={angle}
          min={0}
          max={360}
          onChange={setAngle}
        />
        <label>
          Selected product, currently {product === "RF" ? "RθF" : "FRθ"}
          <select
            value={product}
            onChange={(event) => setProduct(event.target.value as PlaneProduct)}
          >
            <option value="RF">RθF · reflect, then rotate</option>
            <option value="FR">FRθ · rotate, then reflect</option>
          </select>
        </label>
      </div>
      <svg
        viewBox="0 0 400 340"
        className="math-svg"
        role="img"
        aria-label={`${product === "RF" ? "R theta F" : "F R theta"} reflects across a line at ${lineDegrees} degrees; F alone fixes the x-axis`}
      >
        <circle cx="200" cy="170" r="120" fill="none" stroke="#8b9baa" />
        <line
          x1="30"
          y1="170"
          x2="370"
          y2="170"
          stroke="#536982"
          strokeDasharray="4 4"
        />
        <line
          x1={line(-145)[0]}
          y1={line(-145)[1]}
          x2={line(145)[0]}
          y2={line(145)[1]}
          stroke="#9b5427"
          strokeWidth="3"
        />
        <line
          x1="200"
          y1="170"
          x2={200 + 120 * image[0]}
          y2={170 - 120 * image[1]}
          stroke="#2d467d"
          strokeWidth="3"
        />
        <circle
          cx={200 + 120 * image[0]}
          cy={170 - 120 * image[1]}
          r="6"
          fill="#2d467d"
        />
        <text x="205" y="160">
          x-axis · F fixed line
        </text>
      </svg>
      <div className="live-mathematics" aria-live="polite">
        <M
          block
        >{String.raw`F=\begin{pmatrix}1&0\\0&-1\end{pmatrix},\quad R_\theta F\approx${matrixTex(right)}`}</M>
        <M
          block
        >{String.raw`FR_\theta\approx${matrixTex(left)},\quad FR_\theta F=R_{-\theta}`}</M>
        <p>
          Selected {product === "RF" ? "RθF" : "FRθ"} fixes the line at{" "}
          {rounded(lineDegrees)}° modulo 180°; its matrix is{" "}
          {matrix.map((row) => `[${row.map(rounded).join(", ")}]`).join("; ")}.
          It sends e₁ to ({image.map(rounded).join(", ")}).
        </p>
        <p>
          At θ=0 both products equal F and fix the x-axis. For θ≠0, RθF and FRθ
          generally have different fixed lines; swapping multiplication order
          changes the reflection.
        </p>
      </div>
      <button onClick={() => setAngle(0)}>Check the θ=0 boundary</button>
      <p>
        The moving line verifies the selected matrices; the identity FRθF=R−θ
        follows by multiplying the exact matrices.
      </p>
    </div>
  );
}

function MetricGeometryVisual({
  dimension,
  matrix,
}: {
  dimension: 2 | 3;
  matrix: Mat;
}) {
  return dimension === 3 ? (
    <CubeScene matrix={matrix} set="vertices" selected={0} />
  ) : (
    <svg
      viewBox="0 0 400 180"
      role="img"
      aria-label="Plane reflection F fixes the horizontal x-axis and reverses the vertical direction"
    >
      <line x1="20" y1="90" x2="380" y2="90" stroke="#9b5427" strokeWidth="3" />
      <line x1="200" y1="20" x2="200" y2="160" stroke="#536982" />
      <text x="220" y="82">
        fixed x-axis
      </text>
    </svg>
  );
}

function OrientationComparison() {
  return (
    <table>
      <caption>
        Two orientation-reversing maps in R³ have different fixed spaces
      </caption>
      <thead>
        <tr>
          <th scope="col">Map</th>
          <th scope="col">Determinant</th>
          <th scope="col">Fixed space</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Plane reflection I−2nnᵀ</th>
          <td>−1</td>
          <td>n⊥, dimension 2</td>
        </tr>
        <tr>
          <th scope="row">Central inversion −I₃</th>
          <td>−1</td>
          <td>{"{0}"}, dimension 0</td>
        </tr>
      </tbody>
    </table>
  );
}

export function MetricOrientationLab() {
  const [state, setState] = useState<MetricState>("plane2");
  const [normal, setNormal] = useState<CoordinateNormal>("x");
  const [angle, setAngle] = useState(37);
  const model = metricOrientationModel(state, normal, angle);
  return (
    <div className="foundation-lab metric-orientation-lab">
      <p>
        Choose a real orthogonal map. The dimension, matrix, determinant, fixed
        space and cube verdict all follow that same choice.
      </p>
      <div className="lab-controls">
        <label>
          Transformation, currently {state}
          <select
            value={state}
            onChange={(event) => setState(event.target.value as MetricState)}
          >
            <option value="plane2">F=diag(1,−1) · R² plane reflection</option>
            <option value="plane3">I−2nnᵀ · R³ plane reflection</option>
            <option value="inversion3">−I₃ · central inversion</option>
            <option value="rotation3">
              Rz(θ) · arbitrary-angle z-axis rotation
            </option>
          </select>
        </label>
        {state === "plane3" && (
          <label>
            Plane normal, currently {normal}
            <select
              value={normal}
              onChange={(event) =>
                setNormal(event.target.value as CoordinateNormal)
              }
            >
              <option value="x">x direction</option>
              <option value="y">y direction</option>
              <option value="z">z direction</option>
            </select>
          </label>
        )}
        {state === "rotation3" && (
          <Range
            label="Spatial rotation angle in degrees"
            min={0}
            max={360}
            value={angle}
            onChange={setAngle}
          />
        )}
      </div>
      <MetricGeometryVisual dimension={model.dimension} matrix={model.matrix} />
      <div className="live-mathematics" aria-live="polite">
        <M block>{model.matrixEquation}</M>
        <p>
          Selected map on R{model.dimension}: fixed space {model.fixedSpace}.{" "}
          {model.cubePreserved !== null
            ? `Preserves the cube vertex set: ${model.cubePreserved ? "yes" : "no"}.`
            : "The cube question concerns R³ and does not apply."}
        </p>
        <p>
          For u=({model.u.join(",")}) and v=({model.v.join(",")}), ⟨u,v⟩=
          {model.originalDot} and ⟨Qu,Qv⟩={model.transformedDot}. For every u,v,
          orthogonality proves ⟨Qu,Qv⟩=uᵀQᵀQv=uᵀv.
        </p>
      </div>
      <OrientationComparison />
      <p>
        Determinant +1 means orientation preserving, not necessarily cube
        preserving. Orthogonality alone means inner products are preserved, not
        that a chosen solid is fixed.
      </p>
    </div>
  );
}
