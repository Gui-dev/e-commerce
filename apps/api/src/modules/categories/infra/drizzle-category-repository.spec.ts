import { beforeEach, describe, expect, it } from "vitest";
import { categories } from "../../../lib/db/schema.js";
import { db } from "../../../lib/db/test-db.js";
import { TEST_CATEGORY_ID, resetDatabase, seedTestData } from "../../../lib/db/test-helpers.js";
import { CategoryNotFoundError, CategorySlugConflictError } from "../domain/category.js";
import { DrizzleCategoryRepository } from "./drizzle-category-repository.js";

describe("DrizzleCategoryRepository", () => {
  let repo: DrizzleCategoryRepository;

  beforeEach(async () => {
    await resetDatabase();
    repo = new DrizzleCategoryRepository(db);
  });

  describe("findById", () => {
    it("should return a category by id", async () => {
      await seedTestData();
      const found = await repo.findById(TEST_CATEGORY_ID);
      expect(found).toBeDefined();
      expect(found?.name).toBe("Test Category");
      expect(found?.slug).toBe("test-category");
      expect(found?.description).toBe("A test category");
    });

    it("should return null for non-existent id", async () => {
      const found = await repo.findById("00000000-0000-0000-0000-000000000000");
      expect(found).toBeNull();
    });
  });

  describe("findBySlug", () => {
    it("should return a category by slug", async () => {
      await seedTestData();
      const found = await repo.findBySlug("test-category");
      expect(found).toBeDefined();
      expect(found?.name).toBe("Test Category");
      expect(found?.id).toBe(TEST_CATEGORY_ID);
    });

    it("should return null for non-existent slug", async () => {
      const found = await repo.findBySlug("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("should return empty list when no categories exist", async () => {
      const result = await repo.list();
      expect(result).toEqual([]);
    });

    it("should list all categories", async () => {
      await seedTestData();
      const result = await repo.list();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test Category");
    });

    it("should list multiple categories", async () => {
      await seedTestData();
      await db.insert(categories).values([
        { name: "Category A", slug: "cat-a" },
        { name: "Category B", slug: "cat-b" },
      ]);

      const result = await repo.list();
      expect(result).toHaveLength(3);
      expect(result.map((c) => c.name)).toContain("Category A");
      expect(result.map((c) => c.name)).toContain("Category B");
    });
  });

  describe("create", () => {
    it("should create a category", async () => {
      const created = await repo.create({
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices",
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe("Electronics");
      expect(created.slug).toBe("electronics");
      expect(created.description).toBe("Electronic devices");
      expect(created.imageUrl).toBeNull();
      expect(created.parentId).toBeNull();
      expect(created.createdAt).toBeInstanceOf(Date);
    });

    it("should store and retrieve a category by id", async () => {
      const created = await repo.create({
        name: "Books",
        slug: "books",
        description: "All books",
      });

      const found = await repo.findById(created.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe("Books");
    });

    it("should reject duplicate slug", async () => {
      await repo.create({ name: "First", slug: "dup-slug" });

      await expect(repo.create({ name: "Second", slug: "dup-slug" })).rejects.toThrow(
        CategorySlugConflictError,
      );
    });

    it("should save imageUrl when provided", async () => {
      const created = await repo.create({
        name: "With Image",
        slug: "with-image",
        imageUrl: "https://example.com/image.png",
      });

      expect(created.imageUrl).toBe("https://example.com/image.png");
    });

    it("should save parentId when provided", async () => {
      await seedTestData();
      const created = await repo.create({
        name: "Subcategory",
        slug: "subcategory",
        parentId: TEST_CATEGORY_ID,
      });

      expect(created.parentId).toBe(TEST_CATEGORY_ID);
    });
  });

  describe("update", () => {
    it("should update a category", async () => {
      await seedTestData();
      const updated = await repo.update(TEST_CATEGORY_ID, {
        name: "New Name",
      });

      expect(updated.name).toBe("New Name");
      expect(updated.id).toBe(TEST_CATEGORY_ID);
    });

    it("should update description", async () => {
      await seedTestData();
      const updated = await repo.update(TEST_CATEGORY_ID, {
        description: "Updated description",
      });

      expect(updated.description).toBe("Updated description");
    });

    it("should allow setting description to null", async () => {
      await seedTestData();
      const updated = await repo.update(TEST_CATEGORY_ID, {
        description: null,
      });

      expect(updated.description).toBeNull();
    });

    it("should allow setting imageUrl", async () => {
      await seedTestData();
      const updated = await repo.update(TEST_CATEGORY_ID, {
        imageUrl: "https://example.com/new.png",
      });

      expect(updated.imageUrl).toBe("https://example.com/new.png");
    });

    it("should throw CategoryNotFoundError when updating non-existent category", async () => {
      await expect(
        repo.update("00000000-0000-0000-0000-000000000000", { name: "Nope" }),
      ).rejects.toThrow(CategoryNotFoundError);
    });
  });

  describe("delete", () => {
    it("should delete a category", async () => {
      const created = await repo.create({ name: "To Delete", slug: "to-delete" });
      await repo.delete(created.id);
      const found = await repo.findById(created.id);
      expect(found).toBeNull();
    });

    it("should throw CategoryNotFoundError when deleting non-existent category", async () => {
      await expect(repo.delete("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
        CategoryNotFoundError,
      );
    });
  });

  describe("constructor", () => {
    it("should accept a custom db client", async () => {
      await seedTestData();
      const customRepo = new DrizzleCategoryRepository(db);
      const found = await customRepo.findById(TEST_CATEGORY_ID);
      expect(found).toBeDefined();
    });
  });
});
