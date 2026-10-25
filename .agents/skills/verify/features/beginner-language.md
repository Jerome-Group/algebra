# Beginner language

## Sub-features

One finite function shared by four moves. Name objects, read a quantified sentence,
give an exact counterexample and change the codomain. Editable arrows, inverse images,
property summaries and feedback all derive from that same temporary map.

## How to get to it (user POV)

Open `/#home` and choose Start from zero, or choose Start in the top navigation.
Direct entry is `/#start`. The first functions lesson's Help me read the symbols
opens `/#start?move=read&return=foundations-functions`. Return to the lesson you came
from preserves that context. Open the full functions lesson and Use the existing
laboratory lead to the existing lesson and laboratory destinations.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature beginner-language --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/beginner-language.json"`.
This selects `tests/browser/beginner.spec.mjs`. Wait for
`.algebra-app[data-ready="true"]`, the Start from zero workshop region and focused
`#mode-heading`. Each move change focuses `#beginner-move-heading`.

The registered journeys exercise these controls and outcomes:

- Name the objects. Activate Y, the codomain by keyboard. All three allowed outputs
  highlight; no inputs do. Its explanation distinguishes allowed from reached.
- Read the sentence. Every allowed output starts selected; activate has at least one input. Inspect output a to see inputs 0 and 1; inspect c to see an empty inverse
  image. The diagram and TeX expression must agree.
- Give a reason. Check this witness first requests a choice. A reached output is
  rejected as a missing-output witness and shows its actual incoming inputs; c succeeds
  on the initial map. Pair diagnosis distinguishes the same input twice, different
  outputs and two distinct inputs with equal outputs. Changing an arrow clears old
  feedback and witness choices.
- Change an assumption. Use codomain a, b removes unused c and preserves assignments.
  Restore c, assign input 1 to c and check both property summaries. Removing an in-use
  c refuses, names its input and preserves the map. Reassign it before removing c.

The contextual journey follows the first lesson's link, returns, uses Back,
and opens the existing laboratory and full lesson. The guest journey checks unchanged
localStorage, no progress/argument API writes and reset after reload. Source also resets
the workshop after navigating away and returning and provides Reset map; this journey
does not execute those reset paths.

At 320, 390, 768 and 1440 pixels, the registered journey visits all four moves,
operates the shared assignment Choice popup by keyboard, checks page width, requires rendered
MathML with no KaTeX errors and runs the strict workshop accessibility scan on each
move. Inspect retained phone and desktop screenshots. The shared Math renderer keeps
its existing focusable default; nested workshop buttons and diagram alternatives
opt out of separate math tab stops. Automated accessibility does not establish visual
quality or mathematical correctness.

The additional focus journey measures forward move and Previous move transitions at
390 and 1440 pixels. The focused heading must remain below the measured sticky header.

For changes to controls outside those journeys, supplement the pass with Reset map,
Next move, Forward, the remaining symbol/phrase buttons, malformed Start URLs
and a return that includes `lab=1`. Require visible reset state, correct focus and the
original laboratory destination. The registered assignment-choice keyboard check
proves returned focus. Semantic value changes use `selectChoice`, with
`expectChoiceValue` checking the original value.

For shared choice changes, also run the laboratories group. Its `choice-controls.spec.mjs`
enters this workshop and checks that unselected witnesses remain placeholders, not empty
answer options. Opening and dismissing the real list preserves the placeholder and returned
focus. Choosing c and checking the witness must report not surjective. Choosing the first
collision input leaves the second unselected. The beginner group's registered file alone
does not execute those shared-control cases.

## Source bindings

`scripts/algebra-features.mjs` binds this group to `BeginnerRunway.tsx`,
`BeginnerMap.tsx`, `lib/algebra/beginner.ts`, `app/beginner.css`, the shared `Math.tsx`,
`Algebra.tsx`, `LearningHome.tsx`, navigation hook and navigation model. The pure model
uses a discriminated two-output or three-output map with the fixed domain 0, 1, 2.
`tests/beginner.test.mjs` checks all 35 valid maps against independent definitions.
That finite enumeration is not 35 executed browser journeys.

## Gotchas

No prerequisites, score, assessment credit or durable saving. This is session practice
separate from a lesson's account-owned progress and historical argument edition.
A finite map can be checked exhaustively; examples of an arbitrary function do not
prove a universal statement. An inverse image is a set and needs no inverse function.
The declared codomain is part of the function under this repository's convention.
Native sign-in remains **UNVERIFIED** without separate provider evidence. Account persistence
and unaided student understanding need their own evidence. Use the parent skill's full release
pass after cleanup before shipping.
