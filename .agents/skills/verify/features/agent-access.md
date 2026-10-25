# Agent access

## Sub-features

Compact command discovery, per-command schemas, laboratory inspection, exact accessible actions,
declared browser tools, owned server lifecycle and observed build provenance.

## How to get to it (user POV)

Run `node scripts/algebra.mjs help`, then `help --command inspect`.
`inspect <lesson-id> --owner "$ALGEBRA_OWNER"` opens that concept's `#lab:<lesson-id>` route in
a fresh browser context and completes the prediction entry where present. Discover controls
before supplying exact accessible labels through `--actions`; every invocation starts fresh.
There is no dedicated argument-workspace CLI command.

Browser tools register when the mounted application finds `document.modelContext` or
`navigator.modelContext`. `algebra_list_lessons` searches the catalogue;
`algebra_open_lesson` opens a concept; `algebra_current_lesson` returns its content.
`algebra_reading_view` accepts `guided`, `understand` (Overview), `example`, `theorem`, `proof`
or `sources`, using the application's navigation owner. `algebra_search` filters and reveals
the concept library. `algebra_controls` returns registered laboratory parameters and visible
elements; `algebra_set_parameter` accepts a listed choice or an in-range, step-aligned value.
`algebra_interact` requires the current element ID and exact label. Refresh controls after
each action; source links return their URL without navigating away.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature agent-access --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/agent-access.json"`.

The WebMCP journey injects `document.modelContext`, discovers a labelled checkpoint radio with
`algebra_controls`, activates it through `algebra_interact`, and submits the React state for
visible correct feedback. The CLI journeys operate spinbutton boundaries, custom selects and
cyclic sliders. Expect selected values and mathematical output, rejection of an impossible
keyboard step, and no successful observation record for that failed inspection.

For changes to the other declared tools, extend the same injected registration fixture on the
owned Worker: list/open a concept and read its current ID; select `sources` then `proof` and
check visible content, URL and Back; collapse concepts, search, and check the library reappears
with results. In a laboratory, discover parameters, set a listed value, and check displayed
output; reject an out-of-step value. Refresh controls, expand the complete citation library,
then check that an external link returns its URL while the route stays put. An incorrect label
must reject without activating the element. Retain these observations separately from the
group's result: its existing test executes only `algebra_controls` and `algebra_interact`.

Run CLI behavior checks with `node --test tests/agent-cli.test.mjs` when command, ownership,
map or build-identity contracts change. A feature or shard pass is partial coverage.

Build identity version 2 keeps `sourceDigest` separate from `directDependencyDigest` and
`directDependencyCount`. `scripts/lib/direct-dependencies.mjs` compares direct declarations,
lockfile metadata and installed package metadata. Doctor, inspect and browser setup require
both the observed source and direct dependency identity to match. An owned local target must
also acknowledge the live run marker. Shared `node_modules` can violate that coherence despite
an unchanged commit. This direct metadata check does not verify every transitive package byte.

Follow the parent skill for source attestation before build and recorded execution after the
real cases. The CLI binds Node and browser runner records to current source, built outputs and
the owned target. Report metadata alone does not establish that provenance. Partial feature
results or an earlier success after a failed rerun cannot satisfy current executed presentation.

## Gotchas

CLI output is one JSON envelope; failure exits 1. Schema-invalid input causes no effects;
runtime rejection can follow navigation or earlier UI actions in the disposable context.
Successful inspection records its supplied actions, including an empty discovery list.
Local targets require the live owner marker. A local source hash alone cannot identify a
remote deployment; doctor compares observed compiled source and direct dependency digests.
Unavailable identity remains unknown and cannot establish a match.
Injected tool registration proves the invoked application contracts. Native browser support
and hosted ChatGPT authentication require separate live proof; synthetic local identities
establish neither.
