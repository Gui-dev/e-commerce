import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { categories } from "./schema.js";
import { db } from "./test-db.js";
import { resetDatabase } from "./test-helpers.js";
import { getTransactionClient, withTransaction } from "./transaction.js";

describe("withTransaction", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterEach(async () => {
    await resetDatabase();
  });

  test("commits data on success", async () => {
    const categoryId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    await withTransaction(async (tx) => {
      await tx.insert(categories).values({
        id: categoryId,
        name: "Transaction Test Category",
        slug: "transaction-test-category",
      });
    }, db);

    const [category] = await db.select().from(categories).where(eq(categories.id, categoryId));

    expect(category).toBeDefined();
    expect(category.name).toBe("Transaction Test Category");
  });

  test("rolls back on error", async () => {
    const categoryId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12";

    await expect(
      withTransaction(async (tx) => {
        await tx.insert(categories).values({
          id: categoryId,
          name: "Rollback Test Category",
          slug: "rollback-test-category",
        });
        throw new Error("Simulated error");
      }, db),
    ).rejects.toThrow("Simulated error");

    const [category] = await db.select().from(categories).where(eq(categories.id, categoryId));

    expect(category).toBeUndefined();
  });

  test("getTransactionClient returns null outside transaction", () => {
    const client = getTransactionClient();
    expect(client).toBeNull();
  });

  test("getTransactionClient returns tx client inside withTransaction", async () => {
    await withTransaction(async (tx) => {
      const client = getTransactionClient();
      expect(client).toBe(tx);
    });
  });
});
