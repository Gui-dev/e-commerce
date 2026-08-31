import type { FastifyInstance } from 'fastify'
import type { CartRepository } from '../domain/cart-repository.js'
import type { StockRepository } from '../../stock/domain/stock-repository.js'
import { requireAuth } from '../../middleware/auth.js'
import { GetCartUseCase } from '../use-cases/get-cart.use-case.js'
import { AddToCartUseCase } from '../use-cases/add-to-cart.use-case.js'
import { UpdateCartItemUseCase } from '../use-cases/update-cart-item.use-case.js'
import { RemoveCartItemUseCase } from '../use-cases/remove-cart-item.use-case.js'

export function createCartRoutes(
  cartRepository: CartRepository,
  stockRepository: StockRepository,
) {
  return async function cartRoutes(app: FastifyInstance) {
    const getCart = new GetCartUseCase(cartRepository)
    const addToCart = new AddToCartUseCase(cartRepository, stockRepository)
    const updateCartItem = new UpdateCartItemUseCase(cartRepository, stockRepository)
    const removeCartItem = new RemoveCartItemUseCase(cartRepository)

    app.get('/cart', {
      preHandler: [requireAuth],
      schema: {
        tags: ['Cart'],
        summary: 'Obter carrinho do usuário',
        security: [{ cookieAuth: [] }],
      },
    }, async (request, reply) => {
      const cart = await getCart.execute(request.user.id)
      return reply.send(cart)
    })

    app.post('/cart/items', {
      preHandler: [requireAuth],
      schema: {
        tags: ['Cart'],
        summary: 'Adicionar item ao carrinho',
        security: [{ cookieAuth: [] }],
        body: {
          type: 'object',
          required: ['variantId', 'quantity'],
          properties: {
            variantId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer', minimum: 1 },
          },
        },
      },
    }, async (request, reply) => {
      const { variantId, quantity } = request.body as { variantId: string; quantity: number }
      const item = await addToCart.execute(request.user.id, { variantId, quantity })
      return reply.code(201).send(item)
    })

    app.patch('/cart/items/:itemId', {
      preHandler: [requireAuth],
      schema: {
        tags: ['Cart'],
        summary: 'Atualizar quantidade do item',
        security: [{ cookieAuth: [] }],
        params: {
          type: 'object',
          required: ['itemId'],
          properties: {
            itemId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['quantity'],
          properties: {
            quantity: { type: 'integer', minimum: 1 },
          },
        },
      },
    }, async (request, reply) => {
      const { itemId } = request.params as { itemId: string }
      const { quantity } = request.body as { quantity: number }
      const item = await updateCartItem.execute(request.user.id, itemId, quantity)
      return reply.send(item)
    })

    app.delete('/cart/items/:itemId', {
      preHandler: [requireAuth],
      schema: {
        tags: ['Cart'],
        summary: 'Remover item do carrinho',
        security: [{ cookieAuth: [] }],
        params: {
          type: 'object',
          required: ['itemId'],
          properties: {
            itemId: { type: 'string' },
          },
        },
      },
    }, async (request, reply) => {
      const { itemId } = request.params as { itemId: string }
      await removeCartItem.execute(itemId)
      return reply.code(204).send()
    })
  }
}
