# Scope the legacy loader esbuild override

Status: accepted.

## Context

Drizzle Kit 0.31.10 retains `@esbuild-kit/esm-loader` 2.6.5, whose
`@esbuild-kit/core-utils` 3.3.2 dependency declares esbuild `~0.18.20`.
That installed esbuild permits arbitrary browser origins to read its development
server's source responses. The public advisory
[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
covers versions through 0.24.2 and identifies 0.25.0 as the first patched release.
The full dependency audit reports four moderate propagation entries for this one
advisory. The production audit reports none.

The [esbuild 0.25.0 release notes](https://github.com/evanw/esbuild/blob/v0.25.0/CHANGELOG.md)
explicitly describe breaking changes. The development server disables CORS,
validates its host, and returns `hosts` instead of `host` from `serve()`.
The release also changes watch output, CSS transforms, and source maps.
Crossing core-utils' declared range therefore needs compatibility evidence.

## Decision

Override esbuild with exactly 0.25.12 only beneath `@esbuild-kit/core-utils`.
Keep Drizzle Kit, Drizzle ORM, application code, database schema, and production
dependency metadata unchanged. Do not broaden the override to other esbuild
consumers or treat npm's suggested Drizzle downgrade as an equivalent fix.

Retain [prototype PR 107](https://github.com/Jerome-Group/algebra/pull/107),
at commit `1760d09c28562f4ef2bdd66057c9cae0b6223f68`, as non-shippable evidence.
Its instruments and fixtures stay on the prototype branch. The installed legacy
loader probes compare TypeScript ESM, path aliases, dynamic imports, and explicit
CJS `transformSync` execution with caches and native type stripping disabled.
Generated SQL, disposable SQLite application, and repeat generation also match.
Implementation verification additionally copies the checked-in migration history
and checks that generation leaves every migration and metadata file unchanged.

Keep a behavioral regression check through core-utils' installed esbuild.
Ordinary loopback requests must read a temporary source file. An arbitrary browser
origin must not receive permission to read that source. Check the response's CORS
behavior rather than require a particular rejection status.

## Consequences

The override crosses an unsupported upstream version range. The tested transforms
bound the compatibility claim to their fixtures on Node 24.19.0. Native legacy
`.cts` loading fails with the same syntax error before and after the override.
Successful explicit CJS transformation does not establish a complete CJS loader
journey or working Node 24 `globalPreload` support.

Current Drizzle generation uses bundled tsx registration and Drizzle's own esbuild
0.25.12. Its successful migration checks do not prove that Drizzle uses the
overridden legacy loader. Other Node versions, platforms, transform options, and
Drizzle commands require separate checks. The prototype's first-run detailed
evidence overwrite remains a disclosed retention gap.

Remove this override when an upstream core-utils release supports a patched
esbuild, or when Drizzle Kit removes the legacy chain. Verify the resolved
dependency graph, retained behavior, migration history, and full application gates
before removal. Keep the source-access regression for as long as this dependency
remains installed.
