# Accounts and progress

## Sub-features

Public reading and temporary guest answers; ChatGPT-owned competency progress, reading
position and square preference; explicit legacy preview/import/export, reset and restore;
separate argument writing, exact save acknowledgements, retry, conflicts, deletion and backups.

## How to get to it (user POV)

Open any lesson without signing in. Use Sign in with ChatGPT to save personal state. On
`/#foundations-functions`, answer Check the hypothesis, submit Check reasoning and wait for
Saved to your ChatGPT account. Before you begin is an uncredited prerequisite check. Home
offers Export progress backup, Preview legacy browser records, Import preview into this
account, Reset learning progress and Restore previous progress.

Open a lesson's Work on this argument link, or
`/#work:ureca-constructions-induction-adjunction?unit=ureca-constructions-induction-adjunctions`.
Write in Your argument, block 1 and Question for this block. Save argument captures the current
sheet; This writing is saved to your account appears only when that writing is acknowledged.
Open Your saved arguments and backups for Resume saved argument, Delete saved argument,
Export argument backup and Preview argument backup. Guest writing stays in memory; export
before reloading, closing or signing in. Private writing waits for identity confirmation.

## Driving it with Playwright

Run `node scripts/algebra.mjs verify --layer browser --feature accounts-progress --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/accounts-progress.json"`.
Use the parent skill's built launch: an owned Worker, isolated migrated D1 and an explicitly
enabled loopback identity fixture. Check the result's target auth/backend/accountCoverage and
the executed cases; a skipped fixture case is unavailable coverage. Source bindings live in
`scripts/algebra-features.mjs`.

The bound browser files are `tests/browser/account-progress.spec.mjs`, `arguments.spec.mjs`,
`progress.spec.mjs` and `navigation.spec.mjs`. Require these observable results:

| Journey                        | Required result                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Guest learning                 | Reading and temporary answers work with browser storage denied. Prerequisites grant no credit; a second page and reload do not inherit guest answers. No new browser-storage writes occur.                                                                                                                                                                                                                                                 |
| Account progress               | Acknowledged answers, reading position and shared square preference survive reload and an independent context of the same synthetic account. Another owner has an empty independent record. Returning to a unit capstone changes no competency evidence.                                                                                                                                                                                   |
| Legacy and reset               | Sign-in imports nothing. Preview/export retain all four original browser records byte for byte; explicit import keeps account answers, archives earlier answers and fills missing preferences. Confirmed reset and restore increase the progress revision. A subsequent progress or preference mutation disables restore.                                                                                                                  |
| Argument save and conflict     | Hold a real save request, type later writing, then release it: D1 stores the captured writing and the editor stays dirty. A further explicit Save argument acknowledges later writing; reload resumes the single saved sheet. Two tabs retain competing versions; Save my writing as a copy saves a separate record. Argument writing and self-review add no competency credit.                                                            |
| Argument deletion and recovery | Dirty active writing disables Delete saved argument. Deleting a different saved sheet preserves the current draft. If another tab changes that selected sheet before deletion, its conflict reports failed, preserves the unrelated draft and offers Reload saved arguments; Use saved version is absent. A failed initial GET also offers Reload saved arguments. The successful reload returns to ready without replacing dirty writing. |
| Expired account                | A real notes save after fixture sign-out returns 401, clears private writing, confirms guest access and permits fresh temporary writing. Its backup contains no former private text. An expired progress banner alone never confirms guest identity.                                                                                                                                                                                       |
| Argument backup                | Export argument backup downloads `algebra-arguments-export-v1`, separately from progress backup. Preview argument backup opens Argument backup preview; choose one radio option and Use selected copy. The temporary copy preserves writing/question and gets new sheet/block IDs. Reload loses unsaved guest writing.                                                                                                                     |

For changed delivery or identity behavior, supplement that group with the relevant branch below.
The Node assertions in `tests/argument-store.test.mjs`, `argument-server.test.mjs` and
`argument-records.test.mjs` describe these contracts; their presence is not browser execution.

- Unknown delivery or retryable contention: commit through the real Worker but lose the reply,
  or provoke retryable contention. Failed state offers Retry save. Type later text, then Retry
  save; the POST body, operation ID and captured writing stay identical. Read D1 through the
  owner API: one application, captured acknowledgement, later edits still unsaved. Save argument
  remains unavailable while that captured delivery is unresolved.
- Definitive rejection: same-owner account responses with 400/413/415/422/429, or a bare
  `{error}` response with 400/413/415/422, release the captured delivery while retaining writing.
  Failed state offers Reload saved arguments; corrected dirty writing can use Save argument
  with a new operation ID. An expired/changed/mismatched owner clears private buffers instead.
  Label injected transport or response faults separately from real storage proof.
- Identity refresh: Refresh account progress hides private writing and exports while identity
  is checked. Confirming the same owner restores writing and any frozen delivery; another
  owner, sign-out, a current 401 or an owner mismatch clears it. Late replies cannot populate a
  new owner. Require real owner-scoped API reads alongside visible controls.
- Active-sheet deletion: typing after confirmation remains exportable when deletion is
  acknowledged. Choose Save my writing as a copy or Accept deletion and discard local writing
  explicitly. A put acknowledgement followed by a later server change/deletion likewise keeps
  local writing available; Use saved version or the explicit deletion choice discards it only
  on command.
- Scope: with both records present, progress export/reset/restore preserve argument records;
  an argument save preserves progress and its reset-undo eligibility. A v1 progress client still
  works after the additive argument migration. Argument backup import creates a temporary copy
  for the currently confirmed account; only a later explicit Save assigns durable ownership.

For migration or restart changes, use `node scripts/account-migrations.mjs --config dist/server/wrangler.json --persist-to <the owned run's persistence directory>`.
Run it twice on empty isolated scratch persistence and inspect the second result for no pending
migrations. Both account-progress and argument tables must exist. A deliberate restart must use
the same verified scratch persistence and retain acknowledged records; ordinary launch creates
a fresh run instead.

## Gotchas

Synthetic trusted headers are permitted only in an explicitly owned loopback fixture. They
prove application authorization and isolated D1 behavior, not native provider login or hosted
header stripping. Those require separate hosted Sign in with ChatGPT and anonymous forged-header
checks; if excluded or unavailable, record them as unverified. Keep reset/mastery/deletion
fixtures on disposable data. External targets require the parent skill's write authorization.

Progress export/reset/undo retain their v1 scope. Argument backups preserve active, saved,
unsupported raw records and unresolved delivery separately; importing copies does not retry an
old delivery or restore unsupported records. Quota and save-operation expiry failures retain
writing for export; account expiry clears private writing.
Reload saved arguments before reviewing and explicitly deleting another sheet to free space.
Read current limits in `lib/algebra/argument-records.ts`. Unsupported progress documents stay
unchanged and exportable. Legacy browser-read failures identify unreadable keys; their bytes
cannot be exported, and no browser-storage fallback is written. A teaching digest binds retained
fields; it does not establish mathematical correctness or assessed competence.
