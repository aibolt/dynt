# Accessibility and reduced motion

DYNT decorates existing controls and surfaces. It does not replace host elements, change their roles, reorder them, or create alternative interaction semantics.

## Engine guarantees

- Formation uses host pseudo-elements with `pointer-events: none`.
- Kinetic child decorations use `aria-hidden="true"`, have no tab stop, and use `pointer-events: none`.
- Void elements such as `input` receive no invalid child decoration.
- Native links, buttons, inputs, labels, names, values, focus order, and keyboard behavior remain owned by the application.
- Application-owned classes, attributes, styles, and style priorities are restored after the final controller is destroyed.
- Dynamic enhancement does not replace element identity or application event listeners.
- Neither engine produces continuous animation work while idle.

## Reduced motion

Both engines evaluate `prefers-reduced-motion: reduce`.

Formation still reports its complete lifecycle order, but it reaches the terminal formed or unformed state immediately instead of waiting for visible transitions.

Kinetic keeps a static pressure cue, removes tilt, drift, and wave animation, and schedules no animation frames. A programmatic impact becomes a short static pressure cue and returns to rest.

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

Automated DOM tests verify semantic preservation, hidden decoration, void-element handling, exact cleanup, and reduced-motion scheduling. Real-browser checks in Chromium, Firefox, and WebKit verify named controls, focus, input preservation, responsive geometry, pen pressure, reduced motion, and combined lifecycle suppression. Chromium visual baselines record formed and unformed line geometry.

Run the evidence locally with:

```bash
npm test
npm run test:browser
```
