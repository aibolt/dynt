import { expect, test } from "@playwright/test";

test("Formation lifecycle preserves controls, focus, input, and dynamic targets", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/examples/formation-browser/");
  const status = page.getByRole("status");

  await expect(status).toContainText("section-target:formed");
  await expect(status).toContainText("line-rise-target:formed");
  await page.getByRole("button", { name: "Withdraw all" }).click();
  await expect(status).toContainText("section-target:unformed");
  await page.getByRole("button", { name: "Form all" }).click();
  await expect(status).toContainText("section-target:formed");

  const input = page.getByRole("textbox", { name: "Text input" });
  await input.fill("Preserved across browsers");
  await page.getByRole("button", { name: "Add target" }).click();
  await expect(status).toContainText("dynamic-6:formed");
  await expect(input).toHaveValue("Preserved across browsers");
  await page.getByRole("link", { name: "Focusable link" }).focus();
  await expect(page.getByRole("link", { name: "Focusable link" })).toBeFocused();
  expect(errors).toEqual([]);
});

test("Formation reduced motion reaches terminal phases immediately", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/examples/formation-browser/");
  const status = page.getByRole("status");

  await page.getByRole("button", { name: "Withdraw all" }).click();
  await expect(status).toContainText("section-target:unformed");
  await page.getByRole("button", { name: "Form all" }).click();
  await expect(status).toContainText("section-target:formed");
});

test("Formation preserves accessible controls and responsive geometry", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/examples/formation-browser/");
  const section = page.locator("#section-target");
  const link = page.getByRole("link", { name: "Focusable link" });
  const input = page.getByRole("textbox", { name: "Text input" });
  await expect(section).toHaveAttribute("data-dynt-formation-phase", "formed");
  await expect(link).toHaveAttribute("href", "#verified");
  await expect(input).toHaveValue("Editable value");

  await link.focus();
  await expect(link).toBeFocused();
  expect(await link.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");

  const wideBox = await section.boundingBox();
  await page.setViewportSize({ width: 480, height: 700 });
  const narrowBox = await section.boundingBox();
  expect(narrowBox.width).toBeLessThan(wideBox.width);
  await expect(section).toHaveAttribute("data-dynt-formation-phase", "formed");
  expect(await section.evaluate((element) => ({
    after: getComputedStyle(element, "::after").transform,
    before: getComputedStyle(element, "::before").transform,
  }))).toEqual({
    after: "matrix(1, 0, 0, 1, 0, 0)",
    before: "matrix(1, 0, 0, 1, 0, 0)",
  });
});

test("Formation lifecycle visual checkpoints", async ({ browserName, page }) => {
  test.skip(browserName !== "chromium", "One deterministic engine owns visual baselines.");
  await page.setViewportSize({ width: 520, height: 700 });
  await page.goto("/examples/formation-browser/");
  const section = page.locator("#section-target");
  await expect(section).toHaveAttribute("data-dynt-formation-phase", "formed");
  await page.addStyleTag({ content: "#section-target * { visibility: hidden; }" });
  await expect(section).toHaveScreenshot("formation-formed.png", { animations: "disabled" });

  await page.getByRole("button", { name: "Withdraw all" }).click();
  await expect(section).toHaveAttribute("data-dynt-formation-phase", "unformed");
  await expect(section).toHaveScreenshot("formation-unformed.png", { animations: "disabled" });

  await page.getByRole("button", { name: "Form all" }).click();
  await expect(section).toHaveAttribute("data-dynt-formation-phase", "formed");
  await expect(section).toHaveScreenshot("formation-formed.png", { animations: "disabled" });
});
