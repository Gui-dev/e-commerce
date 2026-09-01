import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../../middleware/auth.js";
import type { StockRepository } from "../domain/stock-repository.js";
import { adjustStockBodySchema, stockParamsSchema } from "../schemas/stock.schema.js";

export function createAdminStockRoutes(stockRepository: StockRepository) {
  return async function adminStockRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/stock",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Stock"],
          summary: "Listar estoque",
          security: [{ cookieAuth: [] }],
        },
      },
      async () => {
        const stocks = await stockRepository.list();
        return stocks;
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/stock/:variantId",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Stock"],
          summary: "Obter estoque por variante",
          security: [{ cookieAuth: [] }],
          params: stockParamsSchema,
        },
      },
      async (request, reply) => {
        const stock = await stockRepository.findByVariantId(request.params.variantId);
        if (!stock) {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Stock not found" });
        }
        return reply.send(stock);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().post(
      "/admin/stock/:variantId/adjust",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Stock"],
          summary: "Ajustar estoque",
          security: [{ cookieAuth: [] }],
          params: stockParamsSchema,
          body: adjustStockBodySchema,
        },
      },
      async (request, reply) => {
        const { variantId } = request.params;
        const { quantity } = request.body;

        let stock = await stockRepository.findByVariantId(variantId);
        if (!stock) {
          stock = await stockRepository.create(variantId, quantity);
        } else {
          await stockRepository.addQuantity(variantId, quantity);
          stock = await stockRepository.findByVariantId(variantId);
        }

        return reply.send(stock);
      },
    );
  };
}
