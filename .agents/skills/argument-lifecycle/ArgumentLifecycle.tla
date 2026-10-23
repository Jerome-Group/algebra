------------------------- MODULE ArgumentLifecycle -------------------------
EXTENDS Naturals

CONSTANT Mutation
None == "none"
Sheet(text) == IF text = 0 THEN "A-captured" ELSE "A-later"
Sheets == {None, Sheet(0), Sheet(1)}
EmptyView == [active |-> None, saved |-> None, ack |-> None, pending |-> FALSE]

VARIABLES owner, generation, confirmed, view, concealed, refreshPhase,
          writePhase, writeGeneration, captured, responseSaved, sentBody,
          putUsed, editUsed, retryUsed, loadValid

Init ==
  /\ owner = "A" /\ generation = 0 /\ confirmed = TRUE
  /\ view = [EmptyView EXCEPT !.active = Sheet(0)]
  /\ concealed = EmptyView /\ refreshPhase = "unused"
  /\ writePhase = "idle" /\ writeGeneration = 0
  /\ captured = None /\ responseSaved = None /\ sentBody = None
  /\ putUsed = FALSE /\ editUsed = FALSE /\ retryUsed = FALSE
  /\ loadValid = FALSE

Current == confirmed /\ owner = "A" /\ generation = writeGeneration
           /\ view.pending

\* argument-store.ts enqueue/save/transmit, through the fetch await.
Save ==
  /\ ~putUsed /\ confirmed /\ owner = "A" /\ view.active # None
  /\ writePhase' = "fetch" /\ writeGeneration' = generation
  /\ captured' = view.active /\ sentBody' = view.active /\ putUsed' = TRUE
  /\ loadValid' = FALSE
  /\ view' = [view EXCEPT !.pending = TRUE]
  /\ UNCHANGED <<owner, generation, confirmed, concealed, refreshPhase,
                 responseSaved, editUsed, retryUsed>>

\* edit and emit are synchronous. The captured request does not change.
Edit ==
  /\ ~editUsed /\ confirmed /\ view.active # None
  /\ view' = [view EXCEPT !.active = Sheet(1)] /\ editUsed' = TRUE
  /\ UNCHANGED <<owner, generation, confirmed, concealed, refreshPhase,
                 writePhase, writeGeneration, captured, responseSaved,
                 sentBody, putUsed, retryUsed, loadValid>>

\* refresh conceals arguments and clears progress before awaiting fetch.
Refresh ==
  /\ refreshPhase = "unused" /\ refreshPhase' = "fetch"
  /\ concealed' = view /\ view' = EmptyView
  /\ owner' = None /\ confirmed' = FALSE /\ generation' = 1
  /\ loadValid' = FALSE
  /\ UNCHANGED <<writePhase, writeGeneration, captured, responseSaved,
                 sentBody, putUsed, editUsed, retryUsed>>

RefreshFetch ==
  /\ refreshPhase = "fetch" /\ refreshPhase' = "json"
  /\ UNCHANGED <<owner, generation, confirmed, view, concealed,
                 writePhase, writeGeneration, captured, responseSaved,
                 sentBody, putUsed, editUsed, retryUsed, loadValid>>

\* Progress JSON commits identity, restores only A, and starts argument load.
RefreshJson(account) ==
  /\ refreshPhase = "json" /\ account \in {"A", "B"}
  /\ owner' = account /\ confirmed' = TRUE
  /\ generation' = IF account = "A" THEN 1 ELSE 2
  /\ view' = IF account = "A" THEN concealed ELSE EmptyView
  /\ concealed' = EmptyView /\ refreshPhase' = "argumentsFetch"
  /\ loadValid' = TRUE
  /\ UNCHANGED <<writePhase, writeGeneration, captured, responseSaved,
                 sentBody, putUsed, editUsed, retryUsed>>

ArgumentsFetch ==
  /\ refreshPhase = "argumentsFetch"
  /\ refreshPhase' = IF loadValid THEN "argumentsJson" ELSE "done"
  /\ UNCHANGED <<owner, generation, confirmed, view, concealed,
                 writePhase, writeGeneration, captured, responseSaved,
                 sentBody, putUsed, editUsed, retryUsed, loadValid>>

\* One supported, empty argument-load response; no competing server writer.
ArgumentsJson ==
  /\ refreshPhase = "argumentsJson" /\ refreshPhase' = "done"
  /\ view' = IF loadValid THEN [view EXCEPT !.saved = None] ELSE view
  /\ UNCHANGED <<owner, generation, confirmed, concealed,
                 writePhase, writeGeneration, captured, responseSaved,
                 sentBody, putUsed, editUsed, retryUsed, loadValid>>

WriteFetch ==
  /\ writePhase = "fetch"
  /\ writePhase' = IF Current THEN "json" ELSE "done"
  /\ UNCHANGED <<owner, generation, confirmed, view, concealed, refreshPhase,
                 writeGeneration, captured, responseSaved, sentBody,
                 putUsed, editUsed, retryUsed, loadValid>>

\* A transport rejection leaves the immutable pending operation retryable.
WriteFailure ==
  /\ writePhase = "fetch"
  /\ writePhase' = IF Current THEN "failed" ELSE "done"
  /\ UNCHANGED <<owner, generation, confirmed, view, concealed, refreshPhase,
                 writeGeneration, captured, responseSaved, sentBody,
                 putUsed, editUsed, retryUsed, loadValid>>

\* JSON guards run before recordsFrom captures supported records and hashes.
WriteJson ==
  /\ writePhase = "json"
  /\ writePhase' = IF Current THEN "digest" ELSE "done"
  /\ responseSaved' = IF Current THEN captured ELSE None
  /\ UNCHANGED <<owner, generation, confirmed, view, concealed, refreshPhase,
                 writeGeneration, captured, sentBody, putUsed, editUsed,
                 retryUsed, loadValid>>

\* The sole privacy mutation removes the guard AFTER the digest await.
WriteDigest ==
  /\ writePhase = "digest" /\ writePhase' = "done"
  /\ view' = IF Current \/ Mutation = "privacy"
       THEN [view EXCEPT !.pending = FALSE, !.saved = responseSaved,
                        !.ack = IF Mutation = "ack" THEN view.active ELSE captured]
       ELSE view
  /\ UNCHANGED <<owner, generation, confirmed, concealed, refreshPhase,
                 writeGeneration, captured, responseSaved, sentBody,
                 putUsed, editUsed, retryUsed, loadValid>>

\* The bounded retry is after failure without a refresh, never concurrent.
Retry ==
  /\ writePhase = "failed" /\ Current /\ ~retryUsed
  /\ refreshPhase = "unused"
  /\ writePhase' = "fetch" /\ retryUsed' = TRUE
  /\ sentBody' = IF Mutation = "retry" THEN view.active ELSE captured
  /\ loadValid' = FALSE
  /\ UNCHANGED <<owner, generation, confirmed, view, concealed, refreshPhase,
                 writeGeneration, captured, responseSaved, putUsed, editUsed>>

Next == Save \/ Edit \/ Refresh \/ RefreshFetch
     \/ (\E account \in {"A", "B"}: RefreshJson(account))
     \/ ArgumentsFetch \/ ArgumentsJson \/ WriteFetch \/ WriteFailure
     \/ WriteJson \/ WriteDigest \/ Retry

TypeOK ==
  /\ owner \in {None, "A", "B"} /\ generation \in 0..2
  /\ confirmed \in BOOLEAN
  /\ view \in [active: Sheets, saved: Sheets, ack: Sheets, pending: BOOLEAN]
  /\ concealed \in [active: Sheets, saved: Sheets, ack: Sheets, pending: BOOLEAN]
  /\ refreshPhase \in {"unused", "fetch", "json", "argumentsFetch", "argumentsJson", "done"}
  /\ writePhase \in {"idle", "fetch", "json", "digest", "failed", "done"}
  /\ writeGeneration \in 0..2 /\ captured \in Sheets
  /\ responseSaved \in Sheets /\ sentBody \in Sheets
  /\ putUsed \in BOOLEAN /\ editUsed \in BOOLEAN /\ retryUsed \in BOOLEAN
  /\ loadValid \in BOOLEAN

OwnerPrivacy == \A sheet \in {view.active, view.saved, view.ack}:
  sheet # None => (confirmed /\ owner = "A")
CapturedAcknowledgement == view.ack = None \/ view.ack = captured
ImmutableRetry == sentBody = None \/ sentBody = captured

=============================================================================
