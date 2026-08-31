import type { FastifyReply, FastifyRequest } from "fastify";
import { auth } from "../lib/auth.js";

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return reply.code(401).send({ error: "UNAUTHORIZED", message: "Login required" });
  }

  request.user = session.user;
  request.session = session.session;
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);

  if (reply.sent) return;

  if (request.user.role !== "admin") {
    return reply.code(403).send({ error: "FORBIDDEN", message: "Admin access required" });
  }
}
