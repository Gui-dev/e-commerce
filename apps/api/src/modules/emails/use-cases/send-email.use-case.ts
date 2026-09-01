import { emailQueue } from "../../../queues/email.queue.js";
import type { EmailRepository, SendEmailInput } from "../domain/email-repository.js";

export class SendEmailUseCase {
  constructor(private readonly emailRepository: EmailRepository) {}

  async execute(input: SendEmailInput) {
    const email = await this.emailRepository.create(input);

    await emailQueue.add("send-email", {
      to: input.to,
      subject: input.subject,
      html: `<p>Template: ${input.template}</p><pre>${JSON.stringify(input.data, null, 2)}</pre>`,
    });

    return await this.emailRepository.markSent(email.id);
  }
}
