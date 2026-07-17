# `@dynt/formation`

Framework-independent, line-led construction and reversible formation lifecycle.

The first implementation milestone is a single Line Push profile applied to existing HTML through one root-level initializer.

```ts
import { createFormation } from "@dynt/formation";
import "@dynt/formation/styles.css";

const formation = createFormation({
  root: document,
  selector: "main section, main button",
  exclude: ".third-party-widget",
  observe: true,
});

formation.withdraw();
formation.form(document.querySelector("button"));
formation.refresh();
formation.destroy();
```

The initializer only enhances matching elements inside the supplied root. Add `data-dynt-ignore` to any element to exclude that entire subtree. The optional `exclude` selector adds application-specific exclusions without disabling the built-in escape hatch.

The root must be a `Document`, `DocumentFragment`, or HTML element. Matches outside the HTML namespace are left unchanged, and an unknown profile is rejected before any target is mutated.

Set `observe: true` to enhance matching elements inserted later. Observed attribute and subtree changes also restore elements that leave the root, stop matching, or become excluded. Mutation records are batched into one refresh operation, and `destroy()` disconnects observation before restoring Formation-owned state.

Repeated and nested controllers share one internal ownership record per element. An element is enhanced once and its application-owned state is restored only after the final controller releases it.

## Lifecycle contract

The Formation lifecycle contract uses explicit `unformed`, `locating`, `constructing`, `enclosed`, `revealing`, `formed`, `withdrawing`, and `deconstructing` phases. `form()` and `withdraw()` act on the full managed set or one managed element. Phase-driven CSS transitions let an opposing command reverse the active Line Push transition from its current visual position. When the operating system requests reduced motion, commands preserve the same lifecycle order and complete without waiting for transition events.
