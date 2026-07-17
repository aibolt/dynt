# `@dynt/formation`

Framework-independent, line-led construction and reversible formation lifecycle.

```bash
npm install @dynt/formation
```

Formation applies viewport-spanning flow lines and four-rail Line Forge construction through one root-level initializer. Line Push and Line Rise select different construction directions without changing the integration contract.

```ts
import { createFormation } from "@dynt/formation";
import "@dynt/formation/styles.css";

const formation = createFormation({
  root: document,
  selector: "main section, main button",
  exclude: ".third-party-widget",
  profile: "line-push",
  observe: true,
  viewportFlow: {
    duration: 1160,
    lineLength: 680,
    overrun: 36,
    stagger: 110,
  },
  tokens: {
    duration: 320,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    fillColor: "rgb(8 24 32 / 0.92)",
    lineColor: "#67e8f9",
    lineStyle: "solid",
    lineWidth: "1px",
    overflow: 14,
  },
  groups: [
    { selector: ".featured", tokens: { lineWidth: "2px" } },
  ],
});

formation.withdraw();
formation.form(document.querySelector("button"));
const unsubscribe = formation.subscribe(({ element, phase }) => {
  console.log(element, phase);
});
formation.refresh();
formation.update({ tokens: { duration: 200 }, viewportFlow: true });
unsubscribe();
formation.destroy();
```

The initializer only enhances matching elements inside the supplied root. Add `data-dynt-ignore` to any element to exclude that entire subtree. The optional `exclude` selector adds application-specific exclusions without disabling the built-in escape hatch.

The root must be a `Document`, `DocumentFragment`, or HTML element. Matches outside the HTML namespace are left unchanged, and an unknown profile is rejected before any target is mutated.

Set `observe: true` to enhance matching elements inserted later. Observed attribute and subtree changes also restore elements that leave the root, stop matching, or become excluded. Mutation records are batched into one refresh operation, and `destroy()` disconnects observation before restoring Formation-owned state.

Repeated and nested controllers share one internal ownership record per element. An element is enhanced once and its application-owned state is restored only after the final controller releases it.

## Profiles

Formation includes two independent Line Forge profiles. Both produce four complete rails, optional corner overflow, enclosure, fill/reveal, and reversible deconstruction:

- `line-push` constructs horizontal edges before vertical edges.
- `line-rise` constructs vertical edges before horizontal edges.

The typed `createFormationProfileRegistry()` API accepts additional profile definitions without changing the engine. A definition declares its scoped CSS class, edge geometry, supported tokens, transition completion hooks, rendering strategy, and reduced-motion and responsive capabilities. Pass the returned registry through `profiles` and select its profile by name.

Two controllers may share a target only when they use the same profile definition. Formation rejects conflicting profiles before changing that target.

## Configuration layers

Formation applies configuration in this order: profile CSS defaults, controller `tokens`, matching `groups` in array order, and local data attributes. Supported local overrides are `data-dynt-formation-duration`, `data-dynt-formation-easing`, `data-dynt-fill-color`, `data-dynt-line-color`, `data-dynt-line-style`, `data-dynt-line-width`, and `data-dynt-formation-overflow`. `update()` replaces supplied controller or group layers and reapplies them without replacing the managed elements.

Duration and overflow are expressed in milliseconds and pixels respectively. Colors, width, and easing accept non-empty CSS values. Line style accepts `solid`, `dashed`, `dotted`, or `double`. Destroying a controller restores the exact inline custom-property values and priorities that existed before Formation managed the target.

When Kinetic is also present, the four rails join its bounded plate transform. Corner overflow contracts near the pointer and expands at the far edge while the application-owned host transform remains untouched.

## Viewport flow

Set `viewportFlow: true` to use the default travelling-line choreography, or pass `{ duration, stagger, lineLength, overrun }`. Formation measures each target against its viewport, sends four transient lines from the window boundaries, begins the permanent rail construction as those lines strike the target, and staggers the same sequence across the managed set. `withdraw()` runs the target order and travelling lines in reverse before deconstructing each permanent frame. The effect is opt-in because it deliberately occupies the full viewport; it remains available through the plain DOM engine, React hook, and Web Component helper without component-level markup.

The viewport layer is outside application targets, uses `aria-hidden` and `pointer-events: none`, and is removed by `destroy()`. Reduced motion skips the travelling lines while preserving lifecycle events and the final formed state.

## Lifecycle contract

The Formation lifecycle contract uses explicit `unformed`, `locating`, `constructing`, `enclosed`, `revealing`, `formed`, `withdrawing`, and `deconstructing` phases. `form()` and `withdraw()` act on the full managed set or one managed element. Phase-driven CSS transitions let an opposing command reverse the active Line Push transition from its current visual position. When the operating system requests reduced motion, commands preserve the same lifecycle order and complete without waiting for transition events.

`subscribe()` reports every phase change with the element, previous phase, and current phase. Formation also emits the bubbling `dynt:formation-phase` DOM event with the same detail so independent packages can coordinate without importing one another.

See the repository [API reference](https://github.com/aibolt/dynt/blob/main/docs/API.md), [accessibility contract](https://github.com/aibolt/dynt/blob/main/docs/ACCESSIBILITY.md), and [browser example](https://github.com/aibolt/dynt/tree/main/examples/formation-browser).
