# Accessibility and reduced motion

DYNT decorates existing controls and surfaces. It does not replace host elements, change their roles, reorder them, or create alternative interaction semantics.

## Engine guarantees

- Formation uses host pseudo-elements or an `aria-hidden` perimeter layer with `pointer-events: none`.
- Formation's optional viewport-flow layer is `aria-hidden`, has `pointer-events: none`, and is removed after its transient sequence.
- Kinetic canvas decorations sit inside an `aria-hidden="true"` layer, have no tab stop, and use `pointer-events: none`.
- Void elements such as `input` receive no invalid child decoration.
- Native links, buttons, inputs, labels, names, values, focus order, and keyboard behavior remain owned by the application.
- Application-owned classes, attributes, styles, and style priorities are restored after the final controller is destroyed.
- Dynamic enhancement does not replace element identity or application event listeners.
- Neither engine produces continuous animation work while idle.

## Reduced motion

Both engines evaluate `prefers-reduced-motion: reduce`.

Formation skips viewport travel and still reports its complete lifecycle order, reaching the terminal formed or unformed state immediately instead of waiting for visible transitions.

Kinetic removes tilt, drift, and wave animation and schedules no animation frames. A programmatic impact remains at rest.

Reduced motion changes presentation, not meaning. Applications must not rely on a visual effect as the only indication of state.

## Application responsibilities

- Keep every interactive target natively operable by keyboard.
- Preserve a visible focus indicator with sufficient contrast.
- Provide accessible names and labels before DYNT initializes.
- Do not use line color or motion as the only way to communicate required information.
- Choose `--dynt-line-color` and `--dynt-kinetic-color` values appropriate for the surrounding theme.
- Use `data-dynt-ignore` for third-party widgets or surfaces that should not be decorated.
- Test application-specific screen-reader output; DYNT cannot validate names or descriptions supplied by the application.

## Verification evidence

Automated DOM tests verify semantic preservation, hidden decoration, void-element handling, exact cleanup, and reduced-motion scheduling. Real-browser checks in Chromium, Firefox, and WebKit verify named controls, focus, input preservation, responsive geometry, circular wave activation, reduced motion, and combined lifecycle suppression. Chromium visual baselines record formed and unformed line geometry.

Run the evidence locally with:

```bash
npm test
npm run test:browser
```
