# `@dynt/formation`

Framework-independent, line-led construction and reversible formation lifecycle.

The first implementation milestone is a single Line Push profile applied to existing HTML through one root-level initializer.

```ts
import { createFormation } from "@dynt/formation";
import "@dynt/formation/styles.css";

const formation = createFormation({
  root: document,
  selector: "main section, main button",
});

formation.refresh();
formation.destroy();
```

The initializer only enhances matching elements inside the supplied root. This first slice handles elements already in the DOM; automatic observation of future elements is the next milestone.
