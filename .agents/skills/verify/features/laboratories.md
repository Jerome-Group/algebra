# Laboratories

## Sub-features

Lesson/laboratory entry, fitted/readable diagrams, square actions, the shared D₈ representation
journey, prediction/reveal controls, lazy-load recovery and laboratories consulted from an argument.

## How to get to it (user POV)

Open `/#explore` and choose a laboratory. `/#lab:<lesson-id>` opens its laboratory;
`/#<lesson-id>` keeps the reader beside it. Examples: `/#lab:orthogonal-axis-angle`,
`/#lab:ureca-cyclic-eigenvalues` and `/#lab:tensor-products`.

Home has the square symmetry desk. `/#route-ureca-representation-theory` carries one selected
D₈ element through nine proof moves and related laboratories.

From a lesson, choose `Work on this argument`, enter writing and a question, then find support.
In a consulted lesson, `Open its laboratory` switches to the actual laboratory; `Read this lesson`
switches back. The reference reader's `Open experiment` opens that same support laboratory.
`Return to my writing` retains the argument and its unit context during the detour.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature laboratories --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/laboratories.json"`.

Require successful executed checks and retained screenshots/measurements. The registered journeys
cover catalogue entry and selected control boundaries, diagram sizing, selected plane/cube
outcomes, exact square vertex images, the shared representation object and import recovery.
Inspect screenshots when diagrams change.

Expect fitted models and reachable controls at 320, 375, 768 and 1280 pixels. Selected diagrams
offer `Read diagram labels`: original-size labels sit in a focusable region that pans with arrow
keys. `Fit diagram to panel` restores the fitted view. Text-only structure illustrations require
their named SVG, declared objects and relationship controls; formula labels retain KaTeX checks.
A valid text diagram need not contain a formula.

Where a prediction is requested, an empty prediction disables `Test my prediction`. Some
laboratories enforce reveal inside their own controls; entries without a prediction contract open
directly. For the tensor laboratory, check `Balance: equal`, then the zero-product failure witness.
Its small cyclic ℤ-module calculation illustrates balancing; its debrief states the general proof
boundary.

In the representation journey, select `r`, leave and return, then enter the external-tensor
laboratory: its D₈ selector retains `r`. Guest selection lasts the page session; reload restores
the default. Account persistence belongs to [Accounts and progress](accounts-progress.md).

Argument-support integration is executed by [Guided learning](guided-learning.md), outside the
laboratories group's registered files. Include that group when this integration changes. Check
both the consultation link and the reference reader's `Open experiment`; confirm the support
laboratory, heading focus, retained writing/question and return to the same unit.

## Gotchas

Lazy laboratories require assets from the same build; doctor must match it. Keep deliberate
network interception in its disposable browser context. The recovery journey delays/aborts the
FunctionFibers import, observes pending/error feedback, restores the request and chooses
`Reload laboratory`. This reloads the whole page, retains the laboratory route and requires a new
prediction. It does not prove every lazy chunk. The argument journey separately aborts a support import,
cancels the page-reload warning, returns to the unchanged writing and exports its backup.
Accepting a full-page reload still loses temporary guest writing; save or export first.

Catalogue entry and control endpoints do not exhaust every combination or certify every theorem.
Sizing checks cover their rendered states; integrated prediction laboratories also need their
revealed state inspected when changed. Source bindings are an inventory, not execution evidence.
