# URECA coverage gate

URECA material changes outside Git. Public catalogue tags cannot detect those changes. Reconcile
the retained sources at task start and before release; public CI verifies the teaching ledger
without requiring access to the private source folder.

## Reconcile

1. Locate the current URECA Y2 source folder and its previously accepted private state. Run
   `node scripts/ureca-sources.mjs scan --root "$URECA_SOURCE_ROOT" --state "$URECA_PRIVATE_STATE"`.
   A missing snapshot is uninitialized. Missing, empty, unreadable or unsupported sources remain
   unresolved. If the source folder is unavailable, record freshness as unverified and leave that
   acceptance criterion open.
2. Read every added, changed, removed or renamed source and review duplicate identities. Classify
   mathematical obligations before editing the site. Required study includes exercise methods and
   retained proof details. Candidate investigations and prepared assignments keep those boundaries.
   Administrative records and generated renders need explicit dispositions rather than public copies.
3. Author original public teaching with exact actions, hypotheses, proofs, worked examples,
   counterexamples and diagnosed assessments. Integrate through the existing catalogue shapes.
   `scripts/ureca-content.mjs import --proposal <file>` validates isolated author proposals before
   appending them. Preserve existing lesson IDs, assessments, units and capstones.
4. Update `lib/algebra/ureca-topics.json` with exact public passage pointers and every distinct
   exercise method. A separate mathematics reviewer checks the full linked lessons against primary
   references and independent calculations. Publish the review rationale in `docs/research/ureca-*.md`.
   Bind each accepted topic to that report, its reviewer, date and current `review-digest --topic <id>`.
   Run `node scripts/ureca-content.mjs check --release`; any unresolved required topic stays open.
5. Prepare a private decisions JSON with `reviewedBy`, exact current `entries` and reviewed
   `removed` sources. Each entry carries its relative path, byte digest and disposition. Covered
   entries name public topic IDs and the current public coverage digest; duplicates name an
   identical retained original. The scanner's accepted JSON shape is `sourceStateSchema` in
   `scripts/lib/ureca-source-scan.mjs`.
6. Run `node scripts/ureca-sources.mjs accept --root "$URECA_SOURCE_ROOT" --state "$URECA_PRIVATE_STATE" --decisions <private-file>`.
   Add `--initialize` only for the first reviewed snapshot. Acceptance requires exact current bytes,
   removed-source dispositions and current independent public review. Run the scan again: completion
   requires `clean: true`, then the normal verification and owned-browser journeys.

Keep source paths, byte fingerprints, private records, attempts, grades and course files outside
public Git. The private snapshot belongs outside the checkout, even its ignored directories.

## Boundaries

The first ledger retains T01–T86 as required obligations, P01–P04 as candidate investigations and
P05–P06 as preparation. New retained study extends the obligations; those initial IDs survive.
Lesson count is not topic count, and reading is not assessed competence.

Passage pointers and digests establish traceability and freshness. They cannot establish depth,
mathematical correctness, source access, browser execution or native account authentication.
Report each of those states from its own evidence.

Scanning a mutable filesystem is not an atomic snapshot. The scanner checks file identity,
size, modification/change timestamps and directory membership before and after traversal,
then validates the observed tree again. Keep sources quiescent during reconciliation and
release; use an immutable filesystem snapshot when concurrent edits cannot be stopped.
Writes after the final check require another scan. Duplicate chains must terminate at an
identical retained nonduplicate entry. Removal attestations remain in append-only private
history. Acceptance uses an exclusive lock; inspect an abandoned writer before removing its
lock and retrying.
