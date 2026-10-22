# URECA coverage design

The original catalogue taught twenty of eighty-six retained topics in detail. Twenty-nine were
partial and thirty-seven missing. Adding lesson cards alone would preserve that gap between an
inventory and teaching. This expansion therefore separates three claims: material is taught,
the mathematics was independently reviewed, and the private source inventory is current.

## Alternatives considered

Two isolated architecture proposals and a separate judge compared the existing catalogue with
a permanent content compiler. The chosen proposal keeps the five application catalogues as
canonical data and adds a topic ledger. A strict, temporary proposal importer checks the joins
before appending authored content. A compiler would introduce another permanent representation
of every lesson without improving the learner's explanation or the reviewer's evidence.

The ledger points to actual statements, proofs, examples and boundaries. Exercise methods have
their own reciprocal topic mappings. It supports both the Sources screen and a release check;
neither a lesson count nor the presence of a source reference counts as detailed coverage.

## Preserved contracts

Existing lesson IDs, unit IDs and assessment serializations remain stable. The original teaching
audit remains a historical record. New lessons join the current guides, metadata, units and
assessment registry, so account-size checks measure the complete expanded registry.

Each independent review binds full linked lesson, guide and metadata records, containing units,
their capstones and relevant exercise methods. Changing one of those inputs invalidates the
review. The digest detects change; the review report and independent calculations establish
what was checked. All agents use the same model at the owner's request, so separation from the
authors is claimed, while model diversity is not.

## Source reconciliation

The private scanner records file bytes and explicit dispositions outside Git. Added, changed,
removed, renamed, duplicate, unreadable and unsupported entries require reconciliation. A source
disposition cannot advance the reviewed state implicitly. Covered entries bind the public
coverage ledger; candidate and prepared investigations remain separately classified.

Public CI checks teaching joins, stale reviews and synthetic filesystem failures without access
to private notes. A local source reconciliation is still required before release. Native provider
sign-in remains a separate, unverified boundary for this release.
