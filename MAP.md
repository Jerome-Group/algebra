# Map

Abstract Algebra: an interactive mathematics learning site.

Start here: `README.md`, then `AGENTS.md`.

| Area                              | Entry point                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Learning experience               | `app/page.tsx` and the subject views in `components/`                                            |
| Mathematics                       | `lib/` for calculations and lesson data                                                          |
| Validation                        | `package.json` for commands, `tests/` for behavior, `eslint-suppressions.json` for recorded debt |
| Runtime and deployment            | `worker/index.ts`, `vite.config.ts`, `.openai/hosting.json`                                      |
| Working conventions and decisions | `AGENTS.md`, `CODING_STANDARDS.md`, `CONTEXT.md`, `docs/adr/`                                    |
| Automation                        | `.github/workflows/ci.yml` and the central conformance caller                                    |
