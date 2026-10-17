# Discovery

## Sub-features

Home, Learn, Explore, Reference, Sources, direct lesson links, concept library, aliases and history.

## How to get to it (user POV)

Open `/#home`. Use the Learning modes links to visit `/#learn`, `/#explore`, `/#reference` and
`/#sources`. Open Concepts, search a title, enter a lesson, then use Back and Forward.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature discovery --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/discovery.json"`.
The registered navigation, focus and learning journeys exercise these routes, atlas filters,
unit entry and mobile drawer. Expect the correct heading, restored keyboard focus, working history,
no horizontal overflow at 320, 390, 768 and 1440 pixels, and no serious accessibility failures.
Inspect captured responsive screenshots when changing navigation or layout.

## Gotchas

Public reading requires no sign-in. Source links can require the owner's Drive permission;
their presence is not proof that a private document opens. A route inventory is not a navigation pass.
