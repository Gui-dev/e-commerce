import type { FastifyInstance } from 'fastify'

export async function productRoutes(app: FastifyInstance) {
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
      response: {
        200: {
          description: 'Lista de produtos',
          type: 'object',
          properties: {
            products: { type: 'array' },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return reply.send({ products: [], total: 0, page: 1, limit: 12 })
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
      response: {
        200: {
          description: 'Detalhes do produto',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            priceCents: { type: 'integer' },
            imageUrl: { type: 'string', nullable: true },
            variants: { type: 'array' },
          },
        },
        404: {
          description: 'Produto não encontrado',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string }
    return reply.code(404).send({ error: 'NOT_FOUND', message: `Product ${slug} not found` })
  })
}
