export type FormationTokenName = "duration" | "line-color" | "line-width";

export type FormationTokens = Readonly<{
  duration?: number;
  lineColor?: string;
  lineWidth?: string;
}>;

export type ResolvedFormationTokens = Partial<Record<FormationTokenName, string>>;

export const FORMATION_TOKEN_PROPERTIES: Readonly<Record<FormationTokenName, string>> = {
  duration: "--dynt-formation-duration",
  "line-color": "--dynt-line-color",
  "line-width": "--dynt-line-width",
};

const TOKEN_OPTION_NAMES = new Set(["duration", "lineColor", "lineWidth"]);

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

  if (tokens.lineColor !== undefined) {
    if (!supported.has("line-color")) {
      throw new TypeError("DYNT Formation profile does not support the lineColor token.");
    }
    if (typeof tokens.lineColor !== "string" || !tokens.lineColor.trim()) {
      throw new TypeError("DYNT Formation lineColor must be a non-empty string.");
    }
    normalized["line-color"] = tokens.lineColor;
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

  return normalized;
}

export function readLocalFormationTokens(
  element: HTMLElement,
  supportedTokens: readonly FormationTokenName[],
): ResolvedFormationTokens {
  const duration = element.getAttribute("data-dynt-formation-duration");
  const lineColor = element.getAttribute("data-dynt-line-color");
  const lineWidth = element.getAttribute("data-dynt-line-width");

  return normalizeFormationTokens({
    duration: duration === null ? undefined : Number(duration.trim() ? duration : Number.NaN),
    lineColor: lineColor === null ? undefined : lineColor,
    lineWidth: lineWidth === null ? undefined : lineWidth,
  }, supportedTokens, "local tokens");
}

export function mergeFormationTokens(
  ...layers: readonly ResolvedFormationTokens[]
): ResolvedFormationTokens {
  return Object.assign({}, ...layers);
}
