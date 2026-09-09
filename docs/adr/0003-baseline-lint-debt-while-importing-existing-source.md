# Baseline lint debt while importing existing source

The import preserves an existing teaching application. Its build and behavior tests pass, but
its original lint configuration reports existing TypeScript and React findings. Resolving those
through application refactoring would enlarge a repository-provisioning change.

Use ESLint's checked-in bulk suppression file to record the existing error counts by file and
rule. CI runs ESLint normally: new violations above that recorded baseline fail, and unused
suppressions must be removed when debt is fixed. A count-based baseline cannot distinguish a
replacement violation of the same rule in the same file; review must guard that limitation.
Do not regenerate the baseline as part of routine linting or CI.

Prettier formats the owned source without changing application behavior. Registry UI and
vendored assets keep their original formatting and licences. CI checks formatting, lint,
build, and the existing tests in the required check within a ten-minute timeout.
