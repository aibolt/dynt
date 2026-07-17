import {
  FORMATION_TOKEN_PROPERTIES,
  type FormationTokenName,
} from "./tokens.js";

export type FormationTransitionHook = Readonly<{
  propertyName: string;
  pseudoElement: "::before" | "::after";
}>;

export type FormationProfileDefinition<Name extends string = string> = Readonly<{
  name: Name;
  className: string;
  geometry: Readonly<{
    type: "edge-lines" | "line-forge";
    edgeOrder: "horizontal-vertical" | "vertical-horizontal";
  }>;
  tokens: readonly FormationTokenName[];
  lifecycle: Readonly<{
    formComplete: FormationTransitionHook;
    withdrawComplete: FormationTransitionHook;
  }>;
  capabilities: Readonly<{
    reducedMotion: boolean;
    responsive: boolean;
  }>;
  rendering: "pseudo-elements";
}>;

export type FormationProfileRegistry<Name extends string = string> = Readonly<{
  names: readonly Name[];
  get(name: string): FormationProfileDefinition<Name> | undefined;
}>;

export function createFormationProfileRegistry<
  const Profiles extends readonly FormationProfileDefinition[],
>(profiles: Profiles): FormationProfileRegistry<Profiles[number]["name"]> {
  const definitions = new Map<string, FormationProfileDefinition>();

  for (const profile of profiles) {
    if (!profile || typeof profile.name !== "string" || !profile.name.trim()) {
      throw new TypeError("DYNT Formation profiles require a non-empty name.");
    }
    if (
      typeof profile.className !== "string"
      || !profile.className.startsWith("dynt-formation--")
      || /\s/.test(profile.className)
    ) {
      throw new TypeError("DYNT Formation profile classes must use the dynt-formation-- prefix.");
    }
    if (definitions.has(profile.name)) {
      throw new TypeError(`DYNT Formation received a duplicate profile: ${profile.name}.`);
    }
    if (
      !profile.geometry
      || (profile.geometry.type !== "edge-lines" && profile.geometry.type !== "line-forge")
      || (
        profile.geometry.edgeOrder !== "horizontal-vertical"
        && profile.geometry.edgeOrder !== "vertical-horizontal"
      )
      || profile.rendering !== "pseudo-elements"
    ) {
      throw new TypeError("DYNT Formation profiles require supported geometry and rendering metadata.");
    }
    if (
      !Array.isArray(profile.tokens)
      || profile.tokens.some((token) => !Object.hasOwn(FORMATION_TOKEN_PROPERTIES, token))
    ) {
      throw new TypeError("DYNT Formation profiles contain an unsupported token name.");
    }
    if (
      !profile.capabilities
      || typeof profile.capabilities.reducedMotion !== "boolean"
      || typeof profile.capabilities.responsive !== "boolean"
    ) {
      throw new TypeError("DYNT Formation profiles require capability metadata.");
    }

    for (const hook of [profile.lifecycle?.formComplete, profile.lifecycle?.withdrawComplete]) {
      if (
        !hook
        || typeof hook.propertyName !== "string"
        || !hook.propertyName.trim()
        || (hook.pseudoElement !== "::before" && hook.pseudoElement !== "::after")
      ) {
        throw new TypeError("DYNT Formation profiles require valid lifecycle completion hooks.");
      }
    }

    const definition = Object.freeze({
      ...profile,
      geometry: Object.freeze({ ...profile.geometry }),
      tokens: Object.freeze([...profile.tokens]),
      lifecycle: Object.freeze({
        formComplete: Object.freeze({ ...profile.lifecycle.formComplete }),
        withdrawComplete: Object.freeze({ ...profile.lifecycle.withdrawComplete }),
      }),
      capabilities: Object.freeze({ ...profile.capabilities }),
    });
    definitions.set(profile.name, definition);
  }

  const names = Object.freeze(Array.from(definitions.keys())) as readonly Profiles[number]["name"][];

  return Object.freeze({
    names,
    get(name: string) {
      return definitions.get(name) as FormationProfileDefinition<Profiles[number]["name"]> | undefined;
    },
  });
}

const BUILTIN_PROFILES = [
  {
    name: "line-push",
    className: "dynt-formation--line-push",
    geometry: {
      type: "line-forge",
      edgeOrder: "horizontal-vertical",
    },
    tokens: [
      "duration",
      "easing",
      "fill-color",
      "line-color",
      "line-style",
      "line-width",
      "overflow",
    ],
    lifecycle: {
      formComplete: {
        propertyName: "clip-path",
        pseudoElement: "::after",
      },
      withdrawComplete: {
        propertyName: "clip-path",
        pseudoElement: "::before",
      },
    },
    capabilities: {
      reducedMotion: true,
      responsive: true,
    },
    rendering: "pseudo-elements",
  },
  {
    name: "line-rise",
    className: "dynt-formation--line-rise",
    geometry: {
      type: "line-forge",
      edgeOrder: "vertical-horizontal",
    },
    tokens: [
      "duration",
      "easing",
      "fill-color",
      "line-color",
      "line-style",
      "line-width",
      "overflow",
    ],
    lifecycle: {
      formComplete: {
        propertyName: "clip-path",
        pseudoElement: "::after",
      },
      withdrawComplete: {
        propertyName: "clip-path",
        pseudoElement: "::before",
      },
    },
    capabilities: {
      reducedMotion: true,
      responsive: true,
    },
    rendering: "pseudo-elements",
  },
] as const satisfies readonly FormationProfileDefinition[];

export type FormationProfile = typeof BUILTIN_PROFILES[number]["name"];

export const defaultFormationProfiles = createFormationProfileRegistry(BUILTIN_PROFILES);
