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

formation.refresh();
formation.destroy();
```

The initializer only enhances matching elements inside the supplied root. Add `data-dynt-ignore` to any element to exclude that entire subtree. The optional `exclude` selector adds application-specific exclusions without disabling the built-in escape hatch.

Set `observe: true` to enhance matching elements inserted later. Mutation records are batched into one refresh operation, and `destroy()` disconnects observation before restoring Formation-owned state.
