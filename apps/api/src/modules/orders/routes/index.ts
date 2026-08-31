import type { FastifyInstance } from 'fastify'
import type { OrderRepository, PaymentRepository } from '../domain/order-repository.js'
import type { CartRepository } from '../../cart/domain/cart-repository.js'
import type { StockRepository } from '../../stock/domain/stock-repository.js'
import type { CouponRepository } from '../../coupons/domain/coupon-repository.js'
import { requireAuth } from '../../middleware/auth.js'
import { idempotencyMiddleware } from '../../middleware/idempotency.js'
import { CheckoutUseCase } from '../use-cases/checkout.use-case.js'

export function createCheckoutRoutes(
  orderRepository: OrderRepository,
  cartRepository: CartRepository,
  stockRepository: StockRepository,
  couponRepository: CouponRepository,
) {
  return async function checkoutRoutes(app: FastifyInstance) {
    const checkout = new CheckoutUseCase(
      orderRepository,
      cartRepository,
      stockRepository,
      couponRepository,
    )

    app.post('/checkout', {
      preHandler: [requireAuth, idempotencyMiddleware],
      schema: {
        tags: ['Checkout'],
        summary: 'Finalizar compra',
        security: [{ cookieAuth: [] }],
        headers: {
          type: 'object',
          properties: {
            'idempotency-key': { type: 'string' },
          },
        },
      },
    }, async (request, reply) => {
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined

      const order = await checkout.execute({
        userId: request.user.id,
        idempotencyKey,
      })

      return reply.code(201).send(order)
    })

    app.get('/orders', {
      preHandler: [requireAuth],
      schema: {
        tags: ['Orders'],
        summary: 'Listar pedidos do usuário',
        security: [{ cookieAuth: [] }],
      },
    }, async (request, reply) => {
      const orders = await orderRepository.findByUserId(request.user.id)
      return reply.send(orders)
    })

    app.get('/orders/:id', {
      preHandler: [requireAuth],
      schema: {
        tags: ['Orders'],
        summary: 'Obter detalhes do pedido',
        security: [{ cookieAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    }, async (request, reply) => {
      const { id } = request.params as { id: string }
      const order = await orderRepository.findById(id)
      if (!order || order.userId !== request.user.id) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Order not found' })
      }
      return reply.send(order)
    })
  }
}
