import { eq } from "drizzle-orm";
import { db as defaultDb } from "../../../lib/db/index.js";
import { emailLogs } from "../../../lib/db/schema.js";
import { getTransactionClient } from "../../../lib/db/transaction.js";
import type { Email, EmailRepository, SendEmailInput } from "../domain/email-repository.js";

type DbClient = typeof defaultDb;

function mapEmail(row: typeof emailLogs.$inferSelect): Email {
  return {
    id: row.id,
    to: row.to,
    subject: row.subject,
    template: row.template,
    data: (row.data as Record<string, unknown>) ?? {},
    status: row.status as Email["status"],
    sentAt: row.sentAt,
    error: row.error,
    createdAt: row.createdAt,
  };
}

export class DrizzleEmailRepository implements EmailRepository {
  private explicitTx?: DbClient;

  constructor(tx?: DbClient) {
    this.explicitTx = tx;
  }

  private get db(): DbClient {
    return this.explicitTx ?? getTransactionClient() ?? defaultDb;
  }

  async findById(id: string): Promise<Email | null> {
    const row = await this.db.query.emailLogs.findFirst({
      where: (e, { eq }) => eq(e.id, id),
    });
    return row ? mapEmail(row) : null;
  }

  async create(input: SendEmailInput): Promise<Email> {
    const [row] = await this.db
      .insert(emailLogs)
      .values({
        to: input.to,
        subject: input.subject,
        template: input.template,
        data: input.data ?? {},
      })
      .returning();

    return mapEmail(row);
  }

  async markSent(id: string): Promise<Email> {
    const existing = await this.findById(id);
    if (!existing) throw new Error("Email not found");

    const [row] = await this.db
      .update(emailLogs)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(emailLogs.id, id))
      .returning();

    return mapEmail(row);
  }

  async markFailed(id: string, error: string): Promise<Email> {
    const existing = await this.findById(id);
    if (!existing) throw new Error("Email not found");

    const [row] = await this.db
      .update(emailLogs)
      .set({ status: "failed", error })
      .where(eq(emailLogs.id, id))
      .returning();

    return mapEmail(row);
  }
}
