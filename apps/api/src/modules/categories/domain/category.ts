import { DomainError } from "../../../lib/errors.js";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  createdAt: Date;
}

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
}

export class CategoryError extends DomainError {
  constructor(code: string, message: string, statusCode = 400) {
    super(code, message, statusCode);
    this.name = "CategoryError";
  }
}

export class CategoryNotFoundError extends CategoryError {
  constructor(identifier: string) {
    super("CATEGORY_NOT_FOUND", `Category "${identifier}" not found`, 404);
  }
}

export class CategorySlugConflictError extends CategoryError {
  constructor(slug: string) {
    super("CATEGORY_SLUG_CONFLICT", `Category with slug "${slug}" already exists`, 409);
  }
}
