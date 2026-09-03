import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../lib/db/test-db.js";
import { resetDatabase } from "../../../lib/db/test-helpers.js";
import type { Webhook } from "../domain/webhook-repository.js";
import { DrizzleWebhookRepository } from "./drizzle-webhook-repository.js";

const TEST_WEBHOOK_ID = "eeeeeeee-0000-4000-8000-000000000005";

describe("DrizzleWebhookRepository", () => {
  let repo: DrizzleWebhookRepository;

  beforeEach(async () => {
    await resetDatabase();
    repo = new DrizzleWebhookRepository(db);
  });

  function makeInput(overrides: Partial<Omit<Webhook, "id" | "createdAt">> = {}) {
    return {
      event: "payment.approved" as const,
      payload: { paymentId: "11111111-1111-4111-8111-111111111111", amount: 1000 },
      processedAt: null,
      ...overrides,
    };
  }

  describe("create", () => {
    it("should create a webhook", async () => {
      const created = await repo.create(makeInput());

      expect(created.id).toBeDefined();
      expect(created.event).toBe("payment.approved");
      expect(created.payload).toEqual({
        paymentId: "11111111-1111-4111-8111-111111111111",
        amount: 1000,
      });
      expect(created.processedAt).toBeNull();
      expect(created.createdAt).toBeInstanceOf(Date);
    });

    it("should preserve processedAt when provided", async () => {
      const processedAt = new Date();
      const created = await repo.create(makeInput({ processedAt }));

      expect(created.processedAt).toEqual(processedAt);
    });

    it("should store and retrieve a webhook by id", async () => {
      const created = await repo.create(makeInput());
      const found = await repo.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.event).toBe("payment.approved");
    });
  });

  describe("findById", () => {
    it("should return a webhook by id", async () => {
      const created = await repo.create(makeInput());
      const found = await repo.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.payload).toEqual(created.payload);
    });

    it("should return null for non-existent id", async () => {
      const found = await repo.findById(TEST_WEBHOOK_ID);
      expect(found).toBeNull();
    });
  });

  describe("markProcessed", () => {
    it("should set the processedAt timestamp", async () => {
      const created = await repo.create(makeInput());
      expect(created.processedAt).toBeNull();

      const updated = await repo.markProcessed(created.id);

      expect(updated.id).toBe(created.id);
      expect(updated.processedAt).toBeInstanceOf(Date);
      expect(updated.createdAt).toEqual(created.createdAt);
      expect(updated.event).toBe(created.event);
    });

    it("should persist the processedAt timestamp", async () => {
      const created = await repo.create(makeInput());
      await repo.markProcessed(created.id);

      const found = await repo.findById(created.id);
      expect(found?.processedAt).toBeInstanceOf(Date);
    });
  });
});
