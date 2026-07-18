import {
  nextFormationPhase,
  type FormationCommand,
  type FormationPhase,
} from "./lifecycle.js";
import {
  defaultFormationProfiles,
  type FormationProfile,
  type FormationProfileDefinition,
  type FormationProfileRegistry,
} from "./profiles.js";
import {
  FORMATION_TOKEN_PROPERTIES,
  mergeFormationTokens,
  normalizeFormationTokens,
  readLocalFormationTokens,
  type FormationTokenName,
  type FormationTokens,
  type ResolvedFormationTokens,
} from "./tokens.js";
import {
  createFormationFlowFlight,
  createFormationFlowLayer,
  normalizeFormationViewportFlow,
  type FormationViewportFlowOption,
  type ResolvedFormationViewportFlow,
} from "./viewport-flow.js";

export type { FormationCommand, FormationPhase } from "./lifecycle.js";
export {
  createFormationProfileRegistry,
  defaultFormationProfiles,
} from "./profiles.js";
export type {
  FormationProfile,
  FormationProfileDefinition,
  FormationProfileRegistry,
  FormationTransitionHook,
} from "./profiles.js";
export type { FormationTokenName, FormationTokens } from "./tokens.js";
export type {
  FormationViewportFlow,
  FormationViewportFlowOption,
} from "./viewport-flow.js";

export type FormationRoot = Document | DocumentFragment | HTMLElement;

export type FormationTransition = Readonly<{
  element: HTMLElement;
  previousPhase: FormationPhase;
  phase: FormationPhase;
}>;

export type FormationTransitionListener = (transition: FormationTransition) => void;

export type FormationSelectorGroup = Readonly<{
  selector: string;
  tokens: FormationTokens;
}>;

export type FormationUpdateOptions = Readonly<{
  groups?: readonly FormationSelectorGroup[];
  tokens?: FormationTokens;
  viewportFlow?: FormationViewportFlowOption;
}>;

export type FormationOptions<ProfileName extends string = FormationProfile> = {
  root: FormationRoot;
  selector: string;
  exclude?: string;
  profile?: ProfileName;
  profiles?: FormationProfileRegistry<ProfileName>;
  observe?: boolean;
  groups?: readonly FormationSelectorGroup[];
  tokens?: FormationTokens;
  viewportFlow?: FormationViewportFlowOption;
};

export type FormationController<ProfileName extends string = FormationProfile> = {
  readonly elements: readonly HTMLElement[];
  readonly profile: ProfileName;
  form(target?: HTMLElement): void;
  withdraw(target?: HTMLElement): void;
  subscribe(listener: FormationTransitionListener): () => void;
  update(options: FormationUpdateOptions): void;
  refresh(): number;
  destroy(): void;
};

type ElementSnapshot = {
  hadBaseClass: boolean;
  hadProfileClass: boolean;
  formationAttribute: string | null;
  phaseAttribute: string | null;
  tokenStyles: Readonly<Record<FormationTokenName, StylePropertySnapshot>>;
};

type StylePropertySnapshot = Readonly<{
  priority: string;
  value: string;
}>;

type FormationOwner = {
  listeners: Set<FormationTransitionListener>;
};

type ElementOwnership = {
  cancelInitialForm?: () => void;
  decoration: HTMLElement | null;
  owners: Set<FormationOwner>;
  ownerTokens: Map<FormationOwner, ResolvedFormationTokens>;
  managedTokenProperties: Set<FormationTokenName>;
  phase: FormationPhase;
  profile: FormationProfileDefinition;
  snapshot: ElementSnapshot;
};

const BASE_CLASS = "dynt-formation";
const DEFAULT_EXCLUDE_SELECTOR = "[data-dynt-ignore]";
const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const PERIMETER_ATTRIBUTE = "data-dynt-formation-perimeter";
const PHASE_ATTRIBUTE = "data-dynt-formation-phase";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
export const FORMATION_PHASE_EVENT = "dynt:formation-phase";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const ELEMENT_OWNERSHIP = new WeakMap<HTMLElement, ElementOwnership>();

type NormalizedFormationSelectorGroup = Readonly<{
  selector: string;
  tokens: ResolvedFormationTokens;
}>;

function isFormationRoot(value: unknown): value is FormationRoot {
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

function setFormationPhase(
  element: HTMLElement,
  ownership: ElementOwnership,
  phase: FormationPhase,
) {
  const previousPhase = ownership.phase;
  if (previousPhase === phase) return;

  ownership.phase = phase;
  element.setAttribute(PHASE_ATTRIBUTE, phase);

  const transition = Object.freeze({ element, previousPhase, phase });
  const EventConstructor = element.ownerDocument.defaultView?.CustomEvent;
  if (EventConstructor) {
    element.dispatchEvent(new EventConstructor(FORMATION_PHASE_EVENT, {
      bubbles: true,
      composed: true,
      detail: transition,
    }));
  }

  for (const owner of ownership.owners) {
    for (const listener of owner.listeners) listener(transition);
  }
}

function cancelInitialForm(ownership: ElementOwnership) {
  const cancel = ownership.cancelInitialForm;
  ownership.cancelInitialForm = undefined;
  cancel?.();
}

function prefersReducedMotion(view: Window | null | undefined) {
  return view?.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
}

function advanceToTerminal(
  element: HTMLElement,
  ownership: ElementOwnership,
  command: FormationCommand,
  terminalPhase: FormationPhase,
) {
  while (ownership.phase !== terminalPhase) {
    setFormationPhase(
      element,
      ownership,
      nextFormationPhase(ownership.phase, command),
    );
  }
}

function runFormationCommand(
  element: HTMLElement,
  ownership: ElementOwnership,
  command: FormationCommand,
  reducedMotion = false,
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
      if (reducedMotion && phase !== "formed") {
        advanceToTerminal(element, ownership, command, "formed");
      }
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

    if (reducedMotion && ownership.phase !== "formed") {
      advanceToTerminal(element, ownership, command, "formed");
    }

    return;
  }

  if (phase === "unformed") {
    return;
  }

  if (phase === "withdrawing" || phase === "deconstructing") {
    if (reducedMotion) {
      advanceToTerminal(element, ownership, command, "unformed");
    }
    return;
  }

  let nextPhase = nextFormationPhase(phase, command);
  setFormationPhase(element, ownership, nextPhase);

  if (nextPhase === "withdrawing") {
    nextPhase = nextFormationPhase(nextPhase, command);
    setFormationPhase(element, ownership, nextPhase);
  }

  if (reducedMotion && ownership.phase !== "unformed") {
    advanceToTerminal(element, ownership, command, "unformed");
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
    runFormationCommand(element, ownership, "form", prefersReducedMotion(view));
  };

  if (view?.requestAnimationFrame) {
    frame = view.requestAnimationFrame(() => {
      if (cancelled || ELEMENT_OWNERSHIP.get(element) !== ownership) return;
      frame = view.requestAnimationFrame(start);
    });
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

function normalizeSelectorGroups(
  root: FormationRoot,
  groups: readonly FormationSelectorGroup[] | undefined,
  supportedTokens: readonly FormationTokenName[],
): readonly NormalizedFormationSelectorGroup[] {
  if (groups === undefined) return [];
  if (!Array.isArray(groups)) {
    throw new TypeError("DYNT Formation groups must be an array.");
  }

  return groups.map((group, index) => {
    if (!group || typeof group.selector !== "string" || !group.selector.trim()) {
      throw new TypeError("DYNT Formation groups require a non-empty selector.");
    }
    validateSelector(root, group.selector, `group ${index + 1}`);
    return Object.freeze({
      selector: group.selector,
      tokens: normalizeFormationTokens(
        group.tokens,
        supportedTokens,
        `group ${index + 1} tokens`,
      ),
    });
  });
}

function snapshotTokenStyles(element: HTMLElement) {
  return Object.fromEntries(
    Object.entries(FORMATION_TOKEN_PROPERTIES).map(([name, property]) => [
      name,
      Object.freeze({
        priority: element.style.getPropertyPriority(property),
        value: element.style.getPropertyValue(property),
      }),
    ]),
  ) as Record<FormationTokenName, StylePropertySnapshot>;
}

function restoreTokenStyle(
  element: HTMLElement,
  token: FormationTokenName,
  snapshot: StylePropertySnapshot,
) {
  const property = FORMATION_TOKEN_PROPERTIES[token];
  if (snapshot.value) {
    element.style.setProperty(property, snapshot.value, snapshot.priority);
  } else {
    element.style.removeProperty(property);
  }
}

function applyEffectiveTokens(element: HTMLElement, ownership: ElementOwnership) {
  let effectiveTokens: ResolvedFormationTokens = {};
  for (const tokens of ownership.ownerTokens.values()) effectiveTokens = tokens;

  for (const token of Object.keys(FORMATION_TOKEN_PROPERTIES) as FormationTokenName[]) {
    const value = effectiveTokens[token];
    const property = FORMATION_TOKEN_PROPERTIES[token];

    if (value !== undefined) {
      ownership.managedTokenProperties.add(token);
      if (
        element.style.getPropertyValue(property) !== value
        || element.style.getPropertyPriority(property)
      ) {
        element.style.setProperty(property, value);
      }
    } else if (ownership.managedTokenProperties.delete(token)) {
      restoreTokenStyle(element, token, ownership.snapshot.tokenStyles[token]);
    }
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

function createPerimeterDecoration(element: HTMLElement) {
  const layer = element.ownerDocument.createElement("span");
  const svg = element.ownerDocument.createElementNS(SVG_NAMESPACE, "svg");
  const trace = element.ownerDocument.createElementNS(SVG_NAMESPACE, "rect");
  const restingFrame = element.ownerDocument.createElement("span");
  const entryRegister = element.ownerDocument.createElement("span");
  const exitRegister = element.ownerDocument.createElement("span");

  layer.className = "dynt-formation__perimeter";
  layer.setAttribute(PERIMETER_ATTRIBUTE, "");
  layer.setAttribute("aria-hidden", "true");
  svg.classList.add("dynt-formation__perimeter-svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("preserveAspectRatio", "none");
  trace.classList.add("dynt-formation__perimeter-trace");
  trace.setAttribute("x", "0");
  trace.setAttribute("y", "0");
  trace.setAttribute("width", "100%");
  trace.setAttribute("height", "100%");
  trace.setAttribute("pathLength", "100");
  restingFrame.className = "dynt-formation__perimeter-rest";
  entryRegister.className = "dynt-formation__register dynt-formation__register--entry";
  exitRegister.className = "dynt-formation__register dynt-formation__register--exit";
  svg.append(trace);
  layer.append(svg, restingFrame, entryRegister, exitRegister);
  element.append(layer);
  return layer;
}

type ConstructPattern = Extract<
  FormationProfileDefinition["geometry"],
  { type: "constructed" }
>["pattern"];

type ConstructPath = Readonly<{
  className?: string;
  d: string;
  delay: number;
  reverseDelay: number;
}>;

function constructPaths(pattern: ConstructPattern): readonly ConstructPath[] {
  if (pattern === "squircle") {
    return [
      { d: "M50 0 C84 0 100 16 100 50 C100 84 84 100 50 100 C16 100 0 84 0 50 C0 16 16 0 50 0 Z", delay: 0, reverseDelay: 0 },
      { className: "dynt-formation__construct-path--signature", d: "M42 0 H58 M42 100 H58", delay: 120, reverseDelay: 80 },
    ];
  }
  if (pattern === "chamfer") {
    return [
      { d: "M0 12 L12 0 M88 0 L100 12 M100 88 L88 100 M12 100 L0 88", delay: 0, reverseDelay: 120 },
      { d: "M12 0 H88", delay: 90, reverseDelay: 90 },
      { d: "M100 12 V88", delay: 140, reverseDelay: 50 },
      { d: "M88 100 H12", delay: 190, reverseDelay: 20 },
      { d: "M0 88 V12", delay: 240, reverseDelay: 0 },
    ];
  }
  if (pattern === "magnetic") {
    return [
      { d: "M0 0 H50 M100 0 H50", delay: 0, reverseDelay: 140 },
      { d: "M100 0 V50 M100 100 V50", delay: 70, reverseDelay: 100 },
      { d: "M100 100 H50 M0 100 H50", delay: 140, reverseDelay: 70 },
      { d: "M0 100 V50 M0 0 V50", delay: 210, reverseDelay: 30 },
      { className: "dynt-formation__construct-path--signature", d: "M47 0 H53 M100 47 V53 M53 100 H47 M0 53 V47", delay: 280, reverseDelay: 0 },
    ];
  }
  if (pattern === "compass") {
    return [
      { className: "dynt-formation__construct-path--temporary", d: "M50 50 V0 M50 50 H100 M50 50 V100 M50 50 H0", delay: 0, reverseDelay: 120 },
      { d: "M10 0 H90 Q100 0 100 10 V90 Q100 100 90 100 H10 Q0 100 0 90 V10 Q0 0 10 0 Z", delay: 130, reverseDelay: 60 },
      { className: "dynt-formation__construct-path--signature", d: "M45 0 H55 M100 45 V55 M55 100 H45 M0 55 V45", delay: 260, reverseDelay: 0 },
    ];
  }
  if (pattern === "aperture") {
    return [
      { className: "dynt-formation__construct-path--temporary", d: "M12 12 L50 50 L88 12 M88 88 L50 50 L12 88", delay: 0, reverseDelay: 140 },
      { d: "M50 0 H12 Q0 0 0 12 V50", delay: 100, reverseDelay: 100 },
      { d: "M50 0 H88 Q100 0 100 12 V50", delay: 140, reverseDelay: 70 },
      { d: "M100 50 V88 Q100 100 88 100 H50", delay: 180, reverseDelay: 40 },
      { d: "M50 100 H12 Q0 100 0 88 V50", delay: 220, reverseDelay: 20 },
      { className: "dynt-formation__construct-path--signature", d: "M47 0 H53 M100 47 V53 M53 100 H47 M0 53 V47", delay: 280, reverseDelay: 0 },
    ];
  }
  return [
    { d: "M0 8 C22 -3 78 -3 100 8", delay: 0, reverseDelay: 150 },
    { d: "M92 0 C103 22 103 78 92 100", delay: 80, reverseDelay: 100 },
    { d: "M100 92 C78 103 22 103 0 92", delay: 160, reverseDelay: 50 },
    { d: "M8 100 C-3 78 -3 22 8 0", delay: 240, reverseDelay: 0 },
  ];
}

function createConstructDecoration(element: HTMLElement, pattern: ConstructPattern) {
  const layer = element.ownerDocument.createElement("span");
  const svg = element.ownerDocument.createElementNS(SVG_NAMESPACE, "svg");
  const paths = constructPaths(pattern);

  layer.className = `dynt-formation__construct dynt-formation__construct--${pattern}`;
  layer.setAttribute(PERIMETER_ATTRIBUTE, "");
  layer.setAttribute("data-dynt-formation-pattern", pattern);
  layer.setAttribute("aria-hidden", "true");
  svg.classList.add("dynt-formation__construct-svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");

  for (const [index, definition] of paths.entries()) {
    const path = element.ownerDocument.createElementNS(SVG_NAMESPACE, "path");
    path.classList.add("dynt-formation__construct-path");
    if (definition.className) path.classList.add(definition.className);
    if (index === paths.length - 1) {
      path.classList.add("dynt-formation__construct-completion");
    }
    path.setAttribute("d", definition.d);
    path.setAttribute("pathLength", "100");
    path.style.setProperty("--dynt-construct-delay", `${definition.delay}ms`);
    path.style.setProperty("--dynt-construct-reverse-delay", `${definition.reverseDelay}ms`);
    svg.append(path);
  }

  layer.append(svg);
  element.append(layer);
  return layer;
}

function ensureDecoration(element: HTMLElement, ownership: ElementOwnership) {
  if (ownership.profile.rendering === "pseudo-elements") return;
  if (ownership.decoration?.parentElement === element) return;
  ownership.decoration?.remove();
  ownership.decoration = ownership.profile.rendering === "svg-perimeter"
    ? createPerimeterDecoration(element)
    : createConstructDecoration(
      element,
      (ownership.profile.geometry as Extract<
        FormationProfileDefinition["geometry"],
        { type: "constructed" }
      >).pattern,
    );
}

export function createFormation<ProfileName extends string = FormationProfile>({
  root,
  selector,
  exclude,
  profile = "line-push" as ProfileName,
  profiles = defaultFormationProfiles as FormationProfileRegistry<ProfileName>,
  observe = false,
  groups,
  tokens,
  viewportFlow,
}: FormationOptions<ProfileName>): FormationController<ProfileName> {
  if (!isFormationRoot(root)) {
    throw new TypeError("DYNT Formation requires a Document, DocumentFragment, or HTML element root.");
  }

  if (typeof selector !== "string" || !selector.trim()) {
    throw new TypeError("DYNT Formation requires a non-empty selector.");
  }

  if (exclude !== undefined && (typeof exclude !== "string" || !exclude.trim())) {
    throw new TypeError("DYNT Formation requires a non-empty exclude selector.");
  }

  const profileDefinition = profiles.get(profile);
  if (!profileDefinition) {
    throw new TypeError(`DYNT Formation received an unknown profile: ${String(profile)}.`);
  }

  const selectedProfile = profileDefinition;
  const profileClass = selectedProfile.className;
  const excludeSelector = exclude
    ? `${DEFAULT_EXCLUDE_SELECTOR}, ${exclude}`
    : DEFAULT_EXCLUDE_SELECTOR;
  validateSelector(root, selector, "target");
  validateSelector(root, excludeSelector, "exclude");
  let rootTokens = normalizeFormationTokens(tokens, selectedProfile.tokens);
  let selectorGroups = normalizeSelectorGroups(root, groups, selectedProfile.tokens);
  let resolvedViewportFlow = normalizeFormationViewportFlow(viewportFlow);
  if (resolvedViewportFlow.enabled && selectedProfile.capabilities.viewportFlow === false) {
    throw new TypeError(`DYNT Formation profile ${selectedProfile.name} does not support viewportFlow.`);
  }
  const elements = new Set<HTMLElement>();
  const owner: FormationOwner = { listeners: new Set() };
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
  let flowLayer: HTMLElement | null = null;
  const flowFlights = new Map<HTMLElement, Set<HTMLElement>>();
  const flowTimers = new Map<HTMLElement, Set<number>>();

  function scheduleFlow(element: HTMLElement, callback: () => void, delay: number) {
    if (!view || delay <= 0) {
      callback();
      return;
    }

    const timers = flowTimers.get(element) ?? new Set<number>();
    flowTimers.set(element, timers);
    const timer = view.setTimeout(() => {
      timers.delete(timer);
      if (!timers.size) flowTimers.delete(element);
      callback();
    }, delay);
    timers.add(timer);
  }

  function cancelViewportFlow(target?: HTMLElement) {
    const targets = target
      ? [target]
      : Array.from(new Set([...flowTimers.keys(), ...flowFlights.keys()]));

    for (const element of targets) {
      for (const timer of flowTimers.get(element) ?? []) view?.clearTimeout(timer);
      flowTimers.delete(element);
      for (const flight of flowFlights.get(element) ?? []) flight.remove();
      flowFlights.delete(element);
    }
  }

  function getFlowHost(): ParentNode | null {
    if (!document) return null;
    const tree = root.nodeType === 1 ? (root as HTMLElement).getRootNode() : root;
    if (tree.nodeType === 11 && "host" in tree) return tree as ShadowRoot;
    return document.body ?? document.documentElement;
  }

  function ensureFlowLayer() {
    const host = getFlowHost();
    if (!host || !document) return null;
    if (!flowLayer) flowLayer = createFormationFlowLayer(document);
    if (!flowLayer.isConnected) host.append(flowLayer);
    return flowLayer;
  }

  function removeFlight(element: HTMLElement, flight: HTMLElement) {
    flight.remove();
    const flights = flowFlights.get(element);
    flights?.delete(flight);
    if (!flights?.size) flowFlights.delete(element);
  }

  function startViewportFlowSequence(
    targets: readonly HTMLElement[],
    flow: ResolvedFormationViewportFlow = resolvedViewportFlow,
    command: FormationCommand = "form",
  ) {
    if (
      !flow.enabled
      || prefersReducedMotion(view)
      || !view
      || !document
    ) {
      for (const element of targets) {
        const ownership = ELEMENT_OWNERSHIP.get(element);
        if (ownership) runFormationCommand(element, ownership, command, prefersReducedMotion(view));
      }
      return;
    }

    const layer = ensureFlowLayer();
    if (!layer) {
      for (const element of targets) {
        const ownership = ELEMENT_OWNERSHIP.get(element);
        if (ownership) runFormationCommand(element, ownership, command);
      }
      return;
    }

    const orderedTargets = command === "withdraw" ? [...targets].reverse() : targets;
    const lastIndex = Math.max(1, orderedTargets.length - 1);
    for (const [index, element] of orderedTargets.entries()) {
      const sequenceDelay = Math.min(index * flow.stagger, (index / lastIndex) * 1800);
      scheduleFlow(element, () => {
        const ownership = ELEMENT_OWNERSHIP.get(element);
        const terminalPhase = command === "form" ? "formed" : "unformed";
        if (!ownership || !elements.has(element) || ownership.phase === terminalPhase) return;

        const flight = createFormationFlowFlight(document, element, flow, index, command);
        if (!flight) {
          runFormationCommand(element, ownership, command);
          return;
        }

        const flights = flowFlights.get(element) ?? new Set<HTMLElement>();
        flights.add(flight);
        flowFlights.set(element, flights);
        layer.append(flight);

        scheduleFlow(element, () => {
          const current = ELEMENT_OWNERSHIP.get(element);
          if (current && elements.has(element)) runFormationCommand(element, current, command);
        }, flow.duration * 0.42);
        scheduleFlow(element, () => removeFlight(element, flight), flow.duration + 80);
      }, sequenceDelay);
    }
  }

  function resolveTokens(element: HTMLElement) {
    const layers = [rootTokens];
    for (const group of selectorGroups) {
      if (element.matches(group.selector)) layers.push(group.tokens);
    }
    layers.push(readLocalFormationTokens(element, selectedProfile.tokens));
    return mergeFormationTokens(...layers);
  }

  function enhance(element: HTMLElement, resolvedTokens: ResolvedFormationTokens) {
    if (elements.has(element)) {
      const ownership = ELEMENT_OWNERSHIP.get(element);
      if (ownership) {
        ownership.ownerTokens.set(owner, resolvedTokens);
        applyEffectiveTokens(element, ownership);
        ensureDecoration(element, ownership);
      }
      return false;
    }

    const existingOwnership = ELEMENT_OWNERSHIP.get(element);
    if (existingOwnership) {
      if (existingOwnership.profile !== selectedProfile) {
        throw new TypeError("DYNT Formation cannot apply different profiles to the same target.");
      }
      existingOwnership.owners.add(owner);
      existingOwnership.ownerTokens.set(owner, resolvedTokens);
      elements.add(element);
      applyEffectiveTokens(element, existingOwnership);
      ensureDecoration(element, existingOwnership);
      return true;
    }

    const snapshot = {
      hadBaseClass: element.classList.contains(BASE_CLASS),
      hadProfileClass: element.classList.contains(profileClass),
      formationAttribute: element.getAttribute("data-dynt-formation"),
      phaseAttribute: element.getAttribute(PHASE_ATTRIBUTE),
      tokenStyles: snapshotTokenStyles(element),
    };
    const ownership: ElementOwnership = {
      decoration: null,
      managedTokenProperties: new Set(),
      owners: new Set([owner]),
      ownerTokens: new Map([[owner, resolvedTokens]]),
      phase: "unformed",
      profile: selectedProfile,
      snapshot,
    };
    ELEMENT_OWNERSHIP.set(element, ownership);
    elements.add(element);

    element.classList.add(BASE_CLASS, profileClass);
    element.setAttribute("data-dynt-formation", selectedProfile.name);
    element.setAttribute(PHASE_ATTRIBUTE, "unformed");
    applyEffectiveTokens(element, ownership);
    ensureDecoration(element, ownership);
    if (!resolvedViewportFlow.enabled) scheduleInitialForm(element, ownership, view);
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

    for (const token of Object.keys(FORMATION_TOKEN_PROPERTIES) as FormationTokenName[]) {
      restoreTokenStyle(element, token, snapshot.tokenStyles[token]);
    }
  }

  function release(element: HTMLElement) {
    if (!elements.delete(element)) return;
    cancelViewportFlow(element);

    const ownership = ELEMENT_OWNERSHIP.get(element);
    if (!ownership) return;

    ownership.owners.delete(owner);
    ownership.ownerTokens.delete(owner);
    if (ownership.owners.size > 0) {
      applyEffectiveTokens(element, ownership);
      return;
    }

    cancelInitialForm(ownership);
    ownership.decoration?.remove();
    ownership.decoration = null;
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

    const targets = commandTargets(target);
    if (command === "withdraw") {
      for (const element of targets) cancelViewportFlow(element);
    }
    for (const element of targets) {
      const ownership = ELEMENT_OWNERSHIP.get(element);
      if (ownership) {
        runFormationCommand(element, ownership, command, prefersReducedMotion(view));
      }
    }
  }

  function handleTransitionEnd(event: Event) {
    const transition = event as TransitionEvent;
    const eventTarget = event.target as Element | null;
    const perimeter = eventTarget?.closest?.(`[${PERIMETER_ATTRIBUTE}]`);
    const element = eventTarget && elements.has(eventTarget as HTMLElement)
      ? eventTarget as HTMLElement
      : perimeter?.parentElement ?? null;
    if (
      !element
      || element.nodeType !== 1
      || !elements.has(element)
    ) {
      return;
    }

    const ownership = ELEMENT_OWNERSHIP.get(element);
    if (!ownership) return;
    if (
      ownership.profile.rendering === "svg-construct"
      && !eventTarget?.matches?.(".dynt-formation__construct-completion")
    ) {
      return;
    }

    const formComplete = ownership.profile.lifecycle.formComplete;
    const withdrawComplete = ownership.profile.lifecycle.withdrawComplete;

    if (
      ownership.phase === "constructing"
      && transition.propertyName === formComplete.propertyName
      && (
        formComplete.pseudoElement === undefined
        || transition.pseudoElement === formComplete.pseudoElement
      )
    ) {
      advanceToTerminal(element, ownership, "form", "formed");
    } else if (
      ownership.phase === "deconstructing"
      && transition.propertyName === withdrawComplete.propertyName
      && (
        withdrawComplete.pseudoElement === undefined
        || transition.pseudoElement === withdrawComplete.pseudoElement
      )
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
      const enhancedElements: HTMLElement[] = [];
      const targets = findTargets(root, selector, excludeSelector);
      const targetSet = new Set(targets);
      const targetTokens = new Map(
        targets.map((element) => [element, resolveTokens(element)]),
      );

      for (const element of targets) {
        const ownership = ELEMENT_OWNERSHIP.get(element);
        if (ownership && ownership.profile !== selectedProfile) {
          throw new TypeError("DYNT Formation cannot apply different profiles to the same target.");
        }
      }

      for (const element of elements) {
        if (targetSet.has(element)) continue;
        release(element);
      }

      for (const element of targets) {
        if (enhance(element, targetTokens.get(element)!)) {
          enhancedCount += 1;
          enhancedElements.push(element);
        }
      }

      if (resolvedViewportFlow.enabled && enhancedElements.length) {
        startViewportFlowSequence(enhancedElements);
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
    cancelViewportFlow();
    flowLayer?.remove();
    flowLayer = null;

    for (const element of Array.from(elements)) {
      release(element);
    }
    owner.listeners.clear();
  }

  function update(options: FormationUpdateOptions) {
    if (destroyed) return;
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("DYNT Formation update options must be an object.");
    }
    for (const name of Object.keys(options)) {
      if (name !== "groups" && name !== "tokens" && name !== "viewportFlow") {
        throw new TypeError(`DYNT Formation received an unknown update option: ${name}.`);
      }
    }

    const nextRootTokens = options.tokens === undefined
      ? rootTokens
      : normalizeFormationTokens(options.tokens, selectedProfile.tokens);
    const nextSelectorGroups = options.groups === undefined
      ? selectorGroups
      : normalizeSelectorGroups(root, options.groups, selectedProfile.tokens);
    const nextViewportFlow = options.viewportFlow === undefined
      ? resolvedViewportFlow
      : normalizeFormationViewportFlow(options.viewportFlow);
    if (nextViewportFlow.enabled && selectedProfile.capabilities.viewportFlow === false) {
      throw new TypeError(`DYNT Formation profile ${selectedProfile.name} does not support viewportFlow.`);
    }
    const disabledActiveFlow = resolvedViewportFlow.enabled && !nextViewportFlow.enabled;

    rootTokens = nextRootTokens;
    selectorGroups = nextSelectorGroups;
    if (disabledActiveFlow) cancelViewportFlow();
    resolvedViewportFlow = nextViewportFlow;
    refresh();
    if (disabledActiveFlow) runCommand("form");
  }

  refresh();
  root.addEventListener("transitionend", handleTransitionEnd);

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
      if (destroyed) return;
      if (!resolvedViewportFlow.enabled) {
        runCommand("form", target);
        return;
      }
      const targets = commandTargets(target);
      for (const element of targets) cancelViewportFlow(element);
      startViewportFlowSequence(targets);
    },
    withdraw(target) {
      if (destroyed) return;
      if (!resolvedViewportFlow.enabled) {
        runCommand("withdraw", target);
        return;
      }
      const targets = commandTargets(target);
      for (const element of targets) cancelViewportFlow(element);
      startViewportFlowSequence(targets, resolvedViewportFlow, "withdraw");
    },
    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("DYNT Formation subscriptions require a listener function.");
      }
      if (destroyed) return () => {};

      owner.listeners.add(listener);
      return () => {
        owner.listeners.delete(listener);
      };
    },
    update,
    refresh,
    destroy,
  };
}
