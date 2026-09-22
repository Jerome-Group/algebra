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

- #30 / PR #31 merged as `edceb05`; its browser checks also run in CI.
- #32 authors nineteen guided lessons: seventeen original audit entries and two new
  prerequisite bridges. The first unit now stays within functions, fibers and quotient
  rules. Four diagnostic checkpoints accompany each authored lesson; their grading is
  currently session-local, with persistent competency progress scheduled for its own slice.
  Ledger entries distinguish delivered teaching from pending concept-specific laboratories.
  Existing reference notes, citations and proof-status labels remain reachable.

Foundation validation: 32 Node tests pass; production build passes; no new TypeScript
errors. Browser checks exercise wrong-answer feedback, correction, reference navigation,
all four widths and axe. The baseline diagram-caption contrast and duplicate landmark
labels were corrected rather than excluded from that accessibility check.

- #32 / PR #34 merged as `e119479`. Review found that WebMCP treated checkpoint radios
  as text inputs. Labelled radio/checkbox activation and native select/textarea updates
  now reach React state; a browser test uses the registered tools to submit a checkpoint.
- #33 adds six foundation engines with nineteen lesson-specific contracts. Predictions
  precede manipulation, and each contract states an invariant, failure case and proof
  boundary. The Cayley graph has redundant outline/text reachability encoding; cosets
  reject nonnormal multiplication with an explicit representative witness. Action kernels
  are distinguished from stabilizer cores on a single orbit. The module board retains
  the nonunit-on-one-module counterexample.

Laboratory validation: production build and 37 Node tests pass. Six browser tests cover
keyboard activation, failure witnesses, 320/390/768/1440px layouts and serious/critical
axe checks. Screenshot review caught the inherited 340px inner scrolling cap; foundation
workspaces now expand naturally and the browser suite guards their full height. Evidence
is uploaded by CI. The ledger records foundation-lab delivery without claiming every
concept's full gate: advanced examples and other teaching requirements remain later work.
Review was local on both standards and #33 specification; configured review-agent access
remains unavailable. Type checking retains the same three baseline Cloudflare errors.

Dependency observation: GitHub alert #1 concerns esbuild 0.18.20 under drizzle-kit's
legacy esm-loader development dependency. The application Vite path uses esbuild 0.28.1.
The dependency update is tracked separately from the teaching change.

- #36 adds local, versioned competency evidence for submitted guided checkpoints and
  diagnostic capstones in all sixteen units. Assessment text is the evidence revision:
  edited questions, answers or explanations invalidate old attempts. Unknown, malformed
  and future-version records grant no credit. The device can be reset explicitly;
  inaccessible storage leaves the current session usable. Unit completion requires all
  lessons to have authored guided teaching, all their assessed competencies, and the
  capstone; incomplete units remain visibly pending. The atlas's prerequisite filter
  reads demonstrated competencies. These assessments check selection and explanation
  of reasoning, not a graded written proof.

Progress validation: 42 Node tests, production build and format passed. Type checking
still reports only the three baseline Cloudflare declaration errors. Browser validation
covers reload, correction, reset, unit gate, inaccessible storage and axe.

- #36 / PR #37 merged as `f083457`: versioned local competency evidence and sixteen diagnostic unit capstones.

- #38 adds five guided URECA direct-product lessons and a nine-stage route that
  carries the faithful degree-two D₈ square representation through existing
  Maschke/Schur/character material to product kernels. The route has a stable
  deep link, persists its selected D₈ element across lab navigation/reload,
  derives live decomposition, character and tensor readings from that object,
  and saves an assessed cumulative capstone. The source provenance
  labels the 18 September meeting notes as a reconstruction. V19 and V20 use
  exact C₂/C₃×D₈ character rows, traces, eigenvalues and reciprocal-scalar
  kernel pairs. The master source-gap ledger records all six delivered items;
  the visual backlog records V03 as partial because its relation exploration
  is still narrower than the full specification.

URECA validation: 47 Node tests (including independently checked D₈ matrices,
character orthogonality and reciprocal-scalar kernel pairs), 25 browser checks,
production build, format and lint pass. Browser coverage includes the five new
workspaces at 320/390/768/1440 CSS pixels, keyboard controls, axe and the
nine-stage route, persistent object and capstone. Type checking retains only the three baseline Cloudflare
declaration errors. The package validator still reports PASS for 143 concepts,
15 regressions, six source gaps and twenty visualisation rows.

- #40 adds the V06 fixed-coloring engine and four authored counting lessons.
  Six-bead necklaces/bracelets derive the two even-reflection cycle types;
  cycle-index inventory uses coefficient extraction; cube rotations are
  enumerated as 24 proper signed-permutation matrices and grouped into five
  axis families for vertices, faces and edges. The lab table exposes all
  elements, cycle types, fixed-coloring counts and class contributions before
  averaging, including motions with no fixed positions but fixed colorings.
  Counting-unit competencies and its existing capstone use versioned local
  progress. The 57-versus-56 full cube-symmetry extension remains a separate
  pending audit row, not part of this rotation-only slice.
