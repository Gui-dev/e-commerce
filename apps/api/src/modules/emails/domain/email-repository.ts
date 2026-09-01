import type { Email, SendEmailInput } from "./email.js";

export type { Email, SendEmailInput };

export interface EmailRepository {
  findById(id: string): Promise<Email | null>;
  create(input: SendEmailInput): Promise<Email>;
  markSent(id: string): Promise<Email>;
  markFailed(id: string, error: string): Promise<Email>;
}
