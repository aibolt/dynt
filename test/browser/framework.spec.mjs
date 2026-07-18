import { expect, test } from "@playwright/test";

function directCanvas(surface) {
  return surface.locator(":scope > [data-dynt-kinetic-layer] canvas");
}

test("DOM React and Web Component hosts share Formation and Kinetic behavior", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/examples/framework-browser/");

  for (const host of ["plain", "react", "web"]) {
    const parent = page.locator(`#${host}-parent`);
    const nested = page.locator(`#${host}-nested`);
    await expect(parent).toHaveAttribute("data-dynt-formation-phase", "formed");
    await expect(nested).toHaveAttribute("data-dynt-formation-phase", "formed");
    await expect(directCanvas(nested)).toHaveAttribute("data-dynt-cell-shape", "hexagon");
    await expect(directCanvas(nested)).toHaveAttribute("data-dynt-cell-size", "20");

    const box = await nested.boundingBox();
    await nested.dispatchEvent("pointerdown", {
      bubbles: true,
      clientX: box.x + box.width * 0.7,
      clientY: box.y + box.height * 0.45,
      composed: true,
      pointerType: "mouse",
    });
    await expect.poll(() => directCanvas(nested)
      .getAttribute("data-dynt-flow-cells").then(Number)).toBeGreaterThan(0);
    await expect(directCanvas(parent)).toHaveAttribute("data-dynt-flow-cells", "0");
    await expect.poll(() => nested.evaluate((element) => (
      Math.abs(Number.parseFloat(element.style.getPropertyValue("--dynt-tilt-y")))
    ))).toBeLessThanOrEqual(0.8);
  }

  await page.getByRole("button", { name: "Destroy examples" }).click();
  await expect(page.locator("[data-dynt-kinetic]")).toHaveCount(0);
  await expect(page.locator("[data-dynt-formation]")).toHaveCount(0);
  expect(errors).toEqual([]);
});
