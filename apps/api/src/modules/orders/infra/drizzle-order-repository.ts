import { eq } from "drizzle-orm";
import { db as defaultDb } from "../../../lib/db/index.js";
import { orderItems as orderItemsTable, orders as ordersTable } from "../../../lib/db/schema.js";
import { getTransactionClient } from "../../../lib/db/transaction.js";
import type {
  CreateOrderInput,
  Order,
  OrderItem,
  OrderRepository,
} from "../domain/order-repository.js";
import { OrderNotFoundError } from "../domain/order.js";

type DbClient = typeof defaultDb;

function mapOrder(row: typeof ordersTable.$inferSelect): Order {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    subtotalCents: row.subtotalCents,
    discountCents: row.discountCents,
    totalCents: row.totalCents,
    couponId: row.couponId,
    idempotencyKey: row.idempotencyKey,
    shippingName: row.shippingName,
    shippingStreet: row.shippingStreet,
    shippingCity: row.shippingCity,
    shippingState: row.shippingState,
    shippingZip: row.shippingZip,
    shippingCountry: row.shippingCountry,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapOrderItem(row: typeof orderItemsTable.$inferSelect): OrderItem {
  return {
    id: row.id,
    orderId: row.orderId,
    variantId: row.variantId,
    quantity: row.quantity,
    unitPriceCents: row.unitPriceCents,
  };
}

type OrderRow = NonNullable<Awaited<ReturnType<DbClient["query"]["orders"]["findFirst"]>>>;

function mapOrderRow(row: OrderRow): Order {
  return mapOrder(row);
}

export class DrizzleOrderRepository implements OrderRepository {
  private explicitTx?: DbClient;

  constructor(tx?: DbClient) {
    this.explicitTx = tx;
  }

  private get db(): DbClient {
    return this.explicitTx ?? getTransactionClient() ?? defaultDb;
  }

  async findById(id: string): Promise<Order | null> {
    const row = await this.db.query.orders.findFirst({
      where: (o, { eq: eqFn }) => eqFn(o.id, id),
      with: {
        items: {
          with: {
            variant: true,
          },
        },
        payment: true,
      },
    });
    return row ? mapOrderRow(row) : null;
  }

  async findByUserId(userId: string): Promise<Order[]> {
    const rows = await this.db.query.orders.findMany({
      where: (o, { eq: eqFn }) => eqFn(o.userId, userId),
      orderBy: (o, { desc }) => desc(o.createdAt),
      with: {
        items: {
          with: {
            variant: true,
          },
        },
        payment: true,
      },
    });
    return rows.map(mapOrderRow);
  }

  async findByIdempotencyKey(key: string): Promise<Order | null> {
    const row = await this.db.query.orders.findFirst({
      where: (o, { eq: eqFn }) => eqFn(o.idempotencyKey, key),
      with: {
        items: {
          with: {
            variant: true,
          },
        },
        payment: true,
      },
    });
    return row ? mapOrderRow(row) : null;
  }

  async list(): Promise<Order[]> {
    const rows = await this.db.query.orders.findMany({
      orderBy: (o, { desc }) => desc(o.createdAt),
      with: {
        items: {
          with: {
            variant: true,
          },
        },
        payment: true,
      },
    });
    return rows.map(mapOrderRow);
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const subtotalCents = input.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
    const discountCents = input.discountCents ?? 0;

    const [row] = await this.db
      .insert(ordersTable)
      .values({
        userId: input.userId,
        status: "pending",
        subtotalCents,
        discountCents,
        totalCents: subtotalCents - discountCents,
        couponId: input.couponId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        shippingName: input.shipping?.name ?? null,
        shippingStreet: input.shipping?.street ?? null,
        shippingCity: input.shipping?.city ?? null,
        shippingState: input.shipping?.state ?? null,
        shippingZip: input.shipping?.zip ?? null,
        shippingCountry: input.shipping?.country ?? null,
      })
      .returning();

    return mapOrder(row);
  }

  async addItems(orderId: string, items: CreateOrderInput["items"]): Promise<OrderItem[]> {
    const existing = await this.findById(orderId);
    if (!existing) throw new OrderNotFoundError(orderId);

    const rows = await this.db
      .insert(orderItemsTable)
      .values(items.map((i) => ({ orderId, ...i })))
      .returning();

    return rows.map(mapOrderItem);
  }

  async findItemsByOrderId(orderId: string): Promise<OrderItem[]> {
    const rows = await this.db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderId));
    return rows.map(mapOrderItem);
  }

  async updateStatus(id: string, status: Order["status"]): Promise<Order> {
    const existing = await this.findById(id);
    if (!existing) throw new OrderNotFoundError(id);

    const [row] = await this.db
      .update(ordersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(ordersTable.id, id))
      .returning();

    return mapOrder(row);
  }
}
