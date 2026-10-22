# Guided learning

## Sub-features

Checkpoint reasoning, prerequisite and competency feedback, staged reading, proof recall,
unit context, capstone return and capstone completion.

## How to get to it (user POV)

Open `/#learn`, choose Start this unit, and enter its lesson. Select a checkpoint answer and
press Check reasoning. Move through the reading stages and use the lesson compass.

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

## Gotchas

Before you begin gives no competency credit. Credit follows the latest correct submission for
the current assessment revision; a later incorrect submission removes it. Signed-in credit waits
for server acknowledgement. A unit completes only after every lesson's competencies and its
Unit capstone are correct. The accounts-progress group owns the scripted completion, capstone
and persistence checks in `tests/browser/progress.spec.mjs`; this group's pass alone does not
cover them. Opening a lesson proves only reading position. Passing scripted answers does not
certify unaided mastery or an independent mathematics review.
