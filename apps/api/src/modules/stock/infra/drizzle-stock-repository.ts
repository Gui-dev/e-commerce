import { eq } from "drizzle-orm";
import { db as defaultDb } from "../../../lib/db/index.js";
import { stock, stockMovements } from "../../../lib/db/schema.js";
import { getTransactionClient } from "../../../lib/db/transaction.js";
import type { Stock, StockMovement, StockRepository } from "../domain/stock-repository.js";
import { InsufficientStockError, StockNotFoundError } from "../domain/stock.js";

type DbClient = typeof defaultDb;

function mapStock(row: typeof stock.$inferSelect): Stock {
  return {
    id: row.id,
    variantId: row.variantId,
    quantity: row.quantity,
    reserved: row.reserved,
    updatedAt: row.updatedAt,
  };
}

function mapMovement(row: typeof stockMovements.$inferSelect): StockMovement {
  return {
    id: row.id,
    variantId: row.variantId,
    type: row.type as StockMovement["type"],
    quantity: row.quantity,
    referenceId: row.referenceId,
    notes: row.notes,
    createdAt: row.createdAt,
  };
}

export class DrizzleStockRepository implements StockRepository {
  private explicitTx?: DbClient;

  constructor(tx?: DbClient) {
    this.explicitTx = tx;
  }

  private get db(): DbClient {
    return this.explicitTx ?? getTransactionClient() ?? defaultDb;
  }

  async findByVariantId(variantId: string): Promise<Stock | null> {
    const row = await this.db.query.stock.findFirst({
      where: (s, { eq }) => eq(s.variantId, variantId),
    });
    return row ? mapStock(row) : null;
  }

  async list(): Promise<Stock[]> {
    const rows = await this.db.select().from(stock);
    return rows.map(mapStock);
  }

  async create(variantId: string, initialQuantity = 0): Promise<Stock> {
    const existing = await this.findByVariantId(variantId);
    if (existing) return existing;

    const [row] = await this.db
      .insert(stock)
      .values({
        variantId,
        quantity: initialQuantity,
        reserved: 0,
      })
      .returning();

    return mapStock(row);
  }

  async addQuantity(variantId: string, quantity: number): Promise<Stock> {
    const existing = await this.findByVariantId(variantId);
    if (!existing) throw new StockNotFoundError(variantId);

    const [row] = await this.db
      .update(stock)
      .set({
        quantity: existing.quantity + quantity,
        updatedAt: new Date(),
      })
      .where(eq(stock.variantId, variantId))
      .returning();

    return mapStock(row);
  }

  async reserve(variantId: string, quantity: number): Promise<Stock> {
    const existing = await this.findByVariantId(variantId);
    if (!existing) throw new StockNotFoundError(variantId);

    const available = existing.quantity - existing.reserved;
    if (available < quantity) {
      throw new InsufficientStockError(variantId, quantity, available);
    }

    const [row] = await this.db
      .update(stock)
      .set({
        reserved: existing.reserved + quantity,
        updatedAt: new Date(),
      })
      .where(eq(stock.variantId, variantId))
      .returning();

    return mapStock(row);
  }

  async releaseReservation(variantId: string, quantity: number): Promise<Stock> {
    const existing = await this.findByVariantId(variantId);
    if (!existing) throw new StockNotFoundError(variantId);

    const [row] = await this.db
      .update(stock)
      .set({
        reserved: Math.max(0, existing.reserved - quantity),
        updatedAt: new Date(),
      })
      .where(eq(stock.variantId, variantId))
      .returning();

    return mapStock(row);
  }

  async confirmSale(variantId: string, quantity: number): Promise<Stock> {
    const existing = await this.findByVariantId(variantId);
    if (!existing) throw new StockNotFoundError(variantId);

    const [row] = await this.db
      .update(stock)
      .set({
        quantity: existing.quantity - quantity,
        reserved: Math.max(0, existing.reserved - quantity),
        updatedAt: new Date(),
      })
      .where(eq(stock.variantId, variantId))
      .returning();

    return mapStock(row);
  }

  async getMovements(variantId: string): Promise<StockMovement[]> {
    const rows = await this.db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.variantId, variantId));

    return rows.map(mapMovement);
  }

  async addMovement(movement: Omit<StockMovement, "id" | "createdAt">): Promise<StockMovement> {
    const [row] = await this.db
      .insert(stockMovements)
      .values({
        variantId: movement.variantId,
        type: movement.type,
        quantity: movement.quantity,
        referenceId: movement.referenceId ?? null,
        notes: movement.notes ?? null,
      })
      .returning();

    return mapMovement(row);
  }
}
