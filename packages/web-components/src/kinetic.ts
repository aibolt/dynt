import {
  createKinetic,
  type KineticController,
  type KineticOptions,
} from "@dynt/kinetic";
import { requireCustomElements, validateTagName } from "./environment.js";

export type DefineKineticElementOptions = Omit<KineticOptions, "root">;

export type KineticElement = HTMLElement & Readonly<{
  controller: KineticController | null;
}>;

export function defineKineticElement(
  tagName: string,
  options: DefineKineticElementOptions,
) {
  validateTagName(tagName);
  const { ElementConstructor, registry } = requireCustomElements();
  const existing = registry.get(tagName);
  if (existing) return existing;

  class DyntKineticElement extends ElementConstructor {
    controller: KineticController | null = null;

    connectedCallback() {
      if (this.controller) return;
      this.controller = createKinetic({ root: this, ...options });
    }

    disconnectedCallback() {
      this.controller?.destroy();
      this.controller = null;
    }
  }

  registry.define(tagName, DyntKineticElement);
  return DyntKineticElement;
}
