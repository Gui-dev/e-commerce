import type { FastifyInstance } from "fastify";
import { uploadImage } from "../../../lib/storage/upload.js";
import { requireAdmin } from "../../../middleware/auth.js";

export async function imageRoutes(app: FastifyInstance) {
  app.post(
    "/admin/images",
    {
      preHandler: [requireAdmin],
      schema: {
        tags: ["Admin - Images"],
        summary: "Upload de imagem",
        security: [{ cookieAuth: [] }],
        consumes: ["multipart/form-data"],
      },
    },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: "BAD_REQUEST", message: "No file uploaded" });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const result = await uploadImage(buffer, data.filename, data.mimetype);

      return reply.code(201).send(result);
    },
  );
}
