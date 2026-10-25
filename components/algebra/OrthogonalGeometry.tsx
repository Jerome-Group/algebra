"use client";
import { Diagram } from "./Diagram";
import { SvgMath } from "./SvgMath";
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
import { Math as M, Prose } from "./Math";
import { CubeScene } from "./Cube";
import { Choice, Range } from "./Groups";

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
        <Prose>{String.raw`Columns act on the left; $AB$ applies $B$ first. Fix $F=\operatorname{diag}(1,-1)$, reflection across the horizontal $x$-axis. The two products use the same $F$ and $R_\theta$.`}</Prose>
      </p>
      <div className="lab-controls">
        <Range
          label={"Plane angle $\\theta$ in degrees"}
          accessibleLabel="Plane angle theta in degrees"
          value={angle}
          min={0}
          max={360}
          onChange={setAngle}
        />
        <label>
          Selected product, currently{" "}
          <M focusable={false}>
            {product === "RF" ? String.raw`R_\theta F` : String.raw`FR_\theta`}
          </M>
          <Choice
            label={`Selected product, currently ${product === "RF" ? "RθF" : "FRθ"}`}
            value={product}
            onChange={(value) => setProduct(value)}
            options={[
              {
                value: "RF",
                presentation: "$R_\\theta F$ · reflect, then rotate",
                speech: "R theta times F, reflect then rotate",
              },
              {
                value: "FR",
                presentation: "$FR_\\theta$ · rotate, then reflect",
                speech: "F times R theta, rotate then reflect",
              },
            ]}
          />
        </label>
      </div>
      <Diagram
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
        <SvgMath
          x="205"
          y="160"
        >{String.raw`x\text{-axis: fixed by }F`}</SvgMath>
      </Diagram>
      <div className="live-mathematics" aria-live="polite">
        <M
          block
        >{String.raw`F=\begin{pmatrix}1&0\\0&-1\end{pmatrix},\quad R_\theta F\approx${matrixTex(right)}`}</M>
        <M
          block
        >{String.raw`FR_\theta\approx${matrixTex(left)},\quad FR_\theta F=R_{-\theta}`}</M>
        <p>
          <Prose>{String.raw`Selected $${product === "RF" ? String.raw`R_\theta F` : String.raw`FR_\theta`}$ fixes the line at $${rounded(lineDegrees)}^\circ$ modulo $180^\circ$; its displayed matrix and image coordinates are rounded: $${product === "RF" ? String.raw`R_\theta F` : String.raw`FR_\theta`}\approx${matrixTex(matrix)}$ and $${product === "RF" ? String.raw`R_\theta F` : String.raw`FR_\theta`}e_1\approx(${image.map(rounded).join(", ")})$.`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`At $\theta=0$ both products equal $F$ and fix the $x$-axis. For $\theta\ne0$, $R_\theta F$ and $FR_\theta$ generally have different fixed lines; swapping multiplication order changes the reflection.`}</Prose>
        </p>
      </div>
      <button aria-label="Check the θ=0 boundary" onClick={() => setAngle(0)}>
        Check the <M focusable={false}>{String.raw`\theta=0`}</M> boundary
      </button>
      <p>
        <Prose>{String.raw`The moving line verifies the selected matrices; the identity $FR_\theta F=R_{-\theta}$ follows by multiplying the exact matrices.`}</Prose>
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
    <Diagram
      viewBox="0 0 400 180"
      role="img"
      aria-label="Plane reflection F fixes the horizontal x-axis and reverses the vertical direction"
    >
      <line x1="20" y1="90" x2="380" y2="90" stroke="#9b5427" strokeWidth="3" />
      <line x1="200" y1="20" x2="200" y2="160" stroke="#536982" />
      <SvgMath x="220" y="82">{String.raw`\text{fixed }x\text{-axis}`}</SvgMath>
    </Diagram>
  );
}

function OrientationComparison() {
  return (
    <table>
      <caption>
        <Prose>{String.raw`Two orientation-reversing maps in $\mathbb R^3$ have different fixed spaces`}</Prose>
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
          <th scope="row">
            Plane reflection <M>{"I-2nn^T"}</M>
          </th>
          <td>
            <M>{"-1"}</M>
          </td>
          <td>
            <M>{String.raw`n^\perp`}</M>, dimension <M>{"2"}</M>
          </td>
        </tr>
        <tr>
          <th scope="row">
            Central inversion <M>{"-I_3"}</M>
          </th>
          <td>
            <M>{"-1"}</M>
          </td>
          <td>
            <M>{String.raw`\{0\}`}</M>, dimension <M>{"0"}</M>
          </td>
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
          <Choice
            label={"Transformation"}
            value={state}
            onChange={(value) => setState(value)}
            options={[
              {
                value: "plane2",
                presentation:
                  "$F=\\operatorname{diag}(1,-1)$ · $\\mathbb R^2$ plane reflection",
                speech:
                  "F equals diagonal matrix 1, minus 1, plane reflection in real dimension 2",
              },
              {
                value: "plane3",
                presentation:
                  "$I-2nn^{\\mathsf T}$ · $\\mathbb R^3$ plane reflection",
                speech:
                  "I minus 2 n n transpose, plane reflection in real dimension 3",
              },
              {
                value: "inversion3",
                presentation: "$-I_3$ · central inversion",
                speech: "Minus I subscript 3, central inversion",
              },
              {
                value: "rotation3",
                presentation:
                  "$R_z(\\theta)$ · arbitrary-angle $z$-axis rotation",
                speech:
                  "R subscript z of theta, arbitrary angle rotation about the z axis",
              },
            ]}
          />
        </label>
        {state === "plane3" && (
          <label>
            Plane normal, currently <M focusable={false}>{normal}</M>
            <Choice
              label="Plane normal"
              value={normal}
              onChange={(value) => setNormal(value)}
              options={[
                {
                  value: "x",
                  presentation: "$x$ direction",
                  speech: "x direction",
                },
                {
                  value: "y",
                  presentation: "$y$ direction",
                  speech: "y direction",
                },
                {
                  value: "z",
                  presentation: "$z$ direction",
                  speech: "z direction",
                },
              ]}
            />
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
          <Prose>{String.raw`Selected map on $\mathbb R^{${model.dimension}}$: fixed space ${state === "plane2" ? "$x$-axis, dimension $1$" : state === "plane3" ? `plane $${normal}=0$, dimension $2$` : state === "inversion3" ? String.raw`$\{0\}$, dimension $0$` : angle === 0 || angle === 360 ? String.raw`all $\mathbb R^3$, dimension $3$` : "$z$-axis, dimension $1$"}. ${model.cubePreserved !== null ? `Numerical cube candidate (entrywise tolerance $10^{-8}$): ${model.cubePreserved ? "found" : "no match"}. A numerical match does not assert exact cube membership.` : String.raw`The cube question concerns $\mathbb R^3$ and does not apply.`}`}</Prose>
        </p>
        <p>
          <Prose>{String.raw`For $u=(${model.u.join(",")})$ and $v=(${model.v.join(",")})$, $\langle u,v\rangle=${model.originalDot}$ and $\langle Qu,Qv\rangle=${model.transformedDot}$. For every $u,v$, orthogonality proves $\langle Qu,Qv\rangle=u^TQ^TQv=u^Tv$.`}</Prose>
        </p>
      </div>
      <OrientationComparison />
      <p>
        <Prose>{String.raw`Determinant $+1$ means orientation preserving, not necessarily cube preserving. Orthogonality alone means inner products are preserved, not that a chosen solid is fixed.`}</Prose>
      </p>
    </div>
  );
}
