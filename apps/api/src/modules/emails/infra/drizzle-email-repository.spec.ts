import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../lib/db/test-db.js";
import { resetDatabase } from "../../../lib/db/test-helpers.js";
import { DrizzleEmailRepository } from "./drizzle-email-repository.js";

describe("DrizzleEmailRepository", () => {
  let repo: DrizzleEmailRepository;

  beforeEach(async () => {
    await resetDatabase();
    repo = new DrizzleEmailRepository(db);
  });

  describe("create", () => {
    it("should create an email with pending status", async () => {
      const created = await repo.create({
        to: "user@example.com",
        subject: "Welcome",
        template: "welcome",
        data: { name: "Alice" },
      });

      expect(created.id).toBeDefined();
      expect(created.to).toBe("user@example.com");
      expect(created.subject).toBe("Welcome");
      expect(created.template).toBe("welcome");
      expect(created.data).toEqual({ name: "Alice" });
      expect(created.status).toBe("pending");
      expect(created.sentAt).toBeNull();
      expect(created.error).toBeNull();
      expect(created.createdAt).toBeInstanceOf(Date);
    });

    it("should create an email without data", async () => {
      const created = await repo.create({
        to: "bob@example.com",
        subject: "Test",
        template: "test",
        data: {},
      });

      expect(created.data).toEqual({});
    });
  });

  describe("findById", () => {
    it("should return an email by id", async () => {
      const created = await repo.create({
        to: "user@example.com",
        subject: "Hello",
        template: "hello",
        data: {},
      });

      const found = await repo.findById(created.id);
      expect(found).toBeDefined();
      expect(found?.to).toBe("user@example.com");
      expect(found?.subject).toBe("Hello");
    });

    it("should return null for non-existent id", async () => {
      const found = await repo.findById("00000000-0000-0000-0000-000000000000");
      expect(found).toBeNull();
    });
  });

  describe("markSent", () => {
    it("should mark email as sent with sentAt timestamp", async () => {
      const created = await repo.create({
        to: "user@example.com",
        subject: "Hello",
        template: "hello",
        data: {},
      });

      const sent = await repo.markSent(created.id);
      expect(sent.status).toBe("sent");
      expect(sent.sentAt).toBeInstanceOf(Date);
      expect(sent.id).toBe(created.id);
    });

    it("should throw when marking non-existent email as sent", async () => {
      await expect(repo.markSent("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
        "Email not found",
      );
    });
  });

  describe("markFailed", () => {
    it("should mark email as failed with error message", async () => {
      const created = await repo.create({
        to: "user@example.com",
        subject: "Hello",
        template: "hello",
        data: {},
      });

      const failed = await repo.markFailed(created.id, "SMTP timeout");
      expect(failed.status).toBe("failed");
      expect(failed.error).toBe("SMTP timeout");
      expect(failed.id).toBe(created.id);
    });

    it("should throw when marking non-existent email as failed", async () => {
      await expect(
        repo.markFailed("00000000-0000-0000-0000-000000000000", "error"),
      ).rejects.toThrow("Email not found");
    });
  });

  describe("constructor", () => {
    it("should accept a custom db client", async () => {
      const customRepo = new DrizzleEmailRepository(db);
      const created = await customRepo.create({
        to: "test@example.com",
        subject: "Test",
        template: "test",
        data: {},
      });
      expect(created.id).toBeDefined();
    });
  });
});
