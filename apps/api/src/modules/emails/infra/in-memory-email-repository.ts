import type { Email, EmailRepository, SendEmailInput } from "../domain/email-repository.js";

export class InMemoryEmailRepository implements EmailRepository {
  private emails: Map<string, Email> = new Map();
  private nextId = 1;

  async findById(id: string): Promise<Email | null> {
    return this.emails.get(id) ?? null;
  }

  async create(input: SendEmailInput): Promise<Email> {
    const now = new Date();
    const email: Email = {
      id: `email-${this.nextId++}`,
      to: input.to,
      subject: input.subject,
      template: input.template,
      data: input.data,
      status: "pending",
      sentAt: null,
      error: null,
      createdAt: now,
    };
    this.emails.set(email.id, email);
    return email;
  }

  async markSent(id: string): Promise<Email> {
    const email = this.emails.get(id);
    if (!email) throw new Error("Email not found");
    const updated: Email = { ...email, status: "sent", sentAt: new Date() };
    this.emails.set(id, updated);
    return updated;
  }

  async markFailed(id: string, error: string): Promise<Email> {
    const email = this.emails.get(id);
    if (!email) throw new Error("Email not found");
    const updated: Email = { ...email, status: "failed", error };
    this.emails.set(id, updated);
    return updated;
  }
}
