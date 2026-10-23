# What does the bounded argument lifecycle check establish?

At source `2b8d7e90b367cfd1c1690de5c5302099552b0b4c`, the modeled client schedules
preserve private ownership, captured acknowledgements and immutable retry bytes.
TLC explores 693 generated states and 411 distinct states, with zero left queued.
Actual imported TypeScript stores pass seven selected schedules. Every property has
a failing model mutant and a failing production-module mutant. Restored code passes.
This is a finite safety check and a replay bridge, not a proof of the whole app.

The account/argument lifecycle is the first target because a late continuation can
expose private proof writing or falsely mark later typing saved. The existing finite
group engine tests already enumerate their named finite inputs. A second hand model
of those calculations would add less evidence. Server transactions are a separate
target because D1 batch atomicity and client awaits have different boundaries.

## Method and primary sources

The upstream [creation skill](https://raw.githubusercontent.com/cursor/plugins/main/pstack/skills/create-formal-verification-skill/SKILL.md)
calls for a high-harm target, code-linked steps, reproducible tooling and a real-code
negative control. Its [maintenance companion](https://raw.githubusercontent.com/cursor/plugins/main/pstack/skills/maintain-formal-verification-skill/SKILL.md)
requires reading covered changes and separating model drift from product bugs.
The upstream [statechart skill](https://raw.githubusercontent.com/cursor/plugins/main/pstack/skills/statechart/SKILL.md)
also requires traces replayed through real client entry points and observable checks.
These support a small scheduling model plus imported-store replay.

The [verification example](https://github.com/poteto/verification-skill-example)
demonstrates a behavior map and project driver skill, with its fictional driver
implementation deliberately omitted. It supplies workflow guidance, not a runnable
formal verifier. Direct reads of [Poteto's X profile](https://x.com/poteto),
[post 2111926622278521253](https://x.com/poteto/status/2111926622278521253) and
[post 2113398433977659654](https://x.com/poteto/status/2113398433977659654)
returned HTTP 403 on 2026-10-23. Their contents were not verified through X.

TLA+ suits event ordering here. The runner pins tools
[v1.7.4](https://github.com/tlaplus/tlaplus/releases/tag/v1.7.4), whose jar prints
`TLC2 Version 2.19 of 08 August 2024`. The release lists upstream SHA-1
`bee4a54f3ee3d4afc347c3240ec2d9e93b075104`. The locally verified SHA-256 pin is
`936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`.
The one-command runner downloads and verifies those exact bytes, or verifies an
explicit `TLA2TOOLS_JAR`. Java 21 and Node 24+ are prerequisites. CI installs Java 21
and uses locked npm dependencies. The setup-java commit was resolved from upstream
`actions/setup-java` tag `v5` when adding the job.

## Bounds and code correspondence

There are two owners A/B, one initially active A sheet, two content versions, one put,
one refresh and at most one retry after transport failure without refresh. Refresh
may restore A or confirm B. Generation values 0, 1, 2 are fresh within that single
refresh budget; they never wrap. One supported response carries the captured sheet
and a valid receipt. The optional post-refresh argument load returns no records.
Retry may fail again. Network requests may remain unanswered indefinitely.

| Model action                  | Production source at the sync commit                            | Atomic boundary                                                                                                  |
| ----------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Save`                        | `lib/algebra/argument-store.ts:229-257,393-435`                 | `save`/`enqueue`/`transmit` capture one parsed sheet, pending object, serialized body and identity before fetch. |
| `Edit`                        | `argument-store.ts:87-95,558-574`                               | Synchronous sheet replacement and dirty recomputation.                                                           |
| `Refresh`                     | `account-store.ts:132-147,185-206`; `argument-store.ts:517-528` | Conceal candidate, clear visible progress, increment generation and start fetch.                                 |
| `RefreshFetch`                | `account-store.ts:207-218`                                      | Fetch continuation checks identity freshness before awaiting JSON.                                               |
| `RefreshJson(A/B)`            | `account-store.ts:218-291,175-183`                              | JSON continuation restores only A or clears for B, confirms identity and starts argument load.                   |
| `ArgumentsFetch`              | `argument-store.ts:157-181`                                     | Argument load checks capture and sequence after fetch before awaiting JSON; a save invalidates that load.        |
| `ArgumentsJson`               | `argument-store.ts:182-225`                                     | Only a still-valid supported empty response commits its saved-record list.                                       |
| `WriteFetch` / `WriteFailure` | `argument-store.ts:258-269,378-390`                             | Fetch succeeds into JSON or transport failure retains the captured pending operation.                            |
| `WriteJson`                   | `argument-store.ts:270-282`                                     | JSON guards and supported-record parsing finish before the digest await.                                         |
| `WriteDigest`                 | `argument-store.ts:284-335`; `argument-records.ts:121-128`      | Digest continuation checks identity and pending object before acknowledging captured writing.                    |
| `Retry`                       | `argument-store.ts:229-257,599-602`                             | The failed operation starts one further delivery with identical serialized bytes.                                |

loadValid abstracts the outstanding argument load read-sequence token. Save and Retry invalidate it at argument-store.ts:245; load continuations reject the old token at lines 169 and 175. This prevents a pre-save empty response from clearing a subsequently acknowledged record. Two real-module correspondence schedules confirm cancellation after same-owner restoration, at both await boundaries.

`owner`, `generation`, `confirmed` abstract the account coordinator's identity callback.
`view` contains active, saved, acknowledged and pending state; `concealed` contains the
same owner's retained candidate. `writeGeneration` captures identity and `captured`
names the immutable operation sheet. `responseSaved` is the local supported-record
list captured before hashing. `sentBody` abstracts all serialized request fields as
one immutable value. The remaining variables record continuation positions and the
finite issue budget.

`A-captured` and `A-later` are symbolic complete sheets with ghost A provenance.
Hashes are distinct symbolic values. The replay hashes real schema-valid payloads
using the real `argumentDigest`. Subscribers are assumed not to synchronously reenter
mutating methods. Only supported records are modeled; `recordsFrom`'s earlier
unsupported-record side effect has no member in this bound.

The model omits messages, general UI phases, detailed record revisions and dirty
storage because the properties use sheet equality and owner provenance. Dirty is
the production comparison of active with acknowledged sheet. The replay explicitly
asserts that later typing remains dirty. No fetch, JSON or digest await is collapsed.
Different continuations may interleave only at those boundaries or public synchronous
method returns. Only one put exists, so pending-object equality reduces to retention
of that single operation. Replacement operations and simultaneous retry continuations
need a larger model.

## Properties and negative controls

| Promise and user harm                                                                                                                           | Scratch production mutation                                                                               | Observed failure                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OwnerPrivacy`. Unconfirmed or other-owner writing cannot enter the visible snapshot/export. A breach discloses a proof.                        | Remove only the post-digest identity/pending guard at `argument-store.ts:284`.                            | Pause A's client digest after valid receipt construction; use actual `accountProgressStore.refresh` to confirm B and load B; release A's digest. B's `exportRecords()` contains `A private captured writing`, failing `doesNotMatch`. |
| `CapturedAcknowledgement`. A receipt labels the captured sheet. A breach calls later unsaved typing durable.                                    | Change only acknowledged `sheet: operation.sheet` to `sheet: snapshot.active` at `argument-store.ts:317`. | Edit while digest waits. The acknowledged sheet becomes later typing, failing the captured-writing equality assertion.                                                                                                                |
| `ImmutableRetry`. An ambiguous delivery retries identical operation bytes. A breach changes an operation that may already have reached storage. | Serialize the current active sheet in the POST body instead of `sent.body` at `argument-store.ts:256`.    | Fail the first transport, type later writing, call public `retry`. The next request body differs from the original, failing byte equality before acknowledgement.                                                                     |

The sole privacy edit removes this exact line from a disposable production-module copy:

```ts
if (!current(capture) || pending !== sent) return;
```

The model privacy mutant commits after digest without `Current`; the acknowledgement
mutant commits `view.active`; the retry mutant sends `view.active`. Each fails the
matching invariant. TLC's shortest privacy trace ends while refresh is still awaiting
fetch, when private data has already reentered an unconfirmed export. The actual
module replay deliberately extends the pause through B's confirmation to establish
the requested cross-owner disclosure. It is a realizable extension, not an automated
translation of every TLC state.

| Run                    | Generated / distinct / queued states | Exit                          |
| ---------------------- | ------------------------------------ | ----------------------------- |
| Current model          | 693 / 411 / 0                        | 0                             |
| Privacy mutant         | 91 / 71 / 33                         | 12, `OwnerPrivacy`            |
| Acknowledgement mutant | 73 / 59 / 28                         | 12, `CapturedAcknowledgement` |
| Retry mutant           | 36 / 32 / 17                         | 12, `ImmutableRetry`          |
| Restored model         | 693 / 411 / 0                        | 0                             |

Each real-module mutant exits 1 with `ERR_ASSERTION` and its named behavioral failure.
Current and restored real modules pass seven schedules: owner switch at fetch, JSON
and digest; typing during digest; immutable retry after ambiguous failure; and same-owner restoration with a stale pre-save load released at fetch or JSON.
No product source is edited. Temporary module copies are deleted in `finally`.
Each invocation retains logs, traces and its own `summary.json` in an ignored
`outputs/argument-lifecycle/run-*` directory; CI retains the evidence root as an
artifact. The stable root `summary.json` names the run through `runId` and `runDir`.
It becomes `running` before coverage, source or tool gates, then `passed` or `failed`,
with timestamps, completed results and failure details. An interrupted run may remain
`running`. The pinned jar cache stays at the stable root. A pass requires
`status: "passed"`, all ten named model/replay outcomes listed in the skill and the
matching run's mutation logs. A successful runner does not mistake mutation syntax,
checksum or source-anchor failures for detected product regressions.

## Creation and maintenance receipt

The generated skill was followed using `npm run verify:argument-lifecycle`, including
the pinned jar download, baseline, all negative controls and restored checks.
Maintenance then ran it unchanged before inspecting covered-file history and diffs
from `2b8d7e90b367cfd1c1690de5c5302099552b0b4c` through
`9cd4b5ca651a0574c8279383418644abdd3cbaf5`. The intervening capstone/search
repair changed none of the three covered modules; their state writers remain in
place. All three promises are **in sync**; no promise or bound changed and no
product bug was found in this scope. Full reruns retained the same results. The
sync commit records the latter checked source.

Independent standards review reproduced a receipt defect. A failed rerun with a
missing `TLA2TOOLS_JAR` left the earlier successful root summary unchanged. The runner
now creates a run receipt before those gates and records the failed invocation in
both its own directory and the stable summary. The actual-runner regression
`node --test tests/formal-evidence.test.mjs` uses an isolated Git repository and a
missing jar, without Java or network access. It first failed with
`'passed' !== 'failed'`, then passed after the fix. It also checks the failure log,
timestamps, run identity and retention of the earlier run's summary and log. Existing
creation and maintenance receipts remain retained.

The default command rejects covered source changes until maintenance reads them.
`--allow-drift` permits the maintenance rerun, while retaining every invariant and
negative control. It does not establish that an updated model matches changed code.
That requires reviewing the mapping and recording a new checked sync commit.

Not covered: competing refresh/read sequences, deletion, record replacement, retry
overlap after refresh, expiry/sign-out, disposal, HTTP errors, invalid receipts,
unsupported records, server compare-and-swap or D1 batch
transactions, arbitrary content, hash collisions, counter overflow, resource limits,
eventual delivery, provider authentication, browser rendering, deployment or learning
outcomes. Public teaching and private source freshness are unchanged by this
verification-only work. URECA reconciliation remains the parent release gate.

## Independent model correction

The first model passed 414 distinct states but omitted the load cancellation performed by transmit. It conservatively admitted a stale empty load after a save, a transition that cannot occur in the real store. Independent review reproduced same-owner restoration and confirmed the actual load is canceled. The model now tracks that token and exhausts 411 distinct states. The old pass described a stale abstraction. All three promises and bounds are unchanged; no product bug was found. Current/restored runs and all negative controls pass after this verification correction.
