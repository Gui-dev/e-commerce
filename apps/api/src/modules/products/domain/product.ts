import { DomainError } from '../../../lib/errors.js'

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  categoryId: string
  priceCents: number
  imageUrl: string | null
  skuPrefix: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProductVariant {
  id: string
  productId: string
  name: string
  sku: string
  priceCents: number | null
  attributes: Record<string, string> | null
  isActive: boolean
  createdAt: Date
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[]
}

export interface CreateProductInput {
  name: string
  description: string
  categoryId: string
  priceCents: number
  skuPrefix: string
  imageUrl?: string | null
}

export interface UpdateProductInput {
  name?: string
  description?: string
  categoryId?: string
  priceCents?: number
  imageUrl?: string | null
  isActive?: boolean
}

export class ProductError extends DomainError {
  constructor(code: string, message: string, statusCode = 400) {
    super(code, message, statusCode)
    this.name = 'ProductError'
  }
}

export class ProductNotFoundError extends ProductError {
  constructor(identifier: string) {
    super('PRODUCT_NOT_FOUND', `Product "${identifier}" not found`, 404)
  }
}

export class ProductSlugConflictError extends ProductError {
  constructor(slug: string) {
    super('PRODUCT_SLUG_CONFLICT', `Product with slug "${slug}" already exists`, 409)
  }
}

export class ProductSkuConflictError extends ProductError {
  constructor(sku: string) {
    super('PRODUCT_SKU_CONFLICT', `Variant with SKU "${sku}" already exists`, 409)
  }
}
