# Keep account learning state in one revisioned record

Status: accepted.

Use the Sites-authenticated user subject as the D1 owner. Keep progress, personal preferences,
reset recovery and recent operation receipts in one versioned JSON document. Public reading
and temporary guest answers remain available.

A single conditional update gives the document and its acknowledgement the same revision.
Separate preference or receipt writes could leave a partially applied operation. The client
retries the same immutable operation after an ambiguous response; it never silently rebases
over another device's save. An explicit originating-account precondition rejects a request
whose sign-in changed before delivery.

Keep 64 recent receipts and cap the complete serialized document and request at 1,900,000
bytes, below D1's 2 MiB value limit. An older evicted operation still carries its stale expected
revision. Reject overflow without discarding history. Reset and undo increase revisions;
any intervening write disables undo.

Account switching clears in-memory private state. Browser records remain read-only and require
an explicit import. Unsupported stored versions stay exportable. The migration is additive,
so an application rollback leaves rows intact; an older application can lack account features.
Local trusted-header fixtures prove application behavior and do not prove hosted provider login.

Finish every request through one bounded discard of unread body bytes. Local Worker runs lost
413 responses when an upload remained unread or was cancelled, matching the reported
[workerd service-binding reset](https://github.com/cloudflare/workerd/issues/7634). Keep the
1,900,000-byte JSON limit; discarded bytes are never buffered or parsed. Allow at most twice
that limit, 3,800,000 additional bytes, and two seconds for cleanup. This admits one moderately
oversized upload while bounding each rejected request's extra network work and wait. It also
protects early authentication, origin and media-type responses. Beyond either cleanup budget,
cancel the stream; affected runtimes can still lose the response, but no mutation is applied.
An unsettled cancellation acknowledgement cannot extend the cleanup deadline.
Do not drain arbitrary uploads to EOF or retry a rejected POST to conceal a transport failure.
