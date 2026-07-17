import assert from "node:assert/strict";
import test from "node:test";
import React, { act, createElement, useRef } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { Window } from "happy-dom";

import { useFormation } from "../dist/formation.js";
import { useKinetic } from "../dist/kinetic.js";

function installWindow() {
  const window = new Window();
  globalThis.window = window;
  globalThis.document = window.document;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: window.navigator,
  });
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return window;
}

test("Formation hook initializes once at a React root and cleans up", async () => {
  const window = installWindow();
  const container = window.document.createElement("div");
  window.document.body.append(container);

  function App() {
    const rootRef = useRef(null);
    useFormation({ rootRef, selector: ".surface", observe: true });
    return createElement(
      "main",
      { ref: rootRef },
      createElement("button", { className: "surface" }, "Button"),
    );
  }

  const root = createRoot(container);
  await act(() => root.render(createElement(App)));
  const button = container.querySelector("button");
  assert.equal(button.dataset.dyntFormation, "line-push");

  await act(() => root.unmount());
  assert.equal(button.hasAttribute("data-dynt-formation"), false);
  assert.equal(button.classList.contains("dynt-formation"), false);
});

test("Kinetic hook tolerates React updates and removes its decoration", async () => {
  const window = installWindow();
  const container = window.document.createElement("div");
  window.document.body.append(container);

  function App({ label }) {
    const rootRef = useRef(null);
    useKinetic({
      rootRef,
      selector: ".surface",
      observe: true,
      cells: { shape: "diamond", size: [40, 32, 24] },
      flow: { overflow: 14, turbulence: 0.4 },
    });
    return createElement(
      "main",
      { ref: rootRef },
      createElement("button", { className: "surface" }, label),
    );
  }

  const root = createRoot(container);
  await act(() => root.render(createElement(App, { label: "First" })));
  const button = container.querySelector("button");
  assert.equal(button.querySelectorAll("[data-dynt-kinetic-layer]").length, 1);

  await act(() => root.render(createElement(App, { label: "Updated" })));
  assert.equal(button.textContent.includes("Updated"), true);
  assert.equal(button.querySelectorAll("[data-dynt-kinetic-layer]").length, 1);

  await act(() => root.unmount());
  assert.equal(button.querySelectorAll("[data-dynt-kinetic-layer]").length, 0);
  assert.equal(button.hasAttribute("data-dynt-kinetic"), false);
});

test("React adapters are safe during server rendering", () => {
  function App() {
    const rootRef = useRef(null);
    useFormation({ rootRef, selector: ".surface" });
    useKinetic({ rootRef, selector: ".surface" });
    return createElement("main", { ref: rootRef }, "Server output");
  }

  assert.equal(renderToString(createElement(App)), "<main>Server output</main>");
});
