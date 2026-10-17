# Agent access

## Sub-features

Compact command discovery, per-command schemas, lesson inspection, accessible actions, declared
browser tools, owned server lifecycle and observed build provenance.

## How to get to it (user POV)

Run `node scripts/algebra.mjs help`, then `help --command inspect`. Open a lesson and discover its
controls with `inspect <lesson-id> --owner "$ALGEBRA_OWNER"` before choosing an action.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature agent-access --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/agent-access.json"`.
The CLI and WebMCP journeys discover and operate real checkpoint radios, custom selects,
spinbuttons and cyclic sliders. Expect resulting React state and mathematical output, rejection
of an impossible keyboard step, and action evidence only after an action runs. Run the CLI
behavior checks with `node --test tests/agent-cli.test.mjs` when changing command contracts.

## Gotchas

CLI output is one JSON envelope; failure exits 1. Invalid input causes no effects. Local targets
require the live owner marker. A local source hash alone cannot identify a remote deployment;
doctor compares the observed compiled digest and reports unknown identity explicitly.
