export type FormationTokenName =
  | "duration"
  | "easing"
  | "fill-color"
  | "line-color"
  | "line-style"
  | "line-width"
  | "overflow";

export type FormationTokens = Readonly<{
  duration?: number;
  easing?: string;
  fillColor?: string;
  lineColor?: string;
  lineStyle?: "solid" | "dashed" | "dotted" | "double";
  lineWidth?: string;
  overflow?: number;
}>;

export type ResolvedFormationTokens = Partial<Record<FormationTokenName, string>>;

export const FORMATION_TOKEN_PROPERTIES: Readonly<Record<FormationTokenName, string>> = {
  duration: "--dynt-formation-duration",
  easing: "--dynt-formation-easing",
  "fill-color": "--dynt-formation-fill-color",
  "line-color": "--dynt-line-color",
  "line-style": "--dynt-line-style",
  "line-width": "--dynt-line-width",
  overflow: "--dynt-formation-overflow",
};

const TOKEN_OPTION_NAMES = new Set([
  "duration",
  "easing",
  "fillColor",
  "lineColor",
  "lineStyle",
  "lineWidth",
  "overflow",
]);

export function normalizeFormationTokens(
  tokens: FormationTokens | undefined,
  supportedTokens: readonly FormationTokenName[],
  label = "tokens",
): ResolvedFormationTokens {
  if (tokens === undefined) return {};
  if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) {
    throw new TypeError(`DYNT Formation ${label} must be an object.`);
  }

  for (const name of Object.keys(tokens)) {
    if (!TOKEN_OPTION_NAMES.has(name)) {
      throw new TypeError(`DYNT Formation received an unknown ${label} option: ${name}.`);
    }
  }

  const supported = new Set(supportedTokens);
  const normalized: ResolvedFormationTokens = {};

  if (tokens.duration !== undefined) {
    if (!supported.has("duration")) {
      throw new TypeError("DYNT Formation profile does not support the duration token.");
    }
    if (!Number.isFinite(tokens.duration) || tokens.duration < 0) {
      throw new TypeError("DYNT Formation duration must be a non-negative finite number.");
    }
    normalized.duration = `${tokens.duration}ms`;
  }

  if (tokens.easing !== undefined) {
    if (!supported.has("easing")) {
      throw new TypeError("DYNT Formation profile does not support the easing token.");
    }
    if (typeof tokens.easing !== "string" || !tokens.easing.trim()) {
      throw new TypeError("DYNT Formation easing must be a non-empty CSS timing function.");
    }
    normalized.easing = tokens.easing;
  }

  if (tokens.fillColor !== undefined) {
    if (!supported.has("fill-color")) {
      throw new TypeError("DYNT Formation profile does not support the fillColor token.");
    }
    if (typeof tokens.fillColor !== "string" || !tokens.fillColor.trim()) {
      throw new TypeError("DYNT Formation fillColor must be a non-empty string.");
    }
    normalized["fill-color"] = tokens.fillColor;
  }

  if (tokens.lineColor !== undefined) {
    if (!supported.has("line-color")) {
      throw new TypeError("DYNT Formation profile does not support the lineColor token.");
    }
    if (typeof tokens.lineColor !== "string" || !tokens.lineColor.trim()) {
      throw new TypeError("DYNT Formation lineColor must be a non-empty string.");
    }
    normalized["line-color"] = tokens.lineColor;
  }

  if (tokens.lineStyle !== undefined) {
    if (!supported.has("line-style")) {
      throw new TypeError("DYNT Formation profile does not support the lineStyle token.");
    }
    if (!["solid", "dashed", "dotted", "double"].includes(tokens.lineStyle)) {
      throw new TypeError("DYNT Formation lineStyle must be solid, dashed, dotted, or double.");
    }
    normalized["line-style"] = tokens.lineStyle;
  }

  if (tokens.lineWidth !== undefined) {
    if (!supported.has("line-width")) {
      throw new TypeError("DYNT Formation profile does not support the lineWidth token.");
    }
    if (typeof tokens.lineWidth !== "string" || !tokens.lineWidth.trim()) {
      throw new TypeError("DYNT Formation lineWidth must be a non-empty string.");
    }
    normalized["line-width"] = tokens.lineWidth;
  }

  if (tokens.overflow !== undefined) {
    if (!supported.has("overflow")) {
      throw new TypeError("DYNT Formation profile does not support the overflow token.");
    }
    if (!Number.isFinite(tokens.overflow) || tokens.overflow < 0 || tokens.overflow > 64) {
      throw new TypeError("DYNT Formation overflow must be between 0 and 64 pixels.");
    }
    normalized.overflow = `${tokens.overflow}px`;
  }

  return normalized;
}

export function readLocalFormationTokens(
  element: HTMLElement,
  supportedTokens: readonly FormationTokenName[],
): ResolvedFormationTokens {
  const duration = element.getAttribute("data-dynt-formation-duration");
  const easing = element.getAttribute("data-dynt-formation-easing");
  const fillColor = element.getAttribute("data-dynt-fill-color");
  const lineColor = element.getAttribute("data-dynt-line-color");
  const lineStyle = element.getAttribute("data-dynt-line-style");
  const lineWidth = element.getAttribute("data-dynt-line-width");
  const overflow = element.getAttribute("data-dynt-formation-overflow");

  return normalizeFormationTokens({
    duration: duration === null ? undefined : Number(duration.trim() ? duration : Number.NaN),
    easing: easing === null ? undefined : easing,
    fillColor: fillColor === null ? undefined : fillColor,
    lineColor: lineColor === null ? undefined : lineColor,
    lineStyle: lineStyle === null ? undefined : lineStyle as FormationTokens["lineStyle"],
    lineWidth: lineWidth === null ? undefined : lineWidth,
    overflow: overflow === null ? undefined : Number(overflow.trim() ? overflow : Number.NaN),
  }, supportedTokens, "local tokens");
}

export function mergeFormationTokens(
  ...layers: readonly ResolvedFormationTokens[]
): ResolvedFormationTokens {
  return Object.assign({}, ...layers);
}
