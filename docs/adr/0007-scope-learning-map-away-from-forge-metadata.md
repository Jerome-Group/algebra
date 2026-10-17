# Scope the learning map away from forge metadata

Status: accepted.

Keep `.github/` outside the generated learning-map source hashes. Application,
content, dependency and verification source hashes remain checked. Repository
automation is proved by the workflows and conformance checks that execute on the
proposed revision.

A pin-only Dependabot update previously made `feature-map-current` fail before
its updated action could complete the production artifact and browser pipeline.
Regenerating the map automatically in CI would also hide stale product inventory.
Excluding forge metadata gives the learning inventory its own change boundary
without weakening the required engineering or browser jobs.

The map does not attest to workflow contents. Review action pins against upstream
commits and inspect the resulting pipeline evidence when landing updates.
