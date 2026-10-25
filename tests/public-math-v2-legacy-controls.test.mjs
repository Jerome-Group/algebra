import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  readFile,
  link,
  symlink,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  captureSource,
  assertSourceCurrent,
  assertPlanOutputTarget,
  savedEvidenceFile,
} from "../scripts/lib/public-math-v2/source.mjs";
import { checkPublicMath } from "../scripts/lib/public-math-v2.mjs";
const put = async (root, file, text) => {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), text);
};
async function fixture(t) {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "math-v2-retained-synthetic-"),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  await put(
    root,
    "tsconfig.json",
    JSON.stringify({
      compilerOptions: {
        jsx: "react-jsx",
        module: "esnext",
        moduleResolution: "bundler",
      },
    }),
  );
  await put(
    root,
    "app/page.tsx",
    "export default()=> <p>Unreviewed synthetic prose.</p>;",
  );
  return root;
}
const boundaryRuntimeControls = [
  {
    name: "parenthesized-evidence-url",
    page: 'export default function Page(){return <a href={new URL("../lib/algebra/math-presentation/public-ui-review.json", (import.meta.url)).href}>Download</a>}',
  },
  {
    name: "aliased-base-evidence-url",
    page: 'const base=import.meta.url; export default function Page(){return <a href={new URL("../lib/algebra/math-presentation/public-ui-review.json", base).href}>Download</a>}',
  },
  {
    name: "nested-method-binding",
    page: "export default function Page({ctx}){const {outer:{fillText:draw}}={outer:ctx}; draw.call(ctx,12,0,0); return <canvas/>}",
  },
  {
    name: "parameter-method-binding",
    page: "function paint({fillText:draw},ctx){draw.call(ctx,12,0,0)} export default function Page({ctx}){paint(ctx,ctx);return <canvas/>}",
  },
  {
    name: "svg-namespaced-external-image",
    page: 'export default function Page(){return <img src="/diagram.svg"/>}',
    svg: '<s:svg xmlns:s="http://www.w3.org/2000/svg"><s:image href="https://example.invalid/math.svg"/></s:svg>',
  },
  {
    name: "svg-event-handler",
    page: 'export default function Page(){return <object data="/diagram.svg"/>}',
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" onload=\"this.insertAdjacentHTML('beforeend','&lt;text x=&quot;10&quot; y=&quot;20&quot;&gt;12&lt;/text&gt;')\"/>",
  },
  {
    name: "css-dynamic-custom-property",
    page: 'export default function Page({resource}){return <div style={{backgroundImage:"var(--diagram)","--diagram":resource}}/>}',
  },
];

for (const control of boundaryRuntimeControls)
  test(`retained v1 repair ${control.name} keeps stale-byte refusal and never gains unreviewed source approval`, async (t) => {
    const root = await fixture(t);
    const before = await captureSource(root);
    await put(root, "app/page.tsx", control.page);
    if (control.svg) await put(root, "public/diagram.svg", control.svg);
    await assert.rejects(assertSourceCurrent(before), /Concurrent/);
    const after = await captureSource(root);
    assert.notEqual(after.plan.sourceSetDigest, before.plan.sourceSetDigest);
    assert(after.plan.pending.some(({ file }) => file === "app/page.tsx"));
    const result = await checkPublicMath({
      root,
      require: "source-attestation",
    });
    assert.equal(result.kind, "blocked");
    assert.equal(result.satisfiesRequirement, false);
    await put(
      root,
      savedEvidenceFile,
      JSON.stringify({
        version: 1,
        status: "independently-reviewed",
        sourceDigest: after.plan.sourceSetDigest,
        files: [],
      }),
    );
    assert.equal(
      (await checkPublicMath({ root, require: "source-attestation" }))
        .satisfiesRequirement,
      false,
    );
  });
for (const [name, config] of [
  [
    "parenthesized-config-url",
    'import {readFileSync} from "node:fs"; export default JSON.parse(readFileSync(new URL("./config/build.json", (import.meta.url)),"utf8"));',
  ],
  [
    "aliased-config-url-base",
    'import {readFileSync} from "node:fs"; const base=import.meta.url; export default JSON.parse(readFileSync(new URL("./config/build.json", base),"utf8"));',
  ],
  [
    "createRequire-config-loader",
    'import {createRequire as makeLoader} from "node:module"; const load=makeLoader(import.meta.url); export default load("./config/build.json");',
  ],
])
  test(`retained v1 repair ${name} binds actual configuration or refuses`, async (t) => {
    const root = await fixture(t);
    await put(root, "vite.config.mjs", config);
    await put(root, "config/build.json", '{"mode":"original"}');
    let before;
    try {
      before = await captureSource(root);
    } catch (error) {
      assert.match(error.message, /unsupported|Unsupported/);
      await put(root, "config/build.json", '{"mode":"changed"}');
      await assert.rejects(captureSource(root));
      return;
    }
    await put(root, "config/build.json", '{"mode":"changed"}');
    const after = await captureSource(root);
    assert.notEqual(after.plan.contractDigest, before.plan.contractDigest);
    await assert.rejects(assertSourceCurrent(before), /Concurrent/);
  });
test("retired evidence, source and configuration cannot be overwritten through CLI output aliases", async (t) => {
  const root = await fixture(t);
  await put(root, savedEvidenceFile, "SYNTHETIC NON-APPLICATION EVIDENCE");
  await link(path.join(root, savedEvidenceFile), path.join(root, "alias.json"));
  await assert.rejects(assertPlanOutputTarget(root, "alias.json"), /alias/);
  await symlink(
    path.join(root, "app/page.tsx"),
    path.join(root, "source-link.json"),
  );
  await assert.rejects(
    assertPlanOutputTarget(root, "source-link.json"),
    /symlink|source/,
  );
  for (const file of [
    "lib/new.json",
    "docs/research/new.md",
    "vite.config.mjs",
    "scripts/lib/public-math-v2/new.mjs",
  ])
    await assert.rejects(assertPlanOutputTarget(root, file), /Refusing/);
  assert.equal(
    await readFile(path.join(root, savedEvidenceFile), "utf8"),
    "SYNTHETIC NON-APPLICATION EVIDENCE",
  );
});
