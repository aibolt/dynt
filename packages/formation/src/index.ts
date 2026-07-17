export type { FormationCommand, FormationPhase } from "./lifecycle.js";

export type FormationProfile = "line-push";

export type FormationRoot = Document | DocumentFragment | HTMLElement;

export type FormationOptions = {
  root: FormationRoot;
  selector: string;
  exclude?: string;
  profile?: FormationProfile;
  observe?: boolean;
};

export type FormationController = {
  readonly elements: readonly HTMLElement[];
  readonly profile: FormationProfile;
  refresh(): number;
  destroy(): void;
};

type ElementSnapshot = {
  hadBaseClass: boolean;
  hadProfileClass: boolean;
  formationAttribute: string | null;
};

type ElementOwnership = {
  owners: Set<object>;
  snapshot: ElementSnapshot;
};

const BASE_CLASS = "dynt-formation";
const DEFAULT_EXCLUDE_SELECTOR = "[data-dynt-ignore]";
const PROFILE_CLASSES: Record<FormationProfile, string> = {
  "line-push": "dynt-formation--line-push",
};
const ELEMENT_OWNERSHIP = new WeakMap<HTMLElement, ElementOwnership>();

function validateSelector(root: FormationRoot, selector: string, label: string) {
  try {
    root.querySelector(selector);
  } catch {
    throw new TypeError(`DYNT Formation received an invalid ${label} selector.`);
  }
}

function isExcluded(element: HTMLElement, root: FormationRoot, excludeSelector: string) {
  let current: HTMLElement | null = element;

  while (current) {
    if (current.matches(excludeSelector)) return true;
    if (current === root) return false;
    current = current.parentElement;
  }

  return false;
}

function findTargets(root: FormationRoot, selector: string, excludeSelector: string) {
  const targets = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => (
      element.namespaceURI === "http://www.w3.org/1999/xhtml"
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

export function createFormation({
  root,
  selector,
  exclude,
  profile = "line-push",
  observe = false,
}: FormationOptions): FormationController {
  if (!selector.trim()) {
    throw new TypeError("DYNT Formation requires a non-empty selector.");
  }

  if (exclude !== undefined && !exclude.trim()) {
    throw new TypeError("DYNT Formation requires a non-empty exclude selector.");
  }

  const profileClass = PROFILE_CLASSES[profile];
  const excludeSelector = exclude
    ? `${DEFAULT_EXCLUDE_SELECTOR}, ${exclude}`
    : DEFAULT_EXCLUDE_SELECTOR;
  validateSelector(root, selector, "target");
  validateSelector(root, excludeSelector, "exclude");
  const elements = new Set<HTMLElement>();
  const owner = {};
  const document = root.nodeType === 9 ? root as Document : root.ownerDocument;
  const view = document?.defaultView;
  const observerOptions: MutationObserverInit = {
    attributes: true,
    childList: true,
    subtree: true,
  };
  let destroyed = false;
  let refreshScheduled = false;
  let observer: MutationObserver | null = null;

  function enhance(element: HTMLElement) {
    if (elements.has(element)) return false;

    const existingOwnership = ELEMENT_OWNERSHIP.get(element);
    if (existingOwnership) {
      existingOwnership.owners.add(owner);
      elements.add(element);
      return true;
    }

    const snapshot = {
      hadBaseClass: element.classList.contains(BASE_CLASS),
      hadProfileClass: element.classList.contains(profileClass),
      formationAttribute: element.getAttribute("data-dynt-formation"),
    };
    ELEMENT_OWNERSHIP.set(element, {
      owners: new Set([owner]),
      snapshot,
    });
    elements.add(element);

    element.classList.add(BASE_CLASS, profileClass);
    element.setAttribute("data-dynt-formation", profile);
    return true;
  }

  function restore(element: HTMLElement, snapshot: ElementSnapshot) {
    if (!snapshot.hadBaseClass) element.classList.remove(BASE_CLASS);
    if (!snapshot.hadProfileClass) element.classList.remove(profileClass);

    if (snapshot.formationAttribute === null) {
      element.removeAttribute("data-dynt-formation");
    } else {
      element.setAttribute("data-dynt-formation", snapshot.formationAttribute);
    }
  }

  function release(element: HTMLElement) {
    if (!elements.delete(element)) return;

    const ownership = ELEMENT_OWNERSHIP.get(element);
    if (!ownership) return;

    ownership.owners.delete(owner);
    if (ownership.owners.size > 0) return;

    restore(element, ownership.snapshot);
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
        if (targetSet.has(element)) continue;
        release(element);
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

    if (view?.queueMicrotask) {
      view.queueMicrotask(run);
    } else {
      queueMicrotask(run);
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    observer?.disconnect();
    observer = null;

    for (const element of Array.from(elements)) {
      release(element);
    }
  }

  refresh();

  if (observe) {
    if (!view?.MutationObserver) {
      destroy();
      throw new TypeError("DYNT Formation observation requires MutationObserver support.");
    }

    observer = new view.MutationObserver(scheduleRefresh);
    observer.observe(root, observerOptions);
  }

  return {
    get elements() {
      return Array.from(elements);
    },
    profile,
    refresh,
    destroy,
  };
}
