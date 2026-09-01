import { type Job, Worker } from "bullmq";
import { sendEmail } from "../lib/mailer.js";
import { getRedisConnection } from "../lib/redis.js";

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

export const emailWorker = new Worker(
  "emails",
  async (job: Job<EmailJobData>) => {
    const { to, subject, html } = job.data;
    await sendEmail({ to, subject, html });
    return { success: true };
  },
  { connection: getRedisConnection() },
);

emailWorker.on("completed", (job) => {
  console.log(`[EmailWorker] Job ${job.id} completed for ${job.data.to}`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message);
});
