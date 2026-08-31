# Task 3: Pagamentos & Pedidos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement payment simulation with PIX, credit card, and boleto methods, webhook processing, and complete idempotency for order/payment operations.

**Architecture:** Payment domain with repository contract, in-memory implementation, and use-cases for creating payments and processing webhooks. Webhook logs stored for audit trail. Idempotency enforced at use-case level for payment creation.

**Tech Stack:** TypeScript, Fastify, Vitest, Zod, Better Auth

---

## File Structure

```
apps/api/src/modules/payments/
├── domain/
│   ├── payment.ts              # Payment types, errors
│   └── payment-repository.ts   # Repository contract
├── infra/
│   └── in-memory-payment-repository.ts
├── use-cases/
│   ├── create-payment.use-case.ts + tests
│   ├── process-webhook.use-case.ts + tests
│   └── get-payment-status.use-case.ts + tests
└── routes/
    └── index.ts

apps/api/src/modules/webhooks/
├── domain/
│   ├── webhook-log.ts          # WebhookLog types
│   └── webhook-repository.ts   # Repository contract
└── infra/
    └── in-memory-webhook-repository.ts
```

---

### Task 1: Payment Domain + Repository Contract

**Files:**
- Create: `apps/api/src/modules/payments/domain/payment.ts`
- Create: `apps/api/src/modules/payments/domain/payment-repository.ts`
- Create: `apps/api/src/modules/payments/domain/index.ts`

- [ ] **Step 1: Create payment domain types**

```typescript
// apps/api/src/modules/payments/domain/payment.ts
export type PaymentMethod = 'pix' | 'credit_card' | 'boleto'
export type PaymentStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'refunded'

export interface Payment {
  id: string
  orderId: string
  method: PaymentMethod
  status: PaymentStatus
  amountCents: number
  externalId: string | null
  idempotencyKey: string | null
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreatePaymentInput {
  orderId: string
  method: PaymentMethod
  amountCents: number
  idempotencyKey?: string
}

export interface WebhookPayload {
  paymentId: string
  externalId: string
  status: PaymentStatus
  timestamp: string
}
```

- [ ] **Step 2: Create payment repository contract**

```typescript
// apps/api/src/modules/payments/domain/payment-repository.ts
import type { Payment, CreatePaymentInput } from './payment.js'

export interface PaymentRepository {
  findById(id: string): Promise<Payment | null>
  findByOrderId(orderId: string): Promise<Payment | null>
  findByIdempotencyKey(key: string): Promise<Payment | null>
  create(input: CreatePaymentInput): Promise<Payment>
  updateStatus(id: string, status: Payment['status'], externalId?: string): Promise<Payment>
}
```

- [ ] **Step 3: Create index file**

```typescript
// apps/api/src/modules/payments/domain/index.ts
export * from './payment.js'
export * from './payment-repository.js'
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/payments/domain/
git commit -m "feat(payments): add payment domain types and repository contract"
```

---

### Task 2: In-Memory Payment Repository + Tests

**Files:**
- Create: `apps/api/src/modules/payments/infra/in-memory-payment-repository.ts`
- Create: `apps/api/src/modules/payments/infra/in-memory-payment-repository.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/modules/payments/infra/in-memory-payment-repository.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryPaymentRepository } from './in-memory-payment-repository.js'

describe('InMemoryPaymentRepository', () => {
  let repository: InMemoryPaymentRepository

  beforeEach(() => {
    repository = new InMemoryPaymentRepository()
  })

  it('should create a payment', async () => {
    const payment = await repository.create({
      orderId: 'order-001',
      method: 'pix',
      amountCents: 10000,
    })

    expect(payment.id).toBeDefined()
    expect(payment.orderId).toBe('order-001')
    expect(payment.method).toBe('pix')
    expect(payment.status).toBe('pending')
  })

  it('should find payment by id', async () => {
    const created = await repository.create({
      orderId: 'order-001',
      method: 'pix',
      amountCents: 10000,
    })

    const found = await repository.findById(created.id)
    expect(found).toEqual(created)
  })

  it('should find payment by order id', async () => {
    const created = await repository.create({
      orderId: 'order-001',
      method: 'pix',
      amountCents: 10000,
    })

    const found = await repository.findByOrderId('order-001')
    expect(found).toEqual(created)
  })

  it('should find payment by idempotency key', async () => {
    const created = await repository.create({
      orderId: 'order-001',
      method: 'pix',
      amountCents: 10000,
      idempotencyKey: 'idem-001',
    })

    const found = await repository.findByIdempotencyKey('idem-001')
    expect(found).toEqual(created)
  })

  it('should update payment status', async () => {
    const created = await repository.create({
      orderId: 'order-001',
      method: 'pix',
      amountCents: 10000,
    })

    const updated = await repository.updateStatus(created.id, 'approved', 'ext-001')
    expect(updated.status).toBe('approved')
    expect(updated.externalId).toBe('ext-001')
    expect(updated.paidAt).toBeInstanceOf(Date)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kronostore/api test`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// apps/api/src/modules/payments/infra/in-memory-payment-repository.ts
import type {
  Payment,
  PaymentRepository,
  CreatePaymentInput,
} from '../domain/payment-repository.js'

export class InMemoryPaymentRepository implements PaymentRepository {
  private payments: Map<string, Payment> = new Map()
  private nextId = 1

  async findById(id: string): Promise<Payment | null> {
    return this.payments.get(id) ?? null
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    for (const payment of this.payments.values()) {
      if (payment.orderId === orderId) return payment
    }
    return null
  }

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    for (const payment of this.payments.values()) {
      if (payment.idempotencyKey === key) return payment
    }
    return null
  }

  async create(input: CreatePaymentInput): Promise<Payment> {
    const now = new Date()
    const payment: Payment = {
      id: `pay-${this.nextId++}`,
      orderId: input.orderId,
      method: input.method,
      status: 'pending',
      amountCents: input.amountCents,
      externalId: null,
      idempotencyKey: input.idempotencyKey ?? null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    }

    this.payments.set(payment.id, payment)
    return payment
  }

  async updateStatus(id: string, status: Payment['status'], externalId?: string): Promise<Payment> {
    const payment = this.payments.get(id)
    if (!payment) throw new Error('Payment not found')

    const updated: Payment = {
      ...payment,
      status,
      externalId: externalId ?? payment.externalId,
      paidAt: status === 'approved' ? new Date() : payment.paidAt,
      updatedAt: new Date(),
    }

    this.payments.set(id, updated)
    return updated
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kronostore/api test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/payments/infra/
git commit -m "feat(payments): add in-memory payment repository with tests"
```

---

### Task 3: Create Payment Use-Case + Tests

**Files:**
- Create: `apps/api/src/modules/payments/use-cases/create-payment.use-case.ts`
- Create: `apps/api/src/modules/payments/use-cases/create-payment.use-case.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/modules/payments/use-cases/create-payment.use-case.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryPaymentRepository } from '../infra/in-memory-payment-repository.js'
import { CreatePaymentUseCase } from './create-payment.use-case.js'

describe('CreatePaymentUseCase', () => {
  let repository: InMemoryPaymentRepository
  let useCase: CreatePaymentUseCase

  beforeEach(() => {
    repository = new InMemoryPaymentRepository()
    useCase = new CreatePaymentUseCase(repository)
  })

  it('should create a payment', async () => {
    const payment = await useCase.execute({
      orderId: 'order-001',
      method: 'pix',
      amountCents: 10000,
    })

    expect(payment.id).toBeDefined()
    expect(payment.status).toBe('pending')
  })

  it('should apply idempotency key', async () => {
    const payment1 = await useCase.execute({
      orderId: 'order-001',
      method: 'pix',
      amountCents: 10000,
      idempotencyKey: 'idem-001',
    })

    const payment2 = await useCase.execute({
      orderId: 'order-001',
      method: 'pix',
      amountCents: 10000,
      idempotencyKey: 'idem-001',
    })

    expect(payment1.id).toBe(payment2.id)
  })

  it('should throw error for duplicate order without idempotency key', async () => {
    await useCase.execute({
      orderId: 'order-001',
      method: 'pix',
      amountCents: 10000,
    })

    await expect(
      useCase.execute({
        orderId: 'order-001',
        method: 'pix',
        amountCents: 10000,
      })
    ).rejects.toThrow('Payment already exists for this order')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kronostore/api test`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// apps/api/src/modules/payments/use-cases/create-payment.use-case.ts
import type { Payment, PaymentRepository } from '../domain/payment-repository.js'

export interface CreatePaymentInput {
  orderId: string
  method: 'pix' | 'credit_card' | 'boleto'
  amountCents: number
  idempotencyKey?: string
}

export class CreatePaymentUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(input: CreatePaymentInput): Promise<Payment> {
    if (input.idempotencyKey) {
      const existing = await this.paymentRepository.findByIdempotencyKey(input.idempotencyKey)
      if (existing) return existing
    }

    const existingPayment = await this.paymentRepository.findByOrderId(input.orderId)
    if (existingPayment) {
      throw new Error('Payment already exists for this order')
    }

    return this.paymentRepository.create(input)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kronostore/api test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/payments/use-cases/create-payment.use-case.ts apps/api/src/modules/payments/use-cases/create-payment.use-case.spec.ts
git commit -m "feat(payments): add create payment use-case with idempotency"
```

---

### Task 4: Process Webhook Use-Case + Tests

**Files:**
- Create: `apps/api/src/modules/webhooks/domain/webhook-log.ts`
- Create: `apps/api/src/modules/webhooks/domain/webhook-repository.ts`
- Create: `apps/api/src/modules/webhooks/infra/in-memory-webhook-repository.ts`
- Create: `apps/api/src/modules/payments/use-cases/process-webhook.use-case.ts`
- Create: `apps/api/src/modules/payments/use-cases/process-webhook.use-case.spec.ts`

- [ ] **Step 1: Create webhook domain types**

```typescript
// apps/api/src/modules/webhooks/domain/webhook-log.ts
export interface WebhookLog {
  id: string
  provider: string
  event: string
  payload: unknown
  paymentId: string | null
  processedAt: Date
  createdAt: Date
}

export interface CreateWebhookLogInput {
  provider: string
  event: string
  payload: unknown
  paymentId?: string
}
```

- [ ] **Step 2: Create webhook repository contract**

```typescript
// apps/api/src/modules/webhooks/domain/webhook-repository.ts
import type { WebhookLog, CreateWebhookLogInput } from './webhook-log.js'

export interface WebhookRepository {
  findById(id: string): Promise<WebhookLog | null>
  create(input: CreateWebhookLogInput): Promise<WebhookLog>
}
```

- [ ] **Step 3: Create in-memory webhook repository**

```typescript
// apps/api/src/modules/webhooks/infra/in-memory-webhook-repository.ts
import type {
  WebhookLog,
  WebhookRepository,
  CreateWebhookLogInput,
} from '../domain/webhook-repository.js'

export class InMemoryWebhookRepository implements WebhookRepository {
  private logs: Map<string, WebhookLog> = new Map()
  private nextId = 1

  async findById(id: string): Promise<WebhookLog | null> {
    return this.logs.get(id) ?? null
  }

  async create(input: CreateWebhookLogInput): Promise<WebhookLog> {
    const now = new Date()
    const log: WebhookLog = {
      id: `wh-${this.nextId++}`,
      provider: input.provider,
      event: input.event,
      payload: input.payload,
      paymentId: input.paymentId ?? null,
      processedAt: now,
      createdAt: now,
    }

    this.logs.set(log.id, log)
    return log
  }
}
```

- [ ] **Step 4: Write failing tests for process webhook**

```typescript
// apps/api/src/modules/payments/use-cases/process-webhook.use-case.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryPaymentRepository } from '../infra/in-memory-payment-repository.js'
import { InMemoryWebhookRepository } from '../../webhooks/infra/in-memory-webhook-repository.js'
import { ProcessWebhookUseCase } from './process-webhook.use-case.js'

describe('ProcessWebhookUseCase', () => {
  let paymentRepository: InMemoryPaymentRepository
  let webhookRepository: InMemoryWebhookRepository
  let useCase: ProcessWebhookUseCase

  beforeEach(() => {
    paymentRepository = new InMemoryPaymentRepository()
    webhookRepository = new InMemoryWebhookRepository()
    useCase = new ProcessWebhookUseCase(paymentRepository, webhookRepository)
  })

  it('should process approved webhook', async () => {
    const payment = await paymentRepository.create({
      orderId: 'order-001',
      method: 'pix',
      amountCents: 10000,
    })

    const result = await useCase.execute({
      provider: 'payment-gateway',
      event: 'payment.approved',
      paymentId: payment.id,
      externalId: 'ext-001',
      status: 'approved',
    })

    expect(result.payment.status).toBe('approved')
    expect(result.webhookLog).toBeDefined()
  })

  it('should process rejected webhook', async () => {
    const payment = await paymentRepository.create({
      orderId: 'order-001',
      method: 'credit_card',
      amountCents: 10000,
    })

    const result = await useCase.execute({
      provider: 'payment-gateway',
      event: 'payment.rejected',
      paymentId: payment.id,
      externalId: 'ext-002',
      status: 'rejected',
    })

    expect(result.payment.status).toBe('rejected')
  })

  it('should throw error for invalid payment id', async () => {
    await expect(
      useCase.execute({
        provider: 'payment-gateway',
        event: 'payment.approved',
        paymentId: 'invalid-id',
        externalId: 'ext-001',
        status: 'approved',
      })
    ).rejects.toThrow('Payment not found')
  })
})
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `pnpm --filter @kronostore/api test`
Expected: FAIL with "Cannot find module"

- [ ] **Step 6: Write process webhook use-case implementation**

```typescript
// apps/api/src/modules/payments/use-cases/process-webhook.use-case.ts
import type { Payment, PaymentRepository } from '../domain/payment-repository.js'
import type { WebhookRepository } from '../../webhooks/domain/webhook-repository.js'

export interface ProcessWebhookInput {
  provider: string
  event: string
  paymentId: string
  externalId: string
  status: 'approved' | 'rejected' | 'refunded'
}

export class ProcessWebhookUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly webhookRepository: WebhookRepository,
  ) {}

  async execute(input: ProcessWebhookInput) {
    const payment = await this.paymentRepository.findById(input.paymentId)
    if (!payment) {
      throw new Error('Payment not found')
    }

    const updatedPayment = await this.paymentRepository.updateStatus(
      payment.id,
      input.status,
      input.externalId,
    )

    const webhookLog = await this.webhookRepository.create({
      provider: input.provider,
      event: input.event,
      payload: input,
      paymentId: payment.id,
    })

    return { payment: updatedPayment, webhookLog }
  }
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm --filter @kronostore/api test`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/webhooks/ apps/api/src/modules/payments/use-cases/process-webhook.use-case.ts apps/api/src/modules/payments/use-cases/process-webhook.use-case.spec.ts
git commit -m "feat(webhooks): add webhook domain and process webhook use-case"
```

---

### Task 5: Get Payment Status Use-Case + Tests

**Files:**
- Create: `apps/api/src/modules/payments/use-cases/get-payment-status.use-case.ts`
- Create: `apps/api/src/modules/payments/use-cases/get-payment-status.use-case.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/modules/payments/use-cases/get-payment-status.use-case.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryPaymentRepository } from '../infra/in-memory-payment-repository.js'
import { GetPaymentStatusUseCase } from './get-payment-status.use-case.js'

describe('GetPaymentStatusUseCase', () => {
  let repository: InMemoryPaymentRepository
  let useCase: GetPaymentStatusUseCase

  beforeEach(() => {
    repository = new InMemoryPaymentRepository()
    useCase = new GetPaymentStatusUseCase(repository)
  })

  it('should return payment status', async () => {
    const payment = await repository.create({
      orderId: 'order-001',
      method: 'pix',
      amountCents: 10000,
    })

    const result = await useCase.execute(payment.id)
    expect(result.status).toBe('pending')
  })

  it('should throw error for invalid payment id', async () => {
    await expect(useCase.execute('invalid-id')).rejects.toThrow('Payment not found')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kronostore/api test`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// apps/api/src/modules/payments/use-cases/get-payment-status.use-case.ts
import type { Payment, PaymentRepository } from '../domain/payment-repository.js'

export class GetPaymentStatusUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId)
    if (!payment) {
      throw new Error('Payment not found')
    }
    return payment
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kronostore/api test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/payments/use-cases/get-payment-status.use-case.ts apps/api/src/modules/payments/use-cases/get-payment-status.use-case.spec.ts
git commit -m "feat(payments): add get payment status use-case"
```

---

### Task 6: Payment Routes

**Files:**
- Create: `apps/api/src/modules/payments/routes/index.ts`

- [ ] **Step 1: Create payment routes**

```typescript
// apps/api/src/modules/payments/routes/index.ts
import type { FastifyInstance } from 'fastify'
import type { PaymentRepository } from '../domain/payment-repository.js'
import type { WebhookRepository } from '../../webhooks/domain/webhook-repository.js'
import { requireAuth } from '../../middleware/auth.js'
import { idempotencyMiddleware } from '../../middleware/idempotency.js'
import { CreatePaymentUseCase } from '../use-cases/create-payment.use-case.js'
import { GetPaymentStatusUseCase } from '../use-cases/get-payment-status.use-case.js'
import { ProcessWebhookUseCase } from '../use-cases/process-webhook.use-case.js'

export function createPaymentRoutes(
  paymentRepository: PaymentRepository,
  webhookRepository: WebhookRepository,
) {
  return async function paymentRoutes(app: FastifyInstance) {
    const createPayment = new CreatePaymentUseCase(paymentRepository)
    const getPaymentStatus = new GetPaymentStatusUseCase(paymentRepository)
    const processWebhook = new ProcessWebhookUseCase(paymentRepository, webhookRepository)

    app.post('/payments', {
      preHandler: [requireAuth, idempotencyMiddleware],
      schema: {
        tags: ['Payments'],
        summary: 'Criar pagamento',
        security: [{ cookieAuth: [] }],
        headers: {
          type: 'object',
          properties: {
            'idempotency-key': { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['orderId', 'method', 'amountCents'],
          properties: {
            orderId: { type: 'string' },
            method: { type: 'string', enum: ['pix', 'credit_card', 'boleto'] },
            amountCents: { type: 'integer' },
          },
        },
      },
    }, async (request, reply) => {
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined
      const { orderId, method, amountCents } = request.body as any

      const payment = await createPayment.execute({
        orderId,
        method,
        amountCents,
        idempotencyKey,
      })

      return reply.code(201).send(payment)
    })

    app.get('/payments/:id', {
      preHandler: [requireAuth],
      schema: {
        tags: ['Payments'],
        summary: 'Obter status do pagamento',
        security: [{ cookieAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    }, async (request, reply) => {
      const { id } = request.params as { id: string }
      const payment = await getPaymentStatus.execute(id)
      return reply.send(payment)
    })

    app.post('/webhooks/payment', {
      schema: {
        tags: ['Webhooks'],
        summary: 'Receber webhook de pagamento',
      },
    }, async (request, reply) => {
      const { provider, event, paymentId, externalId, status } = request.body as any

      const result = await processWebhook.execute({
        provider,
        event,
        paymentId,
        externalId,
        status,
      })

      return reply.send({ received: true })
    })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/payments/routes/
git commit -m "feat(payments): add payment and webhook routes"
```

---

### Task 7: Register Routes in app.ts

**Files:**
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Add payment and webhook route imports**

Read `apps/api/src/app.ts` and add imports for payment routes and repositories.

- [ ] **Step 2: Register payment routes**

Add payment routes registration after cart routes.

- [ ] **Step 3: Run tests to verify everything works**

Run: `pnpm --filter @kronostore/api test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app.ts
git commit -m "feat(api): register payment and webhook routes"
```

---

### Task 8: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run all tests**

Run: `pnpm --filter @kronostore/api test`
Expected: All tests PASS

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter @kronostore/api typecheck`
Expected: No type errors

- [ ] **Step 3: Run lint**

Run: `pnpm biome check apps/api/src/modules/payments/ apps/api/src/modules/webhooks/`
Expected: No lint errors

- [ ] **Step 4: Final commit if needed**

```bash
git add -A
git commit -m "chore: final verification for payments sub-project"
```
