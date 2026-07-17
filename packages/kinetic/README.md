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
    pressure: true,
    tilt: true,
  },
  motion: {
    maxTilt: 8,
    response: 0.18,
  },
});

kinetic.pause();
kinetic.resume();
kinetic.update({ motion: { maxTilt: 5 } });
kinetic.refresh();
kinetic.destroy();
```

The controller enhances matching HTML elements without replacing them. It owns one non-interactive, accessibility-hidden decoration layer per compatible target, skips child layers for void elements, observes dynamic targets when requested, and restores application-owned classes and attributes after the final controller releases a target.

## Pressure and tilt

One delegated pointer pipeline per controller resolves the nearest managed surface. Pointer position and pen or touch pressure feed bounded `--dynt-pressure`, `--dynt-pointer-x`, `--dynt-pointer-y`, `--dynt-tilt-x`, and `--dynt-tilt-y` properties. Kinetic applies those properties only to its decoration layer, so it does not replace the host element's transform or background.

`maxTilt` is limited to 30 degrees, and `response` must be greater than zero and at most one. Damped interpolation stops requesting frames when every active surface reaches its target or returns to rest. Pausing immediately returns owned surfaces to rest and suspends input processing.

When reduced motion is requested, pointer pressure remains as a static location-independent cue, tilt is removed, and Kinetic schedules no animation frames.
