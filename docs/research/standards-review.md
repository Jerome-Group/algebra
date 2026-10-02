# Standards review — issue 75

Reviewed working diff against `1ab3a1d0a13a5de8e68323638aaa30dcc6ec7555`, including untracked implementation/tests; no implementation commits. Read repository standards, contribution/domain/workflow conventions, `CONTEXT.md` and ADR-0005. Tooling-enforced style excluded.

## Resolved

- **Formatter coverage:** `package.json:18` now includes `scripts/**/*.mjs`, covering both new production CLI modules. Satisfies `CODING_STANDARDS.md` §2 “Formatted by tooling” and §5’s own-artifact check obligation.
- **Control-kind drift:** exported `actionKinds` now supplies executable validation and both public action schemas. The previous three independently maintained allowed-kind lists are gone.
- Earlier contract observations were addressed: `buildMap()` and evidence/artefact I/O failures enter structured error envelopes; Git-aware source hashes cover runtime dependencies; CI invokes `verify --layer all`, whose browser layer starts an isolated production Worker.
- **Final follow-up:** `eslint.config.mjs:15–16` excludes generated `.wrangler/` and `outputs/`, leaving production sources checked. Independently ran lint: zero errors, ten existing warnings. `app/studio.css:189` gives checkpoint buttons sufficient specificity for white-on-blue contrast. Inspected custom slider keyboard replay (`scripts/algebra.mjs:143–193`): validates finite bounds, discovers keyboard step, rejects unreachable values, and verifies the resulting value. Browser tests cover minimum, maximum, interior and fractional rejection; their rerun belongs to the final all-layer verifier.

## Heuristic resolved

- The previous optional Duplicated Code finding is resolved: `scripts/algebra-map.mjs:235` defines one `actionSchema`, referenced by both `action` and `actions.items` (`:349–352`). Single/repeated-action shape and control-kind validation now share their declarations.

## Recovery defect resolved

`lib/algebra/progress-storage.ts:167–176` journals current raw record and `restoreTarget` before changing primary storage. Reload selects the failed-write target or successful-write inverse backup (`:68–76`), preserving retry/reversal. Independently inspected and ran both focused progress suites: **15 passed, zero failed**. Covered supported/future targets, failed null removal, reload/retry and reversal. A Vite WebSocket warning did not affect results.

Standards: zero documented breaches; zero remaining heuristic findings; recovery defect resolved. Persistence SHA-256 reviewed: `74ee807b140ba1489e0be1437ba973fc37dfb50129387dd8762346bd98dc564c`. Subsequent edits need focused re-review.

## Fresh committed review and repairs

A fresh two-axis review pinned `685bcd6f2ac1e3797a2a5ea4f8653f777e158cd2`. Its Standards reviewer found three documented breaches: a proposed 20-minute CI bound, hidden mutable CLI helper dependencies, and an implementation-narrating Diagram comment. It also identified duplicated verification-layer declarations as a heuristic. Those supersede the earlier zero-finding verdict for that earlier working snapshot. CI now retains ten minutes; helpers take explicit inputs and return results for the dispatcher; the Diagram comment states the label-scaling constraint; one `verificationLayers` declaration supplies schemas, help and executable validation. Focused CLI/map and browser-action checks passed after refactoring. Final independent re-review and exact-head required checks remain gates.

Parallel verifier runs exposed a shared artifact-directory collision: the application assertions passed, but another runner removed the active trace directory. Each CLI browser run now defaults to a unique output directory and reports it as structured evidence; an explicit environment override remains supported. A concurrent isolated-runner regression checks that both evidence sets survive.
