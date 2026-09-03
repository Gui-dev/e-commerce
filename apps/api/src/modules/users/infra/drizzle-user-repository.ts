import { eq } from "drizzle-orm";
import { db as defaultDb } from "../../../lib/db/index.js";
import { users } from "../../../lib/db/schema.js";
import { getTransactionClient } from "../../../lib/db/transaction.js";
import type { User, UserRepository } from "../domain/user-repository.js";

type DbClient = typeof defaultDb;

function mapUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleUserRepository implements UserRepository {
  private explicitTx?: DbClient;

  constructor(tx?: DbClient) {
    this.explicitTx = tx;
  }

  private get db(): DbClient {
    return this.explicitTx ?? getTransactionClient() ?? defaultDb;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, id),
    });
    return row ? mapUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    });
    return row ? mapUser(row) : null;
  }

  async list(): Promise<User[]> {
    const rows = await this.db.select().from(users).orderBy(users.createdAt);
    return rows.map(mapUser);
  }

  async updateRole(id: string, role: string): Promise<User> {
    const [row] = await this.db
      .update(users)
      .set({
        role: role as typeof users.$inferSelect.role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return mapUser(row);
  }

  async create(data: Omit<User, "createdAt" | "updatedAt">): Promise<User> {
    const now = new Date();
    const [row] = await this.db
      .insert(users)
      .values({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role as typeof users.$inferSelect.role,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return mapUser(row);
  }
}
