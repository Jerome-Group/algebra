# Acceptance checklist

## Mathematics

- [ ] Every theorem states all field, finiteness, commutativity, unitality and degree hypotheses.
- [ ] Group actions use one documented left/right convention.
- [ ] Matrix multiplication order agrees with displayed action order.
- [ ] Quotient operations include a well-definedness check.
- [ ] Representation pages state field and dimension.
- [ ] Tensor products type-check left/right module actions.
- [ ] Character-kernel pages distinguish `χ(g)=χ(1)` from `|χ(g)|=χ(1)`.
- [ ] External tensor product kernels use scalar matching.
- [ ] Visual evidence is never labelled a proof without a rendered argument.
- [ ] All rows in `prior_regression_check.csv` are green.

## Guided learning

- [ ] Guided lessons have a hook, prerequisite check and explicit outcome.
- [ ] Guided lessons have two examples and one nonexample.
- [ ] Guided lessons have a proof/proof skeleton.
- [ ] Guided lessons have application and transfer practice.
- [ ] Feedback diagnoses at least one likely misconception.
- [ ] Reference-only lessons are excluded from guided completion counts.
- [ ] Each unit has a capstone and remediation links.
- [ ] Progress reflects competencies, not only page visits.

## Visualisations

- [ ] Each lab has a named mathematical question.
- [ ] Each lab asks for a prediction.
- [ ] Every control maps to a named mathematical variable or choice.
- [ ] Equations/sets/invariants update with the state.
- [ ] A counterexample or failure state is available.
- [ ] A theorem debrief explains the scope and proof boundary.
- [ ] A text/table fallback exists.
- [ ] Lab type is one of illustration, experiment, proof animation, constructor, checker or reference diagram.

## Information architecture

- [ ] Home offers Learn, Explore, Reference and Sources.
- [ ] Guided units are 3–7 lessons rather than giant routes.
- [ ] Atlas filters include level, teaching status, source and visualisation type.
- [ ] Source map covers MH2220, MH3220, Odyssey Y1 and URECA Y2.
- [ ] Missing URECA direct-product topics are visible until delivered.
- [ ] Deep links, Back/forward and focus restoration work.

## Accessibility

- [ ] 320px and 390px widths have no document overflow.
- [ ] 200% zoom/reflow works.
- [ ] Every lab is keyboard-operable.
- [ ] Focus is visible and restored after drawers/dialogs.
- [ ] State changes have accessible names/announcements.
- [ ] No information relies on colour alone.
- [ ] Reduced-motion alternatives exist.
- [ ] KaTeX MathML remains accessible.
- [ ] Equivalent text/table views exist for essential visuals.
- [ ] Axe reports no serious or critical violations.

## Engineering and release

- [ ] Existing tests pass.
- [ ] New schema validation passes for every lesson.
- [ ] Prerequisite graph resolves and is acyclic.
- [ ] Guided routes contain no reference-only lessons.
- [ ] Build, lint, format and type-check pass or documented pre-existing failures remain unchanged.
- [ ] Browser console has no errors on representative flows.
- [ ] Screenshots/axe artifacts are stored.
- [ ] `python scripts/validate_package.py` passes.
- [ ] `concept_audit.csv` has an explicit final disposition for all 143 rows.
