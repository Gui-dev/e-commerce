import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../../middleware/auth.js";
import type { OrderRepository } from "../domain/order-repository.js";
import { orderParamsSchema, updateOrderStatusBodySchema } from "../schemas/order.schema.js";
import { GetOrderAdminUseCase } from "../use-cases/get-order-admin.use-case.js";
import { ListAllOrdersUseCase } from "../use-cases/list-all-orders.use-case.js";
import { UpdateOrderStatusUseCase } from "../use-cases/update-order-status.use-case.js";

export function createAdminOrderRoutes(orderRepository: OrderRepository) {
  return async function adminOrderRoutes(app: FastifyInstance) {
    const listAllOrders = new ListAllOrdersUseCase(orderRepository);
    const getOrder = new GetOrderAdminUseCase(orderRepository);
    const updateStatus = new UpdateOrderStatusUseCase(orderRepository);

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/orders",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Orders"],
          summary: "Listar todos os pedidos",
          security: [{ cookieAuth: [] }],
        },
      },
      async () => {
        return listAllOrders.execute();
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/orders/:id",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Orders"],
          summary: "Obter pedido por ID",
          security: [{ cookieAuth: [] }],
          params: orderParamsSchema,
        },
      },
      async (request, reply) => {
        try {
          const order = await getOrder.execute(request.params.id);
          return reply.send(order);
        } catch {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Order not found" });
        }
      },
    );

    app.withTypeProvider<ZodTypeProvider>().patch(
      "/admin/orders/:id/status",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Orders"],
          summary: "Atualizar status do pedido",
          security: [{ cookieAuth: [] }],
          params: orderParamsSchema,
          body: updateOrderStatusBodySchema,
        },
      },
      async (request, reply) => {
        try {
          const order = await updateStatus.execute(request.params.id, request.body.status);
          return reply.send(order);
        } catch {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Order not found" });
        }
      },
    );
  };
}
