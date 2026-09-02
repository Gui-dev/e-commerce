import { describe, expect, test } from "vitest";
import { db } from "./test-db.js";
import {
  TEST_CATEGORY_ID,
  TEST_PRODUCT_ID,
  TEST_STOCK_ID,
  TEST_VARIANT_ID,
  resetDatabase,
  seedTestData,
} from "./test-helpers.js";

describe("Drizzle relations", () => {
  test("products: find with category and variants", async () => {
    await resetDatabase();
    await seedTestData();

    const result = await db.query.products.findFirst({
      where: (p, { eq }) => eq(p.id, TEST_PRODUCT_ID),
      with: { category: true, variants: true },
    });

    expect(result).toBeDefined();
    expect(result!.category.id).toBe(TEST_CATEGORY_ID);
    expect(result!.category.name).toBe("Test Category");
    expect(result!.variants).toHaveLength(1);
    expect(result!.variants[0].id).toBe(TEST_VARIANT_ID);
  });

  test("productVariants: find with product and stock", async () => {
    await resetDatabase();
    await seedTestData();

    const result = await db.query.productVariants.findFirst({
      where: (pv, { eq }) => eq(pv.id, TEST_VARIANT_ID),
      with: { product: true, stock: true },
    });

    expect(result).toBeDefined();
    expect(result!.product.id).toBe(TEST_PRODUCT_ID);
    expect(result!.stock).toBeDefined();
    expect(result!.stock!.quantity).toBe(100);
  });
});
