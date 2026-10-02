# Persistence and delivery research

Verified against source on 3 October 2026:

- Competency evidence lives in `algebra-competency-progress-v1`; resume and the URECA object use separate browser keys. Database schema is empty; `.openai/hosting.json` has null D1/R2 bindings. No application route calls the retained auth helper.
- Previous `readProgress` removed stale and unknown attempts, and the next answer overwrote the original record. Revised questions must invalidate credit, but deleting their evidence is unnecessary. The additive archive preserves valid earlier attempts without granting current credit. A companion raw backup supports restoring the previous write; exports include session evidence and raw current/previous records.
- Unsupported or corrupt records stay untouched during ordinary answers. Confirmed reset backs up the raw record before replacing it. Storage failures keep answers in session; a failed backup write prevents overwriting saved evidence. Backup is one previous write, not unlimited history.
- Independent review exposed two overwrite paths: an undelivered cross-tab event left the submitting snapshot stale, and malformed version-one attempt values could be discarded. Each answer now synchronously reads the latest supported record and retains only unsaved session answers from its own snapshot. Structural validation covers every current and archived attempt. Shared-storage tests reproduce the event-delay race and byte-for-byte malformed-record preservation. This reduces sequential stale writes; localStorage offers no transaction spanning simultaneous read/write operations across processes.
- Sites project identity remains `appgprj_6a9f5e3039108191a1f2d9598aedd130`; the build copies retained deployment metadata. GitHub CI has no Sites deploy step. Cached Sites Git refs cannot establish the live deployment version or access policy.

Authoritative browser/state constraints:

- [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore): stable immutable cached snapshots, subscription cleanup and matching server hydration snapshots are required. The store reads browser storage after mount and supplies a fixed empty server snapshot.
- [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage): persistence is origin-specific and browser access can throw. Export is needed for moving devices or recovering after browser data removal; there is no automatic cloud synchronization.
- [MDN storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event): other same-origin windows receive changes; the writer does not. The store therefore notifies its own subscribers and reloads on other-window storage events.

Hypotheses requiring provider verification: current production source SHA, exact live audience policy, previous deployment restoration support. No deployment, migration or rollback success is claimed by repository checks alone.

## Laboratory loading and measured delivery budget

[React lazy](https://react.dev/reference/react/lazy) defers a component's import until rendering and caches its promise; rejected imports reach an error boundary. [React Suspense](https://react.dev/reference/react/Suspense) provides the pending fallback. Lazy declarations therefore live at module scope, while a boundary keyed by lesson isolates failures and resets when navigating to another lesson. Retry reloads the same fragment so the rejected promise and stale chunk cache do not keep the app stuck. An unsaved lab prediction resets; browser-saved competency evidence remains.

[Vite production build](https://vite.dev/guide/build.html) supports dynamic import splitting. The release budget here is structural: laboratory implementations must remain outside the shell's eager import graph. `tests/ui-components.test.mjs` checks that property against the actual built manifest, alongside streaming SSR mathematics for all catalogue laboratories. The browser loading test delays a real import, proves Home did not request it, then checks pending feedback; a rejected import checks scoped error and ordinary reload recovery. Vinext's development-only error overlay is dismissed in that test; production recovery has no developer overlay.

Both loading cases also passed against the built Worker on port 5175, intercepting the observed production `FunctionFibers-CV_SSIeH.js` chunk. This confirms the pending and recovery behavior on the release artifact, rather than assuming the development source route represents production delivery.

Measured on 3 October using minified `dist/client/assets` plus Python gzip (compressed sizes are artifact comparisons, not network timing): previous available build `Algebra-Bde7TjNX.js` was 1,640,669 bytes / 442,007 gzip. The first split build `Algebra-DcEPdsZ0.js` is 1,431,209 / 378,709 gzip; it emits 49 JS chunks, including deferred Groups at 124,554 / 39,987 gzip. Other agents changed teaching content concurrently, so these numbers are release observations, not a controlled attribution of the entire reduction to splitting. The initial shell remains above Vite's default 500 kB warning; no warning threshold was raised. Remaining eagerly bundled lesson/assessment data explains a material budget pressure. No mobile speed or latency improvement is claimed without a production network measurement.

Independent review additionally reproduced partial undo failure: saving the reverse backup could succeed before restoring primary storage failed. The existing backup envelope now journals both records before any primary change; reload distinguishes failed restoration from successful reversal. Fifteen focused progress/store tests independently pass, including supported/future raw records and failed null-target removal across reload and retry.

The completed teaching corpus's eager `Algebra-C5QBO9DI.js` artifact measures 1,535,761 bytes / 410,888 gzip; the immutable baseline measures 1,640,669 / 444,991 with the same Node gzip default. This is about 6.4% fewer minified bytes and 7.7% fewer compressed bytes despite adding 71 guided teaching contracts. It remains a substantial eager corpus and still triggers the default chunk warning. These artifact-size comparisons establish no device/network latency or learner outcome.

## Later release evidence — 2026-10-03

The earlier review scope and pending statements above remain historical. Final protected CI, independent production verification, in-app coverage, native provenance and the tested version 7 → 8 → 7 restoration are recorded in [the release record](../release-verification.md). This later record is release-owner evidence, not a claim that this earlier reviewer executed those later checks.
