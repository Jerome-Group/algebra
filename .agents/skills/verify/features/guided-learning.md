# Guided learning

## Sub-features

Checkpoint reasoning, prerequisite and competency feedback, staged reading, proof recall and unit context.

## How to get to it (user POV)

Open `/#learn`, choose Start this unit, and enter its lesson. Select a checkpoint answer and
press Check reasoning. Move through the reading stages and use the lesson compass.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature guided-learning --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/guided-learning.json"`.
The learning and studio journeys check correct and incorrect feedback, keyboard stages, proof
recall and heading focus across Back and Forward. Expect unit position and lesson context to
survive navigation. Use a disposable context for answers; a selected radio alone is not a submission.

## Gotchas

Completion requires submitted competency answers; opening a lesson proves only reading position.
Account persistence belongs to the progress feature. Passing scripted answers does not certify
unaided mastery or an independent mathematics review.
