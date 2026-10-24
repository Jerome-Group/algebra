---
name: argument-lifecycle
description: Check private argument ownership, captured-save acknowledgements and retry bytes when changing account refresh or the argument store. Runs bounded TLC scheduling and actual TypeScript store mutation replays.
---

# Argument lifecycle

Read [coverage.json](coverage.json) for the last confirmed source commit and bounds.
Read [the code mapping and limits](../../../docs/research/argument-lifecycle-verification.md)
before changing the model. Paths in the commands below are repository-relative.

Use full Git history and tags. If `coverage.json`'s `syncCommit` is absent locally,
run `git fetch --tags origin` before verification.

Run from the repository root with locked npm dependencies, Node 24+ and Java 21 on PATH:

```sh
npm run verify:argument-lifecycle
```

The runner downloads TLA+ tools v1.7.4 from its upstream release and checks the pinned
SHA-256. `TLA2TOOLS_JAR` may select an existing jar with exactly those bytes. Each
invocation reserves a permanent ordinal directory under
`outputs/argument-lifecycle/evidence-v2/` before coverage, source or tool checks.
The highest admission determines current evidence, including an empty interrupted
admission. Owned artifacts retain logs, traces, exact input hashes, timestamps,
completed outcomes and original failure details. The pinned jar cache stays at the
stable root. Disposable production-module copies are removed after each replay.

Current evidence has one reader:

```sh
node scripts/formal/argument-evidence.mjs current
node scripts/formal/argument-evidence.mjs inspect run-00000000000000000001
```

`current` exits zero only for the newest complete pass with matching captured input
bytes in the intended checkout. Failed, incomplete, conflicted, corrupt, stale,
uninitialized or unavailable evidence exits nonzero; it never searches history.
`inspect` always labels retained evidence historical and ineligible for current.
`inspect-legacy <run-id>` reads old random run directories explicitly. Legacy root
`summary.json` and old receipts remain retained; neither establishes current success.

A complete pass requires current code and restored code to pass, plus all three model
mutants and all three real-module mutants to fail their named invariant/assertion.
A compiler error, missing source anchor or checksum error is a broken check, never a
successful mutation detection. The privacy replay removes only the post-digest guard,
switches A to B through `accountProgressStore.refresh`, loads B, releases A's paused
digest and checks that B's `exportRecords()` excludes A's private writing.

The three promises are:

- `OwnerPrivacy`. Visible active, saved and acknowledged writing belongs to the
  confirmed owner. Concealed writing is absent from exports. Harm is disclosure of
  another account's proof.
- `CapturedAcknowledgement`. Acknowledgement names the captured sheet; later typing
  remains dirty. Harm is treating unsaved writing as durable.
- `ImmutableRetry`. An ambiguous transport failure retries the identical operation
  ID, owner, revision, timestamp and sheet bytes. Harm is changing the meaning of a
  previously delivered operation.

The finite model has two owners, one initially active A sheet, two content versions,
one put, one refresh and at most one retry after transport failure without refresh.
Refresh can restore A or establish B. Fetch, JSON and digest completions are separate
actions. Supported successful responses and transport rejection are modeled. There is
no liveness claim. The real replay checks seven selected schedules, not every model
state against TypeScript.

If covered source differs from the sync commit, the command stops. Read every diff and
commit message affecting the mapped functions or their moved replacements. Classify
each as no effect, model drift, intentional promise change or possible product bug.
Review mapped callers and imported schemas or catalogues even when the covered files
are unchanged. The source gate compares only `coveredFiles`; it cannot classify those
dependencies.
Update only verification artifacts from the code, then run:

```sh
npm run verify:argument-lifecycle -- --allow-drift
```

This flag permits source drift inspection; it still runs every invariant and mutation.
Treat a current-code failure as a bug candidate until its trace is impossible in the
real modules. Fix impossible model steps; never weaken a promise merely to get green.
For an intentional promise change, cite its source evidence in the research report.
Record one maintenance outcome per promise as in sync, updated, bug or blocked.
Advance `coverage.json`'s sync commit only after reading the code mapping, rechecking
atomic boundaries, rerunning every negative control and confirming that commit's
covered bytes. Rerun the normal command after advancing it. Keep model maintenance
separate from any product fix.

Before reporting success, run the `current` command above. Require
`status: "passed"` and all ten named outcomes: `model-current`, `replay-current`,
`model-mutant-privacy`, `replay-mutant-privacy`, `model-mutant-ack`, `replay-mutant-ack`,
`model-mutant-retry`, `replay-mutant-retry`, `model-restored` and `replay-restored`.
Inspect the receipt and each mutation log in the returned `directory`. An older
invocation may finish successfully while current evidence remains a newer failure.
Run `node --test tests/formal-evidence.test.mjs tests/argument-evidence.test.mjs` to
check the actual missing-jar runner and isolated evidence ownership controls without
Java or network access. Report exact checked source, bounds and TLC
counts. This check excludes competing reads,
deletes, replacement operations, overlapping retries after refresh, expiry/sign-out,
disposal, HTTP errors, invalid receipts, unsupported records, D1 transactions,
native sign-in, browser rendering, deployment and arbitrary payloads. It assumes
nonreentrant subscribers and collision-free symbolic hashes.

Captured inputs include covered stores, model, config, coverage, runner, replay and
evidence implementation. A final byte mismatch records `FormalInputsChanged` with
completed outcomes and expected/observed hashes. A later current read rejects stale
passed inputs. These boundary checks do not prove hostile edit-and-restore isolation
or the complete dependency closure.

All required checks, replay cleanup, artifact retention and prepublication flushes
finish before a closed, flushed terminal file is linked into its digest intent.
That link commits the owned outcome. A second distinct intent refuses success even
without a payload. Later optional stdout diagnostics cannot revise that outcome.
An ambiguous link error triggers exact owned-target readback. Matching frozen bytes
establish commitment with a separate diagnostic. Unreadable readback rejects with
`ArgumentPublicationUncertain`; that rejection does not assert a failed proof or
definitely incomplete publication. A later reader can resolve the retained fact.
An existing primary proof or tool error remains primary if evidence storage also fails.
A process killed after commitment differs from an incomplete proof. This establishes
no power-loss guarantee. Writers and readers refuse unknown/remote filesystems,
symlinks, special objects and device changes. The supported identities are local
macOS APFS and Linux ext4; Linux execution remains unverified until actual CI.

CI retains a directory-preserving archive before uploading outputs. Empty admissions
and intents are authority. A file-only copy can lose them and revive an old pass.
The archive command verifies an exact file/directory manifest, extraction and the
same current reader, then publishes the archive. A retained failure or incomplete
attempt remains nonpassed evidence.

```sh
node scripts/formal/argument-evidence.mjs archive --output outputs/argument-lifecycle-evidence.tar
node scripts/formal/argument-evidence.mjs current --evidence-root EXTRACTED/argument-lifecycle --source-root CHECKOUT
```

`--root` always means checkout. `--evidence-root` relocates retained evidence;
`--source-root` names the intended checkout for input comparison. The archive must
be outside the evidence root. Receipt paths never authorize loading outside it.
