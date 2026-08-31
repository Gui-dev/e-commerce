import type { FastifyInstance } from "fastify";
import { auth } from "../../lib/auth.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/sign-up", async (request, reply) => {
    const result = await auth.api.signUpEmail({
      body: request.body as { email: string; password: string; name: string },
    });
    return reply.code(201).send(result);
  });

  app.post("/auth/sign-in", async (request, reply) => {
    const result = await auth.api.signInEmail({
      body: request.body as { email: string; password: string },
    });
    return reply.send(result);
  });

  app.post("/auth/sign-out", async (request, reply) => {
    await auth.api.signOut({ headers: request.headers });
    return reply.send({ success: true });
  });
}
