import { eq } from "drizzle-orm";
import { db as defaultDb } from "../../../lib/db/index.js";
import { payments as paymentsTable } from "../../../lib/db/schema.js";
import { getTransactionClient } from "../../../lib/db/transaction.js";
import type {
  CreatePaymentInput,
  Payment,
  PaymentRepository,
} from "../domain/payment-repository.js";

type DbClient = typeof defaultDb;

function mapPayment(row: typeof paymentsTable.$inferSelect): Payment {
  return {
    id: row.id,
    orderId: row.orderId,
    method: row.method,
    status: row.status,
    amountCents: row.amountCents,
    externalId: row.externalId,
    idempotencyKey: row.idempotencyKey,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzlePaymentRepository implements PaymentRepository {
  private explicitTx?: DbClient;

  constructor(tx?: DbClient) {
    this.explicitTx = tx;
  }

  private get db(): DbClient {
    return this.explicitTx ?? getTransactionClient() ?? defaultDb;
  }

  async findById(id: string): Promise<Payment | null> {
    const row = await this.db.query.payments.findFirst({
      where: (p, { eq: eqFn }) => eqFn(p.id, id),
    });
    return row ? mapPayment(row) : null;
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const row = await this.db.query.payments.findFirst({
      where: (p, { eq: eqFn }) => eqFn(p.orderId, orderId),
    });
    return row ? mapPayment(row) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    const row = await this.db.query.payments.findFirst({
      where: (p, { eq: eqFn }) => eqFn(p.idempotencyKey, key),
    });
    return row ? mapPayment(row) : null;
  }

  async create(input: CreatePaymentInput): Promise<Payment> {
    const [row] = await this.db
      .insert(paymentsTable)
      .values({
        orderId: input.orderId,
        method: input.method,
        status: "pending",
        amountCents: input.amountCents,
        externalId: null,
        idempotencyKey: null,
        paidAt: null,
      })
      .returning();

    return mapPayment(row);
  }

  async updateStatus(id: string, status: Payment["status"], externalId?: string): Promise<Payment> {
    const existing = await this.findById(id);
    if (!existing) throw new Error("Payment not found");

    const [row] = await this.db
      .update(paymentsTable)
      .set({
        status,
        externalId: externalId ?? paymentsTable.externalId,
        paidAt: status === "approved" ? new Date() : paymentsTable.paidAt,
        updatedAt: new Date(),
      })
      .where(eq(paymentsTable.id, id))
      .returning();

    return mapPayment(row);
  }
}
