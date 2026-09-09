import { Children, type ReactNode } from "react";
import { Math as M } from "./Math";

/** Keep typeset labels in SVG coordinates without replacing mathematical notation. */
export function SvgMath({
  x = 0,
  y = 0,
  fill,
  fontSize = 14,
  textAnchor = "start",
  className,
  children,
  fontWeight,
}: {
  fontWeight?: number | string;
  x?: number | string;
  y?: number | string;
  fill?: string;
  fontSize?: number | string;
  textAnchor?: string;
  className?: string;
  children: ReactNode;
}) {
  const value = Children.toArray(children).join("").trim();
  const caption = className === "svg-caption";
  const width = caption ? 510 : 140;
  const left =
    Number(x) -
    (textAnchor === "middle" ? width / 2 : textAnchor === "end" ? width : 0);
  return (
    <foreignObject
      x={left}
      y={Number(y) - Number(fontSize) - 3}
      width={width}
      height={32}
      className={className}
      style={{ overflow: "visible", pointerEvents: "none" }}
    >
      <div
        style={{
          color:
            fill &&
            ["#102331", "#102d38", "#132e3a", "#102e32", "#112535"].includes(
              fill,
            )
              ? fill
              : "#343149",
          fontSize: Number(fontSize),
          fontWeight,
          textAlign:
            textAnchor === "middle"
              ? "center"
              : textAnchor === "end"
                ? "right"
                : "left",
          whiteSpace: "nowrap",
        }}
      >
        {caption ? value : <M>{value}</M>}
      </div>
    </foreignObject>
  );
}
