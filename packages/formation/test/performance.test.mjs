import assert from "node:assert/strict";
import test from "node:test";
import { performance } from "node:perf_hooks";
import { Window } from "happy-dom";

import { createFormation } from "../dist/index.js";

const TARGET_COUNT = 500;
const OPERATION_BUDGET_MS = 1000;

test("500-target initialization, refresh, and cleanup stay within the preview budget", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `<main>${"<article class='surface'>Surface</article>".repeat(TARGET_COUNT)}</main>`;
  const root = document.querySelector("main");

  const initializeStarted = performance.now();
  const controller = createFormation({ root, selector: ".surface" });
  const initializationMs = performance.now() - initializeStarted;

  const refreshStarted = performance.now();
  controller.refresh();
  const refreshMs = performance.now() - refreshStarted;

  const destroyStarted = performance.now();
  controller.destroy();
  const destroyMs = performance.now() - destroyStarted;

  assert.equal(controller.elements.length, 0);
  assert.equal(initializationMs < OPERATION_BUDGET_MS, true);
  assert.equal(refreshMs < OPERATION_BUDGET_MS, true);
  assert.equal(destroyMs < OPERATION_BUDGET_MS, true);
});
