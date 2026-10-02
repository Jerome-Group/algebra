# Independent persistence, laboratory loading and CLI review

Reviewer: mathematics subagent, GPT-6.1 Sol medium. Reviewed implementation owned by other agents against issue #75. Working-tree review; source digest at negative CLI check: `adcc9a173ce93da51518e55d3375a7b73605056c5c88882290adf0e3dc35bb29`. Subsequent edits require revalidation.

## Confirmed finding

- **P2 — numeric controls missing from CLI action contract.** `scripts/algebra.mjs:103–116` accepts textbox, combobox and slider but excludes spinbutton; both action schemas in `scripts/algebra-map.mjs:328–355` do the same. `components/algebra/RotationLessons.tsx:50,81` renders number inputs for arbitrary axis coordinates and exact angles. Chromium observation of a labelled number input returned one spinbutton and zero textboxes. Therefore an agent cannot replay these existing mathematical boundary cases using the advertised inspect actions. Add spinbutton to both schema enums and executor; fill it like a textbox, and verify a numeric boundary/recovery sequence. Sent to lead for coordinated repair.

## Checks and conclusions

- Read `progress.ts`, `progress-storage.ts`, `LearningProgress.tsx`, `Laboratory.tsx`, `LaboratoryLoadBoundary.tsx`, CLI/map implementation, CI, persistence and loading tests, and issue #75 acceptance criteria.
- Executed `node --test tests/progress-storage.test.mjs`: **8/8 passed**. Covers revised/unknown assessment history, exact prior records, reset/restore after reload, future/corrupt records, two stores, failed writes/session recovery, denied storage and subscriptions. No confirmed preservation defect found in these paths. Concurrent writes remain browser-local synchronous operations; this is not a distributed transaction guarantee.
- Executed `verify --layer missing`: structured `ok:false`, actionable unknown-layer message. No check inferred from an unexecuted layer.
- Checked Chromium range-input filling directly: current Playwright supports slider fill. No slider defect reported.
- Source review: lazy imports are module scoped; boundary keyed by lesson ID resets route-local errors; loading feedback is live text; failed import retains navigation and offers a reload preserving the hash. Did **not** independently execute the application loading browser tests here; their evidence must come from the browser verification owner.
- A whole-application CLI inspect attempt against the default development origin did not complete and was interrupted. It supplies no successful inspection evidence.

## Limits

This report is independent engineering review, not production/browser release certification. The CLI finding remains open until implementation and replay evidence confirm repair. Backup exports have no import UI: exact prior-record restoration is the available in-app rollback; exported JSON supplies external preservation.
