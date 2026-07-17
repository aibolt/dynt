# Performance budgets

DYNT's preview budgets are executable contract tests, not informal targets.

## DOM operations

Formation and Kinetic each test initialization, no-change refresh, and cleanup with 500 managed surfaces. Every operation must finish within 1000 milliseconds in the test environment. This generous cross-machine ceiling is intended to catch major regressions while the implementation remains portable across development and hosted continuous-integration machines.

## Kinetic rendering

Kinetic enforces these defaults:

- At most 250 managed surfaces per controller.
- At most 24 simultaneous active reactions per controller.
- One animation-frame scheduler per controller, created only while work is active.
- A new reaction on a surface replaces that surface's current wave or impact state.
- Pointer drift stops when the pointer leaves the owned surface.
- Reduced motion schedules no animation frames.

Applications can set `limits.maxSurfaces` from 1 to 10000 and `limits.maxActive` from 1 to 1000. Hitting the surface cap selects the first targets in DOM order. Hitting the active cap returns the oldest active reaction to rest before admitting the new reaction.

The pressure field uses a CSS grid rather than allocating canvas cells, so it has no device-pixel-ratio buffer or retained cell objects. `--dynt-cell-size` changes its visual density without changing engine state size.

## Idle contract

Formation uses event-driven CSS transitions and retains no animation loop. Kinetic removes a surface from scheduling after its pressure, tilt, drift, wave, and impact channels reach rest. Pausing or destroying a controller cancels the pending frame and clears its active set.
