# Bound glob recursion with a pinned fork

Status: accepted.

## Context

The dependency audit blocks the build and lint toolchain on
[Braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
Braces 3.0.3 has no upstream fix. Both Vinext and the Next ESLint plugin use it
through fast-glob and micromatch. Downgrading either tool to satisfy npm's suggested
remedy would discard unrelated fixes.

## Decision

Override Braces with the exact MIT-licensed
[@dieub/braces-depth-guard 3.0.3-pn.3](https://github.com/dieub/braces-depth-guard).
This third-party fork caps parser nesting and recursive AST walkers. It retains
the upstream API. Its real package identity and registry integrity remain in the
lockfile. It is not an upstream Braces release.

Keep the complete dependency audit and its high-severity threshold unchanged.
Check normal glob expansion and bounded rejection of deeply nested brace and
parenthesis patterns through the installed dependency. Run the production build
and full browser suite against the resolved graph.

Sharp 0.35.5 and source-map-js 1.2.2 fix the other current high-severity root
advisories. Pin Sharp globally because both Next and Miniflare depend on it.

## Consequences

The project temporarily trusts a small third-party fork. Review the guard diff
and exact version when updating it. Restore the upstream dependency when its
published release provides equivalent depth guards, or when the calling tools
remove this dependency. Keep the behavioral depth check after either change.
