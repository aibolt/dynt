import type { KineticCellShape } from "./geometry.js";
import {
  renderKineticCanvas,
  type KineticColorMode,
  type ResolvedCellConfiguration,
  type ResolvedFieldConfiguration,
  type ResolvedFlowConfiguration,
} from "./rendering.js";

export type { KineticCellShape } from "./geometry.js";
export type { KineticColorMode } from "./rendering.js";
export { kineticPresets } from "./presets.js";
export type { KineticPreset } from "./presets.js";

export type KineticRoot = Document | DocumentFragment | HTMLElement;

export type KineticEffects = Readonly<{
  content?: boolean;
  drift?: boolean;
  pressure?: boolean;
  tilt?: boolean;
  wave?: boolean;
}>;

export type KineticMotion = Readonly<{
  drift?: number;
  maxTilt?: number;
  response?: number;
  waveDuration?: number;
}>;

export type KineticLimits = Readonly<{
  maxActive?: number;
  maxSurfaces?: number;
}>;

export type KineticCells = Readonly<{
  colorMode?: KineticColorMode;
  colors?: readonly string[];
  gap?: number;
  shape?: KineticCellShape;
  size?: number | readonly [number, number, number];
}>;

export type KineticField = Readonly<{
  idleDelay?: number;
  intensity?: number;
  maxCells?: number;
  noise?: number;
  radius?: number;
  tail?: number;
}>;

export type KineticFlow = Readonly<{
  growth?: number;
  intensity?: number;
  maxCells?: number;
  maxWaves?: number;
  multi?: boolean;
  overflow?: number;
  recovery?: number;
  seed?: number;
  seedLocked?: boolean;
  speed?: number;
  thickness?: number;
  turbulence?: number;
  turbulenceScale?: number;
}>;

export type KineticImpactInput = Readonly<{
  pressure?: number;
  x?: number;
  y?: number;
}>;

export type KineticUpdateOptions = Readonly<{
  cells?: KineticCells;
  effects?: KineticEffects;
  field?: KineticField;
  flow?: KineticFlow;
  limits?: KineticLimits;
  motion?: KineticMotion;
}>;

export type KineticOptions = Readonly<{
  root: KineticRoot;
  selector: string;
  exclude?: string;
  observe?: boolean;
  cells?: KineticCells;
  effects?: KineticEffects;
  field?: KineticField;
  flow?: KineticFlow;
  limits?: KineticLimits;
  motion?: KineticMotion;
}>;

export type KineticController = Readonly<{
  elements: readonly HTMLElement[];
  paused: boolean;
  pause(): void;
  resume(): void;
  impact(target: HTMLElement, input?: KineticImpactInput): void;
  update(options: KineticUpdateOptions): void;
  refresh(): number;
  destroy(): void;
}>;

type KineticConfiguration = Readonly<{
  cells: ResolvedCellConfiguration;
  content: boolean;
  drift: boolean;
  driftAmount: number;
  field: ResolvedFieldConfiguration;
  flow: ResolvedFlowConfiguration;
  maxActive: number;
  maxSurfaces: number;
  maxTilt: number;
  pressure: boolean;
  response: number;
  tilt: boolean;
  wave: boolean;
  waveDuration: number;
}>;

type KineticOwner = {
  configuration: KineticConfiguration;
  root: KineticRoot;
};

type MotionProperty =
  | "content-x"
  | "content-y"
  | "drift-x"
  | "drift-y"
  | "pointer-x"
  | "pointer-y"
  | "pressure"
  | "tilt-x"
  | "tilt-y"
  | "wave-opacity"
  | "wave-scale"
  | "wave-x"
  | "wave-y";

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

type MotionFlow = {
  progress: number;
  startedAt: number;
  x: number;
  y: number;
};

type MotionState = {
  current: MotionValues;
  driftX: number;
  driftY: number;
  flows: MotionFlow[];
  impactStartedAt: number | null;
  target: MotionValues;
  waveProgress: number;
  waveStartedAt: number | null;
  waveX: number;
  waveY: number;
};

type ElementOwnership = {
  activeOwner: KineticOwner | null;
  canvas: HTMLCanvasElement | null;
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
const CANVAS_ATTRIBUTE = "data-dynt-kinetic-canvas";
const LAYER_ATTRIBUTE = "data-dynt-kinetic-layer";
const FORMATION_PHASE_ATTRIBUTE = "data-dynt-formation-phase";
const FORMATION_PHASE_EVENT = "dynt:formation-phase";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const REST_EPSILON = 0.001;
const DEFAULT_CONFIGURATION: KineticConfiguration = Object.freeze({
  cells: Object.freeze({
    colorMode: "single",
    colors: Object.freeze(["#67e8f9"]),
    gap: 1,
    shape: "square",
    sizes: Object.freeze([40, 32, 24]) as readonly [number, number, number],
  }),
  content: false,
  drift: false,
  driftAmount: 1.5,
  field: Object.freeze({
    idleDelay: 120,
    intensity: 1,
    maxCells: 61,
    noise: 0.18,
    radius: 3,
    tail: 1.55,
  }),
  flow: Object.freeze({
    growth: 1,
    intensity: 1,
    maxCells: 420,
    maxWaves: 4,
    multi: false,
    overflow: 14,
    recovery: 1,
    seed: 37,
    seedLocked: false,
    speed: 1,
    thickness: 1,
    turbulence: 0.38,
    turbulenceScale: 4,
  }),
  maxActive: 24,
  maxSurfaces: 250,
  maxTilt: 8,
  pressure: true,
  response: 0.18,
  tilt: true,
  wave: false,
  waveDuration: 480,
});
const MOTION_PROPERTIES: Readonly<Record<MotionProperty, string>> = {
  "content-x": "--dynt-content-x",
  "content-y": "--dynt-content-y",
  "drift-x": "--dynt-drift-x",
  "drift-y": "--dynt-drift-y",
  "pointer-x": "--dynt-pointer-x",
  "pointer-y": "--dynt-pointer-y",
  pressure: "--dynt-pressure",
  "tilt-x": "--dynt-tilt-x",
  "tilt-y": "--dynt-tilt-y",
  "wave-opacity": "--dynt-wave-opacity",
  "wave-scale": "--dynt-wave-scale",
  "wave-x": "--dynt-wave-x",
  "wave-y": "--dynt-wave-y",
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
  limits: KineticLimits | undefined,
  cells: KineticCells | undefined,
  field: KineticField | undefined,
  flow: KineticFlow | undefined,
  base = DEFAULT_CONFIGURATION,
): KineticConfiguration {
  if (effects !== undefined && (!effects || typeof effects !== "object" || Array.isArray(effects))) {
    throw new TypeError("DYNT Kinetic effects must be an object.");
  }
  if (motion !== undefined && (!motion || typeof motion !== "object" || Array.isArray(motion))) {
    throw new TypeError("DYNT Kinetic motion must be an object.");
  }
  if (limits !== undefined && (!limits || typeof limits !== "object" || Array.isArray(limits))) {
    throw new TypeError("DYNT Kinetic limits must be an object.");
  }
  if (cells !== undefined && (!cells || typeof cells !== "object" || Array.isArray(cells))) {
    throw new TypeError("DYNT Kinetic cells must be an object.");
  }
  if (field !== undefined && (!field || typeof field !== "object" || Array.isArray(field))) {
    throw new TypeError("DYNT Kinetic field must be an object.");
  }
  if (flow !== undefined && (!flow || typeof flow !== "object" || Array.isArray(flow))) {
    throw new TypeError("DYNT Kinetic flow must be an object.");
  }
  for (const name of Object.keys(effects ?? {})) {
    if (
      name !== "content"
      && name !== "drift"
      && name !== "pressure"
      && name !== "tilt"
      && name !== "wave"
    ) {
      throw new TypeError(`DYNT Kinetic received an unknown effect: ${name}.`);
    }
  }
  for (const name of Object.keys(motion ?? {})) {
    if (
      name !== "drift"
      && name !== "maxTilt"
      && name !== "response"
      && name !== "waveDuration"
    ) {
      throw new TypeError(`DYNT Kinetic received an unknown motion option: ${name}.`);
    }
  }
  for (const name of Object.keys(limits ?? {})) {
    if (name !== "maxActive" && name !== "maxSurfaces") {
      throw new TypeError(`DYNT Kinetic received an unknown limit: ${name}.`);
    }
  }
  for (const name of Object.keys(cells ?? {})) {
    if (
      name !== "colorMode"
      && name !== "colors"
      && name !== "gap"
      && name !== "shape"
      && name !== "size"
    ) {
      throw new TypeError(`DYNT Kinetic received an unknown cells option: ${name}.`);
    }
  }
  for (const name of Object.keys(field ?? {})) {
    if (
      name !== "idleDelay"
      && name !== "intensity"
      && name !== "maxCells"
      && name !== "noise"
      && name !== "radius"
      && name !== "tail"
    ) {
      throw new TypeError(`DYNT Kinetic received an unknown field option: ${name}.`);
    }
  }
  for (const name of Object.keys(flow ?? {})) {
    if (
      name !== "growth"
      && name !== "intensity"
      && name !== "maxCells"
      && name !== "maxWaves"
      && name !== "multi"
      && name !== "overflow"
      && name !== "recovery"
      && name !== "seed"
      && name !== "seedLocked"
      && name !== "speed"
      && name !== "thickness"
      && name !== "turbulence"
      && name !== "turbulenceScale"
    ) {
      throw new TypeError(`DYNT Kinetic received an unknown flow option: ${name}.`);
    }
  }

  const content = effects?.content ?? base.content;
  const drift = effects?.drift ?? base.drift;
  const pressure = effects?.pressure ?? base.pressure;
  const tilt = effects?.tilt ?? base.tilt;
  const wave = effects?.wave ?? base.wave;
  const driftAmount = motion?.drift ?? base.driftAmount;
  const maxActive = limits?.maxActive ?? base.maxActive;
  const maxSurfaces = limits?.maxSurfaces ?? base.maxSurfaces;
  const maxTilt = motion?.maxTilt ?? base.maxTilt;
  const response = motion?.response ?? base.response;
  const waveDuration = motion?.waveDuration ?? base.waveDuration;
  const cellShape = cells?.shape ?? base.cells.shape;
  const cellGap = cells?.gap ?? base.cells.gap;
  const colorMode = cells?.colorMode ?? base.cells.colorMode;
  const colors = cells?.colors ?? base.cells.colors;
  const size = cells?.size ?? base.cells.sizes;
  const sizes = typeof size === "number" ? [size, size, size] : size;
  const fieldConfiguration = {
    idleDelay: field?.idleDelay ?? base.field.idleDelay,
    intensity: field?.intensity ?? base.field.intensity,
    maxCells: field?.maxCells ?? base.field.maxCells,
    noise: field?.noise ?? base.field.noise,
    radius: field?.radius ?? base.field.radius,
    tail: field?.tail ?? base.field.tail,
  };
  const flowConfiguration = {
    growth: flow?.growth ?? base.flow.growth,
    intensity: flow?.intensity ?? base.flow.intensity,
    maxCells: flow?.maxCells ?? base.flow.maxCells,
    maxWaves: flow?.maxWaves ?? base.flow.maxWaves,
    multi: flow?.multi ?? base.flow.multi,
    overflow: flow?.overflow ?? base.flow.overflow,
    recovery: flow?.recovery ?? base.flow.recovery,
    seed: flow?.seed ?? base.flow.seed,
    seedLocked: flow?.seedLocked ?? base.flow.seedLocked,
    speed: flow?.speed ?? base.flow.speed,
    thickness: flow?.thickness ?? base.flow.thickness,
    turbulence: flow?.turbulence ?? base.flow.turbulence,
    turbulenceScale: flow?.turbulenceScale ?? base.flow.turbulenceScale,
  };
  if (
    typeof content !== "boolean"
    || typeof drift !== "boolean"
    || typeof pressure !== "boolean"
    || typeof tilt !== "boolean"
    || typeof wave !== "boolean"
  ) {
    throw new TypeError("DYNT Kinetic effects must be boolean values.");
  }
  if (!Number.isFinite(maxTilt) || maxTilt < 0 || maxTilt > 30) {
    throw new TypeError("DYNT Kinetic maxTilt must be between 0 and 30 degrees.");
  }
  if (!Number.isFinite(response) || response <= 0 || response > 1) {
    throw new TypeError("DYNT Kinetic response must be greater than 0 and at most 1.");
  }
  if (!Number.isFinite(driftAmount) || driftAmount < 0 || driftAmount > 4) {
    throw new TypeError("DYNT Kinetic drift must be between 0 and 4 pixels.");
  }
  if (!Number.isFinite(waveDuration) || waveDuration < 100 || waveDuration > 2000) {
    throw new TypeError("DYNT Kinetic waveDuration must be between 100 and 2000 milliseconds.");
  }
  if (!Number.isInteger(maxActive) || maxActive < 1 || maxActive > 1000) {
    throw new TypeError("DYNT Kinetic maxActive must be an integer between 1 and 1000.");
  }
  if (!Number.isInteger(maxSurfaces) || maxSurfaces < 1 || maxSurfaces > 10000) {
    throw new TypeError("DYNT Kinetic maxSurfaces must be an integer between 1 and 10000.");
  }
  if (!["square", "hexagon", "circle", "diamond"].includes(cellShape)) {
    throw new TypeError("DYNT Kinetic cell shape must be square, hexagon, circle, or diamond.");
  }
  if (!["single", "bands", "gradient"].includes(colorMode)) {
    throw new TypeError("DYNT Kinetic colorMode must be single, bands, or gradient.");
  }
  if (!Number.isFinite(cellGap) || cellGap < 0 || cellGap > 8) {
    throw new TypeError("DYNT Kinetic cell gap must be between 0 and 8 pixels.");
  }
  if (
    !Array.isArray(sizes)
    || sizes.length !== 3
    || sizes.some((value) => !Number.isFinite(value) || value < 8 || value > 120)
  ) {
    throw new TypeError("DYNT Kinetic cell size must be 8 to 120 pixels or a three-level size tree.");
  }
  if (
    !Array.isArray(colors)
    || colors.length < 1
    || colors.length > 8
    || colors.some((color) => typeof color !== "string" || !color.trim())
  ) {
    throw new TypeError("DYNT Kinetic colors must contain one to eight non-empty CSS colors.");
  }
  if (
    !Number.isFinite(fieldConfiguration.radius)
    || fieldConfiguration.radius < 1
    || fieldConfiguration.radius > 8
  ) {
    throw new TypeError("DYNT Kinetic field radius must be between 1 and 8 cells.");
  }
  if (
    !Number.isFinite(fieldConfiguration.tail)
    || fieldConfiguration.tail < 0.5
    || fieldConfiguration.tail > 4
  ) {
    throw new TypeError("DYNT Kinetic field tail must be between 0.5 and 4.");
  }
  if (
    !Number.isFinite(fieldConfiguration.noise)
    || fieldConfiguration.noise < 0
    || fieldConfiguration.noise > 1
  ) {
    throw new TypeError("DYNT Kinetic field noise must be between 0 and 1.");
  }
  if (
    !Number.isFinite(fieldConfiguration.intensity)
    || fieldConfiguration.intensity < 0.1
    || fieldConfiguration.intensity > 2
  ) {
    throw new TypeError("DYNT Kinetic field intensity must be between 0.1 and 2.");
  }
  if (
    !Number.isInteger(fieldConfiguration.idleDelay)
    || fieldConfiguration.idleDelay < 40
    || fieldConfiguration.idleDelay > 1000
  ) {
    throw new TypeError("DYNT Kinetic field idleDelay must be an integer between 40 and 1000 milliseconds.");
  }
  if (
    !Number.isInteger(fieldConfiguration.maxCells)
    || fieldConfiguration.maxCells < 1
    || fieldConfiguration.maxCells > 256
  ) {
    throw new TypeError("DYNT Kinetic field maxCells must be an integer between 1 and 256.");
  }
  if (!Number.isFinite(flowConfiguration.speed) || flowConfiguration.speed < 0.25 || flowConfiguration.speed > 2.5) {
    throw new TypeError("DYNT Kinetic flow speed must be between 0.25 and 2.5.");
  }
  if (!Number.isFinite(flowConfiguration.thickness) || flowConfiguration.thickness < 0.5 || flowConfiguration.thickness > 2.5) {
    throw new TypeError("DYNT Kinetic flow thickness must be between 0.5 and 2.5.");
  }
  if (!Number.isFinite(flowConfiguration.recovery) || flowConfiguration.recovery < 0.5 || flowConfiguration.recovery > 2) {
    throw new TypeError("DYNT Kinetic flow recovery must be between 0.5 and 2.");
  }
  if (!Number.isFinite(flowConfiguration.intensity) || flowConfiguration.intensity < 0.1 || flowConfiguration.intensity > 2) {
    throw new TypeError("DYNT Kinetic flow intensity must be between 0.1 and 2.");
  }
  if (!Number.isFinite(flowConfiguration.turbulence) || flowConfiguration.turbulence < 0 || flowConfiguration.turbulence > 1) {
    throw new TypeError("DYNT Kinetic flow turbulence must be between 0 and 1.");
  }
  if (!Number.isFinite(flowConfiguration.turbulenceScale) || flowConfiguration.turbulenceScale < 1 || flowConfiguration.turbulenceScale > 8) {
    throw new TypeError("DYNT Kinetic flow turbulenceScale must be between 1 and 8.");
  }
  if (!Number.isFinite(flowConfiguration.growth) || flowConfiguration.growth < 0 || flowConfiguration.growth > 1) {
    throw new TypeError("DYNT Kinetic flow growth must be between 0 and 1.");
  }
  if (!Number.isFinite(flowConfiguration.overflow) || flowConfiguration.overflow < 0 || flowConfiguration.overflow > 64) {
    throw new TypeError("DYNT Kinetic flow overflow must be between 0 and 64 pixels.");
  }
  if (!Number.isInteger(flowConfiguration.maxCells) || flowConfiguration.maxCells < 16 || flowConfiguration.maxCells > 2000) {
    throw new TypeError("DYNT Kinetic flow maxCells must be an integer between 16 and 2000.");
  }
  if (!Number.isInteger(flowConfiguration.maxWaves) || flowConfiguration.maxWaves < 1 || flowConfiguration.maxWaves > 8) {
    throw new TypeError("DYNT Kinetic flow maxWaves must be an integer between 1 and 8.");
  }
  if (typeof flowConfiguration.multi !== "boolean" || typeof flowConfiguration.seedLocked !== "boolean") {
    throw new TypeError("DYNT Kinetic flow multi and seedLocked must be boolean values.");
  }
  if (!Number.isInteger(flowConfiguration.seed) || flowConfiguration.seed < 0 || flowConfiguration.seed > 999999) {
    throw new TypeError("DYNT Kinetic flow seed must be an integer between 0 and 999999.");
  }

  return Object.freeze({
    cells: Object.freeze({
      colorMode,
      colors: Object.freeze([...colors]),
      gap: cellGap,
      shape: cellShape,
      sizes: Object.freeze([...sizes]) as readonly [number, number, number],
    }),
    content,
    drift,
    driftAmount,
    field: Object.freeze(fieldConfiguration),
    flow: Object.freeze(flowConfiguration),
    maxActive,
    maxSurfaces,
    maxTilt,
    pressure,
    response,
    tilt,
    wave,
    waveDuration,
  });
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createRestValues(): MotionValues {
  return { pressure: 0, x: 0, y: 0 };
}

function createMotionState(): MotionState {
  return {
    current: createRestValues(),
    driftX: 0,
    driftY: 0,
    flows: [],
    impactStartedAt: null,
    target: createRestValues(),
    waveProgress: 1,
    waveStartedAt: null,
    waveX: 0,
    waveY: 0,
  };
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
  const configuration = ownership.activeOwner?.configuration ?? DEFAULT_CONFIGURATION;
  setMotionProperty(element, "pressure", state.current.pressure.toFixed(4));
  setMotionProperty(element, "pointer-x", `${((state.current.x + 1) * 50).toFixed(2)}%`);
  setMotionProperty(element, "pointer-y", `${((state.current.y + 1) * 50).toFixed(2)}%`);

  const maxTilt = configuration.maxTilt;
  setMotionProperty(element, "tilt-x", `${(-state.current.y * maxTilt).toFixed(3)}deg`);
  setMotionProperty(element, "tilt-y", `${(state.current.x * maxTilt).toFixed(3)}deg`);
  setMotionProperty(element, "drift-x", `${state.driftX.toFixed(3)}px`);
  setMotionProperty(element, "drift-y", `${state.driftY.toFixed(3)}px`);
  setMotionProperty(
    element,
    "content-x",
    `${(configuration.content ? state.current.x * 4 : 0).toFixed(3)}px`,
  );
  setMotionProperty(
    element,
    "content-y",
    `${(configuration.content ? state.current.y * 4 : 0).toFixed(3)}px`,
  );
  setMotionProperty(element, "wave-x", `${((state.waveX + 1) * 50).toFixed(2)}%`);
  setMotionProperty(element, "wave-y", `${((state.waveY + 1) * 50).toFixed(2)}%`);
  setMotionProperty(element, "wave-scale", (0.25 + state.waveProgress * 3).toFixed(4));
  setMotionProperty(
    element,
    "wave-opacity",
    (state.waveStartedAt === null ? 0 : (1 - state.waveProgress) * 0.75).toFixed(4),
  );
  renderKineticCanvas(ownership.canvas, element, configuration, {
    flows: state.flows,
    pressure: state.current.pressure,
    x: state.current.x,
    y: state.current.y,
  });
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
  ownership.state = createMotionState();
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
  if (VOID_ELEMENTS.has(element.tagName)) return { canvas: null, layer: null };

  const layer = element.ownerDocument.createElement("span");
  const canvas = element.ownerDocument.createElement("canvas");
  layer.className = "dynt-kinetic__layer";
  layer.setAttribute(LAYER_ATTRIBUTE, "");
  layer.setAttribute("aria-hidden", "true");
  canvas.className = "dynt-kinetic__canvas";
  canvas.setAttribute(CANVAS_ATTRIBUTE, "");
  layer.append(canvas);
  element.append(layer);
  return { canvas, layer };
}

function ensureLayer(element: HTMLElement, ownership: ElementOwnership) {
  if (ownership.layer?.parentElement === element || VOID_ELEMENTS.has(element.tagName)) return;
  ownership.layer?.remove();
  const decoration = createLayer(element);
  ownership.canvas = decoration.canvas;
  ownership.layer = decoration.layer;
  writeMotionState(ownership);
}

export function createKinetic({
  root,
  selector,
  exclude,
  observe = false,
  cells,
  effects,
  field,
  flow,
  limits,
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
  const configuration = normalizeConfiguration(effects, motion, limits, cells, field, flow);
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
  const fieldTimers = new Map<ElementOwnership, number>();
  const reducedImpactTimers = new Map<ElementOwnership, number>();

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
      && Math.abs(state.current.pressure - state.target.pressure) <= REST_EPSILON
      && Math.abs(state.driftX) <= REST_EPSILON
      && Math.abs(state.driftY) <= REST_EPSILON;
  }

  function clearFieldTimer(ownership: ElementOwnership) {
    const timer = fieldTimers.get(ownership);
    if (timer !== undefined) view?.clearTimeout(timer);
    fieldTimers.delete(ownership);
  }

  function scheduleFieldSuppression(ownership: ElementOwnership) {
    clearFieldTimer(ownership);
    if (!owner.configuration.pressure || !view) return;
    const timer = view.setTimeout(() => {
      fieldTimers.delete(ownership);
      if (ownership.activeOwner !== owner || activeElement !== ownership.element) return;
      ownership.state.target = {
        ...ownership.state.target,
        pressure: 0,
      };
      scheduleMotion(ownership);
    }, owner.configuration.field.idleDelay);
    fieldTimers.set(ownership, timer);
  }

  function animate(timestamp: number) {
    frame = undefined;

    for (const ownership of activeStates) {
      if (ownership.activeOwner !== owner) {
        activeStates.delete(ownership);
        continue;
      }

      const { state } = ownership;
      const { current, target } = state;
      const { response } = owner.configuration;

      if (state.impactStartedAt !== null) {
        if (state.impactStartedAt < 0) state.impactStartedAt = timestamp;
        if (timestamp - state.impactStartedAt >= 90) {
          state.impactStartedAt = null;
          state.target = createRestValues();
        }
      }
      for (const flowState of state.flows) {
        if (flowState.startedAt < 0) flowState.startedAt = timestamp;
        flowState.progress = clamp(
          (timestamp - flowState.startedAt)
            / (owner.configuration.waveDuration / owner.configuration.flow.speed),
          0,
          1,
        );
      }
      state.flows = state.flows.filter((flowState) => flowState.progress < 1);
      const latestFlow = state.flows[state.flows.length - 1];
      state.waveProgress = latestFlow?.progress ?? 1;
      state.waveStartedAt = latestFlow?.startedAt ?? null;
      state.waveX = latestFlow?.x ?? state.waveX;
      state.waveY = latestFlow?.y ?? state.waveY;

      const driftActive = owner.configuration.drift
        && activeElement === ownership.element
        && state.target.pressure > 0;
      if (driftActive) {
        const phase = timestamp / 700;
        state.driftX = Math.sin(phase) * owner.configuration.driftAmount;
        state.driftY = Math.cos(phase * 0.83) * owner.configuration.driftAmount;
      } else {
        state.driftX += (0 - state.driftX) * response;
        state.driftY += (0 - state.driftY) * response;
      }

      current.x += (target.x - current.x) * response;
      current.y += (target.y - current.y) * response;
      current.pressure += (target.pressure - current.pressure) * response;

      if (
        isAtRest(state)
        && !driftActive
        && state.impactStartedAt === null
        && state.flows.length === 0
      ) {
        current.x = target.x;
        current.y = target.y;
        current.pressure = target.pressure;
        state.driftX = 0;
        state.driftY = 0;
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

    if (!activeStates.has(ownership) && activeStates.size >= owner.configuration.maxActive) {
      const oldest = activeStates.values().next().value as ElementOwnership | undefined;
      if (oldest) rest(oldest, true);
    }
    activeStates.add(ownership);
    if (frame === undefined) frame = view.requestAnimationFrame(animate);
  }

  function rest(ownership: ElementOwnership, immediate = false) {
    clearFieldTimer(ownership);
    ownership.state.target = createRestValues();
    if (immediate) {
      ownership.state = createMotionState();
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

  function formationAllowsMotion(element: HTMLElement) {
    let current: HTMLElement | null = element;

    while (current) {
      const phase = current.getAttribute(FORMATION_PHASE_ATTRIBUTE);
      if (phase !== null && phase !== "formed") return false;
      if (current === root) return true;
      current = current.parentElement;
    }

    return true;
  }

  function handlePointer(event: PointerEvent, suppressField = true) {
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
    if (!formationAllowsMotion(element)) {
      rest(ownership, true);
      return;
    }
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
    if (suppressField) scheduleFieldSuppression(ownership);
    else clearFieldTimer(ownership);
  }

  function startWave(ownership: ElementOwnership) {
    if (!owner.configuration.wave || prefersReducedMotion()) return;
    const nextFlow: MotionFlow = {
      progress: 0,
      startedAt: -1,
      x: ownership.state.target.x,
      y: ownership.state.target.y,
    };
    ownership.state.flows = owner.configuration.flow.multi
      ? [...ownership.state.flows, nextFlow].slice(-owner.configuration.flow.maxWaves)
      : [nextFlow];
    ownership.state.waveX = nextFlow.x;
    ownership.state.waveY = nextFlow.y;
    ownership.state.waveProgress = 0;
    ownership.state.waveStartedAt = -1;
    scheduleMotion(ownership);
  }

  function handlePointerDown(event: PointerEvent) {
    handlePointer(event, false);
    const element = findPointerTarget(event);
    if (!element) return;
    const ownership = ELEMENT_OWNERSHIP.get(element);
    if (ownership?.activeOwner === owner) startWave(ownership);
  }

  function impact(target: HTMLElement, input: KineticImpactInput = {}) {
    if (destroyed || paused) return;
    if (!elements.has(target)) {
      throw new TypeError("DYNT Kinetic impacts require a managed target.");
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("DYNT Kinetic impact input must be an object.");
    }
    for (const name of Object.keys(input)) {
      if (name !== "pressure" && name !== "x" && name !== "y") {
        throw new TypeError(`DYNT Kinetic received an unknown impact option: ${name}.`);
      }
    }

    const x = input.x ?? 0;
    const y = input.y ?? 0;
    const pressure = input.pressure ?? 1;
    if (!Number.isFinite(x) || x < -1 || x > 1 || !Number.isFinite(y) || y < -1 || y > 1) {
      throw new TypeError("DYNT Kinetic impact coordinates must be between -1 and 1.");
    }
    if (!Number.isFinite(pressure) || pressure < 0 || pressure > 1) {
      throw new TypeError("DYNT Kinetic impact pressure must be between 0 and 1.");
    }

    const ownership = ELEMENT_OWNERSHIP.get(target);
    if (!ownership || ownership.activeOwner !== owner) {
      throw new TypeError("DYNT Kinetic impacts require the active target owner.");
    }

    const values = { pressure, x, y };
    if (prefersReducedMotion()) {
      ownership.state.current = { pressure, x: 0, y: 0 };
      ownership.state.target = { ...ownership.state.current };
      writeMotionState(ownership);
      const previousTimer = reducedImpactTimers.get(ownership);
      if (previousTimer !== undefined) view?.clearTimeout(previousTimer);
      if (view) {
        const timer = view.setTimeout(() => {
          reducedImpactTimers.delete(ownership);
          if (ownership.activeOwner === owner) rest(ownership, true);
        }, 120);
        reducedImpactTimers.set(ownership, timer);
      } else {
        rest(ownership, true);
      }
      return;
    }

    ownership.state.target = values;
    ownership.state.impactStartedAt = -1;
    startWave(ownership);
    scheduleMotion(ownership);
  }

  function handlePointerLeave() {
    if (destroyed || paused) return;
    activeElement = null;
    for (const element of elements) {
      const ownership = ELEMENT_OWNERSHIP.get(element);
      if (ownership?.activeOwner === owner) {
        clearFieldTimer(ownership);
        rest(ownership);
      }
    }
  }

  function handleFormationPhase(event: Event) {
    const transition = event as CustomEvent<{ phase?: string }>;
    if (transition.detail?.phase === "formed") return;
    const formationElement = event.target as HTMLElement | null;
    if (!formationElement || formationElement.nodeType !== 1) return;

    for (const element of elements) {
      if (element !== formationElement && !formationElement.contains(element)) continue;
      const ownership = ELEMENT_OWNERSHIP.get(element);
      if (ownership?.activeOwner === owner) rest(ownership, true);
    }
    if (activeStates.size === 0) cancelFrame();
  }

  function stopMotion() {
    cancelFrame();
    activeStates.clear();
    activeElement = null;
    for (const timer of fieldTimers.values()) view?.clearTimeout(timer);
    fieldTimers.clear();
    for (const timer of reducedImpactTimers.values()) view?.clearTimeout(timer);
    reducedImpactTimers.clear();
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
      canvas: null,
      element,
      layer: null,
      owners: new Set([owner]),
      snapshot: {
        hadBaseClass: element.classList.contains(BASE_CLASS),
        kineticAttribute: element.getAttribute(KINETIC_ATTRIBUTE),
        motionStyles: snapshotMotionStyles(element),
      },
      state: createMotionState(),
    };
    ELEMENT_OWNERSHIP.set(element, ownership);
    elements.add(element);
    element.classList.add(BASE_CLASS);
    element.setAttribute(KINETIC_ATTRIBUTE, "");
    const decoration = createLayer(element);
    ownership.canvas = decoration.canvas;
    ownership.layer = decoration.layer;
    writeMotionState(ownership);
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
    clearFieldTimer(ownership);
    const timer = reducedImpactTimers.get(ownership);
    if (timer !== undefined) {
      view?.clearTimeout(timer);
      reducedImpactTimers.delete(ownership);
    }
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
      const targets = findTargets(root, selector, excludeSelector)
        .slice(0, owner.configuration.maxSurfaces);
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
    root.removeEventListener("pointerdown", handlePointerDown as EventListener);
    root.removeEventListener("pointerleave", handlePointerLeave);
    root.removeEventListener(FORMATION_PHASE_EVENT, handleFormationPhase);
    for (const element of Array.from(elements)) release(element);
  }

  function update(options: KineticUpdateOptions) {
    if (destroyed) return;
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("DYNT Kinetic update options must be an object.");
    }
    for (const name of Object.keys(options)) {
      if (
        name !== "cells"
        && name !== "effects"
        && name !== "field"
        && name !== "flow"
        && name !== "limits"
        && name !== "motion"
      ) {
        throw new TypeError(`DYNT Kinetic received an unknown update option: ${name}.`);
      }
    }

    owner.configuration = normalizeConfiguration(
      options.effects,
      options.motion,
      options.limits,
      options.cells,
      options.field,
      options.flow,
      owner.configuration,
    );
    stopMotion();
    refresh();
  }

  refresh();
  root.addEventListener("pointermove", handlePointer as EventListener);
  root.addEventListener("pointerdown", handlePointerDown as EventListener);
  root.addEventListener("pointerleave", handlePointerLeave);
  root.addEventListener(FORMATION_PHASE_EVENT, handleFormationPhase);

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
    impact,
    update,
    refresh,
    destroy,
  };
}
