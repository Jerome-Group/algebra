# Acceptance checklist

## Mathematics

- [x] Every theorem states all field, finiteness, commutativity, unitality and degree hypotheses. — Evidence: `tests/review-regressions.test.mjs`, `lib/algebra/lessons.json`.
- [x] Group actions use one documented left/right convention. — Evidence: `tests/foundation-labs.test.mjs`, `tests/browser/final-regressions.spec.mjs`.
- [x] Matrix multiplication order agrees with displayed action order. — Evidence: `tests/permutation-matrices.test.mjs`, `tests/browser/final-regressions.spec.mjs`.
- [x] Quotient operations include a well-definedness check. — Evidence: `tests/quotients.test.mjs`, `tests/ideal-quotients.test.mjs`.
- [x] Representation pages state field and dimension. — Evidence: `tests/review-regressions.test.mjs`, `lib/algebra/lessons.json`.
- [x] Tensor products type-check left/right module actions. — Evidence: `tests/tensor-balancing.test.mjs`, `tests/browser/tensor-balancing.spec.mjs`.
- [x] Character-kernel pages distinguish `χ(g)=χ(1)` from `|χ(g)|=χ(1)`. — Evidence: `tests/character-construction.test.mjs`, `tests/browser/character-construction.spec.mjs`.
- [x] External tensor product kernels use scalar matching. — Evidence: `tests/ureca-direct-products.test.mjs`, `tests/browser/ureca.spec.mjs`.
- [x] Visual evidence is never labelled a proof without a rendered argument. — Evidence: `docs/audit-2026-09-22/PROOF_DEPENDENCIES.md`, `tests/proof-dependencies.test.mjs`.
- [x] All rows in `prior_regression_check.csv` are green. — Evidence: `docs/audit-2026-09-22/prior_regression_check.csv`, `tests/audit-ledger.test.mjs`.

## Guided learning

- [x] Guided lessons have a hook, prerequisite check and explicit outcome. — Evidence: `tests/guided-content.test.mjs`, `tests/lesson-content.test.mjs`.
- [x] Guided lessons have two examples and one nonexample. — Evidence: `tests/guided-content.test.mjs`.
- [x] Guided lessons have a proof/proof skeleton. — Evidence: `tests/guided-content.test.mjs`, `tests/proof-dependencies.test.mjs`.
- [x] Guided lessons have application and transfer practice. — Evidence: `tests/guided-content.test.mjs`, `tests/browser/learning.spec.mjs`.
- [x] Feedback diagnoses at least one likely misconception. — Evidence: `tests/guided-content.test.mjs`, `tests/browser/progress.spec.mjs`.
- [x] Reference-only lessons are excluded from guided completion counts. — Evidence: `tests/learning-metadata.test.mjs`, `tests/progress.test.mjs`.
- [x] Each unit has a capstone and remediation links. — Evidence: `tests/learning-units.test.mjs`, `tests/browser/learning.spec.mjs`.
- [x] Progress reflects competencies, not only page visits. — Evidence: `tests/progress.test.mjs`, `tests/browser/progress.spec.mjs`.

## Visualisations

- [x] Each lab has a named mathematical question. — Evidence: `tests/foundation-labs.test.mjs`, `lib/algebra/lab-contracts.json`.
- [x] Each lab asks for a prediction. — Evidence: `tests/foundation-labs.test.mjs`, `tests/browser/foundation-labs.spec.mjs`.
- [x] Every control maps to a named mathematical variable or choice. — Evidence: `tests/foundation-labs.test.mjs`, `tests/browser/foundation-labs.spec.mjs`.
- [x] Equations/sets/invariants update with the state. — Evidence: `tests/browser/foundation-labs.spec.mjs`, `tests/browser/ureca.spec.mjs`.
- [x] A counterexample or failure state is available. — Evidence: `tests/foundation-labs.test.mjs`, `tests/browser/final-regressions.spec.mjs`.
- [x] A theorem debrief explains the scope and proof boundary. — Evidence: `tests/foundation-labs.test.mjs`, `lib/algebra/lab-contracts.json`.
- [x] A text/table fallback exists. — Evidence: `tests/foundation-labs.test.mjs`, `tests/browser/foundation-labs.spec.mjs`.
- [x] Lab type is one of illustration, experiment, proof animation, constructor, checker or reference diagram. — Evidence: `tests/foundation-labs.test.mjs`, `tests/learning-metadata.test.mjs`.

## Information architecture

- [x] Home offers Learn, Explore, Reference and Sources. — Evidence: `tests/browser/learning.spec.mjs`.
- [x] Guided units are 3–7 lessons rather than giant routes. — Evidence: `tests/learning-units.test.mjs`.
- [x] Atlas filters include level, teaching status, source and visualisation type. — Evidence: `tests/learning-metadata.test.mjs`, `tests/browser/learning.spec.mjs`.
- [x] Source map covers MH2220, MH3220, Odyssey Y1 and URECA Y2. — Evidence: `docs/source-coverage.md`, `tests/learning-metadata.test.mjs`.
- [x] Missing URECA direct-product topics are visible until delivered. — Evidence: `docs/audit-2026-09-22/missing_source_topics.csv`, `tests/ureca-direct-products.test.mjs`.
- [x] Deep links, Back/forward and focus restoration work. — Evidence: `tests/browser/learning.spec.mjs`.

## Accessibility

- [x] 320px and 390px widths have no document overflow. — Evidence: `tests/browser/foundation-labs.spec.mjs`, `tests/browser/final-release.spec.mjs`.
- [x] 200% zoom/reflow works. — Evidence: `tests/browser/final-release.spec.mjs`.
- [x] Every lab is keyboard-operable. — Evidence: `tests/browser/foundation-labs.spec.mjs`, `tests/browser/ureca.spec.mjs`.
- [x] Focus is visible and restored after drawers/dialogs. — Evidence: `tests/browser/learning.spec.mjs`, `tests/browser/foundation-labs.spec.mjs`.
- [x] State changes have accessible names/announcements. — Evidence: `tests/browser/foundation-labs.spec.mjs`, `tests/browser/ureca.spec.mjs`.
- [x] No information relies on colour alone. — Evidence: `tests/browser/foundation-labs.spec.mjs`, `tests/browser/final-regressions.spec.mjs`.
- [x] Reduced-motion alternatives exist. — Evidence: `tests/browser/final-release.spec.mjs`, `app/responsive.css`.
- [x] KaTeX MathML remains accessible. — Evidence: `tests/browser/final-release.spec.mjs`, `components/algebra/Math.tsx`.
- [x] Equivalent text/table views exist for essential visuals. — Evidence: `tests/foundation-labs.test.mjs`, `tests/browser/foundation-labs.spec.mjs`.
- [x] Axe reports no serious or critical violations. — Evidence: `tests/browser/final-release.spec.mjs`, `tests/browser/foundation-labs.spec.mjs`.

## Engineering and release

- [x] Existing tests pass. — Evidence: `node --test tests/*.test.mjs`.
- [x] New schema validation passes for every lesson. — Evidence: `tests/lesson-content.test.mjs`, `tests/learning-metadata.test.mjs`.
- [x] Prerequisite graph resolves and is acyclic. — Evidence: `tests/learning-units.test.mjs`.
- [x] Guided routes contain no reference-only lessons. — Evidence: `tests/learning-units.test.mjs`, `tests/learning-metadata.test.mjs`.
- [x] Build, lint, format and type-check pass or documented pre-existing failures remain unchanged. — Evidence: `docs/audit-2026-09-22/IMPLEMENTATION.md`, `npx vinext build`, `npm run lint`, `npm run format:check`, `npx tsc --noEmit`.
- [x] Browser console has no errors on representative flows. — Evidence: `tests/browser/final-release.spec.mjs`.
- [x] Screenshots/axe artifacts are stored. — Evidence: `.github/workflows/ci.yml`, `tests/browser/final-release.spec.mjs`.
- [x] `python scripts/validate_package.py` passes. — Evidence: `supplied scripts/validate_package.py`, `docs/audit-2026-09-22/IMPLEMENTATION.md`.
- [x] `concept_audit.csv` has an explicit final disposition for all 143 rows. — Evidence: `docs/audit-2026-09-22/concept_audit.csv`, `tests/audit-ledger.test.mjs`.

## Verification evidence

- **Mathematics:** `tests/review-regressions.test.mjs`,
  `tests/permutation-matrices.test.mjs`, `tests/nilradical.test.mjs`,
  `tests/proof-dependencies.test.mjs`, the URECA/tensor tests, and the 15
  final verdicts in `prior_regression_check.csv` preserve the stated
  hypotheses, action order, balancing sides, scalar kernels and proof
  boundaries. Reference the row evidence for concept-specific limits.
- **Guided learning:** `tests/guided-content.test.mjs`,
  `tests/learning-units.test.mjs`, `tests/progress.test.mjs` and their browser
  counterparts check authored lesson fields, remediation, competency credit
  and reference exclusion.
- **Visuals:** `tests/foundation-labs.test.mjs` validates every curated lab
  contract; `visualisation_backlog.csv` links all 20 backlog experiences to
  implementation evidence. Browser tests cover predictions, live state,
  failure cases, text/tables and mathematical debriefs.
- **Architecture:** `tests/browser/learning.spec.mjs`,
  `tests/learning-metadata.test.mjs` and `docs/source-coverage.md` verify
  modes, filters, short units, four source strands and history/focus.
- **Accessibility:** `tests/browser/final-release.spec.mjs` covers 200% layout
  equivalence, KaTeX MathML, reduced motion, console and axe on a reference
  page; the lab browser suite covers 320/390px, keyboard controls, named
  state and text/table alternatives. CI retains screenshots and axe traces.
- **Release:** run `node --test tests/*.test.mjs`, `npm run test:browser`,
  `npm run format:check`, `npm run lint`, `npx vinext build`, `npx tsc --noEmit`
  and the supplied `scripts/validate_package.py`. The unchanged three
  Cloudflare ambient-type errors and ten lint warnings are documented in
  `IMPLEMENTATION.md`. `tests/audit-ledger.test.mjs` checks all 143 concept
  dispositions, 20 visuals and 15 prior regressions.
