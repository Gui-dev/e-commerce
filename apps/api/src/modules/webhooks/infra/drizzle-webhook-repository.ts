import { eq } from "drizzle-orm";
import { db as defaultDb } from "../../../lib/db/index.js";
import { webhookLogs } from "../../../lib/db/schema.js";
import type { Webhook, WebhookRepository } from "../domain/webhook-repository.js";

type DbClient = typeof defaultDb;

function mapWebhook(row: typeof webhookLogs.$inferSelect): Webhook {
  return {
    id: row.id,
    event: row.event as Webhook["event"],
    payload: row.payload as Record<string, unknown>,
    processedAt: row.processedAt,
    createdAt: row.createdAt,
  };
}

export class DrizzleWebhookRepository implements WebhookRepository {
  private db: DbClient;

  constructor(tx?: DbClient) {
    this.db = tx ?? defaultDb;
  }

  async findById(id: string): Promise<Webhook | null> {
    const row = await this.db.query.webhookLogs.findFirst({
      where: (w, { eq }) => eq(w.id, id),
    });
    return row ? mapWebhook(row) : null;
  }

  async create(input: Omit<Webhook, "id" | "createdAt">): Promise<Webhook> {
    const [row] = await this.db
      .insert(webhookLogs)
      .values({
        event: input.event,
        payload: input.payload,
        processedAt: input.processedAt,
      })
      .returning();

    return mapWebhook(row);
  }

  async markProcessed(id: string): Promise<Webhook> {
    const [row] = await this.db
      .update(webhookLogs)
      .set({
        processedAt: new Date(),
        status: "processed",
      })
      .where(eq(webhookLogs.id, id))
      .returning();

    return mapWebhook(row);
  }
}
