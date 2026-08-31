import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../middleware/auth.js";
import type { StockRepository } from "../../stock/domain/stock-repository.js";
import type { CartRepository } from "../domain/cart-repository.js";
import {
  addToCartSchema,
  cartItemParamsSchema,
  updateCartItemSchema,
} from "../schemas/cart.schema.js";
import { AddToCartUseCase } from "../use-cases/add-to-cart.use-case.js";
import { GetCartUseCase } from "../use-cases/get-cart.use-case.js";
import { RemoveCartItemUseCase } from "../use-cases/remove-cart-item.use-case.js";
import { UpdateCartItemUseCase } from "../use-cases/update-cart-item.use-case.js";

export function createCartRoutes(cartRepository: CartRepository, stockRepository: StockRepository) {
  return async function cartRoutes(app: FastifyInstance) {
    const getCart = new GetCartUseCase(cartRepository);
    const addToCart = new AddToCartUseCase(cartRepository, stockRepository);
    const updateCartItem = new UpdateCartItemUseCase(cartRepository, stockRepository);
    const removeCartItem = new RemoveCartItemUseCase(cartRepository);

    app.withTypeProvider<ZodTypeProvider>().get(
      "/cart",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Cart"],
          summary: "Obter carrinho do usuário",
          security: [{ cookieAuth: [] }],
        },
      },
      async (request, reply) => {
        const cart = await getCart.execute(request.user.id);
        return reply.send(cart);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().post(
      "/cart/items",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Cart"],
          summary: "Adicionar item ao carrinho",
          security: [{ cookieAuth: [] }],
          body: addToCartSchema,
        },
      },
      async (request, reply) => {
        const { variantId, quantity } = request.body;
        const item = await addToCart.execute(request.user.id, { variantId, quantity });
        return reply.code(201).send(item);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().patch(
      "/cart/items/:itemId",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Cart"],
          summary: "Atualizar quantidade do item",
          security: [{ cookieAuth: [] }],
          params: cartItemParamsSchema,
          body: updateCartItemSchema,
        },
      },
      async (request, reply) => {
        const { itemId } = request.params;
        const { quantity } = request.body;
        const item = await updateCartItem.execute(request.user.id, itemId, quantity);
        return reply.send(item);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().delete(
      "/cart/items/:itemId",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Cart"],
          summary: "Remover item do carrinho",
          security: [{ cookieAuth: [] }],
          params: cartItemParamsSchema,
        },
      },
      async (request, reply) => {
        const { itemId } = request.params;
        await removeCartItem.execute(itemId);
        return reply.code(204).send();
      },
    );
  };
}
