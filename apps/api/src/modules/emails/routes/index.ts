import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../middleware/auth.js";
import type { EmailRepository } from "../domain/email-repository.js";
import { emailParamsSchema, sendEmailBodySchema } from "../schemas/email.schema.js";
import { SendEmailUseCase } from "../use-cases/send-email.use-case.js";

export function createEmailRoutes(emailRepository: EmailRepository) {
  return async function emailRoutes(app: FastifyInstance) {
    const sendEmail = new SendEmailUseCase(emailRepository);

    app.withTypeProvider<ZodTypeProvider>().post(
      "/emails",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Emails"],
          summary: "Enviar email transacional",
          security: [{ cookieAuth: [] }],
          body: sendEmailBodySchema,
        },
      },
      async (request, reply) => {
        const email = await sendEmail.execute(request.body);
        return reply.code(201).send(email);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/emails/:id",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Emails"],
          summary: "Obter status do email",
          security: [{ cookieAuth: [] }],
          params: emailParamsSchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params;
        const email = await emailRepository.findById(id);
        if (!email) {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Email not found" });
        }
        return reply.send(email);
      },
    );
  };
}
