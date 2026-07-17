# DYNT

DYNT is a framework-agnostic interface engine for constructing UI formations and adding physical, kinetic responses to existing applications.

The project is being developed as two independent packages:

- `@dynt/formation` — line-led construction, enclosure, reveal, and reversible deconstruction.
- `@dynt/kinetic` — pointer pressure, tilt, drift, waves, impact, and content response.

Applications will be able to install either package independently or combine both. The engines will operate on ordinary DOM elements, while small adapters will provide first-class integration for popular frameworks.

## Status

DYNT is in foundation development and is being built incrementally around a stable public API.

## Development order

1. Establish package boundaries and public contracts.
2. Build one framework-independent Line Push formation for existing HTML.
3. Add lifecycle, cleanup, dynamic-DOM observation, and accessibility behavior.
4. Build the independent Kinetic engine.
5. Add React and other framework adapters without coupling the engines to a framework.

See [the architecture](docs/ARCHITECTURE.md) and [the roadmap](docs/ROADMAP.md).
