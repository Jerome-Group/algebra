# Guided learning

## Sub-features

Checkpoint reasoning, prerequisite and competency feedback, staged reading, proof recall,
unit context, capstone return and completion; editable argument blocks, questions,
self-review, retained proof references, chosen support and separate argument backups;
typeset public teaching, mathematical control names and keyboard access to wide equations.

## How to get to it (user POV)

Open `/#learn`, choose Start this unit, and enter its lesson. The first functions
lesson also offers Help me read the symbols, a temporary
[Beginner language](beginner-language.md) detour with a return link. Select a checkpoint answer and
press Check reasoning. Move through the reading stages and use the lesson compass.

Choose Work on this argument from any lesson. Reconstruct shows its objects, statement and
conventions while concealing the proof. Write an argument block and its question; Add block
keeps separate moves. Compare reveals the exact proof references retained with that sheet.
Attach a reference to the active block or record Your self-review. Consult offers direct
catalogue prerequisites, expandable branches and Search teaching for your question.
Open a supporting lesson or laboratory, then Return to my writing. Try transfer check opens
the lesson's existing current assessment. A unit-scoped sheet offers Return to original unit
capstone; Return to my argument restores the sheet.

## Mathematical presentation

`components/algebra/Math.tsx` separates public `Prose` from `WrittenProse`.
Public presentation uses exact-string annotations compiled from lessons, guided lessons,
units and capstone assessments. Unmapped text keeps its original rendering. The adapter
leaves canonical assessment-revision and teaching-edition inputs intact.

Private writing and questions use `WrittenProse`, which renders explicit math delimiters
without the public lookup. Retained teaching uses public presentation only after its
stored edition digest matches the current edition. Pending or historical teaching keeps
the delimiter-only renderer. Check edition labels and backup bytes when these paths change.

Run `npm run verify:math-presentation` for the reviewed catalogue core. To retain its detailed receipt,
run `node scripts/math-presentation.mjs check --complete --report "$ALGEBRA_PROOF/math-presentation.json"`.
Require a passed receipt with `partial: false` and `reviewedCompleteness`. The gate binds
the accepted annotations and complete current display queue to all four source-byte hashes,
exact review counts and recorded review report bytes in
`lib/algebra/math-presentation/review.json`. It also requires the exact generated module
and strict, trust-disabled KaTeX parsing of existing delimited formulas, direct definition
and theorem TeX, and compiled substitutions. The compiler's `queue`, `build` and plain `check` operations are
partial authoring checks. A queue, parser result or self-authored attestation cannot replace
the independent mathematical review retained in `docs/research/`.
That core covers classified catalogue fields. Public components, diagrams and laboratories
also require complete-source independent review and actual execution.

Follow the parent skill's source, build and execution sequence. Before build, run
`node scripts/math-presentation.mjs check --complete --all-ui --require source-attestation --report "$ALGEBRA_PROOF/public-math-source.json"`.
Require `status: "passed"` and `publicCompleteness.satisfiesRequirement: true` for
`require: "source-attestation"`. The current source acceptance binds whole-file review reports,
the catalogue core and the required cases and observations. It reports execution as unverified.
`npm run build` and `vite.config.ts` require this source acceptance without asking for future
execution. The successful outer build records its actual output manifest.

After the full release pass, run
`node scripts/math-presentation.mjs check --complete --all-ui --require executed-presentation --report "$ALGEBRA_RELEASE_PROOF/public-math-execution.json"`.
Require the executed-presentation requirement to pass against the current source and build.
The real Node and browser runner records must supply the required cases, output observations,
served resources and owned cleanup. A source attestation, generated queue, SSR render or partial
feature pass cannot substitute for those records. Preserve failures; an old successful receipt
does not survive a failed latest run. The presentation result grants no release approval and
does not prove every mathematical claim or native sign-in.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature guided-learning --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/guided-learning.json"`.

The learning and studio journeys check correct and incorrect feedback, the Prove compass button
by keyboard, proof recall and heading focus across Back and Forward. For changes to other compass
destinations, operate each affected button and check that its section receives focus.
Expect unit position and lesson context to survive navigation. Use a disposable context for answers;
a selected radio alone is not a submission.

`tests/browser/math-presentation.spec.mjs` checks functions, fibers, quotient rules and an
existing Mackey formula at 390 and 1440 pixels. Require rendered mathematical radio names,
no raw TeX commands in their accessibility snapshots, and no nested math Tab stops in choices.
ArrowDown must move both selection and focus. The three foundations lessons also submit
Check reasoning and require feedback.
Standalone math remains focusable. At 390 pixels, the functions Define stage must let
ArrowRight pan its wide display equation without widening the page. Retain screenshots
and accessibility reports with no serious or critical violations.

The same file enters `/#lab:mh2220-subgroups` and checks Finite group prefix search.
Typing `s` focuses Symmetric; Enter selects it and returns focus to the trigger.
Typeset options have no nested math Tab stops. Include this group when changing the shared
`Choice` control in `components/algebra/Groups.tsx`; the laboratories group alone omits this check.

`citation-math.spec.mjs` checks five retained reader citations at 390 and 1440 pixels,
including character-table groups, the S₃ source example and cube-action references. Open
the relevant further-reading disclosure and require the whole expression and bibliographic
prose, with no nested math Tab stops or page overflow. The same file checks T72/T73 nested
Sources citations through the discovery route. Inspect the citation screenshots when these
passages or their wrapping change.

The discovery learning journey also returns from a unit's final lesson to its existing capstone,
restores `#capstone:<unit>` through refresh and history, and checks visible target focus at 390
and 1440 pixels. It rejects unknown targets and checks deferred focus cancellation. An unscoped
reading endpoint ends the reading list. The account journey checks that capstone navigation
preserves the account document without competency credit.

The argument journey in `tests/browser/arguments.spec.mjs` follows this route at 390 and 1440 pixels:

1. Open `/#work:ureca-constructions-induction-adjunction?unit=ureca-constructions-induction-adjunctions`.
   Write an argument and Question for this block. Initially the desk shows neither proof references
   nor an assessment form. Find support for this question shows two direct prerequisites; expand
   the tensor/coset-identification branch to reach tensor-products.
2. Open that supporting lesson, then Open its laboratory. Enter Your mathematical prediction and
   Test my prediction; expect Balance: equal in the tensor-balancing laboratory. The writing and
   question survive. Return to my writing restores comparison and the original unit route.
3. Attach reference 2 to this block and select I revisited this reasoning. These operations leave
   the workspace without an assessment form. Try transfer check mounts exactly one current transfer
   checkpoint. Select its answer, then Check reasoning; expect Correct. Return to original unit
   capstone focuses that capstone. Return to my argument retains the writing, question and unit.
4. Retain the responsive screenshots and accessibility result. The same browser file also checks
   cold support headings while identity is pending, explicit target replacement, guest backup
   export/preview/import with fresh copy IDs and reload loss, and the consulted reference's
   Open experiment route. A failed support-laboratory import checks cancelled-reload protection and
   export of the retained guest writing. Its owned synthetic-account cases check captured-save acknowledgement,
   later unsaved typing, reload/resume, two-tab conflict copies, current-revision resume after Save,
   protected deletion, unrelated-draft preservation and Reload saved arguments recovery.

For changed search/editing controls, also use Search teaching for your question, inspect the
displayed existing passage and follow its link; check an empty result and clear back to direct
prerequisites. Operate formatted preview, reference removal and block-removal confirmation when
affected. For edition-recovery changes, use a valid retained historical backup: expect earlier
teaching labels, unchanged retained references and an explicit new attempt with current teaching.
Those controls have source/schema coverage; the mapped argument browser journey does not exercise
all of them. Catalogue/schema tests iterate every public lesson (currently 227), which does not
establish 227 executed argument-desk journeys.

The URECA coverage journey enters every added foundations, constructions and theory lesson.
It checks visible conventions, worked-example and proof-step counts, and four checkpoint forms,
operates Work examples and proof recall, then submits one correct hypothesis answer through
the real form. Selecting the answer leaves credit unchanged; submitting it demonstrates one
competency. Other new checkpoint answers remain covered by independent content review and
rendering checks, rather than a claim that this journey submits all four.

For selected public headings and conventions, `tests/browser/math-content.mjs` provides
`expectCatalogueText`. It compares ordered TeX annotations and normalized non-math prose
against the accepted presentation, includes any declared prose prefix, and rejects KaTeX errors.
These assertions preserve both formula content and surrounding words. They establish only
the selected rendered passages, not independent mathematical truth or every catalogue page.

For component output, `tests/browser/public-math-segments.mjs` supplies whole-region and
containment assertions. Whole-region checks compare ordered, complete TeX annotations,
inline/display mode and normalized surrounding prose. Each observed formula needs real MathML
with exactly one nonempty annotation and no KaTeX error. Containment proves only its named
sequence. Keep whole-region, residual-page, native-control and layout checks for broader claims;
finding one formula or MathML node cannot establish them. Whitespace at a soft wrap must preserve
the original word separation without adding invented prose.

## Gotchas

Before you begin gives no competency credit. Credit follows the latest correct submission for
the current assessment revision; a later incorrect submission removes it. Signed-in credit waits
for server acknowledgement. A unit completes only after every lesson's competencies and its
Unit capstone are correct. The accounts-progress group owns the scripted completion, capstone
and persistence checks in `tests/browser/progress.spec.mjs`; this group's pass alone does not
cover them. Opening a lesson proves only reading position. Passing scripted answers does not
certify unaided mastery or an independent mathematics review.

Writing, attached references and self-review edit only the argument sheet. Prerequisite evidence
counts existing demonstrated checkpoint competencies. The desk's transfer form uses the current
assessment and existing competency ID; comparison keeps the sheet's exact retained teaching.
Historical self-review describes that retained edition. The small adjunction recovery guide is
gated by all three exact teaching editions it uses. The public
`docs/research/argument-recovery-review.json` binds their digests and the exact guide to its
independent mathematics review; the catalogue test rejects drift. Its cyclic-integer laboratory illustrates
balancing, while the arbitrary-ring adjunction still requires its general proof. Changed guide
claims require separate mathematics review.

Guest writing stays in memory and is lost on reload or closing; export before leaving or signing
in. Saved arguments require a confirmed account and an explicit save. Private writing and backups
wait for identity confirmation. Replacing dirty writing requires an explicit choice. Argument
backups are separate from progress backups; previewing imports nothing and selected imports are
temporary copies until saved. Follow [Accounts and progress](accounts-progress.md) for account
ownership, transport, migration and recovery. Owned loopback synthetic identities prove only their
executed application/storage paths. Native ChatGPT sign-in remains **UNVERIFIED** without separate provider evidence.
