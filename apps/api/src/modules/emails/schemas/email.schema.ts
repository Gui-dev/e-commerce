import { z } from "zod";

export const sendEmailBodySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  template: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const emailParamsSchema = z.object({
  id: z.string(),
});
