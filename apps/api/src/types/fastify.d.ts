import "fastify";
import type { MultipartFile } from "@fastify/multipart";

declare module "fastify" {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      name: string;
      role?: string;
    };
    session: {
      id: string;
      userId: string;
      expiresAt: Date;
    };
    file(): Promise<MultipartFile | null>;
  }
}
