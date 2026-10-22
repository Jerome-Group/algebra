# Guided learning

## Sub-features

Checkpoint reasoning, prerequisite and competency feedback, staged reading, proof recall,
unit context, capstone return and completion; editable argument blocks, questions,
self-review, retained proof references, chosen support and separate argument backups.

## How to get to it (user POV)

Open `/#learn`, choose Start this unit, and enter its lesson. Select a checkpoint answer and
press Check reasoning. Move through the reading stages and use the lesson compass.

Choose Work on this argument from any lesson. Reconstruct shows its objects, statement and
conventions while concealing the proof. Write an argument block and its question; Add block
keeps separate moves. Compare reveals the exact proof references retained with that sheet.
Attach a reference to the active block or record Your self-review. Consult offers direct
catalogue prerequisites, expandable branches and Search teaching for your question.
Open a supporting lesson or laboratory, then Return to my writing. Try transfer check opens
the lesson's existing current assessment. A unit-scoped sheet offers Return to original unit
capstone; Return to my argument restores the sheet.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature guided-learning --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/guided-learning.json"`.

The learning and studio journeys check correct and incorrect feedback, the Prove compass button
by keyboard, proof recall and heading focus across Back and Forward. For changes to other compass
destinations, operate each affected button and check that its section receives focus.
Expect unit position and lesson context to survive navigation. Use a disposable context for answers;
a selected radio alone is not a submission.
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
It checks visible conventions, all authored worked examples and four checkpoint controls,
operates Work examples and proof recall, then submits one correct hypothesis answer through
the real form. Selecting the answer leaves credit unchanged; submitting it demonstrates one
competency. Other new checkpoint answers remain covered by independent content review and
rendering checks, rather than a claim that this journey submits all four.

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
executed application/storage paths. Native ChatGPT sign-in remains separately unverified.
