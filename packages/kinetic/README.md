# `@dynt/kinetic`

Framework-independent physical response for existing interfaces.

Kinetic is independently installable and does not import or require Formation.

```bash
npm install @dynt/kinetic
```

```ts
import { createKinetic, kineticPresets } from "@dynt/kinetic";
import "@dynt/kinetic/styles.css";

const kinetic = createKinetic({
  root: document.querySelector("#app"),
  selector: "section, article, button, [data-surface]",
  exclude: ".external-widget",
  observe: true,
  ...kineticPresets.structural,
  cells: {
    ...kineticPresets.structural.cells,
    shape: "hexagon",
    size: [40, 32, 26],
  },
  field: { radius: 3, maxCells: 61, idleDelay: 120 },
  flow: { turbulence: 0.38, overflow: 14, multi: true, maxWaves: 4 },
  limits: {
    maxActive: 24,
    maxSurfaces: 250,
  },
});

kinetic.pause();
kinetic.resume();
kinetic.impact(document.querySelector("button"), { pressure: 1, x: 0, y: 0 });
kinetic.update({ motion: { maxTilt: 5 } });
kinetic.refresh();
kinetic.destroy();
```

The controller enhances matching HTML elements without replacing them. It owns one non-interactive, accessibility-hidden decoration layer per compatible target, skips child layers for void elements, observes dynamic targets when requested, and restores application-owned classes and attributes after the final controller releases a target.

## Pressure and tilt

One delegated pointer pipeline per controller resolves the nearest managed surface. Pointer position and pen or touch pressure feed bounded `--dynt-pressure`, `--dynt-pointer-x`, `--dynt-pointer-y`, `--dynt-tilt-x`, and `--dynt-tilt-y` properties. The decoration layer and any Formation rails stay fixed. With `content` enabled, Kinetic moves locally owned semantic content at bounded depths without replacing the host element's transform or background.

`maxTilt` is limited to 30 degrees, and `response` must be greater than zero and at most one. Damped interpolation stops requesting frames when every active surface reaches its target or returns to rest. Pausing immediately returns owned surfaces to rest and suspends input processing.

When reduced motion is requested, pointer pressure remains as a static location-independent cue, tilt is removed, and Kinetic schedules no animation frames.

## Advanced effects

Advanced effects remain independent switches and are rendered by the core package rather than an adapter:

- `drift` adds bounded organic movement only while a pointer actively owns a surface, then decays to zero.
- `wave` sends a geometry-aware directional cell flow from the contact point toward the opposite terminal. A new wave replaces the active flow by default; `flow.multi` enables a bounded set.
- `impact()` produces one bounded local pressure and tilt rebound, with optional normalized coordinates and pressure.
- `content` automatically identifies up to 48 locally owned semantic reactors. Tilt and drift translate them at bounded depths; waves lift, rebound, and settle them in distance order. `data-dynt-reactor` marks a custom group, and nested managed surfaces remain isolated.

The pressure field is a bounded canvas lens. It raises only nearby cells, stops after pointer stillness, caps device-pixel ratio at `1.5`, and defaults to at most `61` cells. The same renderer supports square, connected hexagon, circle, and interlocked diamond geometry.

`cells.size` accepts one size or a three-level `[section, card, nested]` tree. Nested managed surfaces automatically inherit the next level. A target may override the resolved geometry with `data-dynt-cell-shape`, `data-dynt-cell-size`, or an inherited `--dynt-cell-size`. `--dynt-kinetic-color` remains the single-color CSS override.

Cell color sources support `single`, discrete `bands`, and interpolated `gradient` modes with one to eight CSS colors. Wave flow configuration includes speed, thickness, recovery, intensity, turbulence, turbulence scale, three-stage growth, terminal overflow, deterministic seed behavior, multi-wave limits, and a hard cell budget.

`kineticPresets.structural` provides the line-attached square field and terminal overflow baseline. `kineticPresets.locator` provides a connected hexagonal local field with no terminal spill. Presets are immutable plain option objects and work identically through the core API, React hook, or Web Component helper.

Waves last from 100 to 2000 milliseconds. Drift is capped at four pixels. Standard impacts reuse the shared scheduler and reduced-motion impacts use a short static pressure cue with no animation frames.

`maxSurfaces`, `maxActive`, `field.maxCells`, `flow.maxCells`, and `flow.maxWaves` provide explicit rendering budgets. The defaults are 250 managed surfaces, 24 simultaneous reactions, 61 local field cells, 420 flow cells, and one active flow per surface unless bounded multi-wave mode is enabled. See the repository performance guide for the tested DOM-operation and idle-work budgets.

See the repository [API reference](https://github.com/aibolt/dynt/blob/main/docs/API.md), [accessibility contract](https://github.com/aibolt/dynt/blob/main/docs/ACCESSIBILITY.md), and [browser example](https://github.com/aibolt/dynt/tree/main/examples/kinetic-browser).
