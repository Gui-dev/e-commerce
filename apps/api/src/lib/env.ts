import "dotenv/config";

export const env = {
  DATABASE_URL:
    process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/kronostore",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "super-secret-key-change-in-production",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || "localhost",
  MINIO_PORT: Number(process.env.MINIO_PORT) || 9000,
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || "minioadmin",
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || "minioadmin",
  MINIO_BUCKET: process.env.MINIO_BUCKET || "kronostore",
};
