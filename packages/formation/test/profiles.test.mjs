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
    propertyName: { value: "transform" },
    pseudoElement: { value: pseudoElement },
  });
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
  assert.deepEqual(defaultFormationProfiles.names, ["line-push", "line-rise"]);
  assert.equal(
    defaultFormationProfiles.get("line-push").geometry.edgeOrder,
    "horizontal-vertical",
  );
  assert.equal(
    defaultFormationProfiles.get("line-rise").geometry.edgeOrder,
    "vertical-horizontal",
  );
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
