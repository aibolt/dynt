import assert from "node:assert/strict";
import test from "node:test";
import { Window } from "happy-dom";

import { createKinetic } from "../dist/index.js";

function flushMutations(window) {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function installAnimationFrames(window) {
  const callbacks = [];
  let identifier = 0;
  let timestamp = window.performance.now();
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
      const next = callbacks.shift();
      timestamp += 16;
      next?.callback(timestamp);
    },
  };
}

function setRectangle(element, { left = 0, top = 0, width = 100, height = 100 } = {}) {
  element.getBoundingClientRect = () => ({
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
    x: left,
    y: top,
    toJSON() {},
  });
}

function dispatchPointer(window, element, type, values = {}) {
  const event = new window.Event(type, { bubbles: true, composed: true });
  Object.defineProperties(event, {
    clientX: { value: values.clientX ?? 50 },
    clientY: { value: values.clientY ?? 50 },
    pointerType: { value: values.pointerType ?? "mouse" },
    pressure: { value: values.pressure ?? 0 },
  });
  element.dispatchEvent(event);
}

test("enhances only matching HTML targets inside the supplied root", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `
    <main><button id="inside">Inside</button><svg><rect></rect></svg></main>
    <button id="outside">Outside</button>
  `;
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "button, rect",
  });
  const inside = document.querySelector("#inside");

  assert.deepEqual(controller.elements, [inside]);
  assert.equal(inside.classList.contains("dynt-kinetic"), true);
  assert.equal(inside.querySelectorAll("[data-dynt-kinetic-layer]").length, 1);
  assert.equal(document.querySelector("#outside").hasAttribute("data-dynt-kinetic"), false);
  assert.equal(document.querySelector("rect").hasAttribute("data-dynt-kinetic"), false);
});

test("decoration layers are hidden from accessibility and omitted for void elements", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><button>Button</button><input aria-label='Input'></main>";
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "button, input",
  });
  const layer = document.querySelector("button [data-dynt-kinetic-layer]");

  assert.equal(layer.getAttribute("aria-hidden"), "true");
  assert.equal(document.querySelector("input").children.length, 0);
  assert.equal(controller.elements.length, 2);
});

test("respects built-in and custom excluded subtrees", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `
    <main>
      <button id="allowed">Allowed</button>
      <section data-dynt-ignore><button>Ignored</button></section>
      <section class="external"><button>Custom</button></section>
    </main>
  `;
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "button",
    exclude: ".external",
  });

  assert.deepEqual(controller.elements.map((element) => element.id), ["allowed"]);
});

test("refresh reconciles additions, removals, and removed decoration", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><button class='target'>First</button></main>";
  const main = document.querySelector("main");
  const first = document.querySelector("button");
  const controller = createKinetic({ root: main, selector: ".target" });

  first.querySelector("[data-dynt-kinetic-layer]").remove();
  assert.equal(controller.refresh(), 0);
  assert.equal(first.querySelectorAll("[data-dynt-kinetic-layer]").length, 1);

  first.classList.remove("target");
  main.insertAdjacentHTML("beforeend", "<article class='target'>Second</article>");
  assert.equal(controller.refresh(), 1);
  assert.equal(first.classList.contains("dynt-kinetic"), false);
  assert.deepEqual(controller.elements, [document.querySelector("article")]);
});

test("observe batches dynamic reconciliation and stops after destroy", async () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main></main>";
  const main = document.querySelector("main");
  const controller = createKinetic({
    root: main,
    selector: ".target",
    observe: true,
  });

  main.insertAdjacentHTML("beforeend", "<button class='target'>First</button>");
  main.insertAdjacentHTML("beforeend", "<article class='target'>Second</article>");
  await flushMutations(window);
  assert.equal(controller.elements.length, 2);

  controller.destroy();
  main.insertAdjacentHTML("beforeend", "<section class='target'>Later</section>");
  await flushMutations(window);
  assert.equal(controller.elements.length, 0);
  assert.equal(document.querySelector("section").hasAttribute("data-dynt-kinetic"), false);
});

test("repeated and nested controllers share one decoration until final cleanup", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><section><button>Button</button></section></main>";
  const main = document.querySelector("main");
  const section = document.querySelector("section");
  const button = document.querySelector("button");
  const outer = createKinetic({ root: main, selector: "button" });
  const inner = createKinetic({ root: section, selector: "button" });

  assert.equal(button.querySelectorAll("[data-dynt-kinetic-layer]").length, 1);
  outer.destroy();
  assert.equal(button.querySelectorAll("[data-dynt-kinetic-layer]").length, 1);
  inner.destroy();
  assert.equal(button.querySelectorAll("[data-dynt-kinetic-layer]").length, 0);
  assert.equal(button.classList.contains("dynt-kinetic"), false);
});

test("delegated pointer input writes bounded pressure and tilt then becomes idle", () => {
  const window = new Window();
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = "<main><button>Button</button></main>";
  const main = document.querySelector("main");
  const button = document.querySelector("button");
  setRectangle(button);
  const controller = createKinetic({
    root: main,
    selector: "button",
    motion: { response: 1 },
  });

  dispatchPointer(window, button, "pointermove", { clientX: 100, clientY: 50 });
  assert.equal(frames.count, 1);
  frames.runNext();

  assert.equal(button.style.getPropertyValue("--dynt-pointer-x"), "100.00%");
  assert.equal(button.style.getPropertyValue("--dynt-pointer-y"), "50.00%");
  assert.equal(button.style.getPropertyValue("--dynt-pressure"), "0.2929");
  assert.equal(button.style.getPropertyValue("--dynt-tilt-x"), "0.000deg");
  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "8.000deg");
  assert.equal(frames.count, 0);

  dispatchPointer(window, button, "pointermove", {
    clientX: 0,
    clientY: 0,
    pointerType: "pen",
    pressure: 0.8,
  });
  frames.runNext();
  assert.equal(button.style.getPropertyValue("--dynt-pressure"), "0.8000");

  dispatchPointer(window, main, "pointerleave");
  frames.runNext();
  assert.equal(button.style.getPropertyValue("--dynt-pressure"), "0.0000");
  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "0.000deg");

  controller.destroy();
});

test("nearest nested surface owns delegated pointer input", () => {
  const window = new Window();
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = `
    <main class="surface"><button class="surface">Button</button></main>
  `;
  const main = document.querySelector("main");
  const button = document.querySelector("button");
  setRectangle(main);
  setRectangle(button);
  const controller = createKinetic({
    root: main,
    selector: ".surface",
    motion: { response: 1 },
  });

  dispatchPointer(window, button, "pointermove", { clientX: 100 });
  frames.runNext();

  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "8.000deg");
  assert.equal(main.style.getPropertyValue("--dynt-tilt-y"), "0.000deg");
  controller.destroy();
});

test("the most specific shared controller owns motion regardless of initialization order", () => {
  for (const innerFirst of [true, false]) {
    const window = new Window();
    const frames = installAnimationFrames(window);
    const document = window.document;
    document.body.innerHTML = "<main><section><button>Button</button></section></main>";
    const main = document.querySelector("main");
    const section = document.querySelector("section");
    const button = document.querySelector("button");
    setRectangle(button);
    let inner;
    let outer;

    if (innerFirst) {
      inner = createKinetic({
        root: section,
        selector: "button",
        motion: { maxTilt: 4, response: 1 },
      });
      outer = createKinetic({
        root: main,
        selector: "button",
        motion: { maxTilt: 20, response: 1 },
      });
    } else {
      outer = createKinetic({
        root: main,
        selector: "button",
        motion: { maxTilt: 20, response: 1 },
      });
      inner = createKinetic({
        root: section,
        selector: "button",
        motion: { maxTilt: 4, response: 1 },
      });
    }

    dispatchPointer(window, button, "pointermove", { clientX: 100 });
    assert.equal(frames.count, 1);
    frames.runNext();
    assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "4.000deg");

    outer.destroy();
    inner.destroy();
  }
});

test("pause and update control input without rebuilding targets", () => {
  const window = new Window();
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = "<main><button>Button</button></main>";
  const button = document.querySelector("button");
  setRectangle(button);
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "button",
    motion: { response: 1 },
  });

  controller.pause();
  dispatchPointer(window, button, "pointermove", { clientX: 100 });
  assert.equal(frames.count, 0);
  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "0.000deg");

  controller.resume();
  controller.update({ effects: { pressure: false }, motion: { maxTilt: 12 } });
  dispatchPointer(window, button, "pointermove", { clientX: 100 });
  frames.runNext();
  assert.equal(button.style.getPropertyValue("--dynt-pressure"), "0.0000");
  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "12.000deg");
  assert.deepEqual(controller.elements, [button]);
  controller.destroy();
});

test("reduced motion preserves pressure without scheduling tilt", () => {
  const window = new Window();
  const frames = installAnimationFrames(window);
  window.matchMedia = () => ({ matches: true });
  const document = window.document;
  document.body.innerHTML = "<main><button>Button</button></main>";
  const button = document.querySelector("button");
  setRectangle(button);
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "button",
  });

  dispatchPointer(window, button, "pointermove", { clientX: 50, clientY: 50 });

  assert.equal(frames.count, 0);
  assert.equal(button.style.getPropertyValue("--dynt-pressure"), "1.0000");
  assert.equal(button.style.getPropertyValue("--dynt-tilt-x"), "0.000deg");
  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "0.000deg");
  controller.destroy();
});

test("damped motion stops scheduling after reaching rest", () => {
  const window = new Window();
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = "<main><button>Button</button></main>";
  const button = document.querySelector("button");
  setRectangle(button);
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "button",
    motion: { response: 0.5 },
  });

  dispatchPointer(window, button, "pointermove", { clientX: 100 });
  let frameCount = 0;
  while (frames.count > 0 && frameCount < 30) {
    frames.runNext();
    frameCount += 1;
  }

  assert.equal(frames.count, 0);
  assert.equal(frameCount < 30, true);
  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "8.000deg");
  controller.destroy();
});

test("drift runs only during active input and decays back to idle", () => {
  const window = new Window();
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = "<main><button>Button</button></main>";
  const main = document.querySelector("main");
  const button = document.querySelector("button");
  setRectangle(button);
  const controller = createKinetic({
    root: main,
    selector: "button",
    effects: { drift: true },
    motion: { drift: 2, response: 0.5 },
  });

  dispatchPointer(window, button, "pointermove");
  frames.runNext();
  assert.equal(frames.count, 1);
  assert.notEqual(button.style.getPropertyValue("--dynt-drift-x"), "0.000px");

  dispatchPointer(window, main, "pointerleave");
  let frameCount = 0;
  while (frames.count > 0 && frameCount < 30) {
    frames.runNext();
    frameCount += 1;
  }
  assert.equal(frames.count, 0);
  assert.equal(button.style.getPropertyValue("--dynt-drift-x"), "0.000px");
  assert.equal(button.style.getPropertyValue("--dynt-drift-y"), "0.000px");
  controller.destroy();
});

test("pointer waves replace prior reactions and finish within their duration", () => {
  const window = new Window();
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = "<main><button>Button</button></main>";
  const button = document.querySelector("button");
  setRectangle(button);
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "button",
    effects: { wave: true },
    motion: { response: 1, waveDuration: 100 },
  });

  dispatchPointer(window, button, "pointerdown", { clientX: 80 });
  dispatchPointer(window, button, "pointerdown", { clientX: 20 });
  assert.equal(frames.count, 1);
  frames.runNext();
  assert.equal(button.style.getPropertyValue("--dynt-wave-opacity"), "0.7500");
  assert.equal(button.style.getPropertyValue("--dynt-wave-x"), "20.00%");

  let frameCount = 0;
  while (frames.count > 0 && frameCount < 20) {
    frames.runNext();
    frameCount += 1;
  }
  assert.equal(frames.count, 0);
  assert.equal(button.style.getPropertyValue("--dynt-wave-opacity"), "0.0000");
  controller.destroy();
});

test("impact produces one bounded rebound and content response channel", () => {
  const window = new Window();
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = `
    <main><button id="inside">Button</button></main><button id="outside">Outside</button>
  `;
  const inside = document.querySelector("#inside");
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "button",
    effects: { content: true },
    motion: { response: 0.5 },
  });

  controller.impact(inside, { pressure: 0.8, x: 0.5, y: -0.5 });
  assert.equal(frames.count, 1);
  frames.runNext();
  assert.equal(Number(inside.style.getPropertyValue("--dynt-pressure")) > 0, true);
  assert.equal(inside.style.getPropertyValue("--dynt-content-x"), "1.000px");
  assert.equal(inside.style.getPropertyValue("--dynt-content-y"), "-1.000px");

  let frameCount = 0;
  while (frames.count > 0 && frameCount < 40) {
    frames.runNext();
    frameCount += 1;
  }
  assert.equal(frames.count, 0);
  assert.equal(inside.style.getPropertyValue("--dynt-pressure"), "0.0000");
  assert.equal(inside.style.getPropertyValue("--dynt-content-x"), "0.000px");
  assert.throws(
    () => controller.impact(document.querySelector("#outside")),
    /managed target/,
  );
  assert.throws(
    () => controller.impact(inside, { x: 2 }),
    /coordinates must be between -1 and 1/,
  );
  controller.destroy();
});

test("reduced-motion impact uses a static cue without animation frames", async () => {
  const window = new Window();
  const frames = installAnimationFrames(window);
  window.matchMedia = () => ({ matches: true });
  const document = window.document;
  document.body.innerHTML = "<main><button>Button</button></main>";
  const button = document.querySelector("button");
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "button",
  });

  controller.impact(button);
  assert.equal(frames.count, 0);
  assert.equal(button.style.getPropertyValue("--dynt-pressure"), "1.0000");
  await new Promise((resolve) => window.setTimeout(resolve, 140));
  assert.equal(button.style.getPropertyValue("--dynt-pressure"), "0.0000");
  controller.destroy();
});

test("destroy restores application motion properties exactly", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><button>Button</button></main>";
  const button = document.querySelector("button");
  button.style.setProperty("--dynt-pressure", "0.4", "important");
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "button",
  });

  controller.destroy();

  assert.equal(button.style.getPropertyValue("--dynt-pressure"), "0.4");
  assert.equal(button.style.getPropertyPriority("--dynt-pressure"), "important");
  assert.equal(button.style.getPropertyValue("--dynt-tilt-x"), "");
});

test("pause, resume, destroy, and input validation are idempotent", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `
    <button class="dynt-kinetic" data-dynt-kinetic="application">Button</button>
  `;
  const button = document.querySelector("button");
  const controller = createKinetic({ root: document, selector: "button" });

  controller.pause();
  controller.pause();
  assert.equal(controller.paused, true);
  controller.resume();
  assert.equal(controller.paused, false);
  controller.destroy();
  controller.destroy();
  assert.equal(button.classList.contains("dynt-kinetic"), true);
  assert.equal(button.getAttribute("data-dynt-kinetic"), "application");

  assert.throws(() => createKinetic({ root: null, selector: "button" }), /HTML element root/);
  assert.throws(() => createKinetic({ root: document, selector: " " }), /non-empty selector/);
  assert.throws(
    () => createKinetic({ root: document, selector: "button", exclude: "[" }),
    /invalid exclude selector/,
  );
  assert.throws(
    () => createKinetic({
      root: document,
      selector: "button",
      motion: { maxTilt: 31 },
    }),
    /maxTilt must be between 0 and 30/,
  );
  assert.throws(
    () => createKinetic({
      root: document,
      selector: "button",
      effects: { pressure: "yes" },
    }),
    /effects must be boolean values/,
  );
  assert.throws(
    () => createKinetic({
      root: document,
      selector: "button",
      motion: { drift: 5 },
    }),
    /drift must be between 0 and 4/,
  );
  assert.throws(
    () => createKinetic({
      root: document,
      selector: "button",
      motion: { waveDuration: 50 },
    }),
    /waveDuration must be between 100 and 2000/,
  );
});
