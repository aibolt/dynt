# `@dynt/formation`

Framework-independent, line-led construction and reversible formation lifecycle.

```bash
npm install @dynt/formation
```

Formation applies Line Push or Line Rise to existing HTML through one root-level initializer.

```ts
import { createFormation } from "@dynt/formation";
import "@dynt/formation/styles.css";

const formation = createFormation({
  root: document,
  selector: "main section, main button",
  exclude: ".third-party-widget",
  profile: "line-push",
  observe: true,
  tokens: {
    duration: 320,
    lineColor: "#67e8f9",
    lineWidth: "1px",
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
formation.update({ tokens: { duration: 200 } });
unsubscribe();
formation.destroy();
```

The initializer only enhances matching elements inside the supplied root. Add `data-dynt-ignore` to any element to exclude that entire subtree. The optional `exclude` selector adds application-specific exclusions without disabling the built-in escape hatch.

The root must be a `Document`, `DocumentFragment`, or HTML element. Matches outside the HTML namespace are left unchanged, and an unknown profile is rejected before any target is mutated.

Set `observe: true` to enhance matching elements inserted later. Observed attribute and subtree changes also restore elements that leave the root, stop matching, or become excluded. Mutation records are batched into one refresh operation, and `destroy()` disconnects observation before restoring Formation-owned state.

Repeated and nested controllers share one internal ownership record per element. An element is enhanced once and its application-owned state is restored only after the final controller releases it.

## Profiles

Formation includes two independent, line-led profiles:

- `line-push` constructs horizontal edges before vertical edges.
- `line-rise` constructs vertical edges before horizontal edges.

The typed `createFormationProfileRegistry()` API accepts additional profile definitions without changing the engine. A definition declares its scoped CSS class, edge geometry, supported tokens, transition completion hooks, rendering strategy, and reduced-motion and responsive capabilities. Pass the returned registry through `profiles` and select its profile by name.

Two controllers may share a target only when they use the same profile definition. Formation rejects conflicting profiles before changing that target.

## Configuration layers

Formation applies configuration in this order: profile CSS defaults, controller `tokens`, matching `groups` in array order, and local data attributes. Supported local overrides are `data-dynt-formation-duration`, `data-dynt-line-color`, and `data-dynt-line-width`. `update()` replaces supplied controller or group layers and reapplies them without replacing the managed elements.

Duration is expressed in milliseconds. Color and width accept non-empty CSS values. Destroying a controller restores the exact inline custom-property values and priorities that existed before Formation managed the target.

## Lifecycle contract

The Formation lifecycle contract uses explicit `unformed`, `locating`, `constructing`, `enclosed`, `revealing`, `formed`, `withdrawing`, and `deconstructing` phases. `form()` and `withdraw()` act on the full managed set or one managed element. Phase-driven CSS transitions let an opposing command reverse the active Line Push transition from its current visual position. When the operating system requests reduced motion, commands preserve the same lifecycle order and complete without waiting for transition events.

`subscribe()` reports every phase change with the element, previous phase, and current phase. Formation also emits the bubbling `dynt:formation-phase` DOM event with the same detail so independent packages can coordinate without importing one another.

See the repository [API reference](https://github.com/aibolt/dynt/blob/main/docs/API.md), [accessibility contract](https://github.com/aibolt/dynt/blob/main/docs/ACCESSIBILITY.md), and [browser example](https://github.com/aibolt/dynt/tree/main/examples/formation-browser).
