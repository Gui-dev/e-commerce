import { Queue } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

export const emailQueue = new Queue("emails", {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});
