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

const BASE_CLASS = "dynt-formation";
const DEFAULT_EXCLUDE_SELECTOR = "[data-dynt-ignore]";
const PROFILE_CLASSES: Record<FormationProfile, string> = {
  "line-push": "dynt-formation--line-push",
};

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
  const snapshots = new Map<HTMLElement, ElementSnapshot>();
  const document = root.nodeType === 9 ? root as Document : root.ownerDocument;
  const view = document?.defaultView;
  let destroyed = false;
  let refreshScheduled = false;
  let observer: MutationObserver | null = null;

  function enhance(element: HTMLElement) {
    if (snapshots.has(element)) return false;

    snapshots.set(element, {
      hadBaseClass: element.classList.contains(BASE_CLASS),
      hadProfileClass: element.classList.contains(profileClass),
      formationAttribute: element.getAttribute("data-dynt-formation"),
    });

    element.classList.add(BASE_CLASS, profileClass);
    element.setAttribute("data-dynt-formation", profile);
    return true;
  }

  function refresh() {
    if (destroyed) return 0;

    let enhancedCount = 0;

    for (const element of findTargets(root, selector, excludeSelector)) {
      if (enhance(element)) enhancedCount += 1;
    }

    return enhancedCount;
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

    for (const [element, snapshot] of snapshots) {
      if (!snapshot.hadBaseClass) element.classList.remove(BASE_CLASS);
      if (!snapshot.hadProfileClass) element.classList.remove(profileClass);

      if (snapshot.formationAttribute === null) {
        element.removeAttribute("data-dynt-formation");
      } else {
        element.setAttribute("data-dynt-formation", snapshot.formationAttribute);
      }
    }

    snapshots.clear();
  }

  refresh();

  if (observe) {
    if (!view?.MutationObserver) {
      destroy();
      throw new TypeError("DYNT Formation observation requires MutationObserver support.");
    }

    observer = new view.MutationObserver(scheduleRefresh);
    observer.observe(root, { childList: true, subtree: true });
  }

  return {
    get elements() {
      return Array.from(snapshots.keys());
    },
    profile,
    refresh,
    destroy,
  };
}
