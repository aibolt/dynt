import assert from "node:assert/strict";
import test from "node:test";
import { Window } from "happy-dom";

import { createFormation } from "../packages/formation/dist/index.js";
import { createKinetic } from "../packages/kinetic/dist/index.js";

function installAnimationFrames(window) {
  const callbacks = [];
  let identifier = 0;
  window.requestAnimationFrame = (callback) => {
    callbacks.push({ callback, identifier: ++identifier });
    return identifier;
  };
  window.cancelAnimationFrame = (cancelledIdentifier) => {
    const index = callbacks.findIndex(({ identifier }) => identifier === cancelledIdentifier);
    if (index >= 0) callbacks.splice(index, 1);
  };
  return {
    get count() {
      return callbacks.length;
    },
    runNext() {
      callbacks.shift()?.callback(window.performance.now());
    },
  };
}

function setRectangle(element) {
  element.getBoundingClientRect = () => ({
    bottom: 100,
    height: 100,
    left: 0,
    right: 100,
    top: 0,
    width: 100,
    x: 0,
    y: 0,
    toJSON() {},
  });
}

function dispatchPointer(window, element) {
  const event = new window.Event("pointermove", { bubbles: true, composed: true });
  Object.defineProperties(event, {
    clientX: { value: 100 },
    clientY: { value: 50 },
    pressure: { value: 0 },
  });
  element.dispatchEvent(event);
}

function completeFormation(window, element) {
  const event = new window.Event("transitionend", { bubbles: true });
  Object.defineProperties(event, {
    propertyName: { value: "clip-path" },
    pseudoElement: { value: "::after" },
  });
  element.dispatchEvent(event);
}

test("combined mode coordinates through DOM state in either initialization order", () => {
  for (const formationFirst of [true, false]) {
    const window = new Window();
    const frames = installAnimationFrames(window);
    const document = window.document;
    document.body.innerHTML = "<main><button>Button</button></main>";
    const main = document.querySelector("main");
    const button = document.querySelector("button");
    setRectangle(button);
    let formation;
    let kinetic;

    if (formationFirst) {
      formation = createFormation({ root: main, selector: "button" });
      kinetic = createKinetic({
        root: main,
        selector: "button",
        motion: { response: 1 },
      });
    } else {
      kinetic = createKinetic({
        root: main,
        selector: "button",
        motion: { response: 1 },
      });
      formation = createFormation({ root: main, selector: "button" });
    }

    formation.form(button);
    dispatchPointer(window, button);
    assert.equal(frames.count, 0);
    assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "0.000deg");

    completeFormation(window, button);
    dispatchPointer(window, button);
    assert.equal(frames.count, 1);
    frames.runNext();
    assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "8.000deg");

    formation.withdraw(button);
    assert.equal(frames.count, 0);
    assert.equal(button.style.getPropertyValue("--dynt-pressure"), "0.0000");
    assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "0.000deg");

    kinetic.destroy();
    formation.destroy();
  }
});

test("destroying either engine leaves the other engine intact", () => {
  for (const destroyFormationFirst of [true, false]) {
    const window = new Window();
    const document = window.document;
    document.body.innerHTML = "<main><button>Button</button></main>";
    const main = document.querySelector("main");
    const button = document.querySelector("button");
    const formation = createFormation({ root: main, selector: "button" });
    const kinetic = createKinetic({ root: main, selector: "button" });

    if (destroyFormationFirst) {
      formation.destroy();
      assert.equal(button.hasAttribute("data-dynt-formation"), false);
      assert.equal(button.hasAttribute("data-dynt-kinetic"), true);
      assert.equal(button.querySelectorAll("[data-dynt-kinetic-layer]").length, 1);
      kinetic.destroy();
    } else {
      kinetic.destroy();
      assert.equal(button.hasAttribute("data-dynt-kinetic"), false);
      assert.equal(button.hasAttribute("data-dynt-formation"), true);
      formation.destroy();
    }

    assert.equal(button.className, "");
    assert.equal(button.hasAttribute("data-dynt-formation"), false);
    assert.equal(button.hasAttribute("data-dynt-kinetic"), false);
    assert.equal(button.querySelectorAll("[data-dynt-kinetic-layer]").length, 0);
    assert.equal(button.style.getPropertyValue("--dynt-pressure"), "");
  }
});
