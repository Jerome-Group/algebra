# Discovery

## Sub-features

Home, Learn, Explore, Reference, Sources, direct lesson links, concept library, aliases and history.

## How to get to it (user POV)

Open `/#home`. Use the Learning modes links to visit `/#learn`, `/#explore`, `/#reference` and
`/#sources`. Open Concepts, search a title, enter a lesson, then use Back and Forward.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature discovery --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/discovery.json"`.
The registered navigation, focus and learning journeys exercise these routes, atlas search and
Teaching status, unit entry and the mobile drawer. Expect the correct heading, restored keyboard
focus and working history. Overflow checks and screenshots cover 320, 390, 768 and 1440 pixels;
the serious and critical accessibility scan runs at 1440 pixels.
Capstone destinations use `/#capstone:<unit>`. The learning journey checks the final lesson's
return link, direct entry, reload and history, closed worked answers, and target focus below
the sticky header. Cold entry and reload also run with a slower CPU. The focus journey holds
animation frames to check reader and navigation cancellation before and after the destination commit.
Inspect captured responsive screenshots when changing navigation or layout.

For changes to other discovery controls, supplement the registered journeys. At 390 pixels,
search for Sylow in Concepts, open a result and check Back, Forward and heading focus. Exercise
Concept kind, Course tier, Source collection, Visualisation type, Study time and Prerequisites
demonstrated individually in Reference; check the results and clear each filter. Open a workspace
from Explore. Expand a source status and the complete citation library in Sources. For lesson
paging changes, operate Previous, Next and In this chapter. Retain the action results and screenshots.
The registered group exercises footer Next during the capstone journey. It does not exercise
every control listed above.

## Gotchas

Public reading requires no sign-in. Source links can require the owner's Drive permission;
their presence is not proof that a private document opens. A route inventory is not a navigation pass.
