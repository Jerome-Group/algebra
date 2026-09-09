import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders preview metadata and crawler-readable social images", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(
    html,
    /<meta(?=[^>]*property="og:title")(?=[^>]*content="Abstract Algebra")[^>]*>/,
  );
  assert.match(
    html,
    /<meta(?=[^>]*property="og:image")(?=[^>]*content="https:\/\/algebra\.jeromegroup\.org\/og\.png")[^>]*>/,
  );
  assert.match(
    html,
    /<meta(?=[^>]*name="twitter:card")(?=[^>]*content="summary_large_image")[^>]*>/,
  );
  assert.match(
    html,
    /<meta(?=[^>]*name="twitter:image")(?=[^>]*content="https:\/\/algebra\.jeromegroup\.org\/og\.png")[^>]*>/,
  );
  assert.match(
    html,
    /<link(?=[^>]*rel="apple-touch-icon")(?=[^>]*href="[^"]*logo\.png")[^>]*>/,
  );
});
