import assert from "node:assert/strict";
import test from "node:test";
import { Window } from "happy-dom";

import { createKinetic, kineticPresets } from "../dist/index.js";

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

function installCanvasContext(window) {
  const operations = [];
  const context = {
    beginPath() {
      operations.push("beginPath");
    },
    clearRect() {},
    closePath() {
      operations.push("closePath");
    },
    ellipse() {
      operations.push("ellipse");
    },
    fill() {
      operations.push("fill");
    },
    fillStyle: "",
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    lineTo() {
      operations.push("lineTo");
    },
    moveTo() {
      operations.push("moveTo");
    },
    rect() {
      operations.push("rect");
    },
    setTransform() {},
  };
  window.HTMLCanvasElement.prototype.getContext = () => context;
  return operations;
}

function installElementAnimations(window) {
  const animations = [];
  window.HTMLElement.prototype.animate = function animate(keyframes, options) {
    const animation = {
      cancel() {
        animation.oncancel?.();
      },
      oncancel: null,
      onfinish: null,
    };
    animations.push({ animation, keyframes, options, target: this });
    return animation;
  };
  return animations;
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

test("an explicitly supplied shadow root owns input within its boundary", () => {
  const window = new Window();
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = "<div id='host'></div><button id='outside'>Outside</button>";
  const shadowRoot = document.querySelector("#host").attachShadow({ mode: "open" });
  shadowRoot.innerHTML = "<button id='inside'>Inside</button>";
  const inside = shadowRoot.querySelector("#inside");
  setRectangle(inside);
  const controller = createKinetic({ root: shadowRoot, selector: "button" });

  dispatchPointer(window, inside, "pointermove", { clientX: 100, pressure: 0.8 });
  frames.runNext();
  assert.notEqual(inside.style.getPropertyValue("--dynt-tilt-y"), "0.000deg");
  assert.equal(document.querySelector("#outside").hasAttribute("data-dynt-kinetic"), false);

  controller.destroy();
  assert.equal(inside.hasAttribute("data-dynt-kinetic"), false);
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
  assert.equal(layer.querySelectorAll("[data-dynt-kinetic-canvas]").length, 1);
  assert.equal(document.querySelector("input").children.length, 0);
  assert.equal(controller.elements.length, 2);
});

test("canvas cells preserve geometry, nesting depth, local overrides, and wave flow", () => {
  const window = new Window();
  const operations = installCanvasContext(window);
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = `
    <main class="surface">
      <section class="surface">
        <button class="surface" data-dynt-cell-shape="hexagon">Button</button>
      </section>
    </main>
  `;
  const surfaces = Array.from(document.querySelectorAll(".surface"));
  surfaces.forEach((surface) => setRectangle(surface, { width: 240, height: 160 }));
  const button = document.querySelector("button");
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: ".surface",
    effects: { wave: true },
    cells: {
      colorMode: "gradient",
      colors: ["#164e63", "#22d3ee", "#ecfeff"],
      shape: "square",
      size: [40, 32, 24],
    },
    flow: { multi: true, maxWaves: 3, overflow: 14, turbulence: 0.4 },
    motion: { response: 1, waveDuration: 100 },
  });
  const canvases = surfaces.map((surface) => (
    Array.from(surface.children)
      .find((child) => child.hasAttribute("data-dynt-kinetic-layer"))
      .querySelector("[data-dynt-kinetic-canvas]")
  ));

  assert.deepEqual(canvases.map((canvas) => canvas.dataset.dyntCellSize), ["40", "32", "24"]);
  assert.equal(canvases[2].dataset.dyntCellShape, "hexagon");

  dispatchPointer(window, button, "pointermove", { clientX: 120, clientY: 80 });
  frames.runNext();
  assert.equal(canvases[2].dataset.dyntFlowCells, "0");
  assert.equal(canvases[2].hasAttribute("data-dynt-field-cells"), false);

  dispatchPointer(window, button, "pointerdown", { clientX: 60, clientY: 60 });
  dispatchPointer(window, button, "pointerdown", { clientX: 160, clientY: 100 });
  frames.runNext();
  assert.equal(canvases[2].dataset.dyntFlowWaves, "2");
  assert.ok(Number(canvases[2].dataset.dyntFlowCells) > 0);
  assert.equal(canvases[2].dataset.dyntFlowModel, "radial-turbulent");
  assert.ok(operations.includes("lineTo"));

  controller.update({ cells: { shape: "diamond", size: 18 } });
  assert.equal(canvases[2].dataset.dyntCellShape, "hexagon");
  button.removeAttribute("data-dynt-cell-shape");
  controller.refresh();
  controller.impact(button);
  frames.runNext();
  assert.equal(canvases[2].dataset.dyntCellShape, "diamond");
  assert.equal(canvases[2].dataset.dyntCellSize, "18");
  controller.destroy();
});

test("built-in presets remain immutable and directly consumable by the core engine", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><article>Surface</article></main>";
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "article",
    ...kineticPresets.locator,
  });

  assert.equal(Object.isFrozen(kineticPresets.locator), true);
  assert.equal(kineticPresets.locator.cells.shape, "hexagon");
  assert.deepEqual(Object.keys(kineticPresets), [
    "structural",
    "locator",
    "laminar",
    "material",
    "tidal",
    "impact",
  ]);
  assert.equal(Object.isFrozen(kineticPresets.tidal.flow), true);
  assert.equal(kineticPresets.tidal.flow.multi, true);
  assert.equal(kineticPresets.impact.cells.shape, "diamond");
  assert.equal(controller.elements.length, 1);
  controller.destroy();
});

test("ordered selector groups resolve independent surface effects and geometry", () => {
  const window = new Window();
  installCanvasContext(window);
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = `
    <main class="surface">
      <article id="card" class="surface material">
        <h2>Card</h2>
        <button id="action" class="surface local"><span>Action</span></button>
      </article>
    </main>
  `;
  const main = document.querySelector("main");
  const card = document.querySelector("#card");
  const action = document.querySelector("#action");
  const heading = document.querySelector("h2");
  for (const surface of [main, card, action]) {
    setRectangle(surface, { width: 240, height: 160 });
  }

  const controller = createKinetic({
    root: main,
    selector: ".surface",
    cells: { shape: "square", size: [40, 32, 24] },
    effects: { content: false, tilt: false, wave: true },
    motion: { maxTilt: 8, response: 1, waveDuration: 100 },
    groups: [
      {
        selector: ".material",
        cells: { shape: "diamond", size: [36, 28, 20] },
        effects: { content: true, tilt: true, wave: false },
        motion: { maxTilt: 3 },
      },
      {
        selector: ".local",
        cells: { shape: "hexagon", size: 18 },
        effects: { content: true, tilt: false, wave: true },
      },
    ],
  });

  const cardCanvas = card.querySelector(":scope > [data-dynt-kinetic-layer] canvas");
  const actionCanvas = action.querySelector(":scope > [data-dynt-kinetic-layer] canvas");
  assert.equal(cardCanvas.dataset.dyntCellShape, "diamond");
  assert.equal(cardCanvas.dataset.dyntCellSize, "28");
  assert.equal(actionCanvas.dataset.dyntCellShape, "hexagon");
  assert.equal(actionCanvas.dataset.dyntCellSize, "18");
  assert.equal(heading.classList.contains("dynt-kinetic__reactor"), true);

  dispatchPointer(window, card, "pointermove", { clientX: 240, clientY: 80 });
  frames.runNext();
  assert.equal(card.style.getPropertyValue("--dynt-tilt-y"), "3.000deg");
  dispatchPointer(window, card, "pointerdown", { clientX: 120, clientY: 80 });
  frames.runNext();
  assert.equal(cardCanvas.dataset.dyntFlowCells, "0");

  dispatchPointer(window, action, "pointerdown", { clientX: 120, clientY: 80 });
  frames.runNext();
  assert.equal(action.style.getPropertyValue("--dynt-tilt-y"), "0.000deg");
  assert.ok(Number(actionCanvas.dataset.dyntFlowCells) > 0);
  assert.equal(cardCanvas.dataset.dyntFlowCells, "0");

  controller.update({
    groups: [{
      selector: "#card",
      cells: { shape: "circle", size: 22 },
      effects: { tilt: true, wave: true },
      motion: { maxTilt: 5 },
    }],
  });
  assert.equal(cardCanvas.dataset.dyntCellShape, "circle");
  assert.equal(cardCanvas.dataset.dyntCellSize, "22");
  assert.equal(actionCanvas.dataset.dyntCellShape, "square");
  assert.equal(actionCanvas.dataset.dyntCellSize, "24");
  controller.destroy();
});

test("pointer hover does not render cells and click starts the circular wave", () => {
  const window = new Window();
  installCanvasContext(window);
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = "<main><article>Surface</article></main>";
  const article = document.querySelector("article");
  setRectangle(article, { width: 240, height: 160 });
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "article",
    effects: { wave: true },
    motion: { response: 1 },
  });

  dispatchPointer(window, article, "pointermove", { clientX: 120, clientY: 80 });
  frames.runNext();
  const canvas = article.querySelector("canvas");
  assert.equal(canvas.dataset.dyntFlowCells, "0");
  assert.equal(canvas.hasAttribute("data-dynt-field-cells"), false);

  dispatchPointer(window, article, "pointerdown", { clientX: 120, clientY: 80 });
  for (let frameCount = 0; frameCount < 4; frameCount += 1) frames.runNext();
  assert.ok(Number(canvas.dataset.dyntFlowCells) > 0);
  assert.equal(canvas.dataset.dyntFlowModel, "radial-turbulent");
  controller.destroy();
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

test("semantic reactors follow the most specific shared controller", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><section><button><span>Content</span></button></section></main>";
  const button = document.querySelector("button");
  const content = document.querySelector("span");
  const outer = createKinetic({
    root: document.querySelector("main"),
    selector: "button",
    effects: { content: false },
  });
  const inner = createKinetic({
    root: document.querySelector("section"),
    selector: "button",
    effects: { content: true },
  });

  assert.equal(content.classList.contains("dynt-kinetic__reactor"), true);
  inner.destroy();
  assert.equal(content.classList.contains("dynt-kinetic__reactor"), false);
  assert.equal(button.hasAttribute("data-dynt-kinetic"), true);
  outer.destroy();
});

test("delegated pointer input writes bounded tilt then becomes idle", () => {
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
  assert.equal(button.style.getPropertyValue("--dynt-tilt-x"), "0.000deg");
  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "1.350deg");
  assert.equal(frames.count, 0);

  dispatchPointer(window, button, "pointermove", {
    clientX: 0,
    clientY: 0,
    pointerType: "pen",
    pressure: 0.8,
  });
  frames.runNext();
  assert.equal(button.style.getPropertyValue("--dynt-tilt-x"), "1.350deg");
  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "-1.350deg");

  dispatchPointer(window, main, "pointerleave");
  frames.runNext();
  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "0.000deg");

  controller.destroy();
});

test("directional tilt compresses the near overflow and raises the far edge", () => {
  const window = new Window();
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = "<main><button style='--dynt-formation-overflow: 14px'>Button</button></main>";
  const main = document.querySelector("main");
  const button = document.querySelector("button");
  setRectangle(button);
  const controller = createKinetic({
    root: main,
    selector: "button",
    motion: { response: 1 },
  });

  dispatchPointer(window, button, "pointermove", { clientX: 0, clientY: 0 });
  frames.runNext();

  assert.equal(button.style.getPropertyValue("--dynt-tilt-x"), "1.350deg");
  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "-1.350deg");
  assert.equal(button.style.getPropertyValue("--dynt-shadow-x"), "18.000px");
  assert.equal(button.style.getPropertyValue("--dynt-shadow-y"), "22.000px");
  assert.equal(button.style.getPropertyValue("--dynt-tl-overflow"), "6.300px");
  assert.equal(button.style.getPropertyValue("--dynt-tr-overflow"), "17.189px");
  assert.equal(button.style.getPropertyValue("--dynt-bl-overflow"), "17.189px");
  assert.equal(button.style.getPropertyValue("--dynt-br-overflow"), "21.700px");

  dispatchPointer(window, main, "pointerleave");
  frames.runNext();
  assert.equal(button.style.getPropertyValue("--dynt-tl-overflow"), "14.000px");
  assert.equal(button.style.getPropertyValue("--dynt-tr-overflow"), "14.000px");
  assert.equal(button.style.getPropertyValue("--dynt-bl-overflow"), "14.000px");
  assert.equal(button.style.getPropertyValue("--dynt-br-overflow"), "14.000px");
  controller.destroy();
});

test("tilt moves semantic content inside the engine-owned plate", () => {
  const window = new Window();
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = `
    <main>
      <article class="surface">
        <h2>Heading</h2>
        <p style="--dynt-reactor-x: 2px">Supporting content</p>
        <button class="surface"><span>Nested action</span></button>
      </article>
    </main>
  `;
  const article = document.querySelector("article");
  const heading = document.querySelector("h2");
  const paragraph = document.querySelector("p");
  const nestedButton = document.querySelector("button");
  setRectangle(article, { width: 300, height: 180 });
  setRectangle(nestedButton, { left: 20, top: 100, width: 120, height: 40 });
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: ".surface",
    effects: { content: true },
    motion: { contentTravel: 12, response: 1 },
  });

  assert.equal(heading.classList.contains("dynt-kinetic__reactor"), true);
  assert.equal(paragraph.classList.contains("dynt-kinetic__reactor"), true);
  assert.equal(nestedButton.classList.contains("dynt-kinetic__reactor"), false);
  assert.equal(nestedButton.querySelector("span").classList.contains("dynt-kinetic__reactor"), true);

  dispatchPointer(window, article, "pointermove", { clientX: 300, clientY: 0 });
  frames.runNext();
  assert.notEqual(heading.style.getPropertyValue("--dynt-reactor-x"), "0.000px");
  assert.notEqual(heading.style.getPropertyValue("--dynt-reactor-y"), "0.000px");
  assert.equal(
    article.querySelector(":scope > [data-dynt-kinetic-layer]")
      .querySelectorAll("[data-dynt-kinetic-corner]").length,
    4,
  );

  controller.destroy();
  assert.equal(heading.classList.contains("dynt-kinetic__reactor"), false);
  assert.equal(heading.style.getPropertyValue("--dynt-reactor-x"), "");
  assert.equal(paragraph.style.getPropertyValue("--dynt-reactor-x"), "2px");
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

  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "1.350deg");
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
  controller.update({ motion: { maxTilt: 12 } });
  dispatchPointer(window, button, "pointermove", { clientX: 100 });
  frames.runNext();
  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "12.000deg");
  assert.deepEqual(controller.elements, [button]);
  controller.destroy();
});

test("reduced motion suppresses pointer tilt without scheduling frames", () => {
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
  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "1.350deg");
  controller.destroy();
});

test("surface and active-reaction limits are enforced deterministically", () => {
  const window = new Window();
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = `
    <main><button id="one">One</button><button id="two">Two</button><button id="three">Three</button></main>
  `;
  const buttons = Array.from(document.querySelectorAll("button"));
  buttons.forEach((button) => setRectangle(button));
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "button",
    limits: { maxActive: 1, maxSurfaces: 2 },
    motion: { response: 0.5 },
  });

  assert.deepEqual(controller.elements.map((element) => element.id), ["one", "two"]);
  controller.impact(buttons[0]);
  controller.impact(buttons[1]);
  assert.equal(frames.count, 1);
  assert.equal(buttons[0].style.getPropertyValue("--dynt-tilt-y"), "0.000deg");

  controller.update({ limits: { maxActive: 2, maxSurfaces: 3 } });
  assert.deepEqual(controller.elements.map((element) => element.id), ["one", "two", "three"]);
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

test("wave impulses travel through semantic content with distance-timed lift", () => {
  const window = new Window();
  const animations = installElementAnimations(window);
  const frames = installAnimationFrames(window);
  const document = window.document;
  document.body.innerHTML = `
    <main><article><h2>Near</h2><p>Far</p></article></main>
  `;
  const article = document.querySelector("article");
  const heading = document.querySelector("h2");
  const paragraph = document.querySelector("p");
  setRectangle(article, { left: 0, top: 0, width: 400, height: 200 });
  setRectangle(heading, { left: 20, top: 40, width: 100, height: 30 });
  setRectangle(paragraph, { left: 300, top: 130, width: 80, height: 30 });
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "article",
    effects: { content: true, tilt: false, wave: true },
    motion: { contentLift: 14, response: 1, waveDuration: 600 },
  });

  dispatchPointer(window, article, "pointerdown", { clientX: 20, clientY: 50 });
  frames.runNext();

  assert.equal(animations.length, 2);
  const near = animations.find(({ target }) => target === heading);
  const far = animations.find(({ target }) => target === paragraph);
  assert.equal(near.options.delay < far.options.delay, true);
  assert.equal(near.options.duration, 456);
  assert.equal(Number.parseFloat(near.keyframes[1].translate.split(" ")[1]) < -8, true);

  dispatchPointer(window, article, "pointerdown", { clientX: 20, clientY: 50 });
  assert.equal(animations.length, 4);
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
  assert.equal(inside.style.getPropertyValue("--dynt-content-x"), "0.750px");
  assert.equal(inside.style.getPropertyValue("--dynt-content-y"), "-0.750px");

  let frameCount = 0;
  while (frames.count > 0 && frameCount < 40) {
    frames.runNext();
    frameCount += 1;
  }
  assert.equal(frames.count, 0);
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

test("reduced-motion impact remains at rest without animation frames", () => {
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
  assert.equal(button.style.getPropertyValue("--dynt-tilt-x"), "0.000deg");
  assert.equal(button.style.getPropertyValue("--dynt-tilt-y"), "0.000deg");
  controller.destroy();
});

test("destroy restores application motion properties exactly", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><button>Button</button></main>";
  const button = document.querySelector("button");
  button.style.setProperty("--application-depth", "0.4", "important");
  button.style.setProperty("--dynt-tl-overflow", "7px", "important");
  const controller = createKinetic({
    root: document.querySelector("main"),
    selector: "button",
  });

  controller.destroy();

  assert.equal(button.style.getPropertyValue("--application-depth"), "0.4");
  assert.equal(button.style.getPropertyPriority("--application-depth"), "important");
  assert.equal(button.style.getPropertyValue("--dynt-tl-overflow"), "7px");
  assert.equal(button.style.getPropertyPriority("--dynt-tl-overflow"), "important");
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
    /unknown effect: pressure/,
  );
  assert.throws(
    () => createKinetic({ root: document, selector: "button", field: {} }),
    /unknown option: field/,
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
  assert.throws(
    () => createKinetic({
      root: document,
      selector: "button",
      limits: { maxActive: 0 },
    }),
    /maxActive must be an integer between 1 and 1000/,
  );
  assert.throws(
    () => createKinetic({
      root: document,
      selector: "button",
      cells: { shape: "triangle" },
    }),
    /cell shape must be square, hexagon, circle, or diamond/,
  );
  assert.throws(
    () => createKinetic({
      root: document,
      selector: "button",
      cells: { size: [40, 20] },
    }),
    /three-level size tree/,
  );
  assert.throws(
    () => createKinetic({
      root: document,
      selector: "button",
      flow: { overflow: 65 },
    }),
    /flow overflow must be between 0 and 64 pixels/,
  );
  assert.throws(
    () => createKinetic({
      root: document,
      selector: "button",
      flow: { unknown: true },
    }),
    /unknown flow option/,
  );
  assert.throws(
    () => createKinetic({ root: document, selector: "button", groups: {} }),
    /groups must be an array/,
  );
  assert.throws(
    () => createKinetic({
      root: document,
      selector: "button",
      groups: [{ selector: "[", effects: { wave: true } }],
    }),
    /invalid group 1 selector/,
  );
  assert.throws(
    () => createKinetic({
      root: document,
      selector: "button",
      groups: [{ selector: "button", field: true }],
    }),
    /unknown group option: field/,
  );
  assert.equal(button.querySelector("[data-dynt-kinetic-layer]"), null);
});
