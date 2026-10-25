# Laboratories

## Sub-features

Lesson/laboratory entry, fitted/readable diagrams, square actions, the shared D₈ representation
journey, mathematical choices and speech, numerical model boundaries, readable tables and feedback,
prediction/reveal controls, lazy-load recovery and laboratories consulted from an argument.

## How to get to it (user POV)

Open `/#explore` and choose a laboratory. `/#lab:<lesson-id>` opens its laboratory;
`/#<lesson-id>` keeps the reader beside it. Examples: `/#lab:orthogonal-axis-angle`,
`/#lab:ureca-cyclic-eigenvalues` and `/#lab:tensor-products`.

Home has the square symmetry desk. `/#route-ureca-representation-theory` carries one selected
D₈ element through nine proof moves and related laboratories.

From a lesson, choose `Work on this argument`, enter writing and a question, then find support.
In a consulted lesson, `Open its laboratory` switches to the actual laboratory; `Read this lesson`
switches back. The reference reader names the destination as an experiment, mathematical diagram
or worked example, according to its presentation declaration.
`Return to my writing` retains the argument and its unit context during the detour.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature laboratories --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/laboratories.json"`.

Require successful executed checks and retained screenshots/measurements. The registered journeys
cover catalogue entry and selected control boundaries, diagram sizing, selected plane/cube
outcomes, exact square vertex images, the shared representation object and import recovery.
Inspect screenshots when diagrams change.

Expect fitted models and reachable controls at 320, 375, 768 and 1280 pixels. Selected diagrams
offer `Read diagram labels`: original-size labels sit in a focusable region that pans with arrow
keys. `Fit diagram to panel` restores the fitted view. Read the exact lesson disposition in
`lib/algebra/laboratory-presentations.json`. A mathematical reference diagram declares its objects
and relationships. A worked example renders the retained construction and its required object
context. It does not claim to execute an experiment. Counting SVGs or relationship buttons cannot
establish that either view teaches the stated mathematics.

For Euclid, change the first integer from 84 to 85. The ideal diagram, division rows and gcd must
all use the selected pair and finish at five. The Krull comparison keeps integer and polynomial
prime chains in separate ambient rings, with quotient witnesses and an explicit lower-bound
boundary. The tetrahedral displacement view recomputes all six first-order extensions for
translation, infinitesimal rotation, breathing and symmetric shear. Check the actual arrows and
the complete extension table, including the top arrow in the breathing view. Its drawing is not
a time simulation or a proof of arbitrary dynamics.

The residue-table journey checks all 144 arithmetic cells across both operations and six ideal
highlights, scoped named headers and foreground contrast against composited backgrounds.
At 390 and 1440 pixels it requires one MathML expression per cell, readable values and
contrast of at least 4.5. ArrowDown pans the table's own region; at phone width ArrowRight
also pans horizontally. Changing Element a updates the model. Inspect screenshots and paint
attachments as well as the accessibility result.

Mathematical options use the shared typed `Choice`. Open the real popup, inspect typeset options
and select by its original semantic value. Plain accessible speech and typeahead differ from
the visible TeX presentation. Keep keyboard arrows, Home/End, typeahead, Escape and returned focus
in the proof. A separate typeset readout does not excuse raw mathematical native options.
The current component source has 112 `Choice` sites and 14 retained descriptive native selects.
Recount with `rg '<Choice\b|<select\b' components/algebra` when those components change.
`tests/mathematical-choices.test.mjs` checks rendered component families and native-select
boundaries. Those source and SSR checks do not show that every popup ran in a browser.

`choice-controls.spec.mjs` exercises selected popups at 390 and 1440 pixels. Require numeric
Home/End/Escape, permutation typeahead, whole cyclic and scalar notation, original semantic
values and returned focus. Pointer-target checks must hit each actual option. An empty-string
prediction reset remains selectable; an unselected witness placeholder is `null` and cannot
be submitted as an empty option. The beginner group's pass alone omits these shared-control
regressions.

`mathematical-boundaries.spec.mjs` changes the real axis and angle inputs. Compare the numerical
matrix, complete readout and drawn direction for ordinary, subnormal and huge finite axes.
Zero axes and out-of-range angles retain a native recovery path. Scientific notation and
near-boundary angles must distinguish numerical cube candidates from exact membership.
The same file checks additive C/V values across choices, tables, graphs and cosets, actual
orbit element names, rounded orientation matrices, quaternion products and cube point images.
These finite checks do not prove the corresponding general theorems.

`mathematical-feedback.spec.mjs` opens quadratic quotients over F₂, F₃ and F₅ directly.
Select actual coordinate elements and check complete sum, product and inverse formulas while
the other selection stays unchanged. Its DVR route also opens directly and uses Home,
ArrowRight and End to check the whole strict ideal chain at one, four and seven steps.
Neither route has a prediction gate. Read the actual route contract before filling a prediction.

`feedback-contrast.spec.mjs` changes Domain modulus n with native slider keys at 390 and
1440 pixels. Require success, error and restored-success feedback with its whole formula,
unchanged other inputs and measured text contrast of at least 4.5. Inspect the paint attachments
and screenshots. A CSS color literal alone does not prove the rendered contrast.

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
both the consultation link and the reference reader's named destination action; confirm the support
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

Use the parent skill's complete source-attestation check before build, then its
executed-presentation check after the full release pass. Exact-file independent review
and dispositions must match current source, producers and renderer contracts. The
`laboratory-presentations.json` registry classifies all 227 lesson destinations as models,
reference diagrams or worked examples; that inventory does not establish executed coverage. Passing
strict TeX syntax or finding some MathML in a paragraph establishes neither completeness nor
mathematical truth. `tests/browser/public-math-segments.mjs` compares whole ordered TeX tokens
and surrounding prose. Containment assertions prove their named sequence only; whole-region
and residual-page checks carry the broader presentation claim. Record unexecuted branches
separately from the accepted source review.
Native ChatGPT sign-in remains **UNVERIFIED** without separate provider evidence.
