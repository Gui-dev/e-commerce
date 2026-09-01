import { z } from "zod";

export type EmailStatus = "pending" | "sent" | "failed";

export interface Email {
  id: string;
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
  status: EmailStatus;
  sentAt: Date | null;
  error: string | null;
  createdAt: Date;
}

export const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  template: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;
