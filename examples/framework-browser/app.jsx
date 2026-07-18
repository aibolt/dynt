import React, { createElement, useRef } from "react";
import { createRoot } from "react-dom/client";
import { createFormation } from "@dynt/formation";
import { createKinetic } from "@dynt/kinetic";
import { useFormation } from "@dynt/react/formation";
import { useKinetic } from "@dynt/react/kinetic";
import { defineFormationElement } from "@dynt/web-components/formation";
import { defineKineticElement } from "@dynt/web-components/kinetic";

const formationOptions = {
  selector: ".surface",
  tokens: {
    duration: 180,
    fillColor: "rgb(8 24 32 / 0.92)",
    lineColor: "#67e8f9",
    lineWidth: "1px",
    overflow: 10,
  },
};
const kineticOptions = {
  selector: ".surface",
  cells: { colorMode: "gradient", colors: ["#155e75", "#67e8f9"], shape: "square", size: [40, 28, 20] },
  effects: { content: true, drift: false, tilt: true, wave: true },
  flow: { overflow: 10, turbulence: 0.38 },
  motion: { maxTilt: 1.2, response: 0.3, waveDuration: 520 },
  groups: [{
    selector: ".nested",
    cells: { shape: "hexagon", size: 20 },
    motion: { maxTilt: 0.8 },
  }],
};

const plainRoot = document.querySelector("#plain-root");
const plainFormation = createFormation({ root: plainRoot, ...formationOptions });
const plainKinetic = createKinetic({ root: plainRoot, ...kineticOptions });

function ReactExample() {
  const rootRef = useRef(null);
  useFormation({ rootRef, ...formationOptions });
  useKinetic({ rootRef, ...kineticOptions });
  return createElement(
    "div",
    { className: "example-root", ref: rootRef },
    createElement(
      "article",
      { className: "surface", id: "react-parent" },
      createElement("strong", null, "React surface"),
      createElement(
        "button",
        { className: "surface nested", id: "react-nested", type: "button" },
        "Owned action",
      ),
    ),
  );
}

const reactRoot = createRoot(document.querySelector("#react-mount"));
reactRoot.render(createElement(ReactExample));

defineFormationElement("dynt-formation-example", formationOptions);
defineKineticElement("dynt-kinetic-example", kineticOptions);
const webMount = document.querySelector("#web-mount");
webMount.innerHTML = `
  <dynt-formation-example class="example-root">
    <dynt-kinetic-example class="example-root">
      <article id="web-parent" class="surface">
        <strong>Web Component surface</strong>
        <button id="web-nested" class="surface nested" type="button">Owned action</button>
      </article>
    </dynt-kinetic-example>
  </dynt-formation-example>
`;

document.querySelector("#cleanup").addEventListener("click", () => {
  plainKinetic.destroy();
  plainFormation.destroy();
  reactRoot.unmount();
  webMount.replaceChildren();
});
