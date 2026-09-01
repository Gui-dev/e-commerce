import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../../middleware/auth.js";
import type { CategoryRepository } from "../domain/category-repository.js";
import {
  categoryParamsSchema,
  createCategoryBodySchema,
  updateCategoryBodySchema,
} from "../schemas/category.schema.js";
import { CreateCategoryUseCase } from "../use-cases/create-category.use-case.js";
import { ListCategoriesUseCase } from "../use-cases/list-categories.use-case.js";

export function createCategoryRoutes(categoryRepository: CategoryRepository) {
  return async function categoryRoutes(app: FastifyInstance) {
    const listCategories = new ListCategoriesUseCase(categoryRepository);
    const createCategory = new CreateCategoryUseCase(categoryRepository);

    // Public routes
    app.withTypeProvider<ZodTypeProvider>().get(
      "/categories",
      {
        schema: {
          tags: ["Categories"],
          summary: "Listar categorias",
        },
      },
      async () => {
        return listCategories.execute();
      },
    );

    // Admin routes
    app.withTypeProvider<ZodTypeProvider>().post(
      "/admin/categories",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Categories"],
          summary: "Criar categoria",
          security: [{ cookieAuth: [] }],
          body: createCategoryBodySchema,
        },
      },
      async (request, reply) => {
        const category = await createCategory.execute(request.body);
        return reply.code(201).send(category);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().patch(
      "/admin/categories/:id",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Categories"],
          summary: "Atualizar categoria",
          security: [{ cookieAuth: [] }],
          params: categoryParamsSchema,
          body: updateCategoryBodySchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params;
        const category = await categoryRepository.update(id, request.body);
        if (!category) {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Category not found" });
        }
        return reply.send(category);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().delete(
      "/admin/categories/:id",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Categories"],
          summary: "Deletar categoria",
          security: [{ cookieAuth: [] }],
          params: categoryParamsSchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params;
        await categoryRepository.delete(id);
        return reply.code(204).send();
      },
    );
  };
}
