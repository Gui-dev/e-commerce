import { Queue } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

export const paymentQueue = new Queue("payments", {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
  },
});
