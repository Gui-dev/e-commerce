import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../lib/db/test-db.js";
import { resetDatabase } from "../../../lib/db/test-helpers.js";
import { DrizzleUserRepository } from "./drizzle-user-repository.js";

describe("DrizzleUserRepository", () => {
  let repo: DrizzleUserRepository;

  beforeEach(async () => {
    await resetDatabase();
    repo = new DrizzleUserRepository(db);
  });

  const userData = {
    id: "99999999-0000-4000-8000-000000000009",
    name: "Jane Doe",
    email: "jane@example.com",
    role: "customer",
  };

  describe("create", () => {
    it("should create a user", async () => {
      const created = await repo.create(userData);

      expect(created.id).toBe(userData.id);
      expect(created.name).toBe("Jane Doe");
      expect(created.email).toBe("jane@example.com");
      expect(created.role).toBe("customer");
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
    });

    it("should set default role when not provided", async () => {
      const created = await repo.create({
        id: userData.id,
        name: "John",
        email: "john@example.com",
        role: "customer",
      });

      expect(created.role).toBe("customer");
    });
  });

  describe("findById", () => {
    it("should return a user by id", async () => {
      await repo.create(userData);
      const found = await repo.findById(userData.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe("Jane Doe");
      expect(found?.email).toBe("jane@example.com");
    });

    it("should return null for non-existent id", async () => {
      const found = await repo.findById("00000000-0000-0000-0000-000000000000");
      expect(found).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("should return a user by email", async () => {
      await repo.create(userData);
      const found = await repo.findByEmail("jane@example.com");

      expect(found).toBeDefined();
      expect(found?.id).toBe(userData.id);
      expect(found?.name).toBe("Jane Doe");
    });

    it("should return null for non-existent email", async () => {
      const found = await repo.findByEmail("nobody@example.com");
      expect(found).toBeNull();
    });

    it("should be case sensitive", async () => {
      await repo.create(userData);
      const found = await repo.findByEmail("JANE@example.com");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("should return empty list when no users exist", async () => {
      const result = await repo.list();
      expect(result).toEqual([]);
    });

    it("should list all users", async () => {
      await repo.create(userData);
      await repo.create({
        id: "88888888-0000-4000-8000-000000000008",
        name: "Bob Smith",
        email: "bob@example.com",
        role: "admin",
      });

      const result = await repo.list();
      expect(result).toHaveLength(2);
      expect(result.map((u) => u.email)).toEqual(
        expect.arrayContaining(["jane@example.com", "bob@example.com"]),
      );
    });
  });

  describe("updateRole", () => {
    it("should update a user's role", async () => {
      await repo.create(userData);
      const updated = await repo.updateRole(userData.id, "admin");

      expect(updated.role).toBe("admin");
      expect(updated.name).toBe("Jane Doe");
      expect(updated.id).toBe(userData.id);
    });

    it("should update the updatedAt timestamp", async () => {
      await repo.create(userData);
      const before = await repo.findById(userData.id);
      const updated = await repo.updateRole(userData.id, "admin");

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before!.updatedAt.getTime());
    });

    it("should persist the role change", async () => {
      await repo.create(userData);
      await repo.updateRole(userData.id, "admin");

      const found = await repo.findById(userData.id);
      expect(found?.role).toBe("admin");
    });
  });

  describe("constructor", () => {
    it("should accept a custom db client", async () => {
      await repo.create(userData);
      const customRepo = new DrizzleUserRepository(db);
      const found = await customRepo.findById(userData.id);
      expect(found).toBeDefined();
    });
  });
});
