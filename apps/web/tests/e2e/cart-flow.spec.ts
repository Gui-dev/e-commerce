import { type Page, expect, test } from "@playwright/test";

async function addFirstProductToCart(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Produtos em Destaque" })).toBeVisible();

  const productLink = page.getByRole("link", { name: /Comprar/ }).first();
  await productLink.click();

  await expect(page).toHaveURL(/\/product\//);

  const addButton = page.getByRole("button", { name: "+ Comprar" });
  await expect(addButton).toBeVisible();
  await addButton.click();

  await expect(page.getByText("Adicionado!")).toBeVisible();
}

test.describe("Cart Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

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
    await addFirstProductToCart(page);

    await page.goto("/cart");

    await expect(page.getByRole("heading", { name: "Carrinho" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Limpar carrinho" })).toBeVisible();
  });

  test("can clear cart", async ({ page }) => {
    await addFirstProductToCart(page);

    await page.goto("/cart");

    const clearButton = page.getByRole("button", { name: "Limpar carrinho" });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    await expect(page.getByRole("heading", { name: "Seu carrinho está vazio" })).toBeVisible();
  });
});
