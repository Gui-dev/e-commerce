import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../../middleware/auth.js";
import type { CouponRepository } from "../domain/coupon-repository.js";
import { couponParamsSchema, createCouponSchema } from "../schemas/coupon.schema.js";
import { CreateCouponUseCase } from "../use-cases/create-coupon.use-case.js";
import { DeleteCouponUseCase } from "../use-cases/delete-coupon.use-case.js";
import { GetCouponUseCase } from "../use-cases/get-coupon.use-case.js";
import { ListCouponsUseCase } from "../use-cases/list-coupons.use-case.js";

export function createCouponRoutes(couponRepository: CouponRepository) {
  return async function couponRoutes(app: FastifyInstance) {
    const listCoupons = new ListCouponsUseCase(couponRepository);
    const createCoupon = new CreateCouponUseCase(couponRepository);
    const getCoupon = new GetCouponUseCase(couponRepository);
    const deleteCoupon = new DeleteCouponUseCase(couponRepository);

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/coupons",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Coupons"],
          summary: "Listar cupons",
          security: [{ cookieAuth: [] }],
        },
      },
      async () => {
        return listCoupons.execute();
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/coupons/:id",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Coupons"],
          summary: "Obter cupom por ID",
          security: [{ cookieAuth: [] }],
          params: couponParamsSchema,
        },
      },
      async (request, reply) => {
        try {
          const coupon = await getCoupon.execute(request.params.id);
          return reply.send(coupon);
        } catch {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Coupon not found" });
        }
      },
    );

    app.withTypeProvider<ZodTypeProvider>().post(
      "/admin/coupons",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Coupons"],
          summary: "Criar cupom",
          security: [{ cookieAuth: [] }],
          body: createCouponSchema,
        },
      },
      async (request, reply) => {
        const input = {
          ...request.body,
          expiresAt: request.body.expiresAt ? new Date(request.body.expiresAt) : undefined,
        };
        const coupon = await createCoupon.execute(input);
        return reply.code(201).send(coupon);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().delete(
      "/admin/coupons/:id",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Coupons"],
          summary: "Deletar cupom",
          security: [{ cookieAuth: [] }],
          params: couponParamsSchema,
        },
      },
      async (request, reply) => {
        await deleteCoupon.execute(request.params.id);
        return reply.code(204).send();
      },
    );
  };
}
