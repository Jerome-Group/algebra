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

## Delivered slices

- #28 / PR #29: baseline and conservative learning metadata, merged as `a66404e`.
  GitHub review caught a production route count still including reference entries; the
  route filter and its regression test were fixed before merge.
- #30: home and four product modes, sixteen short units, atlas filters, syllabus coverage
  and local resume. Multi-source alignment includes the audit matrix’s URECA Maschke,
  Schur and character chapters; it does not claim to reproduce the private course notes.
  Unit capstones have worked reasoning, but competency grading and guided-content promotion
  remain later slices.

Mode browser evidence is in `/tmp/algebra-audit-evidence/modes-*`: home, atlas and Learn
fit 320, 390, 768 and 1440 CSS pixels; atlas and Learn axe runs report no violations.
The reference filter returns 24 entries. Back/forward restores the lesson heading and
selected unit. Initial dev dependency cache errors were eliminated by restarting Vite
after rebuilding; do not reuse a server loaded against replaced build artifacts.

Required review agents could not start: configured-model access was unavailable. Standards
and specification reviews therefore ran locally; this is not independent review evidence.

Browser regression coverage now runs in CI via `npm run test:browser`. The eight checks
cover all five modes, viewport reflow, axe, unit history, reference filtering and the
measured-header drawer offset. Local results are in `outputs/playwright/`; CI uploads
`browser-evidence`. The drawer/header test caught the 768px fixed-height conflict before
merge. All eight checks pass after correcting both header sizing and drawer positioning.
