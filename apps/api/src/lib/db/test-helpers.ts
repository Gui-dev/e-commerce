import { sql } from "drizzle-orm";
import { categories, productVariants, products, stock } from "./schema.js";
import { db } from "./test-db.js";

export const TEST_CATEGORY_ID = "aaaaaaaa-0000-4000-8000-000000000001";
export const TEST_PRODUCT_ID = "bbbbbbbb-0000-4000-8000-000000000002";
export const TEST_VARIANT_ID = "cccccccc-0000-4000-8000-000000000003";
export const TEST_STOCK_ID = "dddddddd-0000-4000-8000-000000000004";

const TABLES = [
  "outbox_messages",
  "webhook_logs",
  "email_logs",
  "idempotency_keys",
  "payments",
  "order_items",
  "orders",
  "cart_items",
  "carts",
  "stock_movements",
  "stock",
  "product_variants",
  "products",
  "categories",
  "coupons",
  "users",
];

export async function resetDatabase(): Promise<void> {
  for (const table of TABLES) {
    await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`));
  }
}

export async function seedTestData(): Promise<void> {
  await db.insert(categories).values({
    id: TEST_CATEGORY_ID,
    name: "Test Category",
    slug: "test-category",
    description: "A test category",
  });

  await db.insert(products).values({
    id: TEST_PRODUCT_ID,
    name: "Test Product",
    slug: "test-product",
    description: "A test product",
    categoryId: TEST_CATEGORY_ID,
    priceCents: 1999,
    skuPrefix: "TEST",
  });

  await db.insert(productVariants).values({
    id: TEST_VARIANT_ID,
    productId: TEST_PRODUCT_ID,
    name: "Default",
    sku: "TEST-SKU-001",
    priceCents: 1999,
  });

  await db.insert(stock).values({
    id: TEST_STOCK_ID,
    variantId: TEST_VARIANT_ID,
    quantity: 100,
    reserved: 0,
  });
}
