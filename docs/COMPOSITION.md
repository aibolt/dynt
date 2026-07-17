# Combined operation

Formation and Kinetic coordinate through DOM state while remaining independently installable. Neither package imports the other.

## Protocol

Formation owns `data-dynt-formation-phase` and emits the bubbling `dynt:formation-phase` event whenever a managed element changes phase. Kinetic allows input when no Formation phase is present or the nearest formed ancestor is in the `formed` phase.

Kinetic immediately returns an owned surface to rest during locating, construction, reveal, withdrawal, or deconstruction. When the surface reaches `formed`, normal pointer input resumes. This rule applies regardless of initialization order.

Formation geometry stays on host pseudo-elements at layer 1. Kinetic renders inside its accessibility-hidden canvas layer at layer 0. Both renderers consume the same pointer, tilt, and drift channels, so four-rail overflow and the cell plate remain visually attached while the application's host transform remains untouched.

## Cleanup

Each engine removes only its own classes, attributes, event listeners, observers, frames, properties, and decoration. Destroying Formation first leaves Kinetic functional. Destroying Kinetic first leaves Formation functional. The final cleanup restores the application-owned element state.

## Example

```ts
const formation = createFormation({ root, selector, observe: true });
const kinetic = createKinetic({ root, selector, observe: true });

formation.form();

kinetic.destroy();
formation.destroy();
```
