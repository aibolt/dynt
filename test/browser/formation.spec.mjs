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
