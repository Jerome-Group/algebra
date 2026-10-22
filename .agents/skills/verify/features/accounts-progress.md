# Accounts and progress

## Sub-features

Public reading, temporary guest answers, ChatGPT sign-in, acknowledged account progress,
reading position and square preference, explicit legacy import/export, reset and recovery.

## How to get to it (user POV)

Open any lesson without signing in. Use Sign in with ChatGPT to save personal state. On
`/#foundations-functions`, answer Check the hypothesis, submit its Check reasoning button and
wait for Saved to your ChatGPT account. Before you begin is an uncredited prerequisite check.
Reload or open a fresh browser context signed into that account. Home offers Export progress
backup, Preview legacy browser records, explicit import, reset confirmation and restore.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature accounts-progress --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/accounts-progress.json"`.
Use the parent skill's built launch. The account, progress and navigation journeys operate
actual controls and real isolated D1 storage. Expect no guest writes, acknowledged values
after reload and independent contexts, no cross-account access, explicit conflicts and an
immutable retry that applies once. Legacy bytes remain exact; login imports nothing. Reset
and restore increase revisions, and any intervening save disables restore.

For migration or restart changes, use `node scripts/account-migrations.mjs --config dist/server/wrangler.json --persist-to <the owned run's persistence directory>`.
Run it twice on an empty isolated directory and inspect the second result for no pending
migrations. A deliberate restart must use the same verified scratch persistence and retain
the acknowledged record; ordinary launch creates a fresh run instead.

## Gotchas

Synthetic trusted headers are permitted only in an explicitly owned loopback fixture. They
prove application authorization and D1 behavior, not provider login or hosted header stripping.
Prove those separately through the actual hosted Sign in with ChatGPT link and a fresh anonymous
HTTP request with forged identity headers. Never run reset or mastery fixtures against personal
production data. Remote fixture cases report their unavailable prerequisite rather than count
as account proof. Unsupported account rows remain read-only/exportable. Browser access failures
identify keys whose bytes could not be read; no new browser-storage fallback is written.
