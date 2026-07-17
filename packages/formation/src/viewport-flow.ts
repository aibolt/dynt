export type FormationViewportFlow = Readonly<{
  duration?: number;
  enabled?: boolean;
  lineLength?: number;
  overrun?: number;
  stagger?: number;
}>;

export type ResolvedFormationViewportFlow = Readonly<{
  duration: number;
  enabled: boolean;
  lineLength: number;
  overrun: number;
  stagger: number;
}>;

export type FormationViewportFlowOption = boolean | FormationViewportFlow;

const DEFAULT_VIEWPORT_FLOW = Object.freeze({
  duration: 1160,
  enabled: false,
  lineLength: 680,
  overrun: 36,
  stagger: 110,
});

function finiteRange(value: unknown, minimum: number, maximum: number, label: string) {
  if (!Number.isFinite(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new TypeError(`DYNT Formation ${label} must be between ${minimum} and ${maximum}.`);
  }
  return value as number;
}

export function normalizeFormationViewportFlow(
  option: FormationViewportFlowOption | undefined,
): ResolvedFormationViewportFlow {
  if (option === undefined || option === false) return DEFAULT_VIEWPORT_FLOW;
  if (option === true) return Object.freeze({ ...DEFAULT_VIEWPORT_FLOW, enabled: true });
  if (!option || typeof option !== "object" || Array.isArray(option)) {
    throw new TypeError("DYNT Formation viewportFlow must be a boolean or an object.");
  }

  for (const name of Object.keys(option)) {
    if (!["duration", "enabled", "lineLength", "overrun", "stagger"].includes(name)) {
      throw new TypeError(`DYNT Formation received an unknown viewportFlow option: ${name}.`);
    }
  }
  if (option.enabled !== undefined && typeof option.enabled !== "boolean") {
    throw new TypeError("DYNT Formation viewportFlow enabled must be a boolean.");
  }

  return Object.freeze({
    duration: option.duration === undefined
      ? DEFAULT_VIEWPORT_FLOW.duration
      : finiteRange(option.duration, 120, 4000, "viewportFlow duration"),
    enabled: option.enabled ?? true,
    lineLength: option.lineLength === undefined
      ? DEFAULT_VIEWPORT_FLOW.lineLength
      : finiteRange(option.lineLength, 80, 1200, "viewportFlow lineLength"),
    overrun: option.overrun === undefined
      ? DEFAULT_VIEWPORT_FLOW.overrun
      : finiteRange(option.overrun, 0, 160, "viewportFlow overrun"),
    stagger: option.stagger === undefined
      ? DEFAULT_VIEWPORT_FLOW.stagger
      : finiteRange(option.stagger, 0, 1000, "viewportFlow stagger"),
  });
}

export function createFormationFlowLayer(document: Document) {
  const layer = document.createElement("div");
  layer.className = "dynt-formation-flow-layer";
  layer.dataset.dyntFormationFlowLayer = "";
  layer.setAttribute("aria-hidden", "true");
  layer.setAttribute("data-dynt-ignore", "");
  return layer;
}

export function createFormationFlowFlight(
  document: Document,
  element: HTMLElement,
  flow: ResolvedFormationViewportFlow,
  index: number,
  direction: "form" | "withdraw" = "form",
) {
  const bounds = element.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return null;

  const view = document.defaultView;
  const viewportWidth = document.documentElement.clientWidth || view?.innerWidth || 0;
  const viewportHeight = document.documentElement.clientHeight || view?.innerHeight || 0;
  if (!viewportWidth || !viewportHeight) return null;

  const computed = view?.getComputedStyle(element);
  const property = (name: string, fallback: string) => (
    element.style.getPropertyValue(name)
    || computed?.getPropertyValue(name)
    || fallback
  ).trim();
  const xLength = Math.min(flow.lineLength, Math.max(220, viewportWidth * 0.42));
  const yLength = Math.min(flow.lineLength, Math.max(180, viewportHeight * 0.42));
  const flight = document.createElement("div");
  flight.className = "dynt-formation-flow";
  flight.dataset.dyntFormationFlow = "";
  flight.dataset.dyntFlowDirection = direction;
  flight.dataset.dyntFlowIndex = String(index);
  if (element.id) flight.dataset.dyntFlowTarget = element.id;
  flight.style.setProperty("--dynt-flow-duration", `${flow.duration}ms`);
  flight.style.setProperty(
    "--dynt-flow-easing",
    property("--dynt-formation-easing", "cubic-bezier(0.16, 0.72, 0.22, 1)"),
  );
  flight.style.setProperty("--dynt-flow-line-color", property("--dynt-line-color", "currentColor"));
  flight.style.setProperty("--dynt-flow-line-style", property("--dynt-line-style", "solid"));
  flight.style.setProperty("--dynt-flow-line-width", property("--dynt-line-width", "1px"));
  flight.style.setProperty("--dynt-flow-x-length", `${xLength}px`);
  flight.style.setProperty("--dynt-flow-y-length", `${yLength}px`);
  flight.style.setProperty("--dynt-flow-target-left", `${bounds.left}px`);
  flight.style.setProperty("--dynt-flow-target-right", `${bounds.right}px`);
  flight.style.setProperty("--dynt-flow-target-top", `${bounds.top}px`);
  flight.style.setProperty("--dynt-flow-target-bottom", `${bounds.bottom}px`);
  flight.style.setProperty(
    "--dynt-flow-from-right-distance",
    `${viewportWidth - bounds.left + xLength + flow.overrun}px`,
  );
  flight.style.setProperty(
    "--dynt-flow-from-bottom-distance",
    `${viewportHeight - bounds.top + yLength + flow.overrun}px`,
  );
  flight.style.setProperty(
    "--dynt-flow-from-left-distance",
    `${bounds.right + xLength + flow.overrun}px`,
  );
  flight.style.setProperty(
    "--dynt-flow-from-top-distance",
    `${bounds.bottom + yLength + flow.overrun}px`,
  );

  for (const edge of ["top", "right", "bottom", "left"]) {
    const line = document.createElement("i");
    line.className = `dynt-formation-flow-line dynt-formation-flow-line--${edge}`;
    flight.append(line);
  }

  return flight;
}
