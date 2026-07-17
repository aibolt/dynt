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
