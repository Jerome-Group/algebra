# Map

Abstract Algebra: an interactive mathematics learning site.

Start here: `README.md`, then `AGENTS.md`.

| Area                              | Entry point                                                                                                                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Learning experience               | `app/page.tsx`, `components/algebra/Algebra.tsx`, shell/laboratory/responsive styles in `app/`, laboratories in `components/algebra/`, shared `hooks/`, assets in `public/` and `vendor/` |
| Mathematics and examples          | `lib/algebra/` for calculations, quotient models and the lesson catalogue; `examples/` for retained integrations                                                                          |
| Validation                        | `package.json` commands, `tests/`, `scripts/`, `design-qa.md`, and `eslint-suppressions.json`                                                                                             |
| Runtime and deployment            | `worker/index.ts`, `build/`, `vite.config.ts`, `.openai/hosting.json`; retained database scaffolding in `db/` and `drizzle/`                                                              |
| Working conventions and decisions | `AGENTS.md`, `CODING_STANDARDS.md`, `CONTEXT.md`, `docs/adr/`, `docs/source-coverage.md`                                                                                                  |
| Automation                        | `.github/workflows/ci.yml` and the central conformance caller                                                                                                                             |
