export type KineticRoot = Document | DocumentFragment | HTMLElement;

export type KineticEffects = Readonly<{
  pressure?: boolean;
  tilt?: boolean;
}>;

export type KineticMotion = Readonly<{
  maxTilt?: number;
  response?: number;
}>;

export type KineticUpdateOptions = Readonly<{
  effects?: KineticEffects;
  motion?: KineticMotion;
}>;

export type KineticOptions = Readonly<{
  root: KineticRoot;
  selector: string;
  exclude?: string;
  observe?: boolean;
  effects?: KineticEffects;
  motion?: KineticMotion;
}>;

export type KineticController = Readonly<{
  elements: readonly HTMLElement[];
  paused: boolean;
  pause(): void;
  resume(): void;
  update(options: KineticUpdateOptions): void;
  refresh(): number;
  destroy(): void;
}>;

type KineticConfiguration = Readonly<{
  maxTilt: number;
  pressure: boolean;
  response: number;
  tilt: boolean;
}>;

type KineticOwner = {
  configuration: KineticConfiguration;
  root: KineticRoot;
};

type MotionProperty = "pointer-x" | "pointer-y" | "pressure" | "tilt-x" | "tilt-y";

type StylePropertySnapshot = Readonly<{
  priority: string;
  value: string;
}>;

type ElementSnapshot = Readonly<{
  hadBaseClass: boolean;
  kineticAttribute: string | null;
  motionStyles: Readonly<Record<MotionProperty, StylePropertySnapshot>>;
}>;

type MotionValues = {
  pressure: number;
  x: number;
  y: number;
};

type MotionState = {
  current: MotionValues;
  target: MotionValues;
};

type ElementOwnership = {
  activeOwner: KineticOwner | null;
  element: HTMLElement;
  layer: HTMLElement | null;
  owners: Set<KineticOwner>;
  snapshot: ElementSnapshot;
  state: MotionState;
};

const BASE_CLASS = "dynt-kinetic";
const DEFAULT_EXCLUDE_SELECTOR = "[data-dynt-ignore]";
const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const KINETIC_ATTRIBUTE = "data-dynt-kinetic";
const LAYER_ATTRIBUTE = "data-dynt-kinetic-layer";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const REST_EPSILON = 0.001;
const DEFAULT_CONFIGURATION: KineticConfiguration = Object.freeze({
  maxTilt: 8,
  pressure: true,
  response: 0.18,
  tilt: true,
});
const MOTION_PROPERTIES: Readonly<Record<MotionProperty, string>> = {
  "pointer-x": "--dynt-pointer-x",
  "pointer-y": "--dynt-pointer-y",
  pressure: "--dynt-pressure",
  "tilt-x": "--dynt-tilt-x",
  "tilt-y": "--dynt-tilt-y",
};
const VOID_ELEMENTS = new Set([
  "AREA",
  "BASE",
  "BR",
  "COL",
  "EMBED",
  "HR",
  "IMG",
  "INPUT",
  "LINK",
  "META",
  "PARAM",
  "SOURCE",
  "TRACK",
  "WBR",
]);
const ELEMENT_OWNERSHIP = new WeakMap<HTMLElement, ElementOwnership>();

function normalizeConfiguration(
  effects: KineticEffects | undefined,
  motion: KineticMotion | undefined,
  base = DEFAULT_CONFIGURATION,
): KineticConfiguration {
  if (effects !== undefined && (!effects || typeof effects !== "object" || Array.isArray(effects))) {
    throw new TypeError("DYNT Kinetic effects must be an object.");
  }
  if (motion !== undefined && (!motion || typeof motion !== "object" || Array.isArray(motion))) {
    throw new TypeError("DYNT Kinetic motion must be an object.");
  }
  for (const name of Object.keys(effects ?? {})) {
    if (name !== "pressure" && name !== "tilt") {
      throw new TypeError(`DYNT Kinetic received an unknown effect: ${name}.`);
    }
  }
  for (const name of Object.keys(motion ?? {})) {
    if (name !== "maxTilt" && name !== "response") {
      throw new TypeError(`DYNT Kinetic received an unknown motion option: ${name}.`);
    }
  }

  const pressure = effects?.pressure ?? base.pressure;
  const tilt = effects?.tilt ?? base.tilt;
  const maxTilt = motion?.maxTilt ?? base.maxTilt;
  const response = motion?.response ?? base.response;
  if (typeof pressure !== "boolean" || typeof tilt !== "boolean") {
    throw new TypeError("DYNT Kinetic effects must be boolean values.");
  }
  if (!Number.isFinite(maxTilt) || maxTilt < 0 || maxTilt > 30) {
    throw new TypeError("DYNT Kinetic maxTilt must be between 0 and 30 degrees.");
  }
  if (!Number.isFinite(response) || response <= 0 || response > 1) {
    throw new TypeError("DYNT Kinetic response must be greater than 0 and at most 1.");
  }

  return Object.freeze({ maxTilt, pressure, response, tilt });
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createRestValues(): MotionValues {
  return { pressure: 0, x: 0, y: 0 };
}

function isKineticRoot(value: unknown): value is KineticRoot {
  if (!value || typeof value !== "object") return false;

  const root = value as {
    addEventListener?: unknown;
    namespaceURI?: string | null;
    nodeType?: number;
    querySelector?: unknown;
    querySelectorAll?: unknown;
    removeEventListener?: unknown;
  };
  const supportedNode = root.nodeType === 9
    || root.nodeType === 11
    || (root.nodeType === 1 && root.namespaceURI === HTML_NAMESPACE);

  return supportedNode
    && typeof root.addEventListener === "function"
    && typeof root.removeEventListener === "function"
    && typeof root.querySelector === "function"
    && typeof root.querySelectorAll === "function";
}

function validateSelector(root: KineticRoot, selector: string, label: string) {
  try {
    root.querySelector(selector);
  } catch {
    throw new TypeError(`DYNT Kinetic received an invalid ${label} selector.`);
  }
}

function snapshotMotionStyles(element: HTMLElement) {
  return Object.fromEntries(
    Object.entries(MOTION_PROPERTIES).map(([name, property]) => [
      name,
      Object.freeze({
        priority: element.style.getPropertyPriority(property),
        value: element.style.getPropertyValue(property),
      }),
    ]),
  ) as Record<MotionProperty, StylePropertySnapshot>;
}

function setMotionProperty(element: HTMLElement, property: MotionProperty, value: string) {
  const cssProperty = MOTION_PROPERTIES[property];
  if (
    element.style.getPropertyValue(cssProperty) !== value
    || element.style.getPropertyPriority(cssProperty)
  ) {
    element.style.setProperty(cssProperty, value);
  }
}

function writeMotionState(ownership: ElementOwnership) {
  const { element, state } = ownership;
  setMotionProperty(element, "pressure", state.current.pressure.toFixed(4));
  setMotionProperty(element, "pointer-x", `${((state.current.x + 1) * 50).toFixed(2)}%`);
  setMotionProperty(element, "pointer-y", `${((state.current.y + 1) * 50).toFixed(2)}%`);

  const maxTilt = ownership.activeOwner?.configuration.maxTilt ?? 0;
  setMotionProperty(element, "tilt-x", `${(-state.current.y * maxTilt).toFixed(3)}deg`);
  setMotionProperty(element, "tilt-y", `${(state.current.x * maxTilt).toFixed(3)}deg`);
}

function restoreMotionStyles(element: HTMLElement, snapshot: ElementSnapshot) {
  for (const property of Object.keys(MOTION_PROPERTIES) as MotionProperty[]) {
    const cssProperty = MOTION_PROPERTIES[property];
    const previous = snapshot.motionStyles[property];
    if (previous.value) {
      element.style.setProperty(cssProperty, previous.value, previous.priority);
    } else {
      element.style.removeProperty(cssProperty);
    }
  }
}

function rootContains(parent: KineticRoot, child: KineticRoot) {
  return parent === child || parent.contains(child);
}

function selectActiveOwner(owners: Set<KineticOwner>) {
  let selected: KineticOwner | null = null;

  for (const candidate of owners) {
    if (
      !selected
      || selected.root === candidate.root
      || rootContains(selected.root, candidate.root)
    ) {
      selected = candidate;
    }
  }

  return selected;
}

function resetMotionState(ownership: ElementOwnership) {
  ownership.state.current = createRestValues();
  ownership.state.target = createRestValues();
  writeMotionState(ownership);
}

function isExcluded(element: HTMLElement, root: KineticRoot, excludeSelector: string) {
  let current: HTMLElement | null = element;

  while (current) {
    if (current.hasAttribute(LAYER_ATTRIBUTE) || current.matches(excludeSelector)) return true;
    if (current === root) return false;
    current = current.parentElement;
  }

  return false;
}

function findTargets(root: KineticRoot, selector: string, excludeSelector: string) {
  const targets = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => (
      element.namespaceURI === HTML_NAMESPACE
      && !isExcluded(element, root, excludeSelector)
    ),
  );

  if (
    root.nodeType === 1
    && (root as HTMLElement).matches(selector)
    && !isExcluded(root as HTMLElement, root, excludeSelector)
  ) {
    targets.unshift(root as HTMLElement);
  }

  return targets;
}

function createLayer(element: HTMLElement) {
  if (VOID_ELEMENTS.has(element.tagName)) return null;

  const layer = element.ownerDocument.createElement("span");
  layer.className = "dynt-kinetic__layer";
  layer.setAttribute(LAYER_ATTRIBUTE, "");
  layer.setAttribute("aria-hidden", "true");
  element.append(layer);
  return layer;
}

function ensureLayer(element: HTMLElement, ownership: ElementOwnership) {
  if (ownership.layer?.parentElement === element || VOID_ELEMENTS.has(element.tagName)) return;
  ownership.layer?.remove();
  ownership.layer = createLayer(element);
}

export function createKinetic({
  root,
  selector,
  exclude,
  observe = false,
  effects,
  motion,
}: KineticOptions): KineticController {
  if (!isKineticRoot(root)) {
    throw new TypeError("DYNT Kinetic requires a Document, DocumentFragment, or HTML element root.");
  }
  if (typeof selector !== "string" || !selector.trim()) {
    throw new TypeError("DYNT Kinetic requires a non-empty selector.");
  }
  if (exclude !== undefined && (typeof exclude !== "string" || !exclude.trim())) {
    throw new TypeError("DYNT Kinetic requires a non-empty exclude selector.");
  }

  const excludeSelector = exclude
    ? `${DEFAULT_EXCLUDE_SELECTOR}, ${exclude}`
    : DEFAULT_EXCLUDE_SELECTOR;
  validateSelector(root, selector, "target");
  validateSelector(root, excludeSelector, "exclude");
  const configuration = normalizeConfiguration(effects, motion);
  const elements = new Set<HTMLElement>();
  const owner: KineticOwner = { configuration, root };
  const document = root.nodeType === 9 ? root as Document : root.ownerDocument;
  const view = document?.defaultView;
  const observerOptions: MutationObserverInit = {
    attributes: true,
    childList: true,
    subtree: true,
  };
  let destroyed = false;
  let paused = false;
  let refreshScheduled = false;
  let observer: MutationObserver | null = null;
  let frame: number | undefined;
  let activeElement: HTMLElement | null = null;
  const activeStates = new Set<ElementOwnership>();

  function prefersReducedMotion() {
    return view?.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
  }

  function cancelFrame() {
    if (frame !== undefined) view?.cancelAnimationFrame(frame);
    frame = undefined;
  }

  function isAtRest(state: MotionState) {
    return Math.abs(state.current.x - state.target.x) <= REST_EPSILON
      && Math.abs(state.current.y - state.target.y) <= REST_EPSILON
      && Math.abs(state.current.pressure - state.target.pressure) <= REST_EPSILON;
  }

  function animate() {
    frame = undefined;

    for (const ownership of activeStates) {
      if (ownership.activeOwner !== owner) {
        activeStates.delete(ownership);
        continue;
      }

      const { current, target } = ownership.state;
      const { response } = owner.configuration;
      current.x += (target.x - current.x) * response;
      current.y += (target.y - current.y) * response;
      current.pressure += (target.pressure - current.pressure) * response;

      if (isAtRest(ownership.state)) {
        current.x = target.x;
        current.y = target.y;
        current.pressure = target.pressure;
        activeStates.delete(ownership);
      }
      writeMotionState(ownership);
    }

    if (activeStates.size > 0 && view?.requestAnimationFrame) {
      frame = view.requestAnimationFrame(animate);
    }
  }

  function scheduleMotion(ownership: ElementOwnership) {
    if (ownership.activeOwner !== owner) return;

    if (prefersReducedMotion() || !view?.requestAnimationFrame) {
      activeStates.delete(ownership);
      if (activeStates.size === 0) cancelFrame();
      ownership.state.current.x = owner.configuration.tilt ? 0 : ownership.state.target.x;
      ownership.state.current.y = owner.configuration.tilt ? 0 : ownership.state.target.y;
      ownership.state.current.pressure = ownership.state.target.pressure;
      writeMotionState(ownership);
      return;
    }

    activeStates.add(ownership);
    if (frame === undefined) frame = view.requestAnimationFrame(animate);
  }

  function rest(ownership: ElementOwnership, immediate = false) {
    ownership.state.target = createRestValues();
    if (immediate) {
      ownership.state.current = createRestValues();
      activeStates.delete(ownership);
      writeMotionState(ownership);
    } else {
      scheduleMotion(ownership);
    }
  }

  function findPointerTarget(event: Event) {
    for (const candidate of event.composedPath?.() ?? []) {
      if (candidate && typeof candidate === "object" && elements.has(candidate as HTMLElement)) {
        return candidate as HTMLElement;
      }
    }
    return null;
  }

  function handlePointer(event: PointerEvent) {
    if (destroyed || paused) return;
    const element = findPointerTarget(event);

    if (activeElement && activeElement !== element) {
      const previousOwnership = ELEMENT_OWNERSHIP.get(activeElement);
      if (previousOwnership?.activeOwner === owner) rest(previousOwnership);
    }
    activeElement = element;
    if (!element) return;

    const ownership = ELEMENT_OWNERSHIP.get(element);
    if (!ownership || ownership.activeOwner !== owner) return;
    const rectangle = element.getBoundingClientRect();
    if (rectangle.width <= 0 || rectangle.height <= 0) return;

    const x = clamp(((event.clientX - rectangle.left) / rectangle.width) * 2 - 1, -1, 1);
    const y = clamp(((event.clientY - rectangle.top) / rectangle.height) * 2 - 1, -1, 1);
    const radialPressure = 1 - Math.min(1, Math.hypot(x, y) / Math.SQRT2);
    const devicePressure = Number.isFinite(event.pressure) && event.pressure > 0
      ? clamp(event.pressure, 0, 1)
      : 0;
    ownership.state.target = {
      pressure: owner.configuration.pressure
        ? Math.max(radialPressure, devicePressure)
        : 0,
      x: owner.configuration.tilt ? x : 0,
      y: owner.configuration.tilt ? y : 0,
    };
    scheduleMotion(ownership);
  }

  function handlePointerLeave() {
    if (destroyed || paused) return;
    activeElement = null;
    for (const element of elements) {
      const ownership = ELEMENT_OWNERSHIP.get(element);
      if (ownership?.activeOwner === owner) rest(ownership);
    }
  }

  function stopMotion() {
    cancelFrame();
    activeStates.clear();
    activeElement = null;
    for (const element of elements) {
      const ownership = ELEMENT_OWNERSHIP.get(element);
      if (ownership?.activeOwner === owner) rest(ownership, true);
    }
  }

  function enhance(element: HTMLElement) {
    if (elements.has(element)) {
      const ownership = ELEMENT_OWNERSHIP.get(element);
      if (ownership) ensureLayer(element, ownership);
      return false;
    }

    const existingOwnership = ELEMENT_OWNERSHIP.get(element);
    if (existingOwnership) {
      existingOwnership.owners.add(owner);
      existingOwnership.activeOwner = selectActiveOwner(existingOwnership.owners);
      resetMotionState(existingOwnership);
      ensureLayer(element, existingOwnership);
      elements.add(element);
      return true;
    }

    const ownership: ElementOwnership = {
      activeOwner: owner,
      element,
      layer: null,
      owners: new Set([owner]),
      snapshot: {
        hadBaseClass: element.classList.contains(BASE_CLASS),
        kineticAttribute: element.getAttribute(KINETIC_ATTRIBUTE),
        motionStyles: snapshotMotionStyles(element),
      },
      state: {
        current: createRestValues(),
        target: createRestValues(),
      },
    };
    ELEMENT_OWNERSHIP.set(element, ownership);
    elements.add(element);
    element.classList.add(BASE_CLASS);
    element.setAttribute(KINETIC_ATTRIBUTE, "");
    writeMotionState(ownership);
    ownership.layer = createLayer(element);
    return true;
  }

  function restore(element: HTMLElement, ownership: ElementOwnership) {
    ownership.layer?.remove();
    restoreMotionStyles(element, ownership.snapshot);
    if (!ownership.snapshot.hadBaseClass) element.classList.remove(BASE_CLASS);
    if (ownership.snapshot.kineticAttribute === null) {
      element.removeAttribute(KINETIC_ATTRIBUTE);
    } else {
      element.setAttribute(KINETIC_ATTRIBUTE, ownership.snapshot.kineticAttribute);
    }
  }

  function release(element: HTMLElement) {
    if (!elements.delete(element)) return;
    const ownership = ELEMENT_OWNERSHIP.get(element);
    if (!ownership) return;

    ownership.owners.delete(owner);
    activeStates.delete(ownership);
    if (ownership.owners.size > 0) {
      ownership.activeOwner = selectActiveOwner(ownership.owners);
      resetMotionState(ownership);
      return;
    }
    ownership.activeOwner = null;
    restore(element, ownership);
    ELEMENT_OWNERSHIP.delete(element);
  }

  function refresh() {
    if (destroyed) return 0;
    const activeObserver = observer;
    activeObserver?.disconnect();

    try {
      let enhancedCount = 0;
      const targets = findTargets(root, selector, excludeSelector);
      const targetSet = new Set(targets);

      for (const element of elements) {
        if (!targetSet.has(element)) release(element);
      }
      for (const element of targets) {
        if (enhance(element)) enhancedCount += 1;
      }

      return enhancedCount;
    } finally {
      if (!destroyed && observer === activeObserver) {
        activeObserver?.observe(root, observerOptions);
      }
    }
  }

  function scheduleRefresh() {
    if (destroyed || refreshScheduled) return;
    refreshScheduled = true;
    const run = () => {
      refreshScheduled = false;
      refresh();
    };
    if (view?.queueMicrotask) view.queueMicrotask(run);
    else queueMicrotask(run);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stopMotion();
    observer?.disconnect();
    observer = null;
    root.removeEventListener("pointermove", handlePointer as EventListener);
    root.removeEventListener("pointerdown", handlePointer as EventListener);
    root.removeEventListener("pointerleave", handlePointerLeave);
    for (const element of Array.from(elements)) release(element);
  }

  function update(options: KineticUpdateOptions) {
    if (destroyed) return;
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("DYNT Kinetic update options must be an object.");
    }
    for (const name of Object.keys(options)) {
      if (name !== "effects" && name !== "motion") {
        throw new TypeError(`DYNT Kinetic received an unknown update option: ${name}.`);
      }
    }

    owner.configuration = normalizeConfiguration(
      options.effects,
      options.motion,
      owner.configuration,
    );
    stopMotion();
  }

  refresh();
  root.addEventListener("pointermove", handlePointer as EventListener);
  root.addEventListener("pointerdown", handlePointer as EventListener);
  root.addEventListener("pointerleave", handlePointerLeave);

  if (observe) {
    if (!view?.MutationObserver) {
      destroy();
      throw new TypeError("DYNT Kinetic observation requires MutationObserver support.");
    }
    observer = new view.MutationObserver(scheduleRefresh);
    observer.observe(root, observerOptions);
  }

  return {
    get elements() {
      return Array.from(elements);
    },
    get paused() {
      return paused;
    },
    pause() {
      if (!destroyed) {
        paused = true;
        stopMotion();
      }
    },
    resume() {
      if (!destroyed) paused = false;
    },
    update,
    refresh,
    destroy,
  };
}
