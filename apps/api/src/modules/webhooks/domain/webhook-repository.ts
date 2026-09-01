import type { Webhook } from "./webhook.js";

export type { Webhook } from "./webhook.js";

export interface WebhookRepository {
  findById(id: string): Promise<Webhook | null>;
  create(webhook: Omit<Webhook, "id" | "createdAt">): Promise<Webhook>;
  markProcessed(id: string): Promise<Webhook>;
}
