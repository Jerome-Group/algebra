# Accounts and progress

## Sub-features

Current device competency progress, cross-tab synchronization, export, reset confirmation,
previous-record recovery, reading position and square selection.

## How to get to it (user POV)

Open `/#foundations-functions`, submit checkpoint reasoning and reload. Return Home for
progress export and reset controls. Open a second tab to observe a submitted update.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature accounts-progress --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/accounts-progress.json"`.
The progress and navigation journeys operate actual checkpoint, export, reset and recovery
controls in disposable contexts. Expect submitted competencies after reload, a valid downloaded
backup, explicit reset confirmation and recoverable previous records. Inspect storage effects
and downloaded bytes alongside the visible state.

## Gotchas

This release stores progress on the device. Account-backed storage and hosted ChatGPT sign-in
are unimplemented and unverified. Do not interpret the group name as account support or run
destructive progress tests in a personal browser profile. Preserve legacy keys and export bytes.
