import type { Webhook, WebhookRepository } from "../domain/webhook-repository.js";

export class InMemoryWebhookRepository implements WebhookRepository {
  private webhooks: Map<string, Webhook> = new Map();
  private nextId = 1;

  async findById(id: string): Promise<Webhook | null> {
    return this.webhooks.get(id) ?? null;
  }

  async create(input: Omit<Webhook, "id" | "createdAt">): Promise<Webhook> {
    const webhook: Webhook = {
      id: `webhook-${this.nextId++}`,
      ...input,
      createdAt: new Date(),
    };

    this.webhooks.set(webhook.id, webhook);
    return webhook;
  }

  async markProcessed(id: string): Promise<Webhook> {
    const webhook = this.webhooks.get(id);
    if (!webhook) throw new Error("Webhook not found");

    const updated: Webhook = {
      ...webhook,
      processedAt: new Date(),
    };

    this.webhooks.set(id, updated);
    return updated;
  }
}
