import { expect, test } from "@playwright/test";

test.describe("Browse Products", () => {
  test("displays the homepage with hero section", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "KronoStore" })).toBeVisible();
    await expect(page.getByText("Hardware e periféricos de alta performance")).toBeVisible();
  });

  test("displays featured products section", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Produtos em Destaque" })).toBeVisible();
  });

  test("navigates to catalog via Ver Catálogo button", async ({ page }) => {
    await page.goto("/");

    const catalogLink = page.getByRole("link", { name: "Ver Catálogo" });
    await expect(catalogLink).toBeVisible();
    await catalogLink.click();

    await expect(page).toHaveURL(/.*products/);
  });

  test("navigates to categories via Categorias button", async ({ page }) => {
    await page.goto("/");

    const categoriesLink = page.getByRole("link", { name: "Categorias" });
    await expect(categoriesLink).toBeVisible();
    await categoriesLink.click();

    await expect(page).toHaveURL(/.*categories/);
  });
});
