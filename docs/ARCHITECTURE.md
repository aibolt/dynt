# Architecture

## Package boundary

DYNT keeps visual construction and physical response independent.

### `@dynt/formation`

Owns geometry and visual lifecycle:

- locate
- construct
- enclose
- reveal
- withdraw
- deconstruct

It must run without `@dynt/kinetic`.

### `@dynt/kinetic`

Owns physical response:

- tilt and drift
- square, connected hexagon, circle, and interlocked diamond geometry
- click- and impact-driven circular turbulent wave flow
- local impact
- content coupling

It must run without `@dynt/formation`.

## Integration contract

Both engines use the browser DOM as their shared platform contract. A developer initializes an engine once with selectors and configuration; DYNT enhances matching existing and future elements without requiring component-by-component edits.

Framework adapters only manage mounting and cleanup. They do not duplicate formation or kinetic behavior.

Formation can own one accessibility-hidden fixed viewport layer for transient flow lines, draw four complete permanent rails with host pseudo-elements, or own one responsive SVG perimeter for Arc Trace. The controller stages and reverses geometry through one lifecycle; application elements are never replaced. Kinetic owns one accessibility-hidden canvas layer on compatible surfaces. Pointer movement changes the bounded plate tilt without drawing cells. Clicks and impacts create circular, turbulence-distorted cell fronts. On shared formed surfaces, Formation geometry and the Kinetic canvas use the same plate transform while Line Forge corner extensions reproduce near-corner compression and far-corner expansion. Bounded semantic reactors consume optional content drift and distance-timed wave motion without taking ownership of the host transform or leaking into nested managed surfaces.

## Rules

- No React, Vue, Svelte, or application dependency inside the engine packages.
- No automatic global takeover without an explicit root and selector configuration.
- Every enhancement must be removable without replacing the original element.
- Formation and Kinetic may coordinate when both are installed, but neither may require the other.
- Reduced-motion and keyboard behavior are part of the public contract.
