import { type Job, Worker } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

interface WebhookJobData {
  url: string;
  event: string;
  payload: unknown;
}

export const webhookWorker = new Worker(
  "webhooks",
  async (job: Job<WebhookJobData>) => {
    const { url, event, payload } = job.data;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    return { success: true, status: response.status };
  },
  { connection: getRedisConnection() },
);

webhookWorker.on("completed", (job) => {
  console.log(`[WebhookWorker] Job ${job.id} completed for ${job.data.event}`);
});

webhookWorker.on("failed", (job, err) => {
  console.error(`[WebhookWorker] Job ${job?.id} failed:`, err.message);
});
