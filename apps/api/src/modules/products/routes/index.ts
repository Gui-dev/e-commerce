import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../../middleware/auth.js";
import type { ProductRepository } from "../domain/product-repository.js";
import {
  createProductSchema,
  createVariantSchema,
  listProductsQuerySchema,
  productIdParamsSchema,
  productParamsSchema,
  updateProductSchema,
  updateVariantSchema,
} from "../schemas/product.schema.js";
import { CreateProductUseCase } from "../use-cases/create-product.use-case.js";
import { GetProductBySlugUseCase } from "../use-cases/get-product-by-slug.use-case.js";
import { ListProductsUseCase } from "../use-cases/list-products.use-case.js";

export function createProductRoutes(repository: ProductRepository) {
  return async function productRoutes(app: FastifyInstance) {
    const createProduct = new CreateProductUseCase(repository);
    const listProducts = new ListProductsUseCase(repository);
    const getProductBySlug = new GetProductBySlugUseCase(repository);

    app.withTypeProvider<ZodTypeProvider>().get(
      "/products",
      {
        schema: {
          tags: ["Products"],
          summary: "Listar produtos do catálogo",
          querystring: listProductsQuerySchema,
        },
      },
      async (request, reply) => {
        const { categoryId, search, priceMin, priceMax, page, limit } = request.query;

        const result = await listProducts.execute({
          categoryId,
          search,
          priceMin,
          priceMax,
          page,
          limit,
        });
        return reply.send(result);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/products/:slug",
      {
        schema: {
          tags: ["Products"],
          summary: "Obter produto por slug",
          params: productParamsSchema,
        },
      },
      async (request, reply) => {
        const { slug } = request.params;
        const product = await getProductBySlug.execute(slug);
        return reply.send(product);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().post(
      "/admin/products",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Products"],
          summary: "Criar novo produto",
          security: [{ cookieAuth: [] }],
          body: createProductSchema,
        },
      },
      async (request, reply) => {
        const product = await createProduct.execute(request.body);
        return reply.code(201).send(product);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().patch(
      "/admin/products/:id",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Products"],
          summary: "Atualizar produto",
          security: [{ cookieAuth: [] }],
          params: productIdParamsSchema,
          body: updateProductSchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params;
        const updateProduct = new (
          await import("../use-cases/update-product.use-case.js")
        ).UpdateProductUseCase(repository);
        const product = await updateProduct.execute(id, request.body);
        return reply.send(product);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().post(
      "/admin/products/:id/variants",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Variants"],
          summary: "Criar variante do produto",
          security: [{ cookieAuth: [] }],
          params: productIdParamsSchema,
          body: createVariantSchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params;
        const createVariant = new (
          await import("../use-cases/create-variant.use-case.js")
        ).CreateVariantUseCase(repository);
        const variant = await createVariant.execute({ productId: id, ...request.body });
        return reply.code(201).send(variant);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().patch(
      "/admin/products/:id/variants/:variantId",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Variants"],
          summary: "Atualizar variante do produto",
          security: [{ cookieAuth: [] }],
          params: productIdParamsSchema.extend({ variantId: productIdParamsSchema.shape.id }),
          body: updateVariantSchema,
        },
      },
      async (request, reply) => {
        const { variantId } = request.params;
        const updateVariant = new (
          await import("../use-cases/update-variant.use-case.js")
        ).UpdateVariantUseCase(repository);
        const variant = await updateVariant.execute(variantId, request.body);
        return reply.send(variant);
      },
    );
  };
}
