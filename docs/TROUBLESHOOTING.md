# Troubleshooting

## Nothing is enhanced

Confirm that `root` is a `Document`, `DocumentFragment`, `ShadowRoot`, or HTML element; the selector is non-empty; and the target is inside that boundary. DYNT skips non-HTML matches. A matching root is included unless it or an ancestor within the boundary matches `data-dynt-ignore` or the configured `exclude` selector.

For DOM inserted later, set `observe: true` or call `refresh()` after the application update.

## A shadow tree is not enhanced

DYNT does not cross shadow boundaries. Initialize a controller with that `ShadowRoot` as its explicit root. Destroy that controller when the shadow host is permanently removed.

## Kinetic does not move

Check `controller.paused`, the enabled `effects`, the target's dimensions, and the operating system's reduced-motion preference. In combined operation, Kinetic intentionally rests while the target or a Formation-managed ancestor is not in the `formed` phase.

`maxSurfaces` selects the first matching surfaces in DOM order. A target beyond that cap is not managed until the selector set or limit changes.

## Lines or fields are not visible

Import the matching stylesheet:

```ts
import "@dynt/formation/styles.css";
import "@dynt/kinetic/styles.css";
```

Then inspect inherited `--dynt-line-color`, `--dynt-line-width`, `--dynt-kinetic-color`, and `--dynt-cell-size`. A host with unusual stacking or clipping may require application-specific layout styling; do not move DYNT's owned layer manually.

## A controller rejects a target

`form()`, `withdraw()`, and `impact()` accept only targets currently managed by that controller. Call `refresh()` after a selector or DOM change, and use `controller.elements` to confirm ownership. On shared Kinetic surfaces, only the most specific active root owner may trigger an impact.

## Cleanup appears incomplete

Repeated and nested controllers share ownership. The element is restored only after the final controller releases it. Destroy every controller created for the application boundary. Do not manually remove engine markers or decoration layers while a controller is active.

## An application transform is affected

Kinetic leaves the host element's `transform` application-owned. Its own layer and any shared Formation rails use matching engine-owned plate transforms. With `effects.content: true`, it applies the individual CSS `translate` property only to locally owned semantic reactors, preserving each reactor's existing `transform`. Add `data-dynt-reactor` to select a custom content group, or disable `effects.content` when the application wants to own all interior motion.
