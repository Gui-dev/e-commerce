import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { PostgresDialect } from "kysely";
import { Pool } from "pg";
import { env } from "../env.js";

export const auth = betterAuth({
  database: new PostgresDialect({
    pool: new Pool({
      connectionString: env.DATABASE_URL,
    }),
  }),
  plugins: [bearer()],
  user: {
    modelName: "users",
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
});
