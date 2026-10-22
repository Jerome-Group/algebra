# Scoped esbuild compatibility prototype

Throwaway evidence for [issue 106](https://github.com/Jerome-Group/algebra/issues/106). Keep this branch. Do not merge this instrument into main.

The decision is whether a separate implementation of the exact `@esbuild-kit/core-utils` override to `esbuild@0.25.12` earns further verification. The result supports that implementation. It does not establish complete compatibility.

## Run the observations

Use Node 24.19.0 and a PATH-resolved npm CLI. From this branch's repository root, run each variant and then compare their retained output.

```sh
export PATH=/Users/jeromequeck/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH
node docs/prototypes/scoped-esbuild/observe.mjs baseline
node docs/prototypes/scoped-esbuild/observe.mjs candidate
node docs/prototypes/scoped-esbuild/compare.mjs
```

Each variant creates an independent directory under ignored `work/esbuild-observation/`. The script copies the real manifest, locked dependencies, SQLite schema, and Drizzle config. It adds the override only to the candidate scratch manifest. A fresh `npm ci` installs each variant. One command table executes both variants and records stdout, stderr, exit code, runtime, and elapsed time in `evidence/`.

The data shape is one named variant and one ordered command table. Each command produces an observation object. No server starts. Node's native TypeScript stripping is disabled for loader probes, so success requires the installed loader or the explicit core transform.

## Observed behavior

| Observation                                                          | Locked baseline                                                 | Exact scoped override      |
| -------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------- |
| core-utils esbuild                                                   | 0.18.20                                                         | 0.25.12                    |
| Fresh install                                                        | Exit 0                                                          | Exit 0                     |
| Full npm audit                                                       | Exit 1, four moderate propagation entries                       | Exit 0, zero entries       |
| Production npm audit                                                 | Exit 0, zero entries                                            | Exit 0, zero entries       |
| Legacy ESM TypeScript and tsconfig alias                             | Exit 0, value 43                                                | Exit 0, value 43           |
| Legacy dynamic import from JavaScript to TypeScript                  | Exit 0, value 44                                                | Exit 0, value 44           |
| Native legacy loader on `.cts` TypeScript                            | Exit 1, syntax error                                            | Same syntax error and exit |
| Actual core `transformSync` on CJS TypeScript, followed by execution | Exit 0, value 45, source map object                             | Identical stdout and exit  |
| Real repository schema generation                                    | Exit 0, one table and three columns                             | Same schema and SQL bytes  |
| Generated SQL applied to disposable SQLite                           | Table, insert, readback, and duplicate owner rejection observed | Identical stdout and exit  |
| Repeat schema generation                                             | Exit 0, no schema changes                                       | Same result                |

`comparison.json` records 205 identical production lock entries. Their canonical SHA-256 is `fc56b7ed231b7f7e212402930c01b6829603b08d21856632b3c76d6929c17ae8`. The comparison excludes the root manifest and packages marked development-only. It compares every remaining package's full lock metadata, rather than names or version counts alone.

The candidate lock changes 27 entries, all under `node_modules/@esbuild-kit/core-utils/node_modules/`. These include the nested esbuild package and its platform binaries. Drizzle Kit remains 0.31.10, ORM remains 0.45.2, and the Vite, Wrangler, and tsx esbuild versions remain unchanged.

The SQL migration filenames and snapshot IDs are generated nondeterministically. The generated SQL bytes and applied SQLite schema match. The repeat-generation output reports no changes in each variant.

## APIs and limitations

The installed legacy ESM loader imports `transform`, `transformDynamicImport`, and path-resolution helpers from core-utils. Its TypeScript load hook calls asynchronous `transform`. Its JavaScript module hook calls `transformDynamicImport`. The dynamic import fixture exercises that JavaScript hook and then loads a TypeScript module. The explicit CJS fixture executes the installed core-utils `transformSync` output. These are real installed functions, not mocks or equivalent custom transforms.

Both native `.cts` loader invocations fail with `SyntaxError: Missing initializer in const declaration`. Both ESM and dynamic import probes also warn that Node removed `globalPreload`. Those are baseline limitations on Node 24.19.0. The candidate preserves them. This result must not be described as a successful complete CJS loader journey.

Normal Drizzle CLI loading uses tsx in the inspected installed code. Real schema generation therefore validates the repository's current CLI path in addition to the explicit legacy API probes. It does not show that Drizzle generation used the changed legacy dependency.

The prototype does not exercise every transform option, decorators, JSX, error mappings, every tsconfig option, every Drizzle command, other Node versions, other operating systems, or the vulnerable serve API. Full application typecheck, build, Node tests, lint, format, browser checks, and independent review belong to a separate implementation unit. No application or Site source changes. No deployment or authentication action.

## Decision

Proceed with a separate, small implementation issue and PR if removal of this development advisory remains desired. Apply only the exact scoped override, regenerate the lock, repeat this comparison, and run the repository's required gates and independent review before shipping. A stable upstream removal remains preferable when available. Do not downgrade Drizzle or move the application to a prerelease for this finding.

Exhaust the Design Space led to one switcher with a locked baseline and exact candidate. Model the Domain led to named variants and command observations. Prove It Works led to actual loader execution, SQL application, and preservation of failed commands.

The no-child-agent assignment prevents independent review here. This branch is a non-shippable draft evidence artifact. Root review remains required. Discovery also attempted `rg --files .agents/playbooks db`; it exited 2 because `.agents/playbooks` does not exist. The ordinary bundled Prototype playbook therefore applies.

The initial run's detailed JSON was overwritten during a second run. Initial progress records retain its command statuses. The final run retains complete stdout and stderr, including all repeated failures. The instrument now archives prior evidence before a rerun. First-run generated SQL remains under `evidence/first-run-sql/`. This retention gap is an instrument limitation, not an unobserved successful result.
