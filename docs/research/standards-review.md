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
