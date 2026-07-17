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

- pointer pressure
- tilt and drift
- traveling waves
- local impact
- content coupling

It must run without `@dynt/formation`.

## Integration contract

Both engines use the browser DOM as their shared platform contract. A developer initializes an engine once with selectors and configuration; DYNT enhances matching existing and future elements without requiring component-by-component edits.

Framework adapters only manage mounting and cleanup. They do not duplicate formation or kinetic behavior.

## Rules

- No React, Vue, Svelte, or application dependency inside the engine packages.
- No automatic global takeover without an explicit root and selector configuration.
- Every enhancement must be removable without replacing the original element.
- Formation and Kinetic may coordinate when both are installed, but neither may require the other.
- Reduced-motion and keyboard behavior are part of the public contract.
