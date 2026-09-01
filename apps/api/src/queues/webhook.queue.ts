import { Queue } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

export const webhookQueue = new Queue("webhooks", {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
  },
});
