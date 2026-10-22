# Keep argument writing separate from learning progress

Status: accepted.

Proof reconstruction needs editable, potentially large personal writing, retained teaching
excerpts and explicit conflict recovery. The existing account-progress document is a strict
version-one contract used by older clients, backups, reset and undo. Extending that document
would make older clients reject it and let a large proof block competency saves.

Store bounded argument records through a separate owner-scoped API and additive tables. Keep
the existing account coordinator as the sole identity-generation authority. Conceal notes
during identity confirmation, restore them only for the same owner, and ignore late replies
from a former generation. Guest writing remains in page memory, with explicit export and
previewed import. Progress export, reset and undo keep their existing scope.

Each save captures one complete sheet, revision, operation identifier and delivery time.
Acknowledgement applies to those exact bytes. Later edits remain dirty. Ambiguous delivery
retries the captured operation; a conflicting server version and local writing remain
available for an explicit choice. Storage limits and receipt lifetime are visible constraints,
not reasons to evict writing silently.

A retained teaching edition includes the objects, statement, conventions and ordered proof
passages. Its digest identifies those fields; it does not certify mathematical correctness.
Historical editions stay attached to their original writing. No positional reference is
silently reassigned after a teaching change.

Public work fragments contain lesson, support and unit context. Private text and record
identifiers remain outside URLs. A support consultation preserves the active argument, and
existing transfer checkpoints and unit capstones retain their assessment rules. Writing,
self-review and comparison never award competency credit.
