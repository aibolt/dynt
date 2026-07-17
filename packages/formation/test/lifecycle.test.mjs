import assert from "node:assert/strict";
import test from "node:test";

import {
  FORMATION_PHASES,
  FORMATION_TRANSITIONS,
  nextFormationPhase,
} from "../dist/lifecycle.js";

function runToTerminal(initialPhase, command, terminalPhase) {
  const phases = [initialPhase];
  let phase = initialPhase;

  while (phase !== terminalPhase) {
    phase = nextFormationPhase(phase, command);
    phases.push(phase);
  }

  return phases;
}

test("form advances through the complete construction sequence", () => {
  assert.deepEqual(runToTerminal("unformed", "form", "formed"), [
    "unformed",
    "locating",
    "constructing",
    "enclosed",
    "revealing",
    "formed",
  ]);
});

test("withdraw advances through the complete reverse sequence", () => {
  assert.deepEqual(runToTerminal("formed", "withdraw", "unformed"), [
    "formed",
    "withdrawing",
    "deconstructing",
    "unformed",
  ]);
});

test("terminal commands remain idempotent", () => {
  assert.equal(nextFormationPhase("formed", "form"), "formed");
  assert.equal(nextFormationPhase("unformed", "withdraw"), "unformed");
});

test("opposing commands reverse active transitions deterministically", () => {
  assert.equal(nextFormationPhase("withdrawing", "form"), "revealing");
  assert.equal(nextFormationPhase("deconstructing", "form"), "constructing");
  assert.equal(nextFormationPhase("revealing", "withdraw"), "withdrawing");
  assert.equal(nextFormationPhase("constructing", "withdraw"), "deconstructing");
});

test("every phase defines a valid form and withdraw transition", () => {
  const validPhases = new Set(FORMATION_PHASES);

  for (const phase of FORMATION_PHASES) {
    assert.equal(validPhases.has(FORMATION_TRANSITIONS[phase].form), true);
    assert.equal(validPhases.has(FORMATION_TRANSITIONS[phase].withdraw), true);
  }
});
