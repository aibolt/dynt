# `@dynt/kinetic`

Framework-independent physical response for existing interfaces.

Kinetic is independently installable and does not import or require Formation.

```ts
import { createKinetic } from "@dynt/kinetic";
import "@dynt/kinetic/styles.css";

const kinetic = createKinetic({
  root: document.querySelector("#app"),
  selector: "section, article, button, [data-surface]",
  exclude: ".external-widget",
  observe: true,
  effects: {
    content: true,
    drift: true,
    pressure: true,
    tilt: true,
    wave: true,
  },
  motion: {
    drift: 1.5,
    maxTilt: 8,
    response: 0.18,
    waveDuration: 480,
  },
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

One delegated pointer pipeline per controller resolves the nearest managed surface. Pointer position and pen or touch pressure feed bounded `--dynt-pressure`, `--dynt-pointer-x`, `--dynt-pointer-y`, `--dynt-tilt-x`, and `--dynt-tilt-y` properties. Kinetic applies those properties only to its decoration layer, so it does not replace the host element's transform or background.

`maxTilt` is limited to 30 degrees, and `response` must be greater than zero and at most one. Damped interpolation stops requesting frames when every active surface reaches its target or returns to rest. Pausing immediately returns owned surfaces to rest and suspends input processing.

When reduced motion is requested, pointer pressure remains as a static location-independent cue, tilt is removed, and Kinetic schedules no animation frames.

## Advanced effects

Advanced effects remain independent switches:

- `drift` adds bounded organic movement only while a pointer actively owns a surface, then decays to zero.
- `wave` starts one cursor-local traveling ring on pointer down. A new wave replaces the active wave on that surface.
- `impact()` produces one bounded local pressure and tilt rebound, with optional normalized coordinates and pressure.
- `content` exposes `--dynt-content-x` and `--dynt-content-y` for explicit application-owned content reactors without overwriting content transforms.

The pressure field is rendered as engine-owned cells. `--dynt-cell-size` controls cell geometry and `--dynt-kinetic-color` supplies the field and wave color. The defaults are `18px` and a translucent cyan; applications can override either custom property through normal CSS inheritance.

Waves last from 100 to 2000 milliseconds. Drift is capped at four pixels. Standard impacts reuse the shared scheduler and reduced-motion impacts use a short static pressure cue with no animation frames.

`maxSurfaces` and `maxActive` provide explicit rendering budgets. The defaults are 250 managed surfaces and 24 simultaneous reactions. See the repository performance guide for the tested DOM-operation and idle-work budgets.
