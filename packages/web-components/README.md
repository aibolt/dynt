# `@dynt/web-components`

Dependency-free custom-element lifecycle helpers with independent Formation and Kinetic entry points.

```bash
npm install @dynt/web-components @dynt/formation
```

```ts
import { defineFormationElement } from "@dynt/web-components/formation";

defineFormationElement("dynt-formation-root", {
  selector: "section, article, button",
  observe: true,
  viewportFlow: true,
});
```

```html
<dynt-formation-root>
  <!-- existing application elements -->
</dynt-formation-root>
```

`@dynt/web-components/kinetic` exports `defineKineticElement()` with the same lifecycle model. Each helper creates its engine when the custom element connects, destroys it when the element disconnects, and safely creates a new controller when the element reconnects. Defining the same tag again returns its existing class.

The modules are safe to import during server rendering because they access the custom-elements environment only when a definition function is called.

Install `@dynt/kinetic` instead of Formation when only the Kinetic helper is used. See the repository [API reference](https://github.com/aibolt/dynt/blob/main/docs/API.md) for both entry points.
