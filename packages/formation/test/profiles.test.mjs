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

function customConstructProfile(name = "custom-construct") {
  return {
    name,
    className: `dynt-formation--${name}`,
    geometry: {
      type: "constructed",
      pattern: "squircle",
    },
    tokens: ["duration", "easing", "fill-color", "line-color", "line-width", "radius"],
    lifecycle: {
      formComplete: { propertyName: "stroke-dashoffset" },
      withdrawComplete: { propertyName: "stroke-dashoffset" },
    },
    capabilities: {
      reducedMotion: true,
      responsive: true,
      viewportFlow: true,
    },
    rendering: "svg-construct",
  };
}

test("default registry exposes independently described profiles", () => {
  assert.deepEqual(defaultFormationProfiles.names, [
    "line-push",
    "arc-trace",
    "line-rise",
    "squircle-sweep",
    "chamfer-fold",
    "magnetic-segment",
    "radial-compass",
    "aperture-iris",
    "elastic-membrane",
  ]);
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
  assert.equal(defaultFormationProfiles.get("squircle-sweep").geometry.pattern, "squircle");
  assert.equal(defaultFormationProfiles.get("chamfer-fold").geometry.pattern, "chamfer");
  assert.equal(defaultFormationProfiles.get("magnetic-segment").geometry.pattern, "magnetic");
  assert.equal(defaultFormationProfiles.get("radial-compass").geometry.pattern, "compass");
  assert.equal(defaultFormationProfiles.get("aperture-iris").geometry.pattern, "aperture");
  assert.equal(defaultFormationProfiles.get("elastic-membrane").geometry.pattern, "membrane");
});

test("Squircle Sweep forms and withdraws its vertical shell", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><article>Article</article></main>";
  const article = document.querySelector("article");
  const controller = createFormation({
    root: document.querySelector("main"),
    selector: "article",
    profile: "squircle-sweep",
  });
  const layer = article.querySelector("[data-dynt-formation-pattern='squircle']");
  const completion = layer.querySelector(".dynt-formation__construct-completion");

  assert.equal(layer.querySelectorAll("path").length, 2);
  controller.form(article);
  dispatchStrokeTransition(window, completion);
  assert.equal(article.dataset.dyntFormationPhase, "formed");
  controller.withdraw(article);
  dispatchStrokeTransition(window, completion);
  assert.equal(article.dataset.dyntFormationPhase, "unformed");
  controller.destroy();
});

test("Chamfer Fold constructs corner joints before its straight rails", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><article>Article</article></main>";
  const article = document.querySelector("article");
  const controller = createFormation({
    root: document.querySelector("main"),
    selector: "article",
    profile: "chamfer-fold",
  });
  const layer = article.querySelector("[data-dynt-formation-pattern='chamfer']");
  const paths = layer.querySelectorAll("path");

  assert.equal(paths.length, 5);
  assert.match(paths[0].getAttribute("d"), /M0 12 L12 0/);
  assert.equal(paths[0].style.getPropertyValue("--dynt-construct-delay"), "0ms");
  assert.equal(paths[1].style.getPropertyValue("--dynt-construct-delay"), "90ms");
  controller.form(article);
  dispatchStrokeTransition(window, paths[4]);
  assert.equal(article.dataset.dyntFormationPhase, "formed");
  controller.withdraw(article);
  dispatchStrokeTransition(window, paths[4]);
  assert.equal(article.dataset.dyntFormationPhase, "unformed");
  controller.destroy();
});

test("Magnetic Segment joins distributed half-rails at four locks", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><article>Article</article></main>";
  const article = document.querySelector("article");
  const controller = createFormation({
    root: document.querySelector("main"),
    selector: "article",
    profile: "magnetic-segment",
  });
  const layer = article.querySelector("[data-dynt-formation-pattern='magnetic']");
  const paths = layer.querySelectorAll("path");

  assert.equal(paths.length, 5);
  assert.match(paths[0].getAttribute("d"), /M0 0 H50 M100 0 H50/);
  assert.equal(paths[4].classList.contains("dynt-formation__construct-path--signature"), true);
  controller.form(article);
  dispatchStrokeTransition(window, paths[4]);
  assert.equal(article.dataset.dyntFormationPhase, "formed");
  controller.withdraw(article);
  dispatchStrokeTransition(window, paths[4]);
  assert.equal(article.dataset.dyntFormationPhase, "unformed");
  controller.destroy();
});

test("Radial Compass locates its shell from four centre spokes", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><article>Article</article></main>";
  const article = document.querySelector("article");
  const controller = createFormation({
    root: document.querySelector("main"),
    selector: "article",
    profile: "radial-compass",
    tokens: { radius: "22px" },
  });
  const layer = article.querySelector("[data-dynt-formation-pattern='compass']");
  const paths = layer.querySelectorAll("path");

  assert.equal(paths.length, 3);
  assert.match(paths[0].getAttribute("d"), /M50 50 V0/);
  assert.equal(paths[0].classList.contains("dynt-formation__construct-path--temporary"), true);
  assert.equal(article.style.getPropertyValue("--dynt-formation-radius"), "22px");
  controller.form(article);
  dispatchStrokeTransition(window, paths[2]);
  assert.equal(article.dataset.dyntFormationPhase, "formed");
  controller.withdraw(article);
  dispatchStrokeTransition(window, paths[2]);
  assert.equal(article.dataset.dyntFormationPhase, "unformed");
  controller.destroy();
});

test("Aperture Iris converges blades before four shell quadrants", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><article>Article</article></main>";
  const article = document.querySelector("article");
  const controller = createFormation({
    root: document.querySelector("main"),
    selector: "article",
    profile: "aperture-iris",
  });
  const layer = article.querySelector("[data-dynt-formation-pattern='aperture']");
  const paths = layer.querySelectorAll("path");

  assert.equal(paths.length, 6);
  assert.match(paths[0].getAttribute("d"), /M12 12 L50 50/);
  assert.equal(paths[0].classList.contains("dynt-formation__construct-path--temporary"), true);
  assert.equal(paths[5].classList.contains("dynt-formation__construct-path--signature"), true);
  controller.form(article);
  dispatchStrokeTransition(window, paths[5]);
  assert.equal(article.dataset.dyntFormationPhase, "formed");
  controller.withdraw(article);
  dispatchStrokeTransition(window, paths[5]);
  assert.equal(article.dataset.dyntFormationPhase, "unformed");
  controller.destroy();
});

test("Elastic Membrane tensions four curved boundary rails", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><article>Article</article></main>";
  const article = document.querySelector("article");
  const controller = createFormation({
    root: document.querySelector("main"),
    selector: "article",
    profile: "elastic-membrane",
    tokens: { radius: "14px" },
  });
  const layer = article.querySelector("[data-dynt-formation-pattern='membrane']");
  const paths = layer.querySelectorAll("path");

  assert.equal(paths.length, 4);
  assert.match(paths[0].getAttribute("d"), /C22 -3 78 -3/);
  assert.match(paths[3].getAttribute("d"), /C-3 78 -3 22/);
  controller.form(article);
  dispatchStrokeTransition(window, paths[3]);
  assert.equal(article.dataset.dyntFormationPhase, "formed");
  controller.withdraw(article);
  dispatchStrokeTransition(window, paths[3]);
  assert.equal(article.dataset.dyntFormationPhase, "unformed");
  controller.destroy();
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

test("SVG construction profiles own staged paths and the reversible lifecycle", () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = "<main><article>Article</article></main>";
  const registry = createFormationProfileRegistry([customConstructProfile()]);
  const article = document.querySelector("article");
  const controller = createFormation({
    root: document.querySelector("main"),
    selector: "article",
    profile: "custom-construct",
    profiles: registry,
  });
  const layer = article.querySelector("[data-dynt-formation-pattern='squircle']");
  const completion = layer.querySelector(".dynt-formation__construct-completion");

  assert.equal(layer.getAttribute("aria-hidden"), "true");
  assert.equal(layer.querySelectorAll("path").length, 2);
  assert.equal(completion.getAttribute("pathLength"), "100");

  controller.form(article);
  dispatchStrokeTransition(window, layer.querySelector("path:not(.dynt-formation__construct-completion)"));
  assert.equal(article.dataset.dyntFormationPhase, "constructing");
  dispatchStrokeTransition(window, completion);
  assert.equal(article.dataset.dyntFormationPhase, "formed");

  controller.withdraw(article);
  dispatchStrokeTransition(window, completion);
  assert.equal(article.dataset.dyntFormationPhase, "unformed");
  controller.destroy();
  assert.equal(article.querySelector("[data-dynt-formation-pattern]"), null);
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
