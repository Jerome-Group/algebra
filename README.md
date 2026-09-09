# Abstract Algebra

An interactive learning site for students exploring groups, rings, fields, and representations.

Live site: https://algebra.jeromegroup.org

## Status

Existing teaching application imported from ChatGPT Sites; build and tests are checked in CI.
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
npx vinext build
node --test tests/*.test.mjs
```

The retained `install:ci` and `build` wrappers target the Linux Sites environment.
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
