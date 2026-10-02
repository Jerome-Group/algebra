# Production release verification — 2026-10-03

[Abstract Algebra](https://algebra.jeromegroup.org) runs the reviewed learning overhaul and navigation-focus repair. All **150 existing repository concepts** remain; no syllabus was added. The original Site ID, domain, title and public access revision 2 are unchanged. The initial live site had 143 of those existing concepts.

The [machine record](release-verification.json) contains exact identifiers, hashes, executed coverage and limitations. [Browser inspection](research/browser-inspection.json) separates immutable baseline, historical local inspection and final production observations. Ignored `outputs/` evidence is retained locally and in CI artifacts; paths do not imply that artifacts are committed.

## Reviewed delivery

[PR #77](https://github.com/Jerome-Group/algebra/pull/77) supplies the teaching, studio, responsive diagrams, persistence protections and shared verification CLI. [PR #80](https://github.com/Jerome-Group/algebra/pull/80) repairs a focus race found during production verification. Independent Standards and Spec review found no remaining blockers before each protected squash merge. [Dependabot #73](https://github.com/Jerome-Group/algebra/pull/73) and [#74](https://github.com/Jerome-Group/algebra/pull/74) were separately reviewed and merged on passing checks.

Final reviewed head: `154e02d8c4c68a03bc6d5c521a720b0538a33de6`; protected squash: `393bf8df8f4b44916a4be2a20c7c1e4d3fa9a802`; common source tree: `bac9dbdf7fd0cecea949c7aae1139a2f3710409c`.

[CI 37067116022](https://github.com/Jerome-Group/algebra/actions/runs/37067116022) passed build, formatting, lint, types, map, dependency audit, **110 mathematical/content + eight render Node cases**, and **395 built Worker browser cases** (200 + 195). [Conformance 37067116687](https://github.com/Jerome-Group/algebra/actions/runs/37067116687) also passed. Engineering, both browser shards, aggregate checks and conformance were required; strict protection and bypass policy remained intact. The owner approved the isolated protection addition in [org PR #257](https://github.com/Jerome-Group/org/pull/257); its reviewed one-resource Terraform plan was applied and the settled organisation audit passed.

The initial production suite passed 391/392. A delayed navigation frame stole subsequent proof-stage focus. Repeated independent diagnostics reproduced it on production and localhost. Three deterministic regressions fail on the old deployment and pass after cancellation respects subsequent focus and superseding navigation. Historical failures remain in the [verification audit](research/verification-audit.md); the later pass does not erase them.

## Actual final production inspection

After restoring fixed version 7, an independent agent ran both shared CLI shards against the canonical domain: **200 + 195 = 395 passed**, zero failures, skipped or flaky cases. Reports: `outputs/production-final-browser-{1,2}.json`; durations 251154ms and 137672ms. Covered recovery includes unavailable storage, reversible reset, failed laboratory imports and deferred navigation. The reports identify the local build hash; they do not prove downloaded production server-byte identity.

The lead separately inspected in the Codex in-app browser:

- All 150 guided lessons at 320 and 1280 pixels: 300 snapshots, all six stages, zero observed page overflow or mathematics rendering errors.
- All 150 laboratory routes at 320 pixels, with models revealed wherever prediction was required: 1323 displayed controls; zero observed page overflow, mathematics rendering errors or loading errors. Integrated laboratories intentionally retain their reveal button after results appear.
- Definition, example, theorem and proof views for every lesson: 600 snapshots at 320 pixels; zero observed page overflow or mathematics rendering errors.
- Home, Learn, Explore, Reference and Sources at 320 pixels; no observed overflow or rendering errors.

This is executed DOM/render inspection, with a condensed per-lesson ledger. Full live DOM snapshots were read during the browser session; the ledger is not a persisted raw snapshot archive. Independent responsive inspection covered 450 layouts at 320/375/768 pixels and 78 readable-label keyboard-pan flows; all 162 responsive browser cases passed. The final 375×900 production screenshot is `outputs/production-cube-phone.png`; its cube is 311×222 pixels. See [sizing evidence](research/visual-sizing-review.md).

## Mathematical decisions and preservation

[Independent semantic review](research/independent-mathematics-review.md) read all 150 guides, including inherited content. Eight inherited proof/definition defects were repaired and reread; all 316 inherited assessment contracts remain unchanged. [Primary-source research](research/mathematics-and-learning.md), [pedagogy research](research/learning-experience.md) and [source coverage](source-coverage.md) preserve provenance and distinguish verified claims from design hypotheses.

Examples of consequential decisions: the orbit/coset bijection requires `H=G_x` and equivariance, corroborated by [McGerty](https://people.maths.ox.ac.uk/mcgerty/ImperialGRT.pdf); simple-module dimension over a general field is `n_i dim_F D_i`, corroborated by [Sharifi](https://math.ucla.edu/~sharifi/notes/algebra-ch13.html); Artinian structure claims carry their commutative/unital hypotheses, corroborated by [Stacks](https://stacks.math.columbia.edu/tag/00KH). Computed models illustrate examples; imported general theorems remain explicitly identified.

Progress, resume and saved square-element storage keys remain stable. Tests cover unknown/revised, malformed/future, unavailable and cross-tab records, export and reversible reset. No active account/cloud-save consumer was found; retained authentication helpers, access policy, private course links and licences remain. Private course PDFs were not reopened or redistributed.

## Native deployment and tested rollback

Original project: `appgprj_6a9f5e3039108191a1f2d9598aedd130`. Active saved version: **7**, source `6e9190020bcb8a665e3a9dabde83786892b4d90f`. The independent native audit matched all 340 tracked source blobs/modes and all 119 client files. Local and native server bundles differ only in four generated UUID lines; normalized bundles agree. Two manifests differ only in generated prerender secrets. No unexpected application code/config differences were found.

Version 7 archive: 239 application files, provider content hash `sha256:4565dfbc802fe1654b1d56b8b8d25eb8100c03fac4ced8a9ba87d9bcf3adda92`. The compressed local tar has a separate SHA-256, recorded in JSON; these hashes measure different representations.

Version 8 is a distinct saved archive built from an empty checkpoint commit with the same reviewed tree. Both versions were deployed, then version 7 was restored successfully: **7 → 8 → 7**. Final restore deployment `appgdep_6ac024c784a88191aa007dd800bdf7a3` reported success, refreshed at `2026-10-02T21:41:25.264380+00:00`. The full production suite and in-app inspections followed restoration. Latest saved version 8 does not mean it is active.

For recovery, deploy the exact saved version 7 ID in the machine record through the Sites connector, check that deployment reaches `succeeded`, then rerun both production shards and inspect the affected journeys. Keep this saved version available. The rehearsal verifies provider activation/restoration of these archives; it does not inject defective code or test incompatible data schemas. Older vulnerable version 4 is not a rollback target.

## Operating the verifier and limits

Node 24+ and locked dependencies are required. `npm run agent -- help` exposes command schemas, prerequisites and read/write effects. `npm run agent -- verify --layer all --evidence outputs/release-verification.json` builds and verifies the current source. For live verification, run `npm run agent -- verify --layer browser --url https://algebra.jeromegroup.org --shard 1/2 --evidence outputs/production-browser-1.json`, then the corresponding `2/2` command. Both shards must pass. CI uses the same CLI against its transferred exact build.

Four moderate legacy Drizzle/esbuild toolchain audit entries remain; high/critical findings are zero in the executed audit. No full WCAG certification, learner study, exhaustive parameter-combination verification or proof of general theorems from finite displays is claimed. Saved work supports export and one reversible previous record; no import UI or distributed-transaction guarantee. Build chunk-size warnings remain. These limits do not change the existing syllabus or audience.
