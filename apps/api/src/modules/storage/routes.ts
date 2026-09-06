import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { FastifyInstance } from "fastify";
import { BUCKET_NAME, s3Client } from "../../lib/storage/minio.js";

export async function storageRoutes(app: FastifyInstance) {
  app.get(
    "/storage/*",
    {
      schema: {
        tags: ["Storage"],
        summary: "Buscar imagem do storage",
      },
    },
    async (request, reply) => {
      const key = (request.params as { "*": string })["*"];

      try {
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        });

        const response = await s3Client.send(command);

        if (!response.Body) {
          return reply.code(404).send({ error: "NOT_FOUND", message: "File not found" });
        }

        const contentType = response.ContentType || "application/octet-stream";
        reply.header("Content-Type", contentType);
        reply.header("Cache-Control", "public, max-age=31536000");

        const stream = response.Body.transformToWebStream();
        return reply.send(stream);
      } catch {
        return reply.code(404).send({ error: "NOT_FOUND", message: "File not found" });
      }
    },
  );
}
