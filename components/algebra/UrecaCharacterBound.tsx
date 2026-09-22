"use client";
import {
  dihedralCharacter,
  dihedralEigenvalues,
  dihedralElements,
  dihedralScalar,
} from "@/lib/algebra/direct-products";
import {
  DihedralElementControl,
  type UrecaSelection,
} from "./UrecaLabControls";

export function UrecaCharacterBound({ state }: { state: UrecaSelection }) {
  const { element, setElement } = state;
  const trace = dihedralCharacter(element);
  const scalar = dihedralScalar(element);
  return (
    <>
      <DihedralElementControl state={state} />
      <section>
        <h3>Finite-order eigenvalue polygon</h3>
        <svg
          viewBox="0 0 260 250"
          role="img"
          aria-label={`Two unit-circle eigenvalues of ${dihedralElements[element]}, listed below as text`}
        >
          <circle cx="130" cy="125" r="88" fill="none" stroke="#536982" />
          <line x1="30" y1="125" x2="230" y2="125" stroke="#70839a" />
          <line x1="130" y1="25" x2="130" y2="225" stroke="#70839a" />
          {dihedralEigenvalues(element).map((value, index) => (
            <circle
              key={index}
              cx={130 + 88 * value.real}
              cy={125 - 88 * value.imaginary}
              r={index === 0 ? 9 : 5}
              fill={index === 0 ? "#2d467d" : "#9b5427"}
              stroke="#fff"
            />
          ))}
          <text x="224" y="119">
            1
          </text>
          <text x="30" y="119">
            −1
          </text>
        </svg>
        <div className="live-mathematics" aria-live="polite">
          <p>
            Eigenvalues:{" "}
            {element === 0
              ? "1, 1"
              : element === 1
                ? "i, −i"
                : element === 2
                  ? "−1, −1"
                  : element === 3
                    ? "−i, i"
                    : "1, −1"}
            . Their sum is χ(h)={trace}; degree d=2.
          </p>
          <p>
            |χ(h)|={Math.abs(trace)}.{" "}
            {scalar === null
              ? "Strict bound: the image is not scalar."
              : `Equality: image ${scalar === 1 ? "I₂" : "−I₂"} is scalar.`}{" "}
            {element === 0 ? "h is in the kernel." : "h is not in the kernel."}
          </p>
        </div>
        <button onClick={() => setElement(2)}>
          Try −I₂: absolute equality outside the kernel
        </button>
        <p>
          The general proof uses diagonalizability of a finite-order complex
          matrix and equality in the triangle inequality. The picture shows
          these two eigenvalues; it is not that proof.
        </p>
      </section>
    </>
  );
}
