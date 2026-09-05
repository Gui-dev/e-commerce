import { expect, test } from "@playwright/test";

test.describe("Browse Products", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("displays the catalog homepage with title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();
  });

  test("displays product cards", async ({ page }) => {
    await expect(page.getByText("Wireless Headphones")).toBeVisible();
  });

  test("displays category sidebar", async ({ page }) => {
    await expect(page.getByText("Categorias")).toBeVisible();
  });
});
