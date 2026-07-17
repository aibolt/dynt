import assert from "node:assert/strict";
import test from "node:test";
import { Window } from "happy-dom";

import {
  createFormation,
  createFormationProfileRegistry,
  defaultFormationProfiles,
} from "../dist/index.js";

function dispatchTransformTransition(window, element, pseudoElement) {
  const event = new window.Event("transitionend", { bubbles: true });
  Object.defineProperties(event, {
    propertyName: { value: "clip-path" },
    pseudoElement: { value: pseudoElement },
  });
  element.dispatchEvent(event);
}

function dispatchStrokeTransition(window, element) {
  const event = new window.Event("transitionend", { bubbles: true });
  Object.defineProperty(event, "propertyName", { value: "stroke-dashoffset" });
  element.dispatchEvent(event);
}

function customProfile(name = "custom-lines") {
  return {
    name,
    className: `dynt-formation--${name}`,
    geometry: {
      type: "edge-lines",
      edgeOrder: "horizontal-vertical",
    },
    tokens: ["duration", "line-color", "line-width"],
    lifecycle: {
      formComplete: {
        propertyName: "transform",
        pseudoElement: "::after",
      },
      withdrawComplete: {
        propertyName: "transform",
        pseudoElement: "::before",
      },
    },
    capabilities: {
      reducedMotion: true,
      responsive: true,
    },
    rendering: "pseudo-elements",
  };
}

test("default registry exposes independently described profiles", () => {
  assert.deepEqual(defaultFormationProfiles.names, ["line-push", "arc-trace", "line-rise"]);
  assert.equal(
    defaultFormationProfiles.get("line-push").geometry.type,
    "line-forge",
  );
  assert.equal(
    defaultFormationProfiles.get("line-push").geometry.edgeOrder,
    "horizontal-vertical",
  );
  assert.deepEqual(
    defaultFormationProfiles.get("line-push").tokens,
    [
      "duration",
      "easing",
      "fill-color",
      "line-color",
      "line-style",
      "line-width",
      "overflow",
    ],
  );
  assert.equal(
    defaultFormationProfiles.get("line-rise").geometry.edgeOrder,
    "vertical-horizontal",
  );
  assert.equal(defaultFormationProfiles.get("arc-trace").geometry.type, "perimeter");
  assert.equal(defaultFormationProfiles.get("arc-trace").rendering, "svg-perimeter");
  assert.equal(defaultFormationProfiles.get("arc-trace").capabilities.viewportFlow, false);
});

test("Arc Trace draws and withdraws one owned perimeter with opposite registers", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><article>Article</article></main>";
  const article = document.querySelector("article");
  const controller = createFormation({
    root: document.querySelector("main"),
    selector: "article",
    profile: "arc-trace",
    tokens: { duration: 620, radius: "18px", lineStyle: "dashed" },
  });
  const layer = article.querySelector("[data-dynt-formation-perimeter]");
  const trace = layer.querySelector(".dynt-formation__perimeter-trace");

  assert.equal(layer.getAttribute("aria-hidden"), "true");
  assert.equal(trace.getAttribute("pathLength"), "100");
  assert.equal(layer.querySelectorAll(".dynt-formation__register").length, 2);
  assert.equal(article.style.getPropertyValue("--dynt-formation-radius"), "18px");

  controller.form(article);
  assert.equal(article.dataset.dyntFormationPhase, "constructing");
  dispatchStrokeTransition(window, trace);
  assert.equal(article.dataset.dyntFormationPhase, "formed");

  controller.withdraw(article);
  assert.equal(article.dataset.dyntFormationPhase, "deconstructing");
  dispatchStrokeTransition(window, trace);
  assert.equal(article.dataset.dyntFormationPhase, "unformed");

  controller.destroy();
  assert.equal(article.querySelector("[data-dynt-formation-perimeter]"), null);
  assert.equal(article.style.getPropertyValue("--dynt-formation-radius"), "");
});

test("Arc Trace rejects viewport flow and Line Forge overflow", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><article>Article</article></main>";
  const article = document.querySelector("article");

  assert.throws(
    () => createFormation({
      root: document.querySelector("main"),
      selector: "article",
      profile: "arc-trace",
      viewportFlow: true,
    }),
    /arc-trace does not support viewportFlow/,
  );
  assert.throws(
    () => createFormation({
      root: document.querySelector("main"),
      selector: "article",
      profile: "arc-trace",
      tokens: { overflow: 14 },
    }),
    /does not support the overflow token/,
  );
  assert.equal(article.dataset.dyntFormation, undefined);
});

test("Line Rise uses the shared reversible lifecycle contract", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><button>Button</button></main>";
  const button = document.querySelector("button");
  const controller = createFormation({
    root: document.querySelector("main"),
    selector: "button",
    profile: "line-rise",
  });

  assert.equal(controller.profile, "line-rise");
  assert.equal(button.classList.contains("dynt-formation--line-rise"), true);
  controller.form(button);
  dispatchTransformTransition(window, button, "::after");
  assert.equal(button.dataset.dyntFormationPhase, "formed");

  controller.withdraw(button);
  dispatchTransformTransition(window, button, "::before");
  assert.equal(button.dataset.dyntFormationPhase, "unformed");

  controller.destroy();
  assert.equal(button.classList.contains("dynt-formation--line-rise"), false);
});

test("a custom typed registry supplies profile metadata to the engine", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><article>Article</article></main>";
  const registry = createFormationProfileRegistry([customProfile()]);
  const controller = createFormation({
    root: document.querySelector("main"),
    selector: "article",
    profile: "custom-lines",
    profiles: registry,
  });
  const article = document.querySelector("article");

  assert.equal(article.dataset.dyntFormation, "custom-lines");
  assert.equal(article.classList.contains("dynt-formation--custom-lines"), true);
  controller.destroy();
  assert.equal(article.classList.contains("dynt-formation--custom-lines"), false);
});

test("registry validation rejects duplicate names and unscoped classes", () => {
  const profile = customProfile();

  assert.throws(
    () => createFormationProfileRegistry([profile, profile]),
    /duplicate profile: custom-lines/,
  );
  assert.throws(
    () => createFormationProfileRegistry([{ ...profile, className: "custom-lines" }]),
    /classes must use the dynt-formation-- prefix/,
  );
  assert.throws(
    () => createFormationProfileRegistry([{
      ...profile,
      lifecycle: {
        ...profile.lifecycle,
        formComplete: { propertyName: "", pseudoElement: "::after" },
      },
    }]),
    /valid lifecycle completion hooks/,
  );
  assert.throws(
    () => createFormationProfileRegistry([{ ...profile, tokens: ["unknown"] }]),
    /unsupported token name/,
  );
});

test("different profiles cannot claim the same target", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><button>Button</button></main>";
  const main = document.querySelector("main");
  const first = createFormation({ root: main, selector: "button" });

  assert.throws(
    () => createFormation({
      root: main,
      selector: "button",
      profile: "line-rise",
    }),
    /cannot apply different profiles to the same target/,
  );

  first.destroy();
  assert.equal(document.querySelector("button").dataset.dyntFormation, undefined);
});
