import {
  nextFormationPhase,
  type FormationCommand,
  type FormationPhase,
} from "./lifecycle.js";

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
  form(target?: HTMLElement): void;
  withdraw(target?: HTMLElement): void;
  refresh(): number;
  destroy(): void;
};

type ElementSnapshot = {
  hadBaseClass: boolean;
  hadProfileClass: boolean;
  formationAttribute: string | null;
  phaseAttribute: string | null;
};

type ElementOwnership = {
  cancelInitialForm?: () => void;
  owners: Set<object>;
  phase: FormationPhase;
  snapshot: ElementSnapshot;
};

const BASE_CLASS = "dynt-formation";
const DEFAULT_EXCLUDE_SELECTOR = "[data-dynt-ignore]";
const PHASE_ATTRIBUTE = "data-dynt-formation-phase";
const PROFILE_CLASSES: Record<FormationProfile, string> = {
  "line-push": "dynt-formation--line-push",
};
const ELEMENT_OWNERSHIP = new WeakMap<HTMLElement, ElementOwnership>();

function setFormationPhase(
  element: HTMLElement,
  ownership: ElementOwnership,
  phase: FormationPhase,
) {
  ownership.phase = phase;
  element.setAttribute(PHASE_ATTRIBUTE, phase);
}

function cancelInitialForm(ownership: ElementOwnership) {
  const cancel = ownership.cancelInitialForm;
  ownership.cancelInitialForm = undefined;
  cancel?.();
}

function runFormationCommand(
  element: HTMLElement,
  ownership: ElementOwnership,
  command: FormationCommand,
) {
  cancelInitialForm(ownership);
  const { phase } = ownership;

  if (command === "form") {
    if (
      phase === "locating"
      || phase === "constructing"
      || phase === "enclosed"
      || phase === "revealing"
      || phase === "formed"
    ) {
      return;
    }

    let nextPhase = nextFormationPhase(phase, command);
    setFormationPhase(element, ownership, nextPhase);

    if (nextPhase === "locating") {
      nextPhase = nextFormationPhase(nextPhase, command);
      setFormationPhase(element, ownership, nextPhase);
    } else if (nextPhase === "revealing") {
      nextPhase = nextFormationPhase(nextPhase, command);
      setFormationPhase(element, ownership, nextPhase);
    }

    return;
  }

  if (phase === "unformed" || phase === "withdrawing" || phase === "deconstructing") {
    return;
  }

  let nextPhase = nextFormationPhase(phase, command);
  setFormationPhase(element, ownership, nextPhase);

  if (nextPhase === "withdrawing") {
    nextPhase = nextFormationPhase(nextPhase, command);
    setFormationPhase(element, ownership, nextPhase);
  }
}

function scheduleInitialForm(
  element: HTMLElement,
  ownership: ElementOwnership,
  view: Window | null | undefined,
) {
  let cancelled = false;
  let frame: number | undefined;
  const start = () => {
    ownership.cancelInitialForm = undefined;
    if (cancelled || ELEMENT_OWNERSHIP.get(element) !== ownership) return;
    runFormationCommand(element, ownership, "form");
  };

  if (view?.requestAnimationFrame) {
    frame = view.requestAnimationFrame(start);
  } else {
    queueMicrotask(start);
  }

  ownership.cancelInitialForm = () => {
    cancelled = true;
    if (frame !== undefined) view?.cancelAnimationFrame(frame);
  };
}

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
      phaseAttribute: element.getAttribute(PHASE_ATTRIBUTE),
    };
    const ownership: ElementOwnership = {
      owners: new Set([owner]),
      phase: "unformed",
      snapshot,
    };
    ELEMENT_OWNERSHIP.set(element, ownership);
    elements.add(element);

    element.classList.add(BASE_CLASS, profileClass);
    element.setAttribute("data-dynt-formation", profile);
    element.setAttribute(PHASE_ATTRIBUTE, "unformed");
    scheduleInitialForm(element, ownership, view);
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

    if (snapshot.phaseAttribute === null) {
      element.removeAttribute(PHASE_ATTRIBUTE);
    } else {
      element.setAttribute(PHASE_ATTRIBUTE, snapshot.phaseAttribute);
    }
  }

  function release(element: HTMLElement) {
    if (!elements.delete(element)) return;

    const ownership = ELEMENT_OWNERSHIP.get(element);
    if (!ownership) return;

    ownership.owners.delete(owner);
    if (ownership.owners.size > 0) return;

    cancelInitialForm(ownership);
    restore(element, ownership.snapshot);
    ELEMENT_OWNERSHIP.delete(element);
  }

  function commandTargets(target: HTMLElement | undefined) {
    if (target === undefined) return Array.from(elements);
    if (!elements.has(target)) {
      throw new TypeError("DYNT Formation commands require a managed target.");
    }
    return [target];
  }

  function runCommand(command: FormationCommand, target?: HTMLElement) {
    if (destroyed) return;

    for (const element of commandTargets(target)) {
      const ownership = ELEMENT_OWNERSHIP.get(element);
      if (ownership) runFormationCommand(element, ownership, command);
    }
  }

  function handleTransitionEnd(event: Event) {
    const transition = event as TransitionEvent;
    const element = event.target as HTMLElement | null;
    if (
      transition.propertyName !== "transform"
      || (transition.pseudoElement !== "::before" && transition.pseudoElement !== "::after")
      || !element
      || element.nodeType !== 1
      || !elements.has(element)
    ) {
      return;
    }

    const ownership = ELEMENT_OWNERSHIP.get(element);
    if (!ownership) return;

    if (ownership.phase === "constructing" && transition.pseudoElement === "::after") {
      let nextPhase = nextFormationPhase(ownership.phase, "form");
      while (true) {
        setFormationPhase(element, ownership, nextPhase);
        if (nextPhase === "formed") break;
        nextPhase = nextFormationPhase(nextPhase, "form");
      }
    } else if (
      ownership.phase === "deconstructing"
      && transition.pseudoElement === "::before"
    ) {
      setFormationPhase(
        element,
        ownership,
        nextFormationPhase(ownership.phase, "withdraw"),
      );
    }
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

  function scheduleRefresh(records?: MutationRecord[]) {
    if (
      records?.every((record) => (
        record.type === "attributes"
        && record.attributeName === PHASE_ATTRIBUTE
        && elements.has(record.target as HTMLElement)
      ))
    ) {
      return;
    }

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
    root.removeEventListener("transitionend", handleTransitionEnd);

    for (const element of Array.from(elements)) {
      release(element);
    }
  }

  root.addEventListener("transitionend", handleTransitionEnd);
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
    form(target) {
      runCommand("form", target);
    },
    withdraw(target) {
      runCommand("withdraw", target);
    },
    refresh,
    destroy,
  };
}
