import { expect, test } from "@playwright/test";

test("combined mode suppresses Kinetic until Formation is formed", async ({ page }) => {
  await page.goto("/examples/combined-browser/");
  const section = page.locator("#section-surface");
  await expect(section).toHaveAttribute("data-dynt-formation-phase", "formed");
  const box = await section.boundingBox();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
  await expect.poll(() => section.evaluate((element) => (
    Math.abs(Number.parseFloat(element.style.getPropertyValue("--dynt-tilt-y")))
  ))).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Withdraw" }).click();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await expect(section).toHaveCSS("--dynt-pressure", "0.0000");
  await expect(section).toHaveCSS("--dynt-tilt-y", "0.000deg");

  await page.getByRole("button", { name: "Form" }).click();
  await expect(page.getByRole("status")).toContainText("section-surface:formed");
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await expect.poll(() => section.evaluate((element) => (
    Math.abs(Number.parseFloat(element.style.getPropertyValue("--dynt-tilt-y")))
  ))).toBeGreaterThan(0);
});
