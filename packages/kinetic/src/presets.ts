import type {
  KineticCells,
  KineticEffects,
  KineticField,
  KineticFlow,
  KineticMotion,
} from "./index.js";

export type KineticPreset = Readonly<{
  cells: KineticCells;
  effects: KineticEffects;
  field: KineticField;
  flow: KineticFlow;
  motion: KineticMotion;
}>;

export const kineticPresets = Object.freeze({
  structural: Object.freeze({
    cells: Object.freeze({
      colorMode: "gradient",
      colors: Object.freeze(["#155e75", "#22d3ee", "#ecfeff"]),
      gap: 1,
      shape: "square",
      size: Object.freeze([40, 32, 24] as const),
    }),
    effects: Object.freeze({
      content: true,
      drift: true,
      pressure: true,
      tilt: true,
      wave: true,
    }),
    field: Object.freeze({
      idleDelay: 120,
      intensity: 1,
      maxCells: 61,
      noise: 0.18,
      radius: 3,
      tail: 1.55,
    }),
    flow: Object.freeze({
      growth: 0.82,
      intensity: 1,
      maxCells: 420,
      overflow: 14,
      recovery: 1,
      speed: 1,
      thickness: 1,
      turbulence: 0.38,
      turbulenceScale: 4,
    }),
    motion: Object.freeze({
      contentLift: 12,
      contentTravel: 3,
      drift: 1.5,
      maxTilt: 1.35,
      response: 0.18,
      waveDuration: 640,
    }),
  }),
  locator: Object.freeze({
    cells: Object.freeze({
      colorMode: "single",
      colors: Object.freeze(["#67e8f9"]),
      gap: 0,
      shape: "hexagon",
      size: Object.freeze([40, 32, 26] as const),
    }),
    effects: Object.freeze({
      content: true,
      drift: false,
      pressure: true,
      tilt: true,
      wave: true,
    }),
    field: Object.freeze({
      idleDelay: 120,
      intensity: 1.35,
      maxCells: 61,
      noise: 0.22,
      radius: 3,
      tail: 1.55,
    }),
    flow: Object.freeze({
      growth: 1,
      intensity: 1.35,
      maxCells: 420,
      overflow: 0,
      recovery: 1.15,
      speed: 1.15,
      thickness: 0.9,
      turbulence: 0.2,
      turbulenceScale: 4,
    }),
    motion: Object.freeze({
      contentLift: 10,
      contentTravel: 3,
      maxTilt: 1.35,
      response: 0.2,
      waveDuration: 560,
    }),
  }),
} as const satisfies Readonly<Record<string, KineticPreset>>);
