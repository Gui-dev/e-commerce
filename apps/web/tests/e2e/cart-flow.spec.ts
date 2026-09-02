import { expect, test } from "@playwright/test";

test.describe("Cart Flow", () => {
  test("displays empty cart message when cart is empty", async ({ page }) => {
    await page.goto("/cart");

    await expect(page.getByRole("heading", { name: "Seu carrinho está vazio" })).toBeVisible();
    await expect(page.getByText("Adicione produtos para continuar comprando.")).toBeVisible();
  });

  test("navigates back to products from empty cart", async ({ page }) => {
    await page.goto("/cart");

    const backLink = page.getByRole("link", { name: "Ver Produtos" });
    await expect(backLink).toBeVisible();
    await backLink.click();

    await expect(page).toHaveURL("/");
  });

  test("can add product to cart and view it", async ({ page }) => {
    await page.goto("/");

    const addButton = page.getByRole("button", { name: "+ Comprar" }).first();
    await addButton.click();

    await page.goto("/cart");

    await expect(page.getByRole("heading", { name: "Carrinho" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Limpar carrinho" })).toBeVisible();
  });

  test("can clear cart", async ({ page }) => {
    await page.goto("/");

    const addButton = page.getByRole("button", { name: "+ Comprar" }).first();
    await addButton.click();

    await page.goto("/cart");

    const clearButton = page.getByRole("button", { name: "Limpar carrinho" });
    await clearButton.click();

    await expect(page.getByRole("heading", { name: "Seu carrinho está vazio" })).toBeVisible();
  });
});
