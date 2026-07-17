import assert from "node:assert/strict";
import test from "node:test";
import { Window } from "happy-dom";

import { createFormation } from "../dist/index.js";

function flushMutations(window) {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

test("enhances only matching elements inside the supplied root", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `
    <main><button id="inside">Inside</button></main>
    <button id="outside">Outside</button>
  `;

  const main = document.querySelector("main");
  const controller = createFormation({ root: main, selector: "button" });

  assert.equal(controller.elements.length, 1);
  assert.equal(document.querySelector("#inside").dataset.dyntFormation, "line-push");
  assert.equal(document.querySelector("#outside").dataset.dyntFormation, undefined);
});

test("ignores built-in and custom excluded subtrees", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `
    <main>
      <button id="allowed">Allowed</button>
      <section data-dynt-ignore><button id="ignored">Ignored</button></section>
      <section class="third-party"><button id="custom">Custom</button></section>
    </main>
  `;

  const controller = createFormation({
    root: document.querySelector("main"),
    selector: "button",
    exclude: ".third-party",
  });

  assert.deepEqual(controller.elements.map((element) => element.id), ["allowed"]);
  assert.equal(document.querySelector("#ignored").dataset.dyntFormation, undefined);
  assert.equal(document.querySelector("#custom").dataset.dyntFormation, undefined);
});

test("does not enhance a matching root marked with data-dynt-ignore", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `
    <main data-dynt-ignore><button>Ignored child</button></main>
  `;
  const main = document.querySelector("main");
  const controller = createFormation({ root: main, selector: "main, button" });

  assert.equal(controller.elements.length, 0);
  assert.equal(main.dataset.dyntFormation, undefined);
  assert.equal(main.querySelector("button").dataset.dyntFormation, undefined);
});

test("refresh enhances new matches without duplicating existing work", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><button>First</button></main>";
  const main = document.querySelector("main");
  const controller = createFormation({ root: main, selector: "button" });

  main.insertAdjacentHTML("beforeend", "<button>Second</button>");

  assert.equal(controller.refresh(), 1);
  assert.equal(controller.refresh(), 0);
  assert.equal(controller.elements.length, 2);
});

test("refresh restores elements that no longer match", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `
    <main><button class="target existing" data-dynt-formation="application">Button</button></main>
  `;
  const button = document.querySelector("button");
  const controller = createFormation({
    root: document.querySelector("main"),
    selector: ".target",
  });

  button.classList.remove("target");
  assert.equal(controller.refresh(), 0);

  assert.equal(controller.elements.length, 0);
  assert.equal(button.classList.contains("existing"), true);
  assert.equal(button.classList.contains("dynt-formation"), false);
  assert.equal(button.getAttribute("data-dynt-formation"), "application");
});

test("repeated controllers share enhancement until the final destroy", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `
    <main><button class="application" data-dynt-formation="application">Button</button></main>
  `;
  const main = document.querySelector("main");
  const button = document.querySelector("button");
  const first = createFormation({ root: main, selector: "button" });
  const second = createFormation({ root: main, selector: "button" });

  assert.deepEqual(first.elements, [button]);
  assert.deepEqual(second.elements, [button]);
  assert.equal(button.classList.contains("dynt-formation"), true);

  first.destroy();
  assert.equal(button.classList.contains("dynt-formation"), true);
  assert.equal(button.dataset.dyntFormation, "line-push");

  second.destroy();
  assert.equal(button.classList.contains("application"), true);
  assert.equal(button.classList.contains("dynt-formation"), false);
  assert.equal(button.getAttribute("data-dynt-formation"), "application");
});

test("nested controllers share one enhancement independent of initialization order", () => {
  for (const innerFirst of [true, false]) {
    const window = new Window();
    const document = window.document;
    document.body.innerHTML = `
      <main><section><button>Nested</button></section></main>
    `;
    const main = document.querySelector("main");
    const section = document.querySelector("section");
    const button = document.querySelector("button");
    const setAttribute = button.setAttribute.bind(button);
    let formationWrites = 0;
    button.setAttribute = (name, value) => {
      if (name === "data-dynt-formation") formationWrites += 1;
      return setAttribute(name, value);
    };

    let inner;
    let outer;
    if (innerFirst) {
      inner = createFormation({ root: section, selector: "button" });
      outer = createFormation({ root: main, selector: "button" });
    } else {
      outer = createFormation({ root: main, selector: "button" });
      inner = createFormation({ root: section, selector: "button" });
    }

    assert.deepEqual(inner.elements, [button]);
    assert.deepEqual(outer.elements, [button]);
    assert.equal(formationWrites, 1);

    outer.destroy();
    assert.equal(button.dataset.dyntFormation, "line-push");

    inner.destroy();
    assert.equal(button.dataset.dyntFormation, undefined);
    assert.equal(button.classList.contains("dynt-formation"), false);
  }
});

test("observe enhances synchronous insertions in one batched refresh", async () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><button>First</button></main>";
  const main = document.querySelector("main");
  const querySelectorAll = main.querySelectorAll.bind(main);
  let queryCount = 0;
  main.querySelectorAll = (...arguments_) => {
    queryCount += 1;
    return querySelectorAll(...arguments_);
  };

  const controller = createFormation({
    root: main,
    selector: "button",
    observe: true,
  });

  main.insertAdjacentHTML("beforeend", "<button>Second</button>");
  main.insertAdjacentHTML("beforeend", "<div><button>Third</button></div>");
  await flushMutations(window);

  assert.equal(controller.elements.length, 3);
  assert.equal(queryCount, 2);
  assert.equal(main.querySelectorAll("[data-dynt-formation='line-push']").length, 3);
});

test("observe ignores new matches inside excluded subtrees", async () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `
    <main><section data-dynt-ignore id="ignored"></section></main>
  `;
  const main = document.querySelector("main");
  const controller = createFormation({
    root: main,
    selector: "button",
    observe: true,
  });

  document.querySelector("#ignored").insertAdjacentHTML(
    "beforeend",
    "<button id='ignored-later'>Ignored later</button>",
  );
  main.insertAdjacentHTML("beforeend", "<button id='allowed-later'>Allowed later</button>");
  await flushMutations(window);

  assert.deepEqual(controller.elements.map((element) => element.id), ["allowed-later"]);
  assert.equal(document.querySelector("#ignored-later").dataset.dyntFormation, undefined);
});

test("observe restores an element removed from the managed root", async () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `
    <main><button id="moving" class="application">Move me</button></main>
    <aside></aside>
  `;
  const main = document.querySelector("main");
  const button = document.querySelector("#moving");
  const controller = createFormation({
    root: main,
    selector: "button",
    observe: true,
  });

  document.querySelector("aside").append(button);
  await flushMutations(window);

  assert.equal(controller.elements.length, 0);
  assert.equal(button.classList.contains("application"), true);
  assert.equal(button.classList.contains("dynt-formation"), false);
  assert.equal(button.dataset.dyntFormation, undefined);
});

test("observe reconciles selector and exclusion attribute changes", async () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `
    <main><section><button class="target">Button</button></section></main>
  `;
  const section = document.querySelector("section");
  const button = document.querySelector("button");
  const controller = createFormation({
    root: document.querySelector("main"),
    selector: ".target",
    observe: true,
  });

  button.classList.remove("target");
  await flushMutations(window);
  assert.equal(controller.elements.length, 0);
  assert.equal(button.dataset.dyntFormation, undefined);

  button.classList.add("target");
  await flushMutations(window);
  assert.deepEqual(controller.elements, [button]);
  assert.equal(button.dataset.dyntFormation, "line-push");

  section.setAttribute("data-dynt-ignore", "");
  await flushMutations(window);
  assert.equal(controller.elements.length, 0);
  assert.equal(button.dataset.dyntFormation, undefined);

  section.removeAttribute("data-dynt-ignore");
  await flushMutations(window);
  assert.deepEqual(controller.elements, [button]);
  assert.equal(button.dataset.dyntFormation, "line-push");
});

test("destroy disconnects observation and cancels pending refresh work", async () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><button id='first'>First</button></main>";
  const main = document.querySelector("main");
  const controller = createFormation({
    root: main,
    selector: "button",
    observe: true,
  });

  main.insertAdjacentHTML("beforeend", "<button id='pending'>Pending</button>");
  controller.destroy();
  main.insertAdjacentHTML("beforeend", "<button id='later'>Later</button>");
  await flushMutations(window);

  assert.equal(document.querySelector("#first").dataset.dyntFormation, undefined);
  assert.equal(document.querySelector("#pending").dataset.dyntFormation, undefined);
  assert.equal(document.querySelector("#later").dataset.dyntFormation, undefined);
  assert.equal(controller.refresh(), 0);
  assert.equal(controller.elements.length, 0);
});

test("destroy restores the classes and attribute owned by the application", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `
    <button class="dynt-formation existing" data-dynt-formation="custom">Button</button>
  `;
  const button = document.querySelector("button");
  const controller = createFormation({ root: document, selector: "button" });

  controller.destroy();

  assert.equal(button.classList.contains("dynt-formation"), true);
  assert.equal(button.classList.contains("dynt-formation--line-push"), false);
  assert.equal(button.getAttribute("data-dynt-formation"), "custom");
  assert.equal(controller.elements.length, 0);
});

test("rejects an empty selector", () => {
  const window = new Window();

  assert.throws(
    () => createFormation({ root: window.document, selector: "  " }),
    /non-empty selector/,
  );
});

test("rejects an empty exclude selector", () => {
  const window = new Window();

  assert.throws(
    () => createFormation({
      root: window.document,
      selector: "button",
      exclude: "  ",
    }),
    /non-empty exclude selector/,
  );
});

test("rejects an invalid custom exclude selector", () => {
  const window = new Window();

  assert.throws(
    () => createFormation({
      root: window.document,
      selector: "button",
      exclude: "[",
    }),
    /invalid exclude selector/,
  );
});
