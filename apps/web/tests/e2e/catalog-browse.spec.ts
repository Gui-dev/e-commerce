import { expect, test } from "@playwright/test";

test.describe("Catalog Browse", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display products on homepage", async ({ page }) => {
    await expect(page.getByText("Wireless Headphones")).toBeVisible();
  });

  test("should navigate to category detail from category nav", async ({ page }) => {
    await page.getByRole("link", { name: "Eletrônicos" }).click();
    await expect(page).toHaveURL("/categories/eletronicos");
  });

  test("should navigate to categories page", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible();
  });

  test("should display categories on /categories page", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.getByText("Eletrônicos")).toBeVisible();
  });

  test("should navigate to category detail from categories page", async ({ page }) => {
    await page.goto("/categories");
    await page.getByText("Eletrônicos").click();
    await expect(page).toHaveURL("/categories/eletronicos");
  });

  test("should search products on homepage", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Buscar produtos...");
    await searchInput.fill("headphones");
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/search=headphones/);
  });
});
