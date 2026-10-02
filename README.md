# Abstract Algebra

An interactive learning site for students exploring groups, rings, fields, and representations.

Live site: [Abstract Algebra](https://algebra.jeromegroup.org)

## Status

Concept-based teaching application imported from ChatGPT Sites; build and tests are checked in CI.
The interface pairs mathematical chapters and progressive notes with visual laboratories.
See [source coverage](docs/source-coverage.md) for the complete 17-section group-to-character reading route.
Course documents are excluded; access-controlled notes links are retained.

## Local development

Use Node.js 24 or newer, then:

```sh
npm ci
npx vite
```

Build and run the existing checks on macOS or Linux:

```sh
npm run format:check
npm run lint
npm run build
node --test tests/*.test.mjs
```

The ordinary build is portable. Retained `scripts/build-verified.sh` and
`scripts/install-ci.sh` provide the older managed Linux workflow.

Agent entry point (JSON results, failures exit 1):

```sh
npm run agent -- help
npm run agent -- list --query symmetry
npm run agent -- lesson mh2220-dihedral
npm run agent -- prerequisites representations-maschke
npm run agent -- map --write
npm run agent -- verify --layer all --evidence outputs/release-verification.json
npm run agent -- verify --layer browser --built --shard 1/2 --evidence outputs/browser-1.json
```

The generated `lib/algebra/feature-map.json` inventories every lesson, route, prerequisite,
laboratory and verification obligation. Regenerate it after source changes; CI rejects drift.
`inspect <lesson-id> --url <origin>` observes an isolated browser with exact accessible-label
actions; `help` describes prerequisites and read/write effects. Install its browser once with
`npx playwright install chromium`. `ALGEBRA_TEST_ORIGIN` runs browser checks against a matching
built application or production; default browser checks start local Vite. Verification artifacts
are written under ignored `outputs/`. Passing automation and independent mathematics review
are separate release gates. `--shard i/n` accepts positive safe integers with `i <= n`,
only for `--layer browser`; a passing shard provides partial coverage. CI builds once,
then runs both browser shards against that uploaded production artifact. Its required
`checks` status passes only when engineering and every browser shard succeed.
See `docs/overhaul-plan.json` and `docs/research/`.

The retained `scripts/install-ci.sh` and `scripts/build-verified.sh` wrappers target the Linux Sites environment.
The commands above work directly on the MacBook Pro. See `MAP.md` for the source layout.

## Source and rights

Imported from the existing ChatGPT Sites source at `95215a69eeff93af7533f63d09459b2e6c3bb49c`. This GitHub repository was generated
from `Jerome-Group/public-template`; it contains a source snapshot, not the Sites development history.
Existing `.openai/hosting.json` identifies the original Site. GitHub pushes do not automatically
publish a new Sites version.

Owned source and documentation are MIT licensed. Dependencies and vendored assets retain their
own licences and notices. Course PDFs and other course files are excluded and ignored. References
to access-controlled notes remain; access is governed by the Owner's Drive sharing permissions.
Credentials, private notes, and student data must never be committed.

The import applies Prettier formatting and records pre-existing ESLint findings in
`eslint-suppressions.json`; see ADR-0003. New lint errors remain gated.
