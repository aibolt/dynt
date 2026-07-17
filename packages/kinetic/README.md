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
});

kinetic.pause();
kinetic.resume();
kinetic.refresh();
kinetic.destroy();
```

The controller enhances matching HTML elements without replacing them. It owns one non-interactive, accessibility-hidden decoration layer per compatible target, skips child layers for void elements, observes dynamic targets when requested, and restores application-owned classes and attributes after the final controller releases a target.
