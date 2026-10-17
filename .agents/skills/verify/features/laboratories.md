# Laboratories

## Sub-features

All lesson and laboratory entries, fitted/readable diagrams, square actions, representation
journeys, prediction/reveal controls and dynamic-load recovery.

## How to get to it (user POV)

Open `/#explore`, choose a laboratory and operate its labelled controls. Direct entries include
`/#orthogonal-axis-angle`, `/#ureca-cyclic-eigenvalues` and `/#mh2220-dihedral`.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature laboratories --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/laboratories.json"`.
The registered catalogue, sizing, geometry, studio, URECA and load-recovery journeys enter the
catalogue and exercise selected mathematical outcomes. Expect exact square vertex images,
visible mathematical output, fitted diagrams at narrow widths and a usable retry after an
intentionally failed laboratory load. Inspect the resulting screenshots for diagram changes.

## Gotchas

Lazy laboratories need the built assets from the same release. Doctor must match that build.
Catalogue entry coverage does not exhaust every input or independently certify each theorem.
Keep deliberate network failure interception local to its disposable browser context.
