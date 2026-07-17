export type KineticRoot = Document | DocumentFragment | HTMLElement;

export type KineticOptions = Readonly<{
  root: KineticRoot;
  selector: string;
  exclude?: string;
  observe?: boolean;
}>;

export type KineticController = Readonly<{
  elements: readonly HTMLElement[];
  paused: boolean;
  pause(): void;
  resume(): void;
  refresh(): number;
  destroy(): void;
}>;

type KineticOwner = Readonly<{
  root: KineticRoot;
}>;

type ElementSnapshot = Readonly<{
  hadBaseClass: boolean;
  kineticAttribute: string | null;
}>;

type ElementOwnership = {
  layer: HTMLElement | null;
  owners: Set<KineticOwner>;
  snapshot: ElementSnapshot;
};

const BASE_CLASS = "dynt-kinetic";
const DEFAULT_EXCLUDE_SELECTOR = "[data-dynt-ignore]";
const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const KINETIC_ATTRIBUTE = "data-dynt-kinetic";
const LAYER_ATTRIBUTE = "data-dynt-kinetic-layer";
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
  const elements = new Set<HTMLElement>();
  const owner: KineticOwner = { root };
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

  function enhance(element: HTMLElement) {
    if (elements.has(element)) {
      const ownership = ELEMENT_OWNERSHIP.get(element);
      if (ownership) ensureLayer(element, ownership);
      return false;
    }

    const existingOwnership = ELEMENT_OWNERSHIP.get(element);
    if (existingOwnership) {
      existingOwnership.owners.add(owner);
      ensureLayer(element, existingOwnership);
      elements.add(element);
      return true;
    }

    const ownership: ElementOwnership = {
      layer: null,
      owners: new Set([owner]),
      snapshot: {
        hadBaseClass: element.classList.contains(BASE_CLASS),
        kineticAttribute: element.getAttribute(KINETIC_ATTRIBUTE),
      },
    };
    ELEMENT_OWNERSHIP.set(element, ownership);
    elements.add(element);
    element.classList.add(BASE_CLASS);
    element.setAttribute(KINETIC_ATTRIBUTE, "");
    ownership.layer = createLayer(element);
    return true;
  }

  function restore(element: HTMLElement, ownership: ElementOwnership) {
    ownership.layer?.remove();
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
    if (ownership.owners.size > 0) return;
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
    observer?.disconnect();
    observer = null;
    for (const element of Array.from(elements)) release(element);
  }

  refresh();

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
      if (!destroyed) paused = true;
    },
    resume() {
      if (!destroyed) paused = false;
    },
    refresh,
    destroy,
  };
}
