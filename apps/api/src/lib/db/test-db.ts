import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://kronostore:kronostore@localhost:5432/kronostore_test";

const client = postgres(TEST_DATABASE_URL);
export const db = drizzle(client, { schema });
