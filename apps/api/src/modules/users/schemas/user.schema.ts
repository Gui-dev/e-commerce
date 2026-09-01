import { z } from "zod";

export const userParamsSchema = z.object({
  id: z.string(),
});

export const updateUserRoleBodySchema = z.object({
  role: z.enum(["user", "admin"]),
});
