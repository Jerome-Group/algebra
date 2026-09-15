export const readingViews = [
  ["guided", "Read lesson"],
  ["understand", "Overview"],
  ["example", "Example"],
  ["theorem", "Theorem"],
  ["proof", "Proof"],
] as const;
export type ReadingView = (typeof readingViews)[number][0];
export const readingViewIds = readingViews.map(([id]) => id);
export function isReadingView(value: unknown): value is ReadingView {
  return readingViewIds.some((id) => id === value);
}
