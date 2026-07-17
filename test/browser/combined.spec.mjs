import { expect, test } from "@playwright/test";

test("combined mode suppresses Kinetic until Formation is formed", async ({ page }) => {
  await page.goto("/examples/combined-browser/");
  const section = page.locator("#section-surface");
  await expect(section).toHaveAttribute("data-dynt-formation-phase", "formed");
  const box = await section.boundingBox();
  const move = (x) => section.dispatchEvent("pointermove", {
    bubbles: true,
    clientX: box.x + box.width * x,
    clientY: box.y + box.height * 0.5,
    composed: true,
    pointerType: "mouse",
  });
  await move(0.8);
  await expect.poll(() => section.evaluate((element) => (
    Math.abs(Number.parseFloat(element.style.getPropertyValue("--dynt-tilt-y")))
  ))).toBeGreaterThan(0);
  const motionOwnership = await section.evaluate((element) => ({
    bottomRight: Number.parseFloat(element.style.getPropertyValue("--dynt-br-overflow")),
    field: getComputedStyle(element.querySelector("[data-dynt-kinetic-layer]")).transform,
    horizontalRails: getComputedStyle(element, "::before").transform,
    topLeft: Number.parseFloat(element.style.getPropertyValue("--dynt-tl-overflow")),
    reactorX: Number.parseFloat(
      element.querySelector(".dynt-kinetic__reactor").style.getPropertyValue("--dynt-reactor-x"),
    ),
    verticalRails: getComputedStyle(element, "::after").transform,
  }));
  expect(motionOwnership.horizontalRails).not.toBe("none");
  expect(motionOwnership.verticalRails).toBe(motionOwnership.horizontalRails);
  expect(motionOwnership.field).toBe(motionOwnership.horizontalRails);
  expect(motionOwnership.topLeft).toBeGreaterThan(motionOwnership.bottomRight);
  expect(Math.abs(motionOwnership.reactorX)).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Withdraw" }).click();
  await expect(page.locator("[data-dynt-flow-direction='withdraw']").first()).toHaveCount(1);
  await move(0.2);
  await expect(section).toHaveCSS("--dynt-pressure", "0.0000");
  await expect(section).toHaveCSS("--dynt-tilt-y", "0.000deg");
  await expect(section).toHaveAttribute("data-dynt-formation-phase", "unformed");

  await page.getByRole("button", { name: "Form" }).click();
  await expect(section).toHaveAttribute("data-dynt-formation-phase", "formed");
  await move(0.2);
  await expect.poll(() => section.evaluate((element) => (
    Math.abs(Number.parseFloat(element.style.getPropertyValue("--dynt-tilt-y")))
  ))).toBeGreaterThan(0);
});
