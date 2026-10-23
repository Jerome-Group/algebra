---
name: argument-lifecycle
description: Check private argument ownership, captured-save acknowledgements and retry bytes when changing account refresh or the argument store. Runs bounded TLC scheduling and actual TypeScript store mutation replays.
---

# Argument lifecycle

Read [coverage.json](coverage.json) for the last confirmed source commit and bounds.
Read [the code mapping and limits](../../../docs/research/argument-lifecycle-verification.md)
before changing the model. Paths in the commands below are repository-relative.

Run from the repository root with locked npm dependencies, Node 24+ and Java 21 on PATH:

```sh
npm run verify:argument-lifecycle
```

The runner downloads TLA+ tools v1.7.4 from its upstream release and checks the pinned
SHA-256. `TLA2TOOLS_JAR` may select an existing jar with exactly those bytes. Each
invocation retains its own `run-*` directory under `outputs/argument-lifecycle/`.
The stable `summary.json` names that run through `runId` and `runDir`. Its status
becomes `running` before coverage, source or tool checks, then `passed` or `failed`.
Each run retains its summary, logs, traces, timestamps and completed results, including
failure details. An interrupted run may remain `running`; that is incomplete evidence.
The pinned jar cache stays at the stable root. Disposable production-module copies
are removed after each replay.

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

Before reporting success, inspect `outputs/argument-lifecycle/summary.json`. Require
`status: "passed"` and all ten named outcomes: `model-current`, `replay-current`,
`model-mutant-privacy`, `replay-mutant-privacy`, `model-mutant-ack`, `replay-mutant-ack`,
`model-mutant-retry`, `replay-mutant-retry`, `model-restored` and `replay-restored`.
Inspect the matching summary and each mutation log in its `runDir`. Earlier run
receipts cannot establish the latest invocation's success. Run
`node --test tests/formal-evidence.test.mjs` to check failed-rerun receipt retention
without Java or network access. Report the exact checked source, bounds and TLC
counts. This check excludes competing reads,
deletes, replacement operations, overlapping retries after refresh, expiry/sign-out,
disposal, HTTP errors, invalid receipts, unsupported records, D1 transactions,
native sign-in, browser rendering, deployment and arbitrary payloads. It assumes
nonreentrant subscribers and collision-free symbolic hashes.
