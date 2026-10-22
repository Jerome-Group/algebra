import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

test("the legacy loader's development server keeps source local to its origin", async () => {
  const esbuild = createRequire(require.resolve("@esbuild-kit/core-utils"))(
    "esbuild",
  );
  const directory = await mkdtemp(join(tmpdir(), "algebra-esbuild-"));
  const source = "export const localSource = true;\n";
  let context;
  try {
    await writeFile(join(directory, "source.ts"), source);
    context = await esbuild.context({});
    const { port } = await context.serve({
      host: "127.0.0.1",
      port: 0,
      servedir: directory,
    });
    const url = `http://127.0.0.1:${port}/source.ts`;
    const local = await fetch(url);
    assert.equal(local.status, 200);
    assert.equal(await local.text(), source);

    const origin = "https://untrusted.invalid";
    const untrusted = await fetch(url, { headers: { Origin: origin } });
    const allowedOrigin = untrusted.headers.get("access-control-allow-origin");
    const browserCanReadSource =
      untrusted.ok &&
      (await untrusted.text()) === source &&
      ["*", origin].includes(allowedOrigin);
    assert.equal(
      browserCanReadSource,
      false,
      `untrusted browser origin can read served source (status=${untrusted.status}, Access-Control-Allow-Origin=${allowedOrigin})`,
    );
  } finally {
    await context?.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
