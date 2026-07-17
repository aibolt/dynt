# `@dynt/react`

Thin React lifecycle adapters for the framework-independent engines.

Install and import only the engine entry point an application needs:

```tsx
import { useRef } from "react";
import { useFormation } from "@dynt/react/formation";

function App() {
  const rootRef = useRef<HTMLElement>(null);
  useFormation({ rootRef, selector: "section, article, button", observe: true });

  return <main ref={rootRef}>{/* existing application tree */}</main>;
}
```

`@dynt/react/kinetic` exports `useKinetic()` with the same root-ref integration shape. Formation and Kinetic are optional peer dependencies, so using one adapter entry point does not require the other engine.

The hooks initialize after mount, destroy before unmount or dependency replacement, tolerate repeated development mounts, and perform no DOM work during server rendering. Memoize object and array configuration when it should remain stable across renders.
