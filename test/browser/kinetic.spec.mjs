import { expect, test } from "@playwright/test";

test("Kinetic routes input locally, pauses, resumes, and adopts dynamic targets", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/examples/kinetic-browser/");
  const nested = page.locator("#nested-surface");
  const parent = page.locator("#parent-surface");
  const box = await nested.boundingBox();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);

  await expect.poll(() => nested.evaluate((element) => (
    Math.abs(Number.parseFloat(element.style.getPropertyValue("--dynt-tilt-y")))
  ))).toBeGreaterThan(0);
  await expect.poll(() => nested.evaluate((element) => (
    Math.abs(Number.parseFloat(element.style.getPropertyValue("--dynt-tilt-y")))
  ))).toBeLessThanOrEqual(0.9);
  await expect(nested.locator("[data-dynt-kinetic-canvas]")).toHaveAttribute(
    "data-dynt-flow-cells",
    "0",
  );
  await expect(parent).toHaveCSS("--dynt-tilt-y", "0.000deg");
  await expect.poll(() => nested.locator(".dynt-kinetic__reactor").evaluate((element) => (
    Math.abs(Number.parseFloat(element.style.getPropertyValue("--dynt-reactor-x")))
  ))).toBeGreaterThan(0);
  await expect(nested.locator("[data-dynt-kinetic-layer]")).not.toHaveCSS("transform", "none");

  await nested.click({ position: { x: box.width * 0.35, y: box.height * 0.45 } });
  await expect.poll(() => nested.locator("[data-dynt-kinetic-canvas]")
    .getAttribute("data-dynt-flow-cells").then(Number)).toBeGreaterThan(0);
  await expect(parent.locator(":scope > [data-dynt-kinetic-layer] canvas"))
    .toHaveAttribute("data-dynt-flow-cells", "0");

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(nested).toHaveCSS("--dynt-tilt-y", "0.000deg");
  await page.getByRole("button", { name: "Resume" }).click();
  await page.getByRole("button", { name: "Add target" }).click();
  await expect(page.locator("#dynamic-5")).toHaveAttribute("data-dynt-kinetic", "");
  await expect(page.locator("#dynamic-5 [data-dynt-kinetic-layer]")).toHaveCount(1);

  const input = page.getByRole("textbox", { name: "Editable input" });
  await input.fill("Preserved kinetic input");
  await expect(input).toHaveValue("Preserved kinetic input");
  expect(errors).toEqual([]);
});

test("Kinetic reduced motion removes pointer and wave motion channels", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/examples/kinetic-browser/");
  const nested = page.locator("#nested-surface");
  const box = await nested.boundingBox();
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.5);

  await expect(nested).toHaveCSS("--dynt-tilt-x", "0.000deg");
  await expect(nested).toHaveCSS("--dynt-tilt-y", "0.000deg");
  await expect(nested).toHaveCSS("--dynt-drift-x", "0.000px");
  await expect(nested).toHaveCSS("--dynt-wave-opacity", "0.0000");
  await expect(nested.locator("[data-dynt-kinetic-canvas]")).toHaveAttribute(
    "data-dynt-flow-cells",
    "0",
  );
});

test("Kinetic preserves accessibility and accepts bounded pen input", async ({ page }) => {
  await page.goto("/examples/kinetic-browser/");
  const nested = page.getByRole("button", { name: "Nearest nested surface" });
  const input = page.getByRole("textbox", { name: "Editable input" });
  const box = await nested.boundingBox();

  await expect(nested.locator("[data-dynt-kinetic-layer]")).toHaveAttribute("aria-hidden", "true");
  await expect(nested.locator("[data-dynt-kinetic-layer]")).not.toHaveAttribute("tabindex", /.+/);
  await expect(input.locator("[data-dynt-kinetic-layer]")).toHaveCount(0);
  await nested.focus();
  await expect(nested).toBeFocused();
  expect(await nested.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");

  for (let index = 0; index < 4; index += 1) {
    await nested.dispatchEvent("pointermove", {
      bubbles: true,
      clientX: box.x + box.width / 2,
      clientY: box.y + box.height / 2,
      composed: true,
      pointerType: "pen",
      pressure: 0.8,
    });
    await page.waitForTimeout(32);
  }
  await expect.poll(() => nested.evaluate((element) => (
    Math.abs(Number.parseFloat(element.style.getPropertyValue("--dynt-tilt-y")))
  ))).toBeLessThanOrEqual(0.9);

  await nested.dispatchEvent("pointermove", {
    bubbles: true,
    clientX: box.x + box.width * 0.2,
    clientY: box.y + box.height / 2,
    composed: true,
    pointerType: "touch",
    pressure: 0.6,
  });
  await expect.poll(() => nested.evaluate((element) => (
    Number.parseFloat(element.style.getPropertyValue("--dynt-tilt-y"))
  ))).toBeLessThan(0);
});

test("Kinetic renders circular turbulent waves in every cell geometry", async ({ page }) => {
  await page.goto("/examples/kinetic-browser/");
  const nested = page.locator("#nested-surface");
  const canvas = nested.locator("[data-dynt-kinetic-canvas]");
  const box = await nested.boundingBox();
  const pointer = {
    bubbles: true,
    clientX: box.x + box.width * 0.35,
    clientY: box.y + box.height * 0.45,
    composed: true,
    pointerType: "mouse",
  };

  await nested.dispatchEvent("pointermove", pointer);
  await page.waitForTimeout(32);
  await expect(canvas).toHaveAttribute("data-dynt-cell-shape", "square");
  await expect(canvas).toHaveAttribute("data-dynt-cell-size", "32");
  await expect(canvas).toHaveAttribute("data-dynt-flow-cells", "0");
  await expect(canvas).not.toHaveAttribute("data-dynt-field-cells", /.+/);

  await nested.dispatchEvent("pointerdown", pointer);
  await page.waitForTimeout(64);
  await expect.poll(() => canvas.getAttribute("data-dynt-flow-cells").then(Number)).toBeGreaterThan(0);
  await expect(canvas).toHaveAttribute("data-dynt-flow-model", "radial-turbulent");
  await expect.poll(() => nested.locator(".dynt-kinetic__reactor").evaluate((element) => (
    element.getAnimations().length
  ))).toBeGreaterThan(0);
  expect(Number(await canvas.getAttribute("data-dynt-flow-cells"))).toBeLessThanOrEqual(420);
  expect(await canvas.evaluate((element) => (
    element.width / Number.parseFloat(element.style.width)
  ))).toBeLessThanOrEqual(1.5);

  for (const shape of ["Hexagon", "Circle", "Diamond", "Square"]) {
    await page.getByRole("button", { name: `${shape} cells` }).click();
    await expect(canvas).toHaveAttribute("data-dynt-cell-shape", shape.toLowerCase());
  }
});
