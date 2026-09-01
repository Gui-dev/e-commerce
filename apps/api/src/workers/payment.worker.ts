import { type Job, Worker } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

interface PaymentJobData {
  paymentId: string;
  orderId: string;
  method: "pix" | "credit_card" | "boleto";
  amountCents: number;
}

export const paymentWorker = new Worker(
  "payments",
  async (job: Job<PaymentJobData>) => {
    const { paymentId, method } = job.data;

    // Simulate payment processing delay
    const delay = method === "pix" ? 1000 : method === "credit_card" ? 3000 : 5000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Simulate 90% success rate
    const success = Math.random() < 0.9;

    return {
      paymentId,
      status: success ? "approved" : "rejected",
      externalId: `ext-${Date.now()}`,
    };
  },
  { connection: getRedisConnection() },
);

paymentWorker.on("completed", (job) => {
  console.log(`[PaymentWorker] Job ${job.id} completed: ${job.returnvalue?.status}`);
});

paymentWorker.on("failed", (job, err) => {
  console.error(`[PaymentWorker] Job ${job?.id} failed:`, err.message);
});
