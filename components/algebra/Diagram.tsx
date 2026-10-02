"use client";

import { useId, useState, type CSSProperties, type SVGProps } from "react";

/** Fit geometry to its panel; keep original label sizes available on phones. */
export function Diagram({ children, ...props }: SVGProps<SVGSVGElement>) {
  const [readable, setReadable] = useState(false);
  const id = useId();
  const bounds = String(props.viewBox).trim().split(/\s+/).map(Number);
  const width = bounds[2] || 560;
  const height = bounds[3] || 400;
  const fittedWidth = Math.min(width, 620, (470 * width) / height);
  const label = String(props["aria-label"] || "Mathematical diagram");
  return (
    <div
      className="diagram"
      style={
        {
          "--diagram-fit-width": `${fittedWidth}px`,
          "--diagram-label-width": `${width}px`,
        } as CSSProperties
      }
    >
      <div className="diagram-tools">
        <button
          type="button"
          aria-expanded={readable}
          aria-controls={id}
          onClick={() => setReadable((value) => !value)}
        >
          {readable ? "Fit diagram to panel" : "Read diagram labels"}
        </button>
        {readable && <span>Scroll sideways or use arrow keys.</span>}
      </div>
      <div
        id={id}
        className="diagram-viewport"
        data-readable={readable}
        role="region"
        aria-label={`${label}: ${readable ? "original-size labels" : "fitted view"}`}
        tabIndex={readable ? 0 : undefined}
      >
        <svg {...props}>{children}</svg>
      </div>
    </div>
  );
}
