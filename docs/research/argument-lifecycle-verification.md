# What does the bounded argument lifecycle check establish?

At source `5c6cdfab6262e219acca1e9aa1b290457e107c2a`, the modeled client schedules
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
returned HTTP 403 on 2026-10-23. That failed access attempt remains part of the
research record. Later that day, the in-app browser displayed both complete posts.
The reading used public post content and made no account changes.

The [19 October post](https://x.com/poteto/status/2111926622278521253) describes
property-specific verification, using TLA+ for concurrent state and Kani for Rust
undefined behavior. It emphasizes requirements modeling and keeping models aligned
with implementation. These support our scheduling model and source-maintenance
gate; they do not establish that our particular model is correct.
The [23 October post](https://x.com/poteto/status/2113398433977659654) announces a
forthcoming statechart and diagram companion checked against formal specifications.
An announcement does not establish an installed tool or a proof of this code.

TLA+ suits event ordering here. The runner pins tools
[v1.7.4](https://github.com/tlaplus/tlaplus/releases/tag/v1.7.4), whose jar prints
`TLC2 Version 2.19 of 08 August 2024`. The release lists upstream SHA-1
`bee4a54f3ee3d4afc347c3240ec2d9e93b075104`. The locally verified SHA-256 pin is
`936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`.
The one-command runner downloads and verifies those exact bytes, or verifies an
explicit `TLA2TOOLS_JAR`. Java 21 and Node 24+ are prerequisites. CI installs Java 21
and uses locked npm dependencies. The setup-java commit was resolved from upstream
`actions/setup-java` tag `v5` when adding the verification step.

## Bounds and code correspondence

There are two owners A/B, one initially active A sheet, two content versions, one put,
one refresh and at most one retry after transport failure without refresh. Refresh
may restore A or confirm B. Generation values 0, 1, 2 are fresh within that single
refresh budget; they never wrap. One supported response carries the captured sheet
and a valid receipt. The optional post-refresh argument load returns no records.
Retry may fail again. Network requests may remain unanswered indefinitely.

| Model action                  | Production source at the sync commit                            | Atomic boundary                                                                                                  |
| ----------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Save`                        | `lib/algebra/argument-store.ts:229-257,393-437`                 | `save`/`enqueue`/`transmit` capture one parsed sheet, pending object, serialized body and identity before fetch. |
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
Each invocation retains logs, traces, input hashes and completed outcomes under a
permanent ordinal admission in ignored `outputs/argument-lifecycle/evidence-v2/`.
Read current evidence with `node scripts/formal/argument-evidence.mjs current`.
Only the newest admitted invocation can establish current success, including when
it is empty, failed or interrupted. A pass requires matching current input bytes,
all ten named outcomes and retained mutation logs. The explicit `inspect <invocation>`
command always reports historical evidence, never current authority. Legacy summaries
remain physically retained and can be read with `inspect-legacy <run-id>`.
A successful runner does not mistake mutation syntax, checksum or source-anchor
failures for detected product regressions.

## Creation and maintenance receipt

The generated skill was followed using `npm run verify:argument-lifecycle`, including
the pinned jar download, baseline, all negative controls and restored checks.
Maintenance then ran it unchanged before inspecting covered-file history and diffs
from `2b8d7e90b367cfd1c1690de5c5302099552b0b4c` through
`9cd4b5ca651a0574c8279383418644abdd3cbaf5`. The intervening capstone/search
repair changed none of the three covered modules; their state writers remain in
place. All three promises are **in sync**; no promise or bound changed and no
product bug was found in this scope. Full reruns retained the same results.
That maintenance advanced the sync record to the latter checked source.

Independent standards review reproduced a receipt defect. A failed rerun with a
missing `TLA2TOOLS_JAR` left the earlier successful root summary unchanged. The
historical sequential repair created a run receipt before those gates and recorded
the failed invocation in both its own directory and the stable summary. The actual-runner regression
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

## Maintenance through PR 151

This pass read every commit message from the previous sync
`9cd4b5ca651a0574c8279383418644abdd3cbaf5` through the checked source
`7c3cee2709b25f64b13c78ecebb5f02136f8f0a2`:

- `f434d6f68ea3fcf5fd86800ef2c2afac535fb04e`, formal lifecycle verification, PR 144.
- `2f55931f49947d43f803c392a1a5cf63925dce28`, beginner language workshop, PR 146.
- `7c3cee2709b25f64b13c78ecebb5f02136f8f0a2`, reviewed catalogue notation and corrections, PR 151.

The three covered modules are byte-identical to the previous sync. The review also
read their state writers, account coordinator, context method forwarding, subscribers,
argument UI callers, navigation changes and imported schema/catalogue dependencies.
`ArgumentContext`, `LearningProgress`, `argument-catalogue`, `argument-server`,
`account-progress` and `progress` are unchanged. PR 146 adds public navigation without
changing argument mutations. PR 151 changes rendering, including `WrittenProse` for
private or historical writing, without changing captured sheets or serialized requests.
Its catalogue corrections change the `objects` field of three current teaching
editions, for `mh2220-simple-composition`, `mh2220-finite-matrices` and
`ureca-cyclic-eigenvalues`. Lesson and unit identities remain unchanged. Those values
do not alter the modeled owner, equality or immutable-operation promises.

The uncommitted laboratory presentation draft was inspected read-only against this
checked source. Its covered modules are unchanged. Among direct argument callers,
only `ArgumentSupport` changes. It looks up public recovery teaching strings before
rendering them; it does not transform a private sheet or change a store callback.
This is a snapshot audit of an unmerged draft, not a claim that a future merge was
checked. A later source revision requires another delta audit before advancing sync.

| Promise                   | Maintenance outcome | Evidence                                                                                                                                                                                     |
| ------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OwnerPrivacy`            | in sync             | Current and restored checks pass. The model mutant violates `OwnerPrivacy`; the real-module mutant exposes A's captured writing in B's export after the paused digest resumes.               |
| `CapturedAcknowledgement` | in sync             | Current and restored checks pass. The model mutant violates `CapturedAcknowledgement`; the real-module mutant acknowledges `A private later typing` instead of `A private captured writing`. |
| `ImmutableRetry`          | in sync             | Current and restored checks pass. The model mutant violates `ImmutableRetry`; the real-module mutant changes the request body to later typing on retry.                                      |

The as-is run passed before verification edits. No model, replay, property, bound or
atomic boundary needed a change. There was no new verification drift or product bug
within this scope. The earlier load-cancellation correction above remains a historical
verification defect, not a newly discovered product failure. The sync record advances
only to the checked source. The skill now explicitly requires reviewing mapped callers
and imported dependencies because the runner's source gate compares only its three
covered files.

The final normal command passes all ten named outcomes with Node 24.19.0, Java
21.0.12.1 and the pinned TLA+ jar SHA-256 above. Current and restored TLC runs each
generate 693 states, find 411 distinct states and leave zero queued. The privacy,
acknowledgement and retry mutants exit 12 on their named invariant with the counts
listed above. All three real-module mutants exit 1 on their named `ERR_ASSERTION`.
Current and restored real modules each pass the same seven schedules. The
failed-rerun receipt regression passes. Run receipts retain the exact source commit,
three covered-file hashes, bounds, tool hash, all ten results and mutation logs.

The finite scope and exclusions above are unchanged. This pass establishes no
liveness, server transaction, native authentication, browser, deployment or arbitrary
payload guarantee. Public teaching and private source reconciliation remain the
parent release's responsibility.

## Concurrent evidence ownership repair

Issue 177 retained an actual overlap in which A started first, B failed later with
ENOENT, then A passed ten checks and overwrote the stable summary. Atomic replacement
kept whole bytes but selected completion order. The replacement module reserves
contiguous ordinal directories by exclusive mkdir before checking inputs. Every
invocation writes only its owned directory. The single current reader selects the
highest admission, validates its terminal digest/schema and captured input bytes,
then rechecks the terminal intent set and successor. It refuses churn without a
last-known-good fallback. Historical inspection cannot promote an old pass.

The owner serializes record calls and retains validated context/results in memory
before diagnostic writes. A caught record failure still prevents pass. Original
proof/tool errors retain name, code, message and stack ahead of secondary evidence
errors. A complete pass requires exactly the existing ten labels/kinds and named
mutation identities. No mathematical promise, bound, jar pin, TLC flag, real-store
schedule or scratch cleanup changed. Coverage sync does not advance for this repair.

Captured exact relative hashes cover the three stores, model, config, coverage,
runner, replay and evidence implementation. Changed final bytes produce a failed
`FormalInputsChanged` receipt with completed outcomes and expected/observed hashes.
Later current reads reject stale passed inputs; failed early gates keep their
original error. These boundary comparisons do not establish hostile edit/restore
isolation or the entire dependency closure.

All mandatory checks, scratch cleanup, retained logs and prepublication flushes
precede the no-replace hard link of frozen, closed, flushed receipt bytes. A digest
intent is created before staging or comparing an existing body. Any second distinct
intent makes the invocation conflicted even when empty. Exact-byte retry converges.
The link commits the owned outcome. Later optional output diagnostics cannot turn
that committed pass into a failed proof. Ambiguous link errors trigger exact owned
target readback with regular-file, realpath, owner, digest and byte checks. Matching
frozen bytes establish commitment and retain the link diagnostic. Unreadable
readback rejects with `ArgumentPublicationUncertain`, without claiming failed proof
or definitely incomplete publication. A later reader may resolve a committed fact.
A captured primary tool or proof error still takes precedence over that secondary
storage uncertainty. Process death after commitment differs
from death during collection. No power-loss guarantee follows. Local macOS APFS and
Linux ext4 identities are admitted; unknown/remote filesystems, symlinks, special
objects and device changes are refused. Linux execution awaits actual CI.

The original file-only CI upload could not establish retention of empty admissions
or intents. CI now creates a directory-preserving tar archive with exact file/dir
manifest, verifies extraction and the same current reader against the intended
checkout, then publishes the verified archive. The CLI-only `archive --output` operation
reports retention separately from the selected formal status. A faithful archived
failure remains failed. Archive failure blocks retention without rewriting a
committed proof. The three imported evidence operations remain the lifecycle wrapper,
current reader and historical inspector. `--root` means checkout; explicit
`--evidence-root` and `--source-root` support relocated evidence without trusting
stored absolute paths.


## Final source audit through PR 157

The checked source advances from `7c3cee2709b25f64b13c78ecebb5f02136f8f0a2`
to `5c6cdfab6262e219acca1e9aa1b290457e107c2a`. The sole intervening commit
repairs cancellation after forced installer process-group termination. Its four
changed paths are the installer, its test, its C fixture and their feature-map
entries. The three covered stores, every modeled caller and imported schema or
catalogue remain unchanged. All three promises remain in sync. No model, bound,
atomic boundary, mutation or replay schedule changes. This audit does not approve
the separate unmerged mathematics draft.

Fresh independent review of the evidence ownership repair reproduced the actual
overlap and restored all ten normal outcomes. Six additional isolated controls
also pass, including required artifact flush failure, final coverage-byte drift,
ambiguous publication with a primary error and admission during archival. These
wrapper controls use synthetic outcomes; the actual TLC and store replay results
remain separate. After this source audit, the ordinary command again passed all ten outcomes with
the unchanged state counts and seven replay schedules. The current reader selected
that passed invocation with the new sync and matching captured input bytes.
