---
name: verify
description: Drive Abstract Algebra's web UI and agent CLI against an owned Worker, verify a mapped feature, and retain browser and command evidence. Use before shipping behavior or maintaining its feature map.
---

# Verify Abstract Algebra

Run from the repository root. Read only the relevant [feature file](features/README.md).
`scripts/algebra-features.mjs` binds five journey groups to source and browser checks;
`lib/algebra/feature-map.json` inventories the catalogue. Neither inventory proves behavior.

## Launch

Use Node 24+, `npm ci`, and `npx playwright install chromium` on a fresh checkout.
Build once, then launch an exclusive production Worker. Choose another unused port if 5180
is occupied. Launch refuses to adopt an existing listener.

```sh
mkdir -p outputs
ALGEBRA_PROOF=$(mktemp -d "$PWD/outputs/verify-XXXXXX")
npm run build > "$ALGEBRA_PROOF/build.log" 2>&1
node scripts/algebra.mjs launch --built --port 5180 --evidence "$ALGEBRA_PROOF/launch.json" > "$ALGEBRA_PROOF/launch.stdout.json"
ALGEBRA_OWNER=$(node -e 'process.stdout.write(require(process.argv[1]).result.ownerFile)' "$ALGEBRA_PROOF/launch.json")
```

Read `ok`, `result.origin`, `result.ownerFile`, and `result.runDir` from the result.
Keep this owner marker for the whole pass. A fresh run gets separate runtime state and logs.
For a built Worker, launch applies the additive D1 migration to that run's empty persistence
directory before starting. It enables synthetic identity fixtures only for its owned loopback
server. Hosted ChatGPT sign-in is a separate boundary. Launch failure still requires cleanup
of any owner it returned.

## Doctor

```sh
node scripts/algebra.mjs doctor --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/doctor.json" > "$ALGEBRA_PROOF/doctor.stdout.json"
```

Require `ok: true`. Doctor checks runtime prerequisites, ownership and observed build identity.
A source digest matches only when the responding Worker reports the compiled digest.
Run doctor before the first drive and after surprises. A healthy process cannot diagnose a
wedged UI; open a fresh browser context or relaunch before retrying that state.

## Drive

```sh
node scripts/algebra.mjs verify --layer browser --feature discovery --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/discovery.json" > "$ALGEBRA_PROOF/discovery.stdout.json"
```

Use the group's exact command and expected outcomes in its feature file. Drive groups serially
on this instance; each journey gets an isolated browser context. For a targeted control, use
`inspect <lesson-id> --owner "$ALGEBRA_OWNER"`. Discover its controls first, then pass exact
accessible labels using `--actions`. `help --command inspect` gives the full action schema.

Use `help` for compact discovery and `help --command NAME` for one exact schema. Unknown flags,
bad IDs and malformed action shapes fail before effects. Runtime UI rejection can follow navigation
or earlier actions in the disposable context. `--feature` and `--shard` are partial coverage.
For a release, run the [full release](#full-release) pass after cleanup. A feature pass does
not replace it. External `--url` targets require separate authorization for personal writes.

## Evidence

Require a successful JSON envelope and each executed check's status. Keep the result, referenced
`logPath` files, screenshots, traces and attachments under `outputs/`. Successful command output
stays in files; read a failing tail before opening a full log.

Prove actions and resulting state through the real controls. Check persisted effects alongside
visible feedback. Internal setters, mocked responses and an inventory are insufficient proof.
Keep synthetic local identities separate from hosted provider-login evidence. Inspect screenshots
when layout changes; accessibility automation cannot establish visual quality or mathematical
correctness. Record unreachable prerequisites and failed attempts rather than weakening a journey.

## Cleanup

```sh
node scripts/algebra.mjs stop --owner "$ALGEBRA_OWNER" --evidence "$ALGEBRA_PROOF/stop.json" > "$ALGEBRA_PROOF/stop.stdout.json"
test -s "$ALGEBRA_PROOF/doctor.json"
test -s "$ALGEBRA_PROOF/discovery.json"
```

Run cleanup after failed iterations too. Stop validates the marker's process identity; never kill
by process name or remove another run's state. Confirm `ok: true`, the recorded origin no longer
answers, and every result and referenced artifact still exists. Retain proof and failed attempts.

## Full release

Complete cleanup of the manually launched pass first. Unset `ALGEBRA_LOCAL_OWNER` and
`ALGEBRA_TEST_ORIGIN` before the full pass.

```sh
mkdir -p outputs
ALGEBRA_RELEASE_PROOF=$(mktemp -d "$PWD/outputs/release-XXXXXX")
unset ALGEBRA_LOCAL_OWNER ALGEBRA_TEST_ORIGIN
node scripts/algebra.mjs verify --layer all --port 5180 --evidence "$ALGEBRA_RELEASE_PROOF/release.json" > "$ALGEBRA_RELEASE_PROOF/release.stdout.json"
```

Choose another unused port if needed. Full verification builds, launches its own production
Worker, runs all gates, then stops that Worker. It rejects `--owner`, `--url`,
`ALGEBRA_LOCAL_OWNER` and `ALGEBRA_TEST_ORIGIN` before build or evidence effects. Use
`--layer browser` for an existing target. Require `ok: true` and retained evidence for every gate.

## Helpers

The existing `node scripts/algebra.mjs` is the only helper. Its launch, doctor, verify, inspect
and stop commands are shown above. Do not add a second server lifecycle. Maintain this directory
with the installed `pstack:maintain-verification-skill` after user-facing changes.
