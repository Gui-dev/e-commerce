import { eq } from "drizzle-orm";
import { db as defaultDb } from "../../../lib/db/index.js";
import { cartItems, carts } from "../../../lib/db/schema.js";
import { getTransactionClient } from "../../../lib/db/transaction.js";
import type {
  AddToCartInput,
  Cart,
  CartItem,
  CartRepository,
  UpdateCartItemInput,
} from "../domain/cart-repository.js";
import { CartItemNotFoundError, CartNotFoundError } from "../domain/cart.js";

type DbClient = typeof defaultDb;

function mapCartRow(row: typeof carts.$inferSelect, items: CartItem[]): Cart {
  return {
    id: row.id,
    userId: row.userId,
    couponId: row.couponId,
    items,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCartItemRow(row: typeof cartItems.$inferSelect): CartItem {
  return {
    id: row.id,
    cartId: row.cartId,
    variantId: row.variantId,
    quantity: row.quantity,
    addedAt: row.addedAt,
  };
}

export class DrizzleCartRepository implements CartRepository {
  private explicitTx?: DbClient;

  constructor(tx?: DbClient) {
    this.explicitTx = tx;
  }

  private get db(): DbClient {
    return this.explicitTx ?? getTransactionClient() ?? defaultDb;
  }

  async findByUserId(userId: string): Promise<Cart | null> {
    const cartRow = await this.db.query.carts.findFirst({
      where: (c, { eq }) => eq(c.userId, userId),
    });
    if (!cartRow) return null;

    const itemRows = await this.db.query.cartItems.findMany({
      where: (ci, { eq }) => eq(ci.cartId, cartRow.id),
    });

    return mapCartRow(cartRow, itemRows.map(mapCartItemRow));
  }

  async findItemById(itemId: string): Promise<CartItem | null> {
    const row = await this.db.query.cartItems.findFirst({
      where: (ci, { eq }) => eq(ci.id, itemId),
    });
    return row ? mapCartItemRow(row) : null;
  }

  async create(userId: string): Promise<Cart> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    const [row] = await this.db.insert(carts).values({ userId }).returning();
    return mapCartRow(row, []);
  }

  async addItem(cartId: string, input: AddToCartInput): Promise<CartItem> {
    const cartRow = await this.db.query.carts.findFirst({
      where: (c, { eq }) => eq(c.id, cartId),
    });
    if (!cartRow) throw new CartNotFoundError(cartId);

    const existingItem = await this.findCartItemByVariantId(cartId, input.variantId);
    if (existingItem) {
      const [updated] = await this.db
        .update(cartItems)
        .set({ quantity: existingItem.quantity + input.quantity })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return mapCartItemRow(updated);
    }

    const [row] = await this.db
      .insert(cartItems)
      .values({
        cartId,
        variantId: input.variantId,
        quantity: input.quantity,
      })
      .returning();

    return mapCartItemRow(row);
  }

  async updateItem(itemId: string, input: UpdateCartItemInput): Promise<CartItem> {
    const existing = await this.findItemById(itemId);
    if (!existing) throw new CartItemNotFoundError(itemId);

    const [updated] = await this.db
      .update(cartItems)
      .set({ quantity: input.quantity })
      .where(eq(cartItems.id, itemId))
      .returning();

    return mapCartItemRow(updated);
  }

  async removeItem(itemId: string): Promise<void> {
    const existing = await this.findItemById(itemId);
    if (!existing) throw new CartItemNotFoundError(itemId);

    await this.db.delete(cartItems).where(eq(cartItems.id, itemId));
  }

  async clearCart(cartId: string): Promise<void> {
    await this.db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  }

  async findCartItemByVariantId(cartId: string, variantId: string): Promise<CartItem | null> {
    const row = await this.db.query.cartItems.findFirst({
      where: (ci, { eq, and }) => and(eq(ci.cartId, cartId), eq(ci.variantId, variantId)),
    });
    return row ? mapCartItemRow(row) : null;
  }
}
