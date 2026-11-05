# Discovery

## Sub-features

Home, Start, Learn, Explore, Reference, Sources, lesson and laboratory links, persistent Concepts
navigation, aliases, history, unit capstones and the guest session's reading position.
Argument/support destinations share this shell; their writing and recovery journeys live in
[Guided learning](guided-learning.md) and [Accounts and progress](accounts-progress.md).

## How to get to it (user POV)

Open `/#home`. Start from zero or the Start navigation link opens `/#start`;
[Beginner language](beginner-language.md) owns that workshop. Use the other Learning modes links to visit `/#learn`, `/#explore`, `/#reference` and
`/#sources`. Above 1150 pixels the Concept library stays beside every mode and lesson; use
Collapse concepts or Expand concepts. At 1150 pixels and below, Concepts opens the Concept
library dialog. Search concepts, expand a subject and chapter, open a lesson, then use Back
and Forward. The current catalogue supplies six subjects and 227 lesson links, derived from
the lessons rather than a separate subject list.

Learn's Start this unit supplies reading context. Lesson endpoints return to that unit's
capstone. Direct `/#<lesson-id>` and `/#lab:<lesson-id>` entry also work without a unit.
From a lesson, Work on this argument opens `/#work:<lesson-id>`; support detours retain their
target and optional unit in the fragment. Abstract Algebra returns Home, where Return to
the visited lesson resumes the guest's reading position within that page session.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature discovery --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/discovery.json"`.
The group selects navigation, navigation-focus, sidebar, learning, learning-recovery,
final-release, URECA coverage, citation-math and search-math-layout journeys.
Require their executed results; source bindings and the catalogue are not evidence
that a control ran. Wait for `.algebra-app[data-ready="true"]` before driving the shell;
the Concepts toggle and search are disabled until its header measurement is ready.

The navigation and learning journeys enter Home, Learn, Explore, Reference and Sources, search the atlas for Sylow,
choose Teaching status, open a result, exercise a retained alias and recover an unknown
lesson to Reference. Expect the correct heading, restored keyboard focus and usable history.
The Reference teaching-status check expects reference only to show zero results and guided
to show the complete current catalogue. Overflow checks and screenshots cover 320, 390, 768
and 1440 pixels; the serious and critical accessibility scan runs at 1440 pixels.

The sidebar journey checks desktop availability across modes, a capstone and a laboratory,
the six subject groups and 227 lesson links, keyboard collapse, and collapse state across
navigation. Its short desktop viewport checks that concept results scroll independently
while the search remains available. Modal checks at 390, 900 and 1150 pixels exercise initial
search focus, visible-control Tab/Shift+Tab containment, Escape returning focus to Concepts,
body-scroll restoration and search-result navigation closing the dialog before the lesson
heading receives focus. The learning journey measures the drawer below every header row at
320, 390 and 768 pixels. Widening an open dialog to desktop must release modality and retain
the earlier desktop collapse choice. Guest lesson and laboratory visits must update Home's
Return to control; laboratory visits resume the corresponding lesson.

The delayed-media-change journey resizes from desktop to 320 pixels before releasing the
responsive coordinator's callback. CSS must give the laboratory usable width immediately,
with the desktop library hidden. Releasing the callback must still allow the native concept
dialog to open. Keep this check alongside ordinary resize tests; a settled-frame screenshot
alone can miss the transient clipping.

Capstone destinations use `/#capstone:<unit>`. The learning journey checks the final lesson's
return link, direct entry, reload and history, closed worked answers, and target focus below
the sticky header. Cold entry and reload also run with a slower CPU. It checks invalid
capstones recovering to Learn, and an unscoped reading endpoint showing End of reading list.
The focus journey holds animation frames to check reader and navigation cancellation before
and after the destination commit. Inspect retained responsive screenshots when changing
navigation or layout.

`search-math-layout.spec.mjs` checks complete search previews at 390 and 1440 pixels.
Search for `array` and reach the small-groups result by Tab. Its mathematical table stays
whole; at desktop width, ArrowRight and ArrowLeft pan the existing result link. Enter opens
the lesson and focuses its heading. At phone width the table fits without page overflow.
Search for `pmatrix` to inspect mixed prose and formulas without vertical clipping. Search
for `multiplicative row` to check that ordinary prose still uses its three-line preview.
Inspect the retained left/right table, mixed-passage and prose screenshots. Do not replace
these checks with formula presence or an injected scrolling style.

`citation-math.spec.mjs` also opens Sources, URECA Y2, Alternating conjugacy classes and
the T72/T73 details at both widths. Require the complete bibliographic prose and
`gxg^{-1}` expression in their original order, with the retained source URL. The reader's
other citation cases belong to [Guided learning](guided-learning.md). These checks do not
open the external source or prove its permission state.

The URECA coverage journey opens reviewed topic evidence at 390 and 1440 pixels, follows its
lesson link and checks the added exercise examples. Expect the current public ledger's
86 reviewed required topics and 74 exercise methods; candidate investigations and prepared
scope retain separate labels. It enters all 77 new foundations, constructions and theory
lessons at 390 pixels, operates proof recall and a hypothesis checkpoint, and checks page
overflow, mathematical rendering and page errors. It also checks explicit square-action
conventions in retained lessons and the Mackey checkpoint's inline mathematics at both
widths. Review the retained topic, lesson and checkpoint screenshots. These guest interactions
do not establish account persistence or independent mathematical truth.

Supplement the registered journeys when changing other discovery controls. At 390 pixels,
search for Sylow in Concepts, open a result and check Back, Forward and heading focus.
At desktop width, expand the sixth subject and a chapter, open a lesson and check its current
link and nonzero chapter number. With a short viewport, wheel or keyboard-scroll results and
check that the page stays still. In the dialog, test Close concepts, backdrop dismissal and
both Tab endpoints after expanding chapters or changing search results. Verify the dialog
itself remains below the measured header, including a visible argument return bar.

Exercise Concept kind, Course tier, Source collection, Visualisation type, Study time and
Prerequisites demonstrated individually in Reference; check the results and clear each
filter. Open a workspace from Explore. Expand a source status and Open the complete citation
library in Sources. For lesson paging changes, operate Previous, Next and In this chapter.
The registered group exercises footer Next during the capstone journey; it does not exercise
every control listed above. Retain action results and screenshots for supplemental controls.

For routing changes, retain alias coverage, including encoded aliases, and the legacy
`/#route-ureca-representation-theory` link to Learn. Exercise a work destination and a support
detour with `unit`, `support` and `lab=1`; expect work-heading or support-heading focus,
working Back/Forward and unchanged public target context. Unknown work targets recover to
Reference; unrelated units and unknown support targets must not supply that context.
The argument-writing group supplies the deeper detour, return and record checks.

## Gotchas

Public reading requires no sign-in. Guest reading position, answers and sidebar choices are
session state; durable progress requires the separate account journey. Source links can
require the owner's Drive permission; their presence is not proof that a private document
opens. Topic counts and review links do not prove current private-source freshness, completed
study or mathematical correctness. A route inventory is not a navigation pass. Hosted
ChatGPT sign-in requires separate provider evidence.
