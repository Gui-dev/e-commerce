import { z } from "zod";

export const signUpBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export const signInBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
