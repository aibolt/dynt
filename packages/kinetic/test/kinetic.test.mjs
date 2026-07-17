import assert from "node:assert/strict";
import test from "node:test";
import { Window } from "happy-dom";

import { createKinetic } from "../dist/index.js";

function flushMutations(window) {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
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
});
