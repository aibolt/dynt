# Roadmap

This checklist tracks delivery status. See the [full implementation plan](IMPLEMENTATION_PLAN.md) for architecture, contracts, gates, testing, framework support, and the immediate work queue.

## Phase 0 — Foundation

- [x] Create a clean repository.
- [x] Define independent Formation and Kinetic package boundaries.
- [x] Define framework-independent DOM enhancement as the base integration model.
- [x] Adopt the MIT public license.
- [x] Establish build, test, package, browser, and release automation.

## Phase 1 — Formation minimum viable engine

- [x] Implement the first `@dynt/formation` Line Push slice.
- [x] Enhance existing elements through root and selector configuration.
- [x] Support existing and dynamically inserted elements.
- [x] Respect ignored subtrees and custom exclusion selectors.
- [x] Reconcile and restore elements that leave the managed target set.
- [x] Keep repeated and nested controller ownership idempotent.
- [x] Return a controller with refresh and destroy operations.
- [x] Define deterministic Formation lifecycle phases and transitions.
- [x] Expose reversible Line Push form and withdraw commands.
- [x] Respect reduced-motion preferences in lifecycle commands.
- [x] Preserve original element semantics and focus behavior.
- [x] Verify construction and reverse deconstruction.

## Phase 2 — Formation system

- [x] Add the profile registry and lifecycle contract.
- [x] Add layered controller, selector-group, and local configuration overrides.
- [x] Add responsive geometry and reduced-motion behavior.
- [x] Add an additional formation after Line Push passes its contract tests.

## Phase 2.5 — Formation hardening

- [x] Add browser coverage for Chromium, Firefox, and WebKit.
- [x] Add lifecycle visual regression checkpoints.
- [x] Record accessibility and performance evidence.

## Phase 3 — Kinetic minimum viable engine

- [x] Implement the independent `@dynt/kinetic` DOM ownership package.
- [x] Add bounded pointer pressure and tilt.
- [x] Add cleanup, ownership, and reduced-motion behavior.
- [x] Verify that Kinetic works on plain HTML without Formation.

## Phase 4 — Combined operation

- [x] Define the optional DOM coordination contract.
- [x] Preserve local ownership across nested surfaces.
- [x] Add waves and impacts without changing Formation geometry.
- [x] Verify Formation-only, Kinetic-only, and combined installations.

## Phase 4.5 — Advanced Kinetic effects

- [x] Add drift, local field, wave, impact, and content channels behind independent configuration.
- [x] Add rendering caps, idle suspension, and performance benchmarks.
- [x] Verify nested ownership and effect cleanup.

## Phase 5 — Framework support

- [x] Add thin, independent React adapter entry points.
- [x] Add independent Web Component helper entry points.
- [ ] Add adapters for other frameworks based on demand.
- [x] Keep all behavior inside the framework-independent engines.

## Phase 5.5 — Release engineering

- [x] Add continuous-integration checks for code, browsers, packages, and audit.
- [x] Add reproducible package builds and provenance-ready publishing.
- [x] Add versioning, release notes, and rollback procedures.

## Phase 6 — Public release

- [ ] Publish versioned packages.
- [x] Add migration, API, and integration documentation.
- [x] Add examples for existing HTML and supported frameworks.
- [x] Document reviewed outside-contribution and maintainer merge policies.

## External release operations

- [ ] Configure owner access to the `@dynt` npm organization.
- [ ] Configure the protected GitHub `npm` environment and npm trusted publishers.
- [ ] Publish the `v0.5.0` tag after the preview candidate is merged.
