import type { FastifyInstance } from 'fastify'
import type { ProductRepository } from '../domain/product-repository.js'
import { CreateProductUseCase } from '../use-cases/create-product.use-case.js'
import { ListProductsUseCase } from '../use-cases/list-products.use-case.js'
import { GetProductBySlugUseCase } from '../use-cases/get-product-by-slug.use-case.js'
import { requireAdmin } from '../../middleware/auth.js'

export function createProductRoutes(repository: ProductRepository) {
  return async function productRoutes(app: FastifyInstance) {
    const createProduct = new CreateProductUseCase(repository)
    const listProducts = new ListProductsUseCase(repository)
    const getProductBySlug = new GetProductBySlugUseCase(repository)

    app.get('/products', {
      schema: {
        tags: ['Products'],
        summary: 'Listar produtos do catálogo',
        querystring: {
          type: 'object',
          properties: {
            categoryId: { type: 'string', format: 'uuid' },
            search: { type: 'string' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 50, default: 12 },
          },
        },
      },
    }, async (request, reply) => {
      const { categoryId, search, page, limit } = request.query as {
        categoryId?: string
        search?: string
        page?: number
        limit?: number
      }

      const result = await listProducts.execute({ categoryId, search, page, limit })
      return reply.send(result)
    })

    app.get('/products/:slug', {
      schema: {
        tags: ['Products'],
        summary: 'Obter produto por slug',
        params: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string' },
          },
        },
      },
    }, async (request, reply) => {
      const { slug } = request.params as { slug: string }
      const product = await getProductBySlug.execute(slug)
      return reply.send(product)
    })

    app.post('/admin/products', {
      preHandler: [requireAdmin],
      schema: {
        tags: ['Admin - Products'],
        summary: 'Criar novo produto',
        security: [{ cookieAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'description', 'categoryId', 'priceCents', 'skuPrefix'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', minLength: 10 },
            categoryId: { type: 'string', format: 'uuid' },
            priceCents: { type: 'integer', minimum: 1 },
            skuPrefix: { type: 'string', minLength: 2, maxLength: 10 },
            imageUrl: { type: 'string', nullable: true },
          },
        },
      },
    }, async (request, reply) => {
      const product = await createProduct.execute(request.body as any)
      return reply.code(201).send(product)
    })

    app.patch('/admin/products/:id', {
      preHandler: [requireAdmin],
      schema: {
        tags: ['Admin - Products'],
        summary: 'Atualizar produto',
        security: [{ cookieAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', minLength: 10 },
            categoryId: { type: 'string', format: 'uuid' },
            priceCents: { type: 'integer', minimum: 1 },
            imageUrl: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
          },
        },
      },
    }, async (request, reply) => {
      const { id } = request.params as { id: string }
      const updateProduct = new (await import('../use-cases/update-product.use-case.js')).UpdateProductUseCase(repository)
      const product = await updateProduct.execute(id, request.body as any)
      return reply.send(product)
    })
  }
}
