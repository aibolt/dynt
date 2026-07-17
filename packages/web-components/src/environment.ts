export function requireCustomElements() {
  const registry = globalThis.customElements;
  const ElementConstructor = globalThis.HTMLElement;

  if (!registry || !ElementConstructor) {
    throw new TypeError("DYNT Web Components require a browser custom-elements environment.");
  }

  return { ElementConstructor, registry };
}

export function validateTagName(tagName: string) {
  if (typeof tagName !== "string" || !tagName.includes("-") || tagName !== tagName.toLowerCase()) {
    throw new TypeError("DYNT Web Component tag names must be lowercase and contain a hyphen.");
  }
}
