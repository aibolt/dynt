# API reference

DYNT exposes browser-native engine APIs. The React and Web Component packages call these APIs; they do not contain engine behavior.

## Formation

```ts
import {
  createFormation,
  createFormationProfileRegistry,
} from "@dynt/formation";
import "@dynt/formation/styles.css";
```

### `createFormation(options)`

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `root` | `Document \| DocumentFragment \| HTMLElement` | Required | Explicit enhancement boundary. Pass a `ShadowRoot` directly to manage that shadow tree. |
| `selector` | `string` | Required | Targets inside the root, including the root itself when it matches. |
| `exclude` | `string` | None | Additional subtree exclusion selector. `[data-dynt-ignore]` is always excluded. |
| `profile` | `FormationProfile \| custom name` | `"line-push"` | Formation profile. |
| `profiles` | `FormationProfileRegistry` | Built-in registry | Registry used to resolve `profile`. |
| `observe` | `boolean` | `false` | Reconcile matching DOM additions, removals, and relevant attribute changes. |
| `viewportFlow` | `boolean \| FormationViewportFlow` | `false` | Send transient lines from the viewport boundaries before staging target rail construction. |
| `tokens` | `FormationTokens` | Profile CSS defaults | Controller-level token layer. |
| `groups` | `FormationSelectorGroup[]` | `[]` | Ordered selector-specific token layers. |

`FormationTokens` accepts `duration`, `easing`, `fillColor`, `lineColor`, `lineStyle`, `lineWidth`, `overflow`, and `radius`. Line style is `solid`, `dashed`, `dotted`, or `double`; overflow is `0` to `64` pixels. Equivalent local attributes are `data-dynt-formation-duration`, `data-dynt-formation-easing`, `data-dynt-fill-color`, `data-dynt-line-color`, `data-dynt-line-style`, `data-dynt-line-width`, `data-dynt-formation-overflow`, and `data-dynt-formation-radius`. Each profile accepts only the tokens appropriate to its geometry.

Configuration precedence is profile CSS, controller tokens, matching groups in array order, then local data attributes.

`viewportFlow: true` uses a `1160ms` travel duration, `110ms` target stagger, `680px` maximum line length, and `36px` overrun. An object can override `enabled`, `duration`, `stagger`, `lineLength`, and `overrun`. Duration accepts `120` to `4000` milliseconds, stagger `0` to `1000` milliseconds, line length `80` to `1200` pixels, and overrun `0` to `160` pixels. Target delays are bounded to an 1800ms sequence window. `withdraw()` reverses the transient line travel and target order before the permanent rails deconstruct.

### Formation controller

| Member | Behavior |
| --- | --- |
| `elements` | New read-only snapshot of currently managed elements. |
| `profile` | Selected profile name. |
| `form(target?)` | Form one managed target or every managed target. |
| `withdraw(target?)` | Reverse one managed target or every managed target. |
| `subscribe(listener)` | Receive `{ element, previousPhase, phase }`; returns an unsubscribe function. |
| `update({ tokens?, groups?, viewportFlow? })` | Replace the supplied configuration or future viewport-flow behavior without replacing targets. |
| `refresh()` | Reconcile current matches and return the number newly enhanced. |
| `destroy()` | Disconnect, cancel pending initialization, and restore Formation-owned DOM state. Idempotent. |

Phases are `unformed`, `locating`, `constructing`, `enclosed`, `revealing`, `formed`, `withdrawing`, and `deconstructing`. Each phase change also emits the bubbling and composed `dynt:formation-phase` event. Its `detail` matches the subscription payload.

### Built-in profiles

- `line-push` forges horizontal rails before vertical rails.
- `arc-trace` draws one continuous rounded perimeter and leaves paired entry/exit registers on opposite edges.
- `line-rise` forges vertical rails before horizontal rails.
- `squircle-sweep` draws a continuous superellipse and opposing registration marks.
- `chamfer-fold` closes clipped edges from staged segments.
- `magnetic-segment` pulls opposing edge segments toward four meeting points.
- `radial-compass` locates the center before enclosing it with a rounded frame and cardinal marks.
- `aperture-iris` locates the center, then closes four curved edge sections.
- `elastic-membrane` stretches opposing curves into a bounded membrane frame.

Line Push and Line Rise use four complete Line Forge rails with optional viewport travel and directional edge overflow. Arc Trace uses an engine-owned SVG perimeter with a `620ms` default trace, a proportionally shorter reverse, an `18px` default radius, no viewport travel, and no overflow. The six constructed profiles use responsive SVG path sets and support viewport travel. Every built-in uses the same lifecycle, coordinated Kinetic plate tilt, reverse choreography, reduced-motion behavior, and cleanup contract.

`createFormationProfileRegistry(definitions)` creates an immutable, typed registry. Each definition declares a unique name, a `dynt-formation--` class, edge order, supported tokens, transition completion hooks, rendering mode, and capability metadata. A custom profile supplies its own scoped CSS for that class.

## Kinetic

```ts
import { createKinetic } from "@dynt/kinetic";
import "@dynt/kinetic/styles.css";
```

### `createKinetic(options)`

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `root` | `Document \| DocumentFragment \| HTMLElement` | Required | Explicit input and enhancement boundary. Pass a `ShadowRoot` directly for a shadow tree. |
| `selector` | `string` | Required | Managed surfaces inside the root. |
| `exclude` | `string` | None | Additional subtree exclusion selector. `[data-dynt-ignore]` is always excluded. |
| `observe` | `boolean` | `false` | Reconcile dynamic matches. |
| `cells` | `KineticCells` | See below | Geometry tree and color source. |
| `effects` | `KineticEffects` | See below | Independent effect switches. |
| `flow` | `KineticFlow` | See below | Circular turbulent wave behavior and budget. |
| `motion` | `KineticMotion` | See below | Bounded motion settings. |
| `groups` | `KineticGroup[]` | `[]` | Ordered selector-specific cells, effects, flow, and motion layers. |
| `limits` | `KineticLimits` | See below | Rendering budgets. |

Effect defaults are `tilt: true`, `content: false`, `drift: false`, and `wave: false`.

| Motion option | Default | Valid range |
| --- | --- | --- |
| `contentLift` | `8` pixels | `0` to `24` |
| `contentTravel` | `3` pixels | `0` to `20` |
| `maxTilt` | `1.35` degrees | `0` to `30` |
| `response` | `0.18` | Greater than `0` through `1` |
| `drift` | `1.5` pixels | `0` to `4` |
| `waveDuration` | `480` milliseconds | `100` to `2000` |

`limits.maxSurfaces` defaults to `250` and accepts integer values from `1` to `10000`. `limits.maxActive` defaults to `24` and accepts integer values from `1` to `1000`.

`cells.shape` accepts `square`, `hexagon`, `circle`, or `diamond`. `cells.size` accepts `8` to `120` pixels or a three-level size tree; the default is `[40, 32, 24]`. `cells.colorMode` accepts `single`, `bands`, or `gradient`, with one to eight values in `cells.colors`. Gap is `0` to `8` pixels and is automatically removed for connected hexagon and diamond lattices.

The canvas stays clear during pointer movement. Clicks and `impact()` start a circular front whose distance timing is distorted by coherent turbulence. Wave flow exposes `speed`, `thickness`, `recovery`, `intensity`, `turbulence`, `turbulenceScale`, `growth`, `overflow`, `seed`, `seedLocked`, `multi`, `maxWaves`, and `maxCells`. Defaults use a size- and travel-aware 14-pixel terminal-overflow ceiling and a 420-cell budget.

Configuration begins with root-level `cells`, `effects`, `flow`, and `motion`, then applies every matching `groups` entry in array order. Target-local `data-dynt-cell-shape`, `data-dynt-cell-size`, `--dynt-cell-size`, and `--dynt-kinetic-color` values have final priority for the channels they control. Nested managed surfaces own their input and wave state independently; the deepest matching surface receives the event.

The immutable `kineticPresets` collection provides six starting configurations: `structural`, `locator`, `laminar`, `material`, `tidal`, and `impact`. Spread a preset before root-specific values, then use groups for local variation.

### Kinetic controller

| Member | Behavior |
| --- | --- |
| `elements` | New read-only snapshot of managed surfaces. |
| `paused` | Current input suspension state. |
| `pause()` | Stop input, cancel scheduled work, and return surfaces to rest. |
| `resume()` | Resume input without rebuilding surfaces. |
| `impact(target, input?)` | Trigger one bounded response on the active managed owner. |
| `update({ cells?, effects?, flow?, groups?, motion?, limits? })` | Merge supplied root settings, replace supplied groups, rest surfaces, and reconcile limits. |
| `refresh()` | Reconcile current matches and return the number newly enhanced. |
| `destroy()` | Remove owned listeners, observers, frames, timers, layers, markers, and styles. Idempotent. |

Impact input accepts `pressure` from `0` to `1` as wave-strength input and normalized `x` and `y` coordinates from `-1` to `1` as the impact origin.

### CSS channels

Kinetic writes these engine-owned custom properties on a managed host: `--dynt-pointer-x`, `--dynt-pointer-y`, `--dynt-tilt-x`, `--dynt-tilt-y`, `--dynt-shadow-x`, `--dynt-shadow-y`, `--dynt-tl-overflow`, `--dynt-tr-overflow`, `--dynt-bl-overflow`, `--dynt-br-overflow`, `--dynt-drift-x`, `--dynt-drift-y`, `--dynt-content-x`, `--dynt-content-y`, `--dynt-wave-x`, `--dynt-wave-y`, `--dynt-wave-scale`, and `--dynt-wave-opacity`.

Applications can set `--dynt-cell-size` and `--dynt-kinetic-color`, or use `data-dynt-cell-shape` and `data-dynt-cell-size` for target-local geometry. Tilt moves the engine-owned cell plate and any shared Formation rails together, with near-side compression, far-side expansion, and an opposing shadow. When `effects.content` is enabled, Kinetic also identifies up to 48 semantic content groups per surface and moves them through the individual CSS `translate` property. The host transform and nested managed surfaces stay untouched. Mark a custom group with `data-dynt-reactor` when its markup has no semantic candidate. A wave applies a distance-timed lift, rebound, and settle sequence to the same locally owned reactors.

## Coordination

The engines do not import one another. Kinetic reads Formation's phase marker and listens for `dynt:formation-phase`. It returns a surface to rest while the surface or a managed ancestor is not `formed`, then accepts input again after formation completes.

## React

```tsx
import { useFormation } from "@dynt/react/formation";
import { useKinetic } from "@dynt/react/kinetic";
```

`useFormation()` and `useKinetic()` accept the corresponding engine options with `root` replaced by `rootRef`. Each returns a ref containing the controller after mount. Hooks destroy the controller before unmount or dependency replacement and perform no DOM work during server rendering. The engine packages are optional peers, so install only the entry point's engine.

## Web Components

```ts
import { defineFormationElement } from "@dynt/web-components/formation";
import { defineKineticElement } from "@dynt/web-components/kinetic";
```

`defineFormationElement(tagName, options)` and `defineKineticElement(tagName, options)` define a custom application boundary. The element creates its controller when connected, destroys it when disconnected, and can reconnect safely. A tag name must contain a hyphen. Calling the helper for an existing name returns its current constructor.

## Errors and cleanup

Invalid roots, selectors, profiles, configuration keys, ranges, targets, and effect values throw `TypeError` before partial mutation. Non-HTML selector matches are skipped. Repeated or nested controllers share internal ownership, and the final owner restores the exact application classes, attributes, inline custom properties, and priorities that existed before DYNT.
