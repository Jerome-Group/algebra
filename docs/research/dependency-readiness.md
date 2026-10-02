# Release dependency readiness

Issue #76 / PR #77; assessed 2026-10-03. Dependabot #73 (brace expansion)
and #74 (Next 16.3.8) were already reviewed and merged. This report covers
remaining release dependencies; it does not certify exhaustive security.

## Baseline and release decision

The pre-patch npm audit reported 13 vulnerable package entries: four high,
nine moderate. These are dependency entries, not 13 independently reachable
production exploits. React Server Components requires a patch before release;
the remaining findings have narrower tool/build/scaffold exposure.

The patch set preserves Vinext 0.0.50 and the existing framework architecture:

| Dependency                                   | Minimal patch   | Reason                                                                |
| -------------------------------------------- | --------------- | --------------------------------------------------------------------- |
| React / React DOM / react-server-dom-webpack | 19.2.8 together | RSC patch and matching peer requirements                              |
| vinext → image-size                          | 2.0.3           | Overrides Vinext's exact 2.0.2 dependency without framework migration |
| miniflare → undici                           | 7.29.1          | Overrides exact 7.29.0 dependency; retains existing Sharp override    |
| ajv → fast-uri                               | 3.1.8           | Compatible with parent's ^3.0.1 range                                 |
| @shuding/opentype.js → fflate                | 0.7.5           | Compatible with parent's ^0.7.3 range                                 |

Versions and parent ranges were verified through read-only npm registry queries.
RSC 19.2.8 requires React and React DOM ^19.2.8. Image-size requires Node >=18;
Undici requires Node >=20.18.1; this repository requires Node >=24.

## Reachability evidence

**RSC: production blocker.** The
[maintainer advisory](https://github.com/react/react/security/advisories/GHSA-wx67-qw84-cm4g)
identifies denial of service from crafted server-function requests and patches
19.2.8. Absence of application `use server` declarations is insufficient:
Vinext `dist/server/app-rsc-handler.js:162–184` dispatches action handling before
page matching. `dist/server/app-server-action-execution.js:130–159` accepts
multipart POSTs without an action header and invokes `decodeAction(body)` before
checking the decoded action's type. CSRF/body/payload guards exist; they are not
evidence that every vulnerable decoder input is excluded. No exploit was run.

The RSC plugin contains a vendored 19.2.6 fallback, but
`@vitejs/plugin-rsc/dist/plugin-BhzHKRFo.js:675–676,874–883` selects and aliases to
the installed `react-server-dom-webpack` when detected. The inspected baseline
`dist/server/index.js:2289` identified that installed package, and its
`decodeAction` implementation appeared at line 4242. The final rebuilt Worker
must retain installed-package provenance; upgrading only an unused package
would not establish remediation.

**Image-size: build input, not the exposed optimizer parser.** The
[JXL/HEIF advisory](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) and
[ICNS advisory](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) identify infinite
loops, patched in 2.0.3. `worker/index.ts` exposes `/_vinext/image`, but delegates
to `vinext/server/image-optimization`. Its `parseImageParams` accepts local
paths; `handleImageOptimization` fetches ASSETS and passes the stream to
Cloudflare IMAGES. That module does not import image-size. Vinext instead uses
image-size in its build-time image-import loader (`dist/index.js:1297`) and
metadata file processing (`dist/server/metadata-route-build-data.js:5,31`). No
image-size code was found in the inspected baseline Worker bundle. The patch
protects build inputs without claiming a demonstrated remote Worker exploit.

**Undici: local tooling.** Installed ownership is Miniflare under the Cloudflare
Vite plugin and Wrangler. The inspected Worker bundle contains no Undici client
implementation. The
[maintainer WebSocket advisory](https://github.com/nodejs/undici/security/advisories/GHSA-rfgv-xxqx-mfg5)
requires a vulnerable client opening a connection to an attacker-controlled or
compromised server; 7.29.1 also clears the other baseline Undici advisories.

**Fast-uri / fflate: unused scaffold paths in this build.** Fast-uri belongs to
AJV under hookform resolvers; fflate 0.7.4 belongs to the Vinext OG/font chain.
No application imports of that resolver/OG generation path, or fast-uri/fflate
implementation in the inspected Worker bundle, were found. This is a build-specific
observation, not a guarantee for future features. See the
[fast-uri maintainer advisory](https://github.com/fastify/fast-uri/security/advisories/GHSA-hrr3-gc8f-f4qj)
and [fflate advisory](https://github.com/advisories/GHSA-px8p-9vwx-vf98).

## Remaining limitation and verification

Drizzle Kit 0.31.10 retains `@esbuild-kit/esm-loader` → `core-utils` →
esbuild 0.18.20. Core-utils requires `~0.18.20`; forcing patched esbuild 0.25+
crosses that compatibility range. The
[esbuild maintainer advisory](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99)
concerns its development server. That legacy dependency is outside the Worker
bundle; current database-generation commands do not start its serve API.
Retain this limitation explicitly instead of undertaking a major Drizzle
migration solely to obtain a zero audit count.

At report creation, post-patch audit, clean installation, rebuilt-package
provenance, production behavior, tests, and CI were pending. The release owner
records their final results separately. Baseline audit counts must not be
presented as post-patch counts, and passing tests do not establish exhaustive
security.

## Patched audit result

Root executed `npm ci` from the patched lockfile and a fresh `npm audit --json`: four moderate advisories in the legacy Drizzle/esbuild chain, zero high or critical findings. The earlier full audit had thirteen advisories, including four high findings. Neither count is a reachability proof or comprehensive security certification. The CLI `dependencies` layer and `all` now execute `npm audit --audit-level=high --json`; CI shares this gate. Existing Node/browser and rebuilt-bundle verification remain required before publication.

Root rebuilt the patched production Worker: installed React, React DOM and RSC are 19.2.8; server output includes installed RSC provenance, two 19.2.8 version strings, zero 19.2.6 strings and no fallback vendor provenance. Final in-app sweeps inspected 300 guided pages, 150 laboratories, 600 retained reading views and all five main modes on the patched runtime, with no mathematical parse errors or page overflow. Automated complete verification and protected CI remain pending.
