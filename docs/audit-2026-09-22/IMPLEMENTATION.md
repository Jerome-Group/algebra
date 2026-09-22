# September learning rebuild

Issue: https://github.com/Jerome-Group/algebra/issues/27
Specification: the supplied package's `codex/CODEX_MASTER_PROMPT.md` and per-concept acceptance gates.

## Release scope

The owner removed Sites publication from scope on 22 September. Finish through reviewed PRs,
merges, and a locally runnable application. Do not change the retained Site identity.

Deliver in slices: baseline and metadata; four modes and short units; guided content and
foundation engines; actions/counting; rings/modules; advanced structure; representations and
URECA; competency assessment; final accessibility and acceptance verification. Each slice
preserves the existing regression suite and records evidence against the master checklist.

The package's first-five prose list includes the module board while CSV V01–V05 includes
Cayley reachability. Deliver both. Audit IDs `mh2220-cauchy` and
`odyssey-frobenius-reciprocity` resolve by exact title to `groups-cauchy` and
`odyssey-frobenius`; the committed ledger uses actual IDs. Blank package IDs were likewise
resolved by exact navigation title. All 143 mappings are unique.

A worked illustration is not automatically a guided lesson. Initial metadata retains the
24 explicit references and ten advanced roadmaps. Promotion requires authored teaching and
assessment evidence, not a filled template or a page visit. Pending ledger entries are not
completed acceptance gates.

## Baseline, 22 September 2026

Source: `c6faf85d302f21f854f2c7e65aa395c99fb561be`; Node 24.11.0.

- `npm ci`: passed.
- `npx vinext build`: passed.
- `node --test tests/*.test.mjs`: 21 passed.
- `npm run format:check`: passed.
- `npm run lint`: no errors; ten existing warnings.
- `npx tsc --noEmit`: three existing errors: missing `cloudflare:workers` declaration in
  `db/index.ts`, and missing `Fetcher`/`D1Database` in `worker/index.ts`.
- Supplied `scripts/validate_package.py`: PASS, 143 concepts, 15 regression rows,
  six source gaps and 20 visualisations.
- Initial axe check: serious contrast failure on `.map-caption` (3.6:1), moderate duplicate
  complementary landmarks. These remain release work; the baseline is not an accessibility pass.
- Initial dev browser hit stale Vite dependency 504s; a production browser run is required
  for reliable console and interaction evidence.
- Deployed source identity unverified: Sites reports the retained project ID unavailable
  in this account. The owner confirmed the Site belongs to another account.

Local evidence: `/tmp/algebra-audit-evidence/` (install/build/lint/format/types/tests logs,
baseline screenshots at 320, 390, 768 and 1440 CSS pixels, axe results). Private package
source files remain outside Git at `/tmp/algebra-audit-20260922/`.
