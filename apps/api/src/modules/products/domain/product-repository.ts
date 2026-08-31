import type { CreateProductInput, Product, ProductVariant, UpdateProductInput } from "./product.js";

export type {
  Product,
  ProductVariant,
  ProductWithVariants,
  CreateProductInput,
  UpdateProductInput,
} from "./product.js";

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  list(params: {
    categoryId?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ products: Product[]; total: number }>;
  create(input: CreateProductInput & { slug: string }): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product>;
  delete(id: string): Promise<void>;

  findVariantsByProductId(productId: string): Promise<ProductVariant[]>;
  findVariantBySku(sku: string): Promise<ProductVariant | null>;
  createVariant(
    productId: string,
    input: {
      name: string;
      sku: string;
      priceCents?: number | null;
      attributes?: Record<string, string>;
    },
  ): Promise<ProductVariant>;
  updateVariant(
    id: string,
    input: {
      name?: string;
      priceCents?: number | null;
      attributes?: Record<string, string>;
      isActive?: boolean;
    },
  ): Promise<ProductVariant>;
  deleteVariant(id: string): Promise<void>;
}
