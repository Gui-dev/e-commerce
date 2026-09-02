import { eq, sql } from "drizzle-orm";
import { db as defaultDb } from "../../../lib/db/index.js";
import { coupons } from "../../../lib/db/schema.js";
import type { Coupon, CouponRepository, CreateCouponInput } from "../domain/coupon-repository.js";
import { CouponNotFoundError } from "../domain/coupon.js";

type DbClient = typeof defaultDb;

function mapCoupon(row: typeof coupons.$inferSelect): Coupon {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: row.value,
    minOrderCents: row.minOrderCents,
    maxUses: row.maxUses,
    usedCount: row.usedCount,
    expiresAt: row.expiresAt,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

export class DrizzleCouponRepository implements CouponRepository {
  private db: DbClient;

  constructor(tx?: DbClient) {
    this.db = tx ?? defaultDb;
  }

  async findById(id: string): Promise<Coupon | null> {
    const row = await this.db.query.coupons.findFirst({
      where: (c, { eq }) => eq(c.id, id),
    });
    return row ? mapCoupon(row) : null;
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const row = await this.db.query.coupons.findFirst({
      where: (c, { eq }) => eq(c.code, code),
    });
    return row ? mapCoupon(row) : null;
  }

  async list(): Promise<Coupon[]> {
    const rows = await this.db.select().from(coupons);
    return rows.map(mapCoupon);
  }

  async create(input: CreateCouponInput): Promise<Coupon> {
    const [row] = await this.db
      .insert(coupons)
      .values({
        code: input.code,
        type: input.type,
        value: input.value,
        minOrderCents: input.minOrderCents ?? null,
        maxUses: input.maxUses ?? null,
        expiresAt: input.expiresAt ?? null,
      })
      .returning();

    return mapCoupon(row);
  }

  async incrementUsedCount(id: string): Promise<Coupon> {
    const existing = await this.findById(id);
    if (!existing) throw new CouponNotFoundError(id);

    const [row] = await this.db
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1` })
      .where(eq(coupons.id, id))
      .returning();

    return mapCoupon(row);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new CouponNotFoundError(id);

    await this.db.delete(coupons).where(eq(coupons.id, id));
  }
}
