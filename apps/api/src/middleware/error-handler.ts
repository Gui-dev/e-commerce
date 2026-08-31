import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { DomainError } from "../lib/errors.js";

export async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    app.log.error(error);

    if (error instanceof DomainError) {
      return reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }

    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: error.issues,
      });
    }

    if (error.validation) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: error.message,
      });
    }

    return reply.code(500).send({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    });
  });
}
