import { AsyncLocalStorage } from "node:async_hooks";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js/session";
import type { TablesRelationalConfig } from "drizzle-orm/relations";
import { db } from "./index.js";

// biome-ignore lint/suspicious/noExplicitAny: Transaction client type from Drizzle
type TransactionClient = any;
type DrizzleDb = PgDatabase<
  PostgresJsQueryResultHKT,
  Record<string, unknown>,
  TablesRelationalConfig
>;

const asyncLocalStorage = new AsyncLocalStorage<TransactionClient>();

export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  drizzleDb?: DrizzleDb,
): Promise<T> {
  const dbClient = drizzleDb ?? db;
  return dbClient.transaction(async (tx) => {
    return asyncLocalStorage.run(tx, () => fn(tx));
  });
}

export function getTransactionClient(): TransactionClient | null {
  return asyncLocalStorage.getStore() ?? null;
}
