# September learning rebuild

Issue: https://github.com/Jerome-Group/algebra/issues/27
Specification: the supplied package's `codex/CODEX_MASTER_PROMPT.md` and per-concept acceptance gates.

## Release scope

The owner restored access to the original Sites project on 23 September. Finish through
reviewed PRs, merges, a locally runnable application and a final verified publication.
Preserve the retained Site identity and public audience.

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
- The retained Site identity was unavailable in the initial account. On 23 September,
  Sites confirmed owner access to the original project, public audience and live URL.

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

- #42 adds three guided geometry lessons and the V09 synchronizer. A fixed
  F=diag(1,−1) drives both ordered plane products and their half-angle fixed
  lines, including the θ=0 gate. The metric comparator keeps dimension,
  normal, matrix, determinant, fixed space, dot products and cube verdict
  together; it separates a plane reflection from −I₃. Rodrigues' formula now
  accepts any nonzero real axis and a continuous angle. The cube permutation
  and generator word appear only after the matrix matches a cube rotation.
  The lessons teach the proof and diagnose the 0°/180° axis ambiguities.

Geometry validation: 52 Node tests, 34 browser checks, production build,
lint and package validator pass. The browser run covers ordered products,
dimension and fixed-space changes, arbitrary axes, four viewport widths and
serious/critical axe checks. Lint retains ten baseline warnings; TypeScript
retains the three baseline Cloudflare declaration errors.

- #44 completes V03 across cyclic and S₃ examples. The cyclic graph now shows
  shortest word lengths, all divisor-order subgroups and the difference between
  a subgroup union and its join. The S₃ word explorer checks relations, then
  separately proves presentation completeness by reducing every word to six
  normal forms whose permutations are distinct. Cayley's theorem is a guided
  lesson with a live left-regular S₃→S₆ table: composition, injectivity and
  the nonminimal-degree boundary are explicit. The three concept audit rows
  and V03 cite the implementation and checks.

V03 validation: 55 Node tests, 37 browser checks, production build, format,
lint and package validator pass. New browser coverage exercises both relation
views and the regular embedding at 320/390/768/1440px, including keyboard
controls and axe. TypeScript still reports only the baseline Cloudflare errors.

- #46 promotes ten lessons across Operations, Actions and Sylow to authored
  guided teaching. The dihedral lesson derives right-to-left normal forms;
  actions include a labelled triangle, orbit–stabilizer, a computed four-property
  grid and the kernel/core distinction. Cauchy uses cyclic-shift orbit counting;
  Sylow existence exposes both induction cases; conjugacy uses distinct P and Q
  in the fixed-coset action; counting proves the normalizer and unique-fixed-point
  steps. The order-six classification uses Cauchy and index-two normality. V07
  lists S₃'s actual subgroups alongside arithmetic candidates, centralizers,
  cosets, conjugacy witnesses and a failure state. The three units now have the
  guided evidence needed for their existing competency completion gates.

V07 checks: model assertions cover every S₃ conjugate, centralizer and fixed
coset; three browser flows cover prediction, keyboard controls, four widths,
tables and axe. The ten audit rows distinguish delivered teaching from remaining
visual work on the dihedral relation and Cauchy tuple action.

- #49 promotes the six Rings-unit lessons to guided teaching. Conventions
  distinguish nonunital rings, unital maps, fields and two-sided ideals.
  Worked examples cover ℤ, 2ℤ, ℤ/8ℤ, M₂(F), a matrix left ideal,
  evaluation ℝ[X]→ℂ and reduction ℤ→ℤ/6ℤ. The quotient lesson proves
  representative independence; the first isomorphism lesson separates
  descent, injectivity, surjectivity and image.

V10 constructs quotients of ℤ/12ℤ by selected ideals and of F₂[X] by three
quadratic ideals. The model computes units, zero divisors, multiplication and
the inclusion-preserving ideal correspondence; an additive subgroup that is
not an ideal gives a representative-dependent failure. Model tests check ring
laws, all finite quotient cases and the non-ideal witness. Browser checks
cover prediction, keyboard controls, live changes, four widths and axe. The
Rings unit has authored competency evidence for its existing capstone.

- #50 promotes seven Factorisation unit lessons to authored guided teaching. Euclidean
  division carries the ideal invariant through every remainder and back-substitution;
  PID and UFD proofs separate the zero ideal, existence, uniqueness and associates.
  Polynomial lessons show legal leading-term cancellation, primitive content,
  Eisenstein after translation, and the degree limit of root tests. V12 compares
  four worked polynomials over ℚ, ℝ, ℂ and F₂, requiring a prediction before each
  field-specific factorisation, roots, content and certificate reveal. A rootless
  reducible quartic and an invalid degree-dropping reduction remain visible
  boundaries. Seven concept rows and V12 have delivery evidence; unrelated
  reference-only and roadmap rows remain outside guided completion.

- #53 promotes the four Localisation unit lessons to guided teaching. Regular
  denominator cancellation and the general annihilator relation are separate;
  the universal property is proved without claiming injectivity. V11 reduces
  selected fractions before classifying them in ℤ₍₃₎, ℤ[1/3] and ℚ, shows
  inverted sets, surviving primes, the v₃ reading and a zero-divisor failure.
  V13 constructs ascending, descending and prime-ideal chains with generators,
  strictness witnesses, the finite/infinite cardinality boundary, and labelled
  Hilbert, Artinian local-decomposition and dimension theorem dependencies.
  Four concept rows and V11/V13 carry delivery evidence.

- #55 promotes the four Modules unit lessons to guided teaching. V14 carries
  one nonfree cyclic ℤ-module across a typed scalar action, presentation,
  submodule/quotient and exactness/splitting stages. Live kernel, image,
  vector/module annihilator and quotient readings come from the same model;
  the operator-submodule lesson retains its invariant-line laboratory. The
  board distinguishes a nonunit acting invertibly on one module from a ring
  unit, and an exact nonsplit sequence from a split direct sum. Four concept
  rows and V14 have delivery evidence.

- #57 promotes five Representations-unit lessons to guided teaching. V15 keeps
  the D₈ quarter-turn and reflection matrices in view across field, subgroup,
  invariant-line and intertwiner choices. The same basis change is checked on
  both generators; a noninvertible equivariant projection exposes invariant
  kernel and image. The complex rotation eigenline fails under reflection,
  while the full representation remains irreducible. Four concept rows and V15
  record delivered gates. The linear-algebra foundation row records its guided
  bridge while retaining the requested split into dedicated prerequisites as
  pending final-audit work.

- #59 promotes Maschke, Schur, real/complex C₃ and characters to guided
  teaching. Averaging an explicitly non-equivariant C₂ projection yields an
  invariant kernel and image, with the characteristic-two obstruction beside
  it. Schur separates the kernel/image theorem from the algebraically closed
  scalar conclusion; a real irreducible C₃ plane has nonscalar endomorphisms.
  V16 constructs S₃ rows from trivial, sign and point-permutation traces,
  subtracts the constant line, then uses class-weighted orthogonality and
  tensor decomposition. Equal-column weighting produces a visible failure.
  Four concept rows and V16 carry delivery evidence.

- #61 promotes the S₃ character-table and induction lessons to guided
  teaching. The table lesson constructs rows, checks weighted row/column
  orthogonality, proves the exact inflation subset, and rejects a virtual row
  as an actual character. V17 follows Ind_{C₂}^{S₃} of trivial or sign across
  the e,r,r² transversal, with both generator matrices, subgroup correction,
  fixed-coset trace and matched Frobenius Hom dimensions. The audit keeps S₄,
  D₄/Q₈, A₅ table constructions and a separate GL₂ route pending.

- #62 guides Wedderburn blocks and radical layers with V18. M₂(F) matrix
  units distinguish block dimension four from simple dimension two and
  regular multiplicity two; F[C₂] has an explicit block map when 2 is
  invertible. The natural T₂(F)-module has radical and socle Fe₁, simple
  successive layers, and a nonsplit extension detected by E₁₂e₂=e₁.
  Characteristic-two group algebra and the opposite-ring step stay visible.
  The audit leaves broader group-algebra, unitization, nilpotent-span and
  Morita extensions outside these worked core examples.
