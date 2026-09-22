import type { ColoringFamily } from "@/lib/algebra/fixed-colorings";

const axisLines: Partial<
  Record<ColoringFamily, [number, number, number, number]>
> = {
  "face-axis quarter-turn": [38, 7, 38, 72],
  "face-axis half-turn": [38, 7, 38, 72],
  "vertex-axis third-turn": [10, 68, 66, 11],
  "edge-axis half-turn": [6, 38, 70, 38],
};
export function ColoringAxisDiagram({ family }: { family: ColoringFamily }) {
  const axis = axisLines[family];
  return (
    <svg
      viewBox="0 0 76 80"
      width="76"
      height="80"
      role="img"
      aria-label={
        family === "identity"
          ? "Identity rotation: every cube axis is fixed"
          : `${family} axis through a cube`
      }
    >
      <path
        d="M16 20H57V61H16ZM16 20L28 9H69V49L57 61M57 20L69 9M57 61L69 49"
        fill="none"
        stroke="currentColor"
      />
      {axis && (
        <line
          x1={axis[0]}
          y1={axis[1]}
          x2={axis[2]}
          y2={axis[3]}
          stroke="#9b5427"
          strokeWidth="3"
        />
      )}
    </svg>
  );
}
