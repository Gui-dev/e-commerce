import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../../middleware/auth.js";
import type { UserRepository } from "../domain/user-repository.js";
import { updateUserRoleBodySchema, userParamsSchema } from "../schemas/user.schema.js";
import { GetUserUseCase } from "../use-cases/get-user.use-case.js";
import { ListUsersUseCase } from "../use-cases/list-users.use-case.js";
import { UpdateUserRoleUseCase } from "../use-cases/update-user-role.use-case.js";

export function createAdminUserRoutes(userRepository: UserRepository) {
  return async function adminUserRoutes(app: FastifyInstance) {
    const listUsers = new ListUsersUseCase(userRepository);
    const getUser = new GetUserUseCase(userRepository);
    const updateRole = new UpdateUserRoleUseCase(userRepository);

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/users",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Users"],
          summary: "Listar usuários",
          security: [{ cookieAuth: [] }],
        },
      },
      async () => {
        return listUsers.execute();
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/users/:id",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Users"],
          summary: "Obter usuário por ID",
          security: [{ cookieAuth: [] }],
          params: userParamsSchema,
        },
      },
      async (request, reply) => {
        try {
          const user = await getUser.execute(request.params.id);
          return reply.send(user);
        } catch {
          return reply.code(404).send({ error: "NOT_FOUND", message: "User not found" });
        }
      },
    );

    app.withTypeProvider<ZodTypeProvider>().patch(
      "/admin/users/:id/role",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Users"],
          summary: "Atualizar role do usuário",
          security: [{ cookieAuth: [] }],
          params: userParamsSchema,
          body: updateUserRoleBodySchema,
        },
      },
      async (request, reply) => {
        try {
          const user = await updateRole.execute(request.params.id, request.body.role);
          return reply.send(user);
        } catch {
          return reply.code(404).send({ error: "NOT_FOUND", message: "User not found" });
        }
      },
    );
  };
}
