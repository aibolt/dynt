export const FORMATION_PHASES = [
  "unformed",
  "locating",
  "constructing",
  "enclosed",
  "revealing",
  "formed",
  "withdrawing",
  "deconstructing",
] as const;

export type FormationPhase = typeof FORMATION_PHASES[number];
export type FormationCommand = "form" | "withdraw";

type FormationTransitionTable = Readonly<
  Record<FormationPhase, Readonly<Record<FormationCommand, FormationPhase>>>
>;

export const FORMATION_TRANSITIONS: FormationTransitionTable = {
  unformed: {
    form: "locating",
    withdraw: "unformed",
  },
  locating: {
    form: "constructing",
    withdraw: "unformed",
  },
  constructing: {
    form: "enclosed",
    withdraw: "deconstructing",
  },
  enclosed: {
    form: "revealing",
    withdraw: "deconstructing",
  },
  revealing: {
    form: "formed",
    withdraw: "withdrawing",
  },
  formed: {
    form: "formed",
    withdraw: "withdrawing",
  },
  withdrawing: {
    form: "revealing",
    withdraw: "deconstructing",
  },
  deconstructing: {
    form: "constructing",
    withdraw: "unformed",
  },
};

export function nextFormationPhase(
  phase: FormationPhase,
  command: FormationCommand,
): FormationPhase {
  return FORMATION_TRANSITIONS[phase][command];
}
