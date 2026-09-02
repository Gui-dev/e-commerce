import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { categories, productVariants, products, stock } from "./schema.js";
import { db } from "./test-db.js";
import {
  TEST_CATEGORY_ID,
  TEST_PRODUCT_ID,
  TEST_STOCK_ID,
  TEST_VARIANT_ID,
  resetDatabase,
  seedTestData,
} from "./test-helpers.js";

describe("test helpers", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterEach(async () => {
    await resetDatabase();
  });

  test("seedTestData inserts category, product, variant, and stock", async () => {
    await seedTestData();

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, TEST_CATEGORY_ID));

    expect(category).toBeDefined();
    expect(category.id).toBe(TEST_CATEGORY_ID);
    expect(category.name).toBe("Test Category");
    expect(category.slug).toBe("test-category");

    const [product] = await db.select().from(products).where(eq(products.id, TEST_PRODUCT_ID));

    expect(product).toBeDefined();
    expect(product.id).toBe(TEST_PRODUCT_ID);
    expect(product.name).toBe("Test Product");
    expect(product.categoryId).toBe(TEST_CATEGORY_ID);

    const [variant] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, TEST_VARIANT_ID));

    expect(variant).toBeDefined();
    expect(variant.id).toBe(TEST_VARIANT_ID);
    expect(variant.productId).toBe(TEST_PRODUCT_ID);
    expect(variant.sku).toBe("TEST-SKU-001");

    const [stockRow] = await db.select().from(stock).where(eq(stock.id, TEST_STOCK_ID));

    expect(stockRow).toBeDefined();
    expect(stockRow.id).toBe(TEST_STOCK_ID);
    expect(stockRow.variantId).toBe(TEST_VARIANT_ID);
    expect(stockRow.quantity).toBe(100);
  });

  test("resetDatabase clears all tables", async () => {
    await seedTestData();

    await resetDatabase();

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, TEST_CATEGORY_ID));

    expect(category).toBeUndefined();

    const [product] = await db.select().from(products).where(eq(products.id, TEST_PRODUCT_ID));

    expect(product).toBeUndefined();

    const [variant] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, TEST_VARIANT_ID));

    expect(variant).toBeUndefined();

    const [stockRow] = await db.select().from(stock).where(eq(stock.id, TEST_STOCK_ID));

    expect(stockRow).toBeUndefined();
  });
});
