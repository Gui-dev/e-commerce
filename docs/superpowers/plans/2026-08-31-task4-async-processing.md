# Task 4: Async Processing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement async processing with BullMQ workers for email delivery, webhook delivery, and payment simulation.

**Architecture:** Redis connection factory, BullMQ queue definitions, worker processors, email service with nodemailer, outbound webhook delivery with retry, and a payment simulation worker. All async jobs use the transactional outbox pattern via the existing `outbox_messages` table.

**Tech Stack:** TypeScript, BullMQ, ioredis, Nodemailer, Fastify, Vitest

---

## File Structure

```
apps/api/src/
├── lib/
│   ├── redis.ts                    # Redis connection factory
│   └── mailer.ts                   # Nodemailer transport setup
├── queues/
│   ├── index.ts                    # Queue exports
│   ├── email.queue.ts              # Email queue definition
│   ├── webhook.queue.ts            # Webhook queue definition
│   └── payment.queue.ts            # Payment queue definition
├── workers/
│   ├── index.ts                    # Worker registry
│   ├── email.worker.ts             # Email sender worker
│   ├── webhook.worker.ts           # Webhook delivery worker
│   └── payment.worker.ts           # Payment simulation worker
├── modules/
│   └── emails/
│       ├── domain/
│       │   ├── email.ts            # Email types
│       │   └── email-repository.ts # Repository contract
│       ├── infra/
│       │   └── in-memory-email-repository.ts
│       ├── use-cases/
│       │   ├── send-email.use-case.ts
│       │   └── send-email.use-case.spec.ts
│       └── schemas/
│           └── email.schema.ts
├── worker.ts                       # Worker process entry point
└── app.ts                          # Modified: register email routes
```

---

### Task 1: Redis Connection Factory

**Files:**
- Create: `apps/api/src/lib/redis.ts`

- [ ] **Step 1: Create Redis connection factory**

```typescript
// apps/api/src/lib/redis.ts
import Redis from "ioredis";
import { env } from "./env.js";

let connection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!connection) {
    connection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

export async function closeRedisConnection(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/lib/redis.ts
git commit -m "feat(async): add Redis connection factory"
```

---

### Task 2: Email Service with Nodemailer

**Files:**
- Create: `apps/api/src/lib/mailer.ts`

- [ ] **Step 1: Create mailer transport**

```typescript
// apps/api/src/lib/mailer.ts
import nodemailer from "nodemailer";
import { env } from "./env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  tls: { rejectUnauthorized: false },
});

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/lib/mailer.ts
git commit -m "feat(email): add nodemailer transport setup"
```

---

### Task 3: Email Domain + Repository

**Files:**
- Create: `apps/api/src/modules/emails/domain/email.ts`
- Create: `apps/api/src/modules/emails/domain/email-repository.ts`
- Create: `apps/api/src/modules/emails/domain/index.ts`
- Create: `apps/api/src/modules/emails/infra/in-memory-email-repository.ts`

- [ ] **Step 1: Create email domain types**

```typescript
// apps/api/src/modules/emails/domain/email.ts
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
  data: z.record(z.unknown()).default({}),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;
```

- [ ] **Step 2: Create email repository contract**

```typescript
// apps/api/src/modules/emails/domain/email-repository.ts
import type { Email, SendEmailInput } from "./email.js";

export interface EmailRepository {
  findById(id: string): Promise<Email | null>;
  create(input: SendEmailInput): Promise<Email>;
  markSent(id: string): Promise<Email>;
  markFailed(id: string, error: string): Promise<Email>;
}
```

- [ ] **Step 3: Create index file**

```typescript
// apps/api/src/modules/emails/domain/index.ts
export * from "./email.js";
export type { EmailRepository } from "./email-repository.js";
```

- [ ] **Step 4: Create in-memory email repository**

```typescript
// apps/api/src/modules/emails/infra/in-memory-email-repository.ts
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
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/emails/
git commit -m "feat(emails): add email domain, repository contract, and in-memory implementation"
```

---

### Task 4: Send Email Use-Case + Tests

**Files:**
- Create: `apps/api/src/modules/emails/use-cases/send-email.use-case.ts`
- Create: `apps/api/src/modules/emails/use-cases/send-email.use-case.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/modules/emails/use-cases/send-email.use-case.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SendEmailUseCase } from "./send-email.use-case.js";
import { InMemoryEmailRepository } from "../infra/in-memory-email-repository.js";

vi.mock("../../../lib/mailer.js", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("SendEmailUseCase", () => {
  let repository: InMemoryEmailRepository;
  let useCase: SendEmailUseCase;

  beforeEach(() => {
    repository = new InMemoryEmailRepository();
    useCase = new SendEmailUseCase(repository);
  });

  it("should create and send an email", async () => {
    const result = await useCase.execute({
      to: "user@example.com",
      subject: "Welcome!",
      template: "welcome",
      data: { name: "John" },
    });

    expect(result.id).toBeDefined();
    expect(result.status).toBe("sent");
    expect(result.to).toBe("user@example.com");
  });

  it("should mark email as failed on error", async () => {
    const { sendEmail } = await import("../../../lib/mailer.js");
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("SMTP error"));

    const result = await useCase.execute({
      to: "user@example.com",
      subject: "Test",
      template: "test",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toBe("SMTP error");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kronostore/api test`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// apps/api/src/modules/emails/use-cases/send-email.use-case.ts
import type { EmailRepository, SendEmailInput } from "../domain/email-repository.js";
import { sendEmail } from "../../../lib/mailer.js";

export class SendEmailUseCase {
  constructor(private readonly emailRepository: EmailRepository) {}

  async execute(input: SendEmailInput) {
    const email = await this.emailRepository.create(input);

    try {
      await sendEmail({
        to: input.to,
        subject: input.subject,
        html: `<p>Template: ${input.template}</p><pre>${JSON.stringify(input.data, null, 2)}</pre>`,
      });
      return await this.emailRepository.markSent(email.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return await this.emailRepository.markFailed(email.id, message);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kronostore/api test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/emails/use-cases/
git commit -m "feat(emails): add send email use-case with tests"
```

---

### Task 5: Email Routes + Schemas

**Files:**
- Create: `apps/api/src/modules/emails/schemas/email.schema.ts`
- Create: `apps/api/src/modules/emails/routes/index.ts`

- [ ] **Step 1: Create email schemas**

```typescript
// apps/api/src/modules/emails/schemas/email.schema.ts
import { z } from "zod";

export const sendEmailBodySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  template: z.string().min(1),
  data: z.record(z.unknown()).default({}),
});

export const emailParamsSchema = z.object({
  id: z.string(),
});
```

- [ ] **Step 2: Create email routes**

```typescript
// apps/api/src/modules/emails/routes/index.ts
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../middleware/auth.js";
import type { EmailRepository } from "../domain/email-repository.js";
import { sendEmailBodySchema, emailParamsSchema } from "../schemas/email.schema.js";
import { SendEmailUseCase } from "../use-cases/send-email.use-case.js";

export function createEmailRoutes(emailRepository: EmailRepository) {
  return async function emailRoutes(app: FastifyInstance) {
    const sendEmail = new SendEmailUseCase(emailRepository);

    app.withTypeProvider<ZodTypeProvider>().post(
      "/emails",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Emails"],
          summary: "Enviar email transacional",
          security: [{ cookieAuth: [] }],
          body: sendEmailBodySchema,
        },
      },
      async (request, reply) => {
        const email = await sendEmail.execute(request.body);
        return reply.code(201).send(email);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/emails/:id",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Emails"],
          summary: "Obter status do email",
          security: [{ cookieAuth: [] }],
          params: emailParamsSchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params;
        const email = await emailRepository.findById(id);
        if (!email) {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Email not found" });
        }
        return reply.send(email);
      },
    );
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/emails/schemas/ apps/api/src/modules/emails/routes/
git commit -m "feat(emails): add email routes with Zod schemas"
```

---

### Task 6: BullMQ Queue Definitions

**Files:**
- Create: `apps/api/src/queues/email.queue.ts`
- Create: `apps/api/src/queues/webhook.queue.ts`
- Create: `apps/api/src/queues/payment.queue.ts`
- Create: `apps/api/src/queues/index.ts`

- [ ] **Step 1: Create email queue**

```typescript
// apps/api/src/queues/email.queue.ts
import { Queue } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

export const emailQueue = new Queue("emails", {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});
```

- [ ] **Step 2: Create webhook queue**

```typescript
// apps/api/src/queues/webhook.queue.ts
import { Queue } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

export const webhookQueue = new Queue("webhooks", {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
  },
});
```

- [ ] **Step 3: Create payment queue**

```typescript
// apps/api/src/queues/payment.queue.ts
import { Queue } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

export const paymentQueue = new Queue("payments", {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
  },
});
```

- [ ] **Step 4: Create queue index**

```typescript
// apps/api/src/queues/index.ts
export { emailQueue } from "./email.queue.js";
export { webhookQueue } from "./webhook.queue.js";
export { paymentQueue } from "./payment.queue.js";
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/queues/
git commit -m "feat(async): add BullMQ queue definitions for emails, webhooks, and payments"
```

---

### Task 7: Email Worker

**Files:**
- Create: `apps/api/src/workers/email.worker.ts`

- [ ] **Step 1: Create email worker**

```typescript
// apps/api/src/workers/email.worker.ts
import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";
import { sendEmail } from "../lib/mailer.js";

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

export const emailWorker = new Worker(
  "emails",
  async (job: Job<EmailJobData>) => {
    const { to, subject, html } = job.data;
    await sendEmail({ to, subject, html });
    return { success: true };
  },
  { connection: getRedisConnection() },
);

emailWorker.on("completed", (job) => {
  console.log(`[EmailWorker] Job ${job.id} completed for ${job.data.to}`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message);
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/workers/email.worker.ts
git commit -m "feat(async): add email worker processor"
```

---

### Task 8: Webhook Worker

**Files:**
- Create: `apps/api/src/workers/webhook.worker.ts`

- [ ] **Step 1: Create webhook worker**

```typescript
// apps/api/src/workers/webhook.worker.ts
import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

interface WebhookJobData {
  url: string;
  event: string;
  payload: unknown;
}

export const webhookWorker = new Worker(
  "webhooks",
  async (job: Job<WebhookJobData>) => {
    const { url, event, payload } = job.data;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    return { success: true, status: response.status };
  },
  { connection: getRedisConnection() },
);

webhookWorker.on("completed", (job) => {
  console.log(`[WebhookWorker] Job ${job.id} completed for ${job.data.event}`);
});

webhookWorker.on("failed", (job, err) => {
  console.error(`[WebhookWorker] Job ${job?.id} failed:`, err.message);
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/workers/webhook.worker.ts
git commit -m "feat(async): add webhook delivery worker"
```

---

### Task 9: Payment Simulation Worker

**Files:**
- Create: `apps/api/src/workers/payment.worker.ts`

- [ ] **Step 1: Create payment worker**

```typescript
// apps/api/src/workers/payment.worker.ts
import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

interface PaymentJobData {
  paymentId: string;
  orderId: string;
  method: "pix" | "credit_card" | "boleto";
  amountCents: number;
}

export const paymentWorker = new Worker(
  "payments",
  async (job: Job<PaymentJobData>) => {
    const { paymentId, method } = job.data;

    // Simulate payment processing delay
    const delay = method === "pix" ? 1000 : method === "credit_card" ? 3000 : 5000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Simulate 90% success rate
    const success = Math.random() < 0.9;

    return {
      paymentId,
      status: success ? "approved" : "rejected",
      externalId: `ext-${Date.now()}`,
    };
  },
  { connection: getRedisConnection() },
);

paymentWorker.on("completed", (job) => {
  console.log(`[PaymentWorker] Job ${job.id} completed: ${job.returnvalue?.status}`);
});

paymentWorker.on("failed", (job, err) => {
  console.error(`[PaymentWorker] Job ${job?.id} failed:`, err.message);
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/workers/payment.worker.ts
git commit -m "feat(async): add payment simulation worker"
```

---

### Task 10: Worker Registry + Entry Point

**Files:**
- Create: `apps/api/src/workers/index.ts`
- Create: `apps/api/src/worker.ts`
- Modify: `apps/api/package.json` (add worker script)

- [ ] **Step 1: Create worker registry**

```typescript
// apps/api/src/workers/index.ts
import "./email.worker.js";
import "./webhook.worker.js";
import "./payment.worker.js";

console.log("[Workers] All workers started");
```

- [ ] **Step 2: Create worker entry point**

```typescript
// apps/api/src/worker.ts
import "./workers/index.js";
```

- [ ] **Step 3: Add worker script to package.json**

Read `apps/api/package.json` and add to `"scripts"`:

```json
"worker": "tsx src/worker.ts"
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/workers/ apps/api/src/worker.ts apps/api/package.json
git commit -m "feat(async): add worker registry and entry point"
```

---

### Task 11: Wire Queues to Use-Cases

**Files:**
- Modify: `apps/api/src/modules/emails/use-cases/send-email.use-case.ts`
- Modify: `apps/api/src/modules/orders/use-cases/checkout.use-case.ts`

- [ ] **Step 1: Update send-email use-case to use queue**

```typescript
// apps/api/src/modules/emails/use-cases/send-email.use-case.ts
import type { EmailRepository, SendEmailInput } from "../domain/email-repository.js";
import { emailQueue } from "../../../queues/email.queue.js";

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
```

- [ ] **Step 2: Update checkout use-case to queue confirmation email**

Read `apps/api/src/modules/orders/use-cases/checkout.use-case.ts` and add after clearing cart:

```typescript
import { emailQueue } from "../../../queues/email.queue.js";

// After clearing cart, add this:
await emailQueue.add("order-confirmation", {
  to: "customer@example.com", // Would come from user context
  subject: `Order ${order.id} confirmed`,
  html: `<h1>Thank you for your order!</h1><p>Order ID: ${order.id}</p>`,
});
```

- [ ] **Step 3: Run tests to verify everything works**

Run: `pnpm --filter @kronostore/api test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/emails/use-cases/send-email.use-case.ts apps/api/src/modules/orders/use-cases/checkout.use-case.ts
git commit -m "refactor(async): wire queues to email and checkout use-cases"
```

---

### Task 12: Register Email Routes in app.ts

**Files:**
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Add email route imports and registration**

Read `apps/api/src/app.ts` and add:

```typescript
import { InMemoryEmailRepository } from "./modules/emails/infra/in-memory-email-repository.js";
import { createEmailRoutes } from "./modules/emails/routes/index.js";
```

After payment routes registration, add:

```typescript
const emailRepository = new InMemoryEmailRepository();
await app.register(createEmailRoutes(emailRepository));
```

- [ ] **Step 2: Run tests to verify everything works**

Run: `pnpm --filter @kronostore/api test`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app.ts
git commit -m "feat(emails): register email routes in app.ts"
```

---

### Task 13: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `pnpm --filter @kronostore/api test`
Expected: All tests PASS

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter @kronostore/api typecheck`
Expected: No type errors

- [ ] **Step 3: Verify worker can start**

Run: `pnpm --filter @kronostore/api worker` (will fail without Redis, but should import cleanly)
Expected: Worker imports successfully, fails to connect to Redis (expected in test env)

- [ ] **Step 4: Final commit if needed**

```bash
git add -A
git commit -m "chore: final verification for async processing"
```
