import assert from "node:assert/strict";
import test from "node:test";
import { Window } from "happy-dom";

import { defineFormationElement } from "../dist/formation.js";
import { defineKineticElement } from "../dist/kinetic.js";

function installWindow() {
  const window = new Window();
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.customElements = window.customElements;
  return window;
}

test("Formation custom element mounts, reconnects, and cleans up", () => {
  const window = installWindow();
  const firstDefinition = defineFormationElement("dynt-formation-root", {
    selector: ".surface",
    observe: true,
  });
  const secondDefinition = defineFormationElement("dynt-formation-root", {
    selector: ".different",
  });
  assert.equal(secondDefinition, firstDefinition);

  const element = window.document.createElement("dynt-formation-root");
  element.innerHTML = "<button class='surface'>Button</button>";
  const button = element.querySelector("button");
  window.document.body.append(element);
  assert.equal(button.dataset.dyntFormation, "line-push");

  element.remove();
  assert.equal(button.hasAttribute("data-dynt-formation"), false);
  window.document.body.append(element);
  assert.equal(button.dataset.dyntFormation, "line-push");
  element.remove();
});

test("Kinetic custom element owns one removable decoration layer", () => {
  const window = installWindow();
  defineKineticElement("dynt-kinetic-root", {
    selector: ".surface",
    observe: true,
  });
  const element = window.document.createElement("dynt-kinetic-root");
  element.innerHTML = "<button class='surface'>Button</button>";
  const button = element.querySelector("button");

  window.document.body.append(element);
  assert.equal(button.querySelectorAll("[data-dynt-kinetic-layer]").length, 1);
  element.remove();
  assert.equal(button.querySelectorAll("[data-dynt-kinetic-layer]").length, 0);
  assert.equal(button.hasAttribute("data-dynt-kinetic"), false);
});

test("definition validates browser support and custom-element names", () => {
  installWindow();
  assert.throws(
    () => defineFormationElement("FormationRoot", { selector: ".surface" }),
    /lowercase and contain a hyphen/,
  );

  delete globalThis.customElements;
  delete globalThis.HTMLElement;
  assert.throws(
    () => defineKineticElement("dynt-missing-root", { selector: ".surface" }),
    /browser custom-elements environment/,
  );
});
