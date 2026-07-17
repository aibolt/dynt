import {
  createFormation,
  type FormationController,
  type FormationOptions,
  type FormationProfile,
} from "@dynt/formation";
import { requireCustomElements, validateTagName } from "./environment.js";

export type DefineFormationElementOptions<ProfileName extends string = FormationProfile> =
  Omit<FormationOptions<ProfileName>, "root">;

export type FormationElement = HTMLElement & Readonly<{
  controller: FormationController<string> | null;
}>;

export function defineFormationElement<ProfileName extends string = FormationProfile>(
  tagName: string,
  options: DefineFormationElementOptions<ProfileName>,
) {
  validateTagName(tagName);
  const { ElementConstructor, registry } = requireCustomElements();
  const existing = registry.get(tagName);
  if (existing) return existing;

  class DyntFormationElement extends ElementConstructor {
    controller: FormationController<ProfileName> | null = null;

    connectedCallback() {
      if (this.controller) return;
      this.controller = createFormation({ root: this, ...options });
    }

    disconnectedCallback() {
      this.controller?.destroy();
      this.controller = null;
    }
  }

  registry.define(tagName, DyntFormationElement);
  return DyntFormationElement;
}
