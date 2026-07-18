# Changelog

All notable changes are recorded here. DYNT follows semantic versioning while the `0.x` line may still refine public APIs between minor releases.

## 0.5.1 - 2026-07-19

### Fixed

- Constructed Formation profiles now settle from their animated dash paths into clean, continuous resting geometry instead of retaining broken-looking construction segments.

### Migration

No API changes are required.

## 0.5.0 - 2026-07-18

### Added

- Independent Formation engine with dynamic DOM reconciliation, exclusions, shared ownership, exact cleanup, reversible lifecycle commands, reduced motion, nine built-in profiles, typed profile registries, responsive SVG construction, layered tokens, subscriptions, and DOM phase events.
- Independent Kinetic engine with delegated pointer input, bounded directional tilt, drift, circular turbulent waves, impacts, content channels, ordered selector groups, six immutable presets, reduced motion, rendering caps, idle suspension, and exact cleanup.
- Optional DOM coordination that keeps Kinetic at rest during unsafe Formation phases without package imports.
- Independent React hooks and Web Component helpers for both engines, including server-rendering and reconnect safety.
- Plain-HTML Formation, Kinetic, combined, and plain DOM/React/Web Component parity examples.
- Unit, DOM, composition, performance, packed-consumer, accessibility, responsive, visual, and Chromium/Firefox/WebKit verification.
- MIT licensing, public package metadata, CI, and an owner-controlled release workflow with npm provenance support.

### Migration

This is the first public-preview release; there is no earlier DYNT package version to migrate from.
