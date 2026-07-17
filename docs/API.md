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
| `profile` | `"line-push" \| "line-rise" \| custom name` | `"line-push"` | Formation profile. |
| `profiles` | `FormationProfileRegistry` | Built-in registry | Registry used to resolve `profile`. |
| `observe` | `boolean` | `false` | Reconcile matching DOM additions, removals, and relevant attribute changes. |
| `tokens` | `FormationTokens` | Profile CSS defaults | Controller-level token layer. |
| `groups` | `FormationSelectorGroup[]` | `[]` | Ordered selector-specific token layers. |

`FormationTokens` accepts `duration` in milliseconds, `lineColor` as a non-empty CSS color value, and `lineWidth` as a non-empty CSS width value. A target can override those values with `data-dynt-formation-duration`, `data-dynt-line-color`, and `data-dynt-line-width`.

Configuration precedence is profile CSS, controller tokens, matching groups in array order, then local data attributes.

### Formation controller

| Member | Behavior |
| --- | --- |
| `elements` | New read-only snapshot of currently managed elements. |
| `profile` | Selected profile name. |
| `form(target?)` | Form one managed target or every managed target. |
| `withdraw(target?)` | Reverse one managed target or every managed target. |
| `subscribe(listener)` | Receive `{ element, previousPhase, phase }`; returns an unsubscribe function. |
| `update({ tokens?, groups? })` | Replace the supplied configuration layers without replacing targets. |
| `refresh()` | Reconcile current matches and return the number newly enhanced. |
| `destroy()` | Disconnect, cancel pending initialization, and restore Formation-owned DOM state. Idempotent. |

Phases are `unformed`, `locating`, `constructing`, `enclosed`, `revealing`, `formed`, `withdrawing`, and `deconstructing`. Each phase change also emits the bubbling and composed `dynt:formation-phase` event. Its `detail` matches the subscription payload.

### Built-in profiles

- `line-push` forms horizontal edges before vertical edges.
- `line-rise` forms vertical edges before horizontal edges.

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
| `effects` | `KineticEffects` | See below | Independent effect switches. |
| `motion` | `KineticMotion` | See below | Bounded motion settings. |
| `limits` | `KineticLimits` | See below | Rendering budgets. |

Effect defaults are `pressure: true`, `tilt: true`, `content: false`, `drift: false`, and `wave: false`.

| Motion option | Default | Valid range |
| --- | --- | --- |
| `maxTilt` | `8` degrees | `0` to `30` |
| `response` | `0.18` | Greater than `0` through `1` |
| `drift` | `1.5` pixels | `0` to `4` |
| `waveDuration` | `480` milliseconds | `100` to `2000` |

`limits.maxSurfaces` defaults to `250` and accepts integer values from `1` to `10000`. `limits.maxActive` defaults to `24` and accepts integer values from `1` to `1000`.

### Kinetic controller

| Member | Behavior |
| --- | --- |
| `elements` | New read-only snapshot of managed surfaces. |
| `paused` | Current input suspension state. |
| `pause()` | Stop input, cancel scheduled work, and return surfaces to rest. |
| `resume()` | Resume input without rebuilding surfaces. |
| `impact(target, input?)` | Trigger one bounded response on the active managed owner. |
| `update({ effects?, motion?, limits? })` | Merge supplied settings into current configuration, rest surfaces, and reconcile limits. |
| `refresh()` | Reconcile current matches and return the number newly enhanced. |
| `destroy()` | Remove owned listeners, observers, frames, timers, layers, markers, and styles. Idempotent. |

Impact input accepts `pressure` from `0` to `1` and normalized `x` and `y` coordinates from `-1` to `1`.

### CSS channels

Kinetic writes these engine-owned custom properties on a managed host: `--dynt-pressure`, `--dynt-pointer-x`, `--dynt-pointer-y`, `--dynt-tilt-x`, `--dynt-tilt-y`, `--dynt-drift-x`, `--dynt-drift-y`, `--dynt-content-x`, `--dynt-content-y`, `--dynt-wave-x`, `--dynt-wave-y`, `--dynt-wave-scale`, and `--dynt-wave-opacity`.

Applications can set `--dynt-cell-size` and `--dynt-kinetic-color`. Content response values are opt-in channels: DYNT does not overwrite the application's content transform.

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
