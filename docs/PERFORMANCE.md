# Performance budgets

DYNT's preview budgets are executable contract tests, not informal targets.

## DOM operations

Formation and Kinetic each test initialization, no-change refresh, and cleanup with 500 managed surfaces. Every Formation operation must finish within 1000 milliseconds, and every Kinetic operation within 2000 milliseconds, in the test environment. These generous cross-machine ceilings are intended to catch major regressions while the implementation remains portable across development and hosted continuous-integration machines.

## Kinetic rendering

Kinetic enforces these defaults:

- At most 250 managed surfaces per controller.
- At most 24 simultaneous active reactions per controller.
- One animation-frame scheduler per controller, created only while work is active.
- Circular wave flow renders at most 420 cells by default.
- Canvas backing resolution is capped at `1.5x` device pixel ratio.
- A new reaction on a surface replaces that surface's current flow by default; multi-wave mode is explicitly bounded from one to eight waves.
- Pointer drift stops when the pointer leaves the owned surface.
- Reduced motion schedules no animation frames.

Applications can set `limits.maxSurfaces` from 1 to 10000 and `limits.maxActive` from 1 to 1000. Hitting the surface cap selects the first targets in DOM order. Hitting the active cap returns the oldest active reaction to rest before admitting the new reaction.

Canvas geometry is generated only for an active click or programmatic wave; pointer movement alone leaves it clear. Square and circle cells retain a configurable gap; hexagon and diamond cells use connected staggered lattices. The wave budget is enforced after radial and turbulence filtering, and the canvas is cleared when the surface reaches rest.

## Idle contract

Formation uses event-driven CSS transitions and retains no animation loop. Its optional viewport flow creates four CSS-animated strokes only while a target is being formed or withdrawn, bounds the full-set delay window to 1800 milliseconds, and removes every transient flight after completion. Arc Trace uses one SVG stroke and no viewport layer. A new command cancels conflicting pending flights before starting its direction. Kinetic removes a surface from scheduling after its tilt, drift, wave, and impact channels reach rest. Content response is capped at 48 semantic reactors per surface. Pausing or destroying a controller cancels pending frames, content animations, and its active set.
