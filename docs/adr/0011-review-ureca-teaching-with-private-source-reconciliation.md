# ADR-0011: Bind URECA teaching to reviewed obligations and private source reconciliation

Status: Accepted

## Context

The catalogue had detailed teaching for twenty of eighty-six retained URECA topics. Twenty-nine
were partial and thirty-seven absent. Its source screen inferred completeness from five older
direct-product IDs, so new study could remain invisible. The retained sources also contain
private learning records, rendered duplicates, historical candidates and preparation.

## Decision

Keep the existing lesson, guide, metadata, unit and assessment JSON as canonical application data.
Temporary isolated proposals enter through one validating integrator. A separate public topic
ledger identifies actual teaching passages, exercise methods, primary references and independent
review evidence. Digests invalidate reviews after linked content changes; separate reviewers
remain responsible for mathematical depth and correctness.

Compare private source bytes against explicitly reviewed dispositions outside the repository.
Changes cannot silently advance that state. Public CI runs synthetic source-failure fixtures and
checks current public review bindings without mounting private material.

## Consequences

Existing progress identifiers and assessment serializations survive. A catalogue-wide format
migration or permanent content compiler would add maintenance without improving teaching, so
neither is introduced. Candidate and prepared material stays distinct from required coverage.
Source freshness remains a separate local release check; passing public CI alone cannot prove it.

Architecture alternatives and independent mathematical reviews are retained with this change.
All agent roles use the same model family at the owner's request; independent readers provide
separation from authors, with no claim of model diversity.
