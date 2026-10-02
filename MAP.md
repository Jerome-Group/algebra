# Map

Abstract Algebra: an interactive mathematics learning site.

Start here: `README.md`, then `AGENTS.md`.

| Area                              | Entry point                                                                                                                                                                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Learning experience               | `app/page.tsx`, `components/algebra/Algebra.tsx`, shared fitted/readable `Diagram.tsx`, shell/laboratory/responsive styles in `app/`, laboratories in `components/algebra/`, shared `hooks/`, assets in `public/` and `vendor/`          |
| Mathematics and examples          | `lib/algebra/` for calculations, quotient models and the lesson catalogue; `examples/` for retained integrations                                                                                                                         |
| Validation                        | `npm run agent -- help`, `scripts/algebra.mjs`, generated `lib/algebra/feature-map.json`, `tests/`, `design-qa.md`, and `eslint-suppressions.json`                                                                                       |
| Runtime and deployment            | `worker/index.ts`, `build/`, `vite.config.ts`, `.openai/hosting.json`; retained database scaffolding in `db/` and `drizzle/`                                                                                                             |
| Working conventions and decisions | `AGENTS.md`, `CODING_STANDARDS.md`, `CONTEXT.md`, `docs/adr/`, `docs/source-coverage.md`, research/provenance in `docs/research/`, release gates in `docs/overhaul-plan.json`, executed release record in `docs/release-verification.md` |
| Automation                        | `.github/workflows/ci.yml`: shared CLI engineering gates, exact-artifact browser shards, required `checks` aggregate; central conformance caller                                                                                         |
