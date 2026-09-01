import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { auth } from "../../lib/auth.js";
import { signInBodySchema, signUpBodySchema } from "./schemas/auth.schema.js";

export async function authRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/auth/sign-up",
    {
      schema: {
        tags: ["Auth"],
        summary: "Criar conta",
        body: signUpBodySchema,
      },
    },
    async (request, reply) => {
      const result = await auth.api.signUpEmail({
        body: request.body,
      });
      return reply.code(201).send(result);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().post(
    "/auth/sign-in",
    {
      schema: {
        tags: ["Auth"],
        summary: "Entrar",
        body: signInBodySchema,
      },
    },
    async (request, reply) => {
      const result = await auth.api.signInEmail({
        body: request.body,
      });
      return reply.send(result);
    },
  );

  app.post("/auth/sign-out", async (request, reply) => {
    await auth.api.signOut({ headers: request.headers });
    return reply.send({ success: true });
  });
}
