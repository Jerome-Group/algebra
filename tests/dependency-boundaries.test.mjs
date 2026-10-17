import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const braces = createRequire(require.resolve("micromatch"))("braces");

test("build globs preserve alternatives and numeric ranges", () => {
  assert.deepEqual(braces.expand("app/{page,layout}.{ts,tsx}"), [
    "app/page.ts",
    "app/page.tsx",
    "app/layout.ts",
    "app/layout.tsx",
  ]);
  assert.deepEqual(braces.expand("lesson-{1..3}"), [
    "lesson-1",
    "lesson-2",
    "lesson-3",
  ]);
});

test("nested glob input fails at a bounded depth before recursive walkers", () => {
  for (const [open, close] of [
    ["{", "}"],
    ["(", ")"],
  ]) {
    const input = open.repeat(4000) + "x" + close.repeat(4000);
    for (const action of [
      braces,
      braces.parse,
      braces.compile,
      braces.expand,
      braces.stringify,
    ]) {
      assert.throws(() => action(input), /exceeds max depth/);
    }
  }
});
