# Address unit capstones with durable fragments

Use `#capstone:<unit>` to return from a unit's final lesson to its existing
catalogue assessment. Resolve the unit against the catalogue at the navigation
boundary. An unknown or malformed unit returns to Learn.

A fragment carries the destination across copied links, reload and history.
History metadata alone would make the destination depend on the previous tab
session. A separate assessment page would repeat presentation and risk changing
checkpoint identity or submission behavior.

The capstone is a destination within Learn. The five product modes and existing
lesson history stay intact. One screen union owns the selected destination.
The catalogue owns its native disclosures, so arriving opens the selected
capstone and closes its worked answer without remounting its checkpoint.
The shared focus scheduler records intent immediately and schedules one frame
after React commits the destination. Scheduling before the commit could consume
the request before its target mounts. Reader focus or newer navigation cancels
the intent before scheduling or execution. The selected summary scrolls below
the sticky header.

Revisit this decision if capstones need a separate reading experience or their
own saved drafts. Navigation continues to grant no competency credit.
