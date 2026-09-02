import { beforeEach, describe, expect, it } from "vitest";
import { coupons } from "../../../lib/db/schema.js";
import { db } from "../../../lib/db/test-db.js";
import { resetDatabase } from "../../../lib/db/test-helpers.js";
import { CouponNotFoundError } from "../domain/coupon.js";
import { DrizzleCouponRepository } from "./drizzle-coupon-repository.js";

const TEST_COUPON_ID = "aaaaaaaa-0000-4000-8000-000000000010";

async function seedCoupon(overrides?: Partial<typeof coupons.$inferInsert>) {
  const [row] = await db
    .insert(coupons)
    .values({
      id: TEST_COUPON_ID,
      code: "SAVE10",
      type: "percentage",
      value: 10,
      ...overrides,
    })
    .returning();
  return row;
}

describe("DrizzleCouponRepository", () => {
  let repo: DrizzleCouponRepository;

  beforeEach(async () => {
    await resetDatabase();
    repo = new DrizzleCouponRepository(db);
  });

  describe("findById", () => {
    it("should return a coupon by id", async () => {
      await seedCoupon();
      const found = await repo.findById(TEST_COUPON_ID);
      expect(found).toBeDefined();
      expect(found?.code).toBe("SAVE10");
      expect(found?.type).toBe("percentage");
      expect(found?.value).toBe(10);
      expect(found?.isActive).toBe(true);
      expect(found?.usedCount).toBe(0);
      expect(found?.createdAt).toBeInstanceOf(Date);
    });

    it("should return null for non-existent id", async () => {
      const found = await repo.findById("00000000-0000-0000-0000-000000000000");
      expect(found).toBeNull();
    });

    it("should return coupon with optional fields as null", async () => {
      await seedCoupon({ minOrderCents: null, maxUses: null, expiresAt: null });
      const found = await repo.findById(TEST_COUPON_ID);
      expect(found?.minOrderCents).toBeNull();
      expect(found?.maxUses).toBeNull();
      expect(found?.expiresAt).toBeNull();
    });

    it("should return coupon with optional fields set", async () => {
      const expiresAt = new Date("2026-12-31");
      await seedCoupon({ minOrderCents: 5000, maxUses: 100, expiresAt });
      const found = await repo.findById(TEST_COUPON_ID);
      expect(found?.minOrderCents).toBe(5000);
      expect(found?.maxUses).toBe(100);
      expect(found?.expiresAt?.getTime()).toBe(expiresAt.getTime());
    });
  });

  describe("findByCode", () => {
    it("should return a coupon by code", async () => {
      await seedCoupon();
      const found = await repo.findByCode("SAVE10");
      expect(found).toBeDefined();
      expect(found?.id).toBe(TEST_COUPON_ID);
      expect(found?.code).toBe("SAVE10");
    });

    it("should return null for non-existent code", async () => {
      const found = await repo.findByCode("NOPE");
      expect(found).toBeNull();
    });

    it("should be case-sensitive", async () => {
      await seedCoupon();
      const found = await repo.findByCode("save10");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("should return empty list when no coupons exist", async () => {
      const result = await repo.list();
      expect(result).toEqual([]);
    });

    it("should list all coupons", async () => {
      await seedCoupon({ code: "COUPON_A" });
      await db.insert(coupons).values({ code: "COUPON_B", type: "fixed", value: 500 });
      const result = await repo.list();
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.code)).toContain("COUPON_A");
      expect(result.map((c) => c.code)).toContain("COUPON_B");
    });
  });

  describe("create", () => {
    it("should create a coupon", async () => {
      const created = await repo.create({
        code: "WELCOME20",
        type: "percentage",
        value: 20,
      });

      expect(created.id).toBeDefined();
      expect(created.code).toBe("WELCOME20");
      expect(created.type).toBe("percentage");
      expect(created.value).toBe(20);
      expect(created.usedCount).toBe(0);
      expect(created.isActive).toBe(true);
      expect(created.minOrderCents).toBeNull();
      expect(created.maxUses).toBeNull();
      expect(created.expiresAt).toBeNull();
      expect(created.createdAt).toBeInstanceOf(Date);
    });

    it("should create coupon with optional fields", async () => {
      const expiresAt = new Date("2026-06-30");
      const created = await repo.create({
        code: "VIP50",
        type: "fixed",
        value: 500,
        minOrderCents: 10000,
        maxUses: 50,
        expiresAt,
      });

      expect(created.minOrderCents).toBe(10000);
      expect(created.maxUses).toBe(50);
      expect(created.expiresAt?.getTime()).toBe(expiresAt.getTime());
    });

    it("should store and retrieve a coupon by id", async () => {
      const created = await repo.create({
        code: "RETRIEVE",
        type: "fixed",
        value: 100,
      });
      const found = await repo.findById(created.id);
      expect(found).toBeDefined();
      expect(found?.code).toBe("RETRIEVE");
      expect(found?.value).toBe(100);
    });

    it("should reject duplicate code", async () => {
      await repo.create({ code: "DUP", type: "percentage", value: 10 });
      await expect(repo.create({ code: "DUP", type: "fixed", value: 5 })).rejects.toThrow();
    });
  });

  describe("incrementUsedCount", () => {
    it("should increment usedCount by 1", async () => {
      await seedCoupon();
      const updated = await repo.incrementUsedCount(TEST_COUPON_ID);
      expect(updated.usedCount).toBe(1);
    });

    it("should increment usedCount multiple times", async () => {
      await seedCoupon();
      await repo.incrementUsedCount(TEST_COUPON_ID);
      await repo.incrementUsedCount(TEST_COUPON_ID);
      const updated = await repo.incrementUsedCount(TEST_COUPON_ID);
      expect(updated.usedCount).toBe(3);
    });

    it("should throw CouponNotFoundError for non-existent id", async () => {
      await expect(repo.incrementUsedCount("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
        CouponNotFoundError,
      );
    });

    it("should return updated coupon data", async () => {
      await seedCoupon({ code: "TRACK" });
      const updated = await repo.incrementUsedCount(TEST_COUPON_ID);
      expect(updated.code).toBe("TRACK");
      expect(updated.type).toBe("percentage");
      expect(updated.usedCount).toBe(1);
    });
  });

  describe("delete", () => {
    it("should delete a coupon", async () => {
      await seedCoupon();
      await repo.delete(TEST_COUPON_ID);
      const found = await repo.findById(TEST_COUPON_ID);
      expect(found).toBeNull();
    });

    it("should throw CouponNotFoundError when deleting non-existent coupon", async () => {
      await expect(repo.delete("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
        CouponNotFoundError,
      );
    });

    it("should only delete the specified coupon", async () => {
      await seedCoupon({ code: "KEEP" });
      const [other] = await db
        .insert(coupons)
        .values({ code: "ALSO_KEEP", type: "fixed", value: 10 })
        .returning();

      await repo.delete(TEST_COUPON_ID);

      const found = await repo.findById(TEST_COUPON_ID);
      expect(found).toBeNull();
      const otherFound = await repo.findById(other.id);
      expect(otherFound).toBeDefined();
    });
  });

  describe("constructor", () => {
    it("should accept a custom db client", async () => {
      await seedCoupon();
      const customRepo = new DrizzleCouponRepository(db);
      const found = await customRepo.findById(TEST_COUPON_ID);
      expect(found).toBeDefined();
    });
  });
});
