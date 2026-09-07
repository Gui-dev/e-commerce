# Stripe Payments (Cartão, PIX e Boleto) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify cartão, PIX e boleto num único fluxo Stripe (PaymentIntent + webhook real) e remover o webhook genérico com HMAC próprio.

**Architecture:** Backend cria PaymentIntent conforme o método (`card` → clientSecret; `pix`/`boleto` → confirm imediato server-side e retorna dados do `next_action`). Webhook Stripe real (`payment_intent.succeeded`/`payment_failed`) é a fonte da verdade do estado. Frontend usa Stripe Elements (cartão) e painéis com polling (PIX/boleto).

**Tech Stack:** Fastify + TypeScript, `stripe` (Node SDK, apiVersion 2026-08-26.dahlia), `@stripe/stripe-js` + `@stripe/react-stripe-js` (Next.js App Router), Vitest (unit), Playwright (e2e), Stripe CLI (webhook forwarding), sandbox Stripe test mode.

**External facts (verificados em 2026-09-06):**
- API roda na porta **3001** → webhook: `stripe listen --forward-to http://localhost:3001/webhooks/stripe`.
- O `whsec_...` do `stripe listen` muda por sessão; `STRIPE_WEBHOOK_SECRET` no `.env` deve refletir a sessão ativa.
- Test mode PIX/boleto é simulado pelo `billing_details.email`: `succeed_immediately@...` → `payment_intent.succeeded` em segundos; `expire_immediately@...` → `payment_failed` em segundos. Tax id de teste: `000.000.000-00`.
- O webhook node SDK: `stripe.webhooks.constructEvent(rawBody, signature, secret)` e `stripe.webhooks.generateTestHeaderString({ payload, secret })`.
- `paymentIntent.metadata` recebe `{ orderId, paymentId }` na criação → o webhook mapeia o evento ao pagamento local.
- **Correção verificada (2026-09-07):** o campo real do `next_action` para PIX é `pix_display_qr_code` (flat: `data`, `image_url_png`, `image_url_svg`, `hosted_instructions_url`, `expires_at`) — NÃO `pix.qr_code`. Confirmado nas docs oficiais (`payment_intent.next_action.pix_display_qr_code.data` etc.).
- **Correção verificada (2026-09-07):** `stripe@22.6.1` só aceita o literal de `apiVersion` `"2026-08-26.dahlia"` (constante exportada `ApiVersion`) — NÃO aceita `"2024-06-20"`. Usar `"2026-08-26.dahlia"` em todas as instanciações (`stripe-client.ts`, `verify-stripe-signature.ts`, specs via `generateTestHeaderString`).

---

## File Structure

### Backend (`apps/api/src/modules/`)
- `payments/domain/payment-gateway.ts` (criar) — porta `PaymentGateway` + tipos de resultado.
- `payments/infra/stripe-payment-gateway.ts` (criar) — adapter usando o SDK; DI do cliente.
- `payments/infra/stripe-client.ts` (criar) — singleton `new Stripe(env.STRIPE_SECRET_KEY, { apiVersion })`.
- `payments/use-cases/generate-payment-intent.use-case.ts` (criar) + `.spec.ts` — orquestra payment→gateway.
- `webhooks/middleware/capture-raw-body.ts` (criar; extraído de `verify-webhook-signature.ts`).
- `webhooks/middleware/verify-stripe-signature.ts` (criar) — `constructEvent`.
- `webhooks/use-cases/process-stripe-webhook.use-case.ts` (criar) + `.spec.ts` — atualiza payment/order.
- `webhooks/routes/index.ts` (reescrever) — rota `POST /webhooks/stripe`.
- `webhooks/routes/index.spec.ts` (reescrever) — testes Stripe (DB-based, padrão atual).
- `webhooks/middleware/verify-webhook-signature.ts` (remover após extrair `captureRawBody`).
- `orders/schemas/order.schema.ts` (modificar) — `taxId` no checkout + `paymentIntentSchema`; remover `webhookPaymentSchema`.
- `orders/routes/index.ts` (modificar) — rota `POST /checkout/payment-intent`.
- `env.ts` (modificar) — variáveis Stripe.
- `src/app.ts` (modificar) — wiring do gateway + webhook.

### Frontend (`apps/web/src/`)
- `lib/stripe.ts` (criar) — `loadStripe` singleton.
- `hooks/use-payment-status.ts` (criar) + `.spec.ts` — polling `GET /orders/:id`.
- `components/checkout/credit-card-form.tsx` (criar) + `.spec.tsx`.
- `components/checkout/pix-panel.tsx` (criar) + `.spec.tsx`.
- `components/checkout/boleto-panel.tsx` (criar) + `.spec.tsx`.
- `components/checkout/checkout-form.tsx` (modificar) + `checkout-form.spec.tsx` (modificar).
- `types/index.ts` (modificar) — tipos do `PaymentIntentResult` do backend.
- Interfaces de infra: package.json (deps), `.env.example`/`.env.local`, `tests/e2e/checkout-flow.spec.ts`.

---

## Task 1: Backend env vars + dependência `stripe`

**Files:**
- Modify: `apps/api/src/env.ts`
- Modify: `apps/api/.env.example`, `apps/api/.env`
- Modify: `apps/api/package.json` (via pnpm)

- [ ] **Step 1: Add stripe dependency**

Run:
```bash
pnpm --filter @kronostore/api add stripe
```
Expected: package.json gains `"stripe": "^..."`, lockfile updated.

- [ ] **Step 2: Add Stripe vars to env schema**

Edit `apps/api/src/env.ts` — inside `envSchema` (after `API_PORT`), add:

```ts
  STRIPE_SECRET_KEY: z.string().regex(/^sk_test_/),
  STRIPE_PUBLISHABLE_KEY: z.string().regex(/^pk_test_/),
  STRIPE_WEBHOOK_SECRET: z.string().regex(/^whsec_/),
```

- [ ] **Step 3: Add vars to `.env.example`**

At the bottom of `apps/api/.env.example` add:

```
# Stripe (sandbox test mode)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

(`apps/api/.env` já tem as chaves reais — não alterar os valores.)

- [ ] **Step 4: Verify typecheck**

Run: `pnpm --filter @kronostore/api typecheck`
Expected: PASS (0 errors).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/env.ts apps/api/.env.example apps/api/package.json pnpm-lock.yaml
git commit -m "feat(payments): add stripe env vars and dependency"
```

---

## Task 2: Porta `PaymentGateway` (domain)

**Files:**
- Create: `apps/api/src/modules/payments/domain/payment-gateway.ts`

- [ ] **Step 1: Create the port**

```ts
import type { PaymentMethod } from "./payment.js";

export interface BillingDetails {
  name: string;
  email: string;
  taxId?: string;
}

export interface CardIntentResult {
  type: "card";
  paymentIntentId: string;
  clientSecret: string;
}

export interface PixIntentResult {
  type: "pix";
  paymentIntentId: string;
  qrCodeUrl: string;
  qrCodePngUrl: string;
  qrCodeSvgUrl: string;
  hostedInstructionsUrl: string;
  expiresAt: string | null;
}

export interface BoletoIntentResult {
  type: "boleto";
  paymentIntentId: string;
  hostedVoucherUrl: string;
  pdfUrl: string;
  expiresAt: string | null;
}

export type PaymentIntentResult = CardIntentResult | PixIntentResult | BoletoIntentResult;

export interface PaymentGateway {
  createPaymentIntent(input: {
    method: PaymentMethod;
    amountCents: number;
    orderId: string;
    paymentId: string;
    billingDetails: BillingDetails;
  }): Promise<PaymentIntentResult>;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/payments/domain/payment-gateway.ts
git commit -m "feat(payments): add payment gateway port"
```

---

## Task 3: `StripePaymentGateway` + singleton + spec

**Files:**
- Create: `apps/api/src/modules/payments/infra/stripe-payment-gateway.ts`
- Create: `apps/api/src/modules/payments/infra/stripe-client.ts`
- Test: `apps/api/src/modules/payments/infra/stripe-payment-gateway.spec.ts`

- [ ] **Step 1: Write the failing spec**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentIntentResult } from "../domain/payment-gateway.js";
import { StripePaymentGateway } from "./stripe-payment-gateway.js";

type FakePaymentIntents = {
  create: ReturnType<typeof vi.fn>;
};

function makeFakeIntents(returnValue: unknown): FakePaymentIntents {
  return { create: vi.fn().mockResolvedValue(returnValue) };
}

const BILLING = { name: "Maria Silva", email: "maria@example.com", taxId: "000.000.000-00" };

describe("StripePaymentGateway", () => {
  it("creates a card PaymentIntent with amount, brl and metadata", async () => {
    const paymentIntents = makeFakeIntents({
      id: "pi_card_1",
      client_secret: "cs_secret",
    });
    const gateway = new StripePaymentGateway({ paymentIntents } as never);

    const result = (await gateway.createPaymentIntent({
      method: "credit_card",
      amountCents: 3998,
      orderId: "order-1",
      paymentId: "pay-1",
      billingDetails: BILLING,
    })) as Extract<PaymentIntentResult, { type: "card" }>;

    expect(paymentIntents.create).toHaveBeenCalledWith({
      amount: 3998,
      currency: "brl",
      metadata: { orderId: "order-1", paymentId: "pay-1" },
      payment_method_types: ["card"],
    });
    expect(result).toEqual({ type: "card", paymentIntentId: "pi_card_1", clientSecret: "cs_secret" });
  });

  it("confirms a pix PaymentIntent and maps next_action to QR data", async () => {
    const paymentIntents = makeFakeIntents({
      id: "pi_pix_1",
      next_action: {
        pix_display_qr_code: {
          data: "000201pixpayload",
          image_url_png: "https://stripe.test/qr.png",
          image_url_svg: "https://stripe.test/qr.svg",
          hosted_instructions_url: "https://stripe.test/pix/instructions",
          expires_at: 1780000000,
        },
      },
    });
    const gateway = new StripePaymentGateway({ paymentIntents } as never);

    const result = (await gateway.createPaymentIntent({
      method: "pix",
      amountCents: 3998,
      orderId: "order-1",
      paymentId: "pay-1",
      billingDetails: BILLING,
    })) as Extract<PaymentIntentResult, { type: "pix" }>;

    expect(paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ["pix"],
        payment_method_data: {
          pix: {},
          billing_details: {
            name: BILLING.name,
            email: BILLING.email,
            tax_id: BILLING.taxId,
          },
        },
        confirm: true,
      }),
    );
    expect(result.type).toBe("pix");
    expect(result.qrCodeUrl).toBe("000201pixpayload");
    expect(result.qrCodePngUrl).toBe("https://stripe.test/qr.png");
    expect(result.qrCodeSvgUrl).toBe("https://stripe.test/qr.svg");
    expect(result.hostedInstructionsUrl).toBe("https://stripe.test/pix/instructions");
    expect(result.expiresAt).toBe(new Date(1780000000 * 1000).toISOString());
  });

  it("confirms a boleto PaymentIntent and maps next_action to voucher urls", async () => {
    const paymentIntents = makeFakeIntents({
      id: "pi_boleto_1",
      next_action: {
        boleto_display_details: {
          hosted_voucher_url: "https://stripe.test/boleto/hosted",
          pdf: "https://stripe.test/boleto/voucher.pdf",
          expires_at: 1780000000,
        },
      },
    });
    const gateway = new StripePaymentGateway({ paymentIntents } as never);

    const result = (await gateway.createPaymentIntent({
      method: "boleto",
      amountCents: 3998,
      orderId: "order-1",
      paymentId: "pay-1",
      billingDetails: BILLING,
    })) as Extract<PaymentIntentResult, { type: "boleto" }>;

    expect(paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ["boleto"],
        payment_method_options: { boleto: { expires_after_days: 3 } },
        payment_method_data: {
          billing_details: {
            name: BILLING.name,
            email: BILLING.email,
            tax_id: BILLING.taxId,
          },
        },
        confirm: true,
      }),
    );
    expect(result).toEqual({
      type: "boleto",
      paymentIntentId: "pi_boleto_1",
      hostedVoucherUrl: "https://stripe.test/boleto/hosted",
      pdfUrl: "https://stripe.test/boleto/voucher.pdf",
      expiresAt: new Date(1780000000 * 1000).toISOString(),
    });
  });

  it("throws when Stripe does not return the card client_secret", async () => {
    const paymentIntents = makeFakeIntents({ id: "pi_card_2" });
    const gateway = new StripePaymentGateway({ paymentIntents } as never);

    await expect(
      gateway.createPaymentIntent({
        method: "credit_card",
        amountCents: 3998,
        orderId: "order-1",
        paymentId: "pay-1",
        billingDetails: BILLING,
      }),
    ).rejects.toThrow("client_secret");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kronostore/api test`
Expected: FAIL — module `./stripe-payment-gateway.js` not found (no such file).

- [ ] **Step 3: Write the gateway and singleton**

Create `apps/api/src/modules/payments/infra/stripe-payment-gateway.ts`:

```ts
import type { Stripe } from "stripe";
import type {
  BillingDetails,
  PaymentGateway,
  PaymentIntentResult,
} from "../domain/payment-gateway.js";
import type { PaymentMethod } from "../domain/payment.js";

export class StripePaymentGateway implements PaymentGateway {
  constructor(private readonly client: Pick<Stripe, "paymentIntents">) {}

  async createPaymentIntent(input: {
    method: PaymentMethod;
    amountCents: number;
    orderId: string;
    paymentId: string;
    billingDetails: BillingDetails;
  }): Promise<PaymentIntentResult> {
    const base = {
      amount: input.amountCents,
      currency: "brl",
      metadata: { orderId: input.orderId, paymentId: input.paymentId },
    };

    if (input.method === "credit_card") {
      const paymentIntent = await this.client.paymentIntents.create({
        ...base,
        payment_method_types: ["card"],
      });
      if (!paymentIntent.client_secret) {
        throw new Error("Stripe did not return a client_secret");
      }
      return {
        type: "card",
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      };
    }

    if (input.method === "pix") {
      const paymentIntent = await this.client.paymentIntents.create({
        ...base,
        payment_method_types: ["pix"],
        payment_method_data: {
          pix: {},
          billing_details: {
            name: input.billingDetails.name,
            email: input.billingDetails.email,
            tax_id: input.billingDetails.taxId,
          },
        },
        confirm: true,
      });
      const pix = paymentIntent.next_action?.pix_display_qr_code;
      if (!pix?.data) {
        throw new Error("Stripe did not return pix next_action data");
      }
      return {
        type: "pix",
        paymentIntentId: paymentIntent.id,
        qrCodeUrl: pix.data,
        qrCodePngUrl: pix.image_url_png ?? "",
        qrCodeSvgUrl: pix.image_url_svg ?? "",
        hostedInstructionsUrl: pix.hosted_instructions_url ?? "",
        expiresAt: pix.expires_at ? new Date(pix.expires_at * 1000).toISOString() : null,
      };
    }

    const paymentIntent = await this.client.paymentIntents.create({
      ...base,
      payment_method_types: ["boleto"],
      payment_method_options: { boleto: { expires_after_days: 3 } },
      payment_method_data: {
        billing_details: {
          name: input.billingDetails.name,
          email: input.billingDetails.email,
          tax_id: input.billingDetails.taxId ?? "000.000.000-00",
        },
      },
      confirm: true,
    });
    const boleto = paymentIntent.next_action?.boleto_display_details;
    if (!boleto?.hosted_voucher_url) {
      throw new Error("Stripe did not return boleto next_action data");
    }
    return {
      type: "boleto",
      paymentIntentId: paymentIntent.id,
      hostedVoucherUrl: boleto.hosted_voucher_url,
      pdfUrl: boleto.pdf,
      expiresAt: boleto.expires_at
        ? new Date(boleto.expires_at * 1000).toISOString()
        : null,
    };
  }
}
```

Create `apps/api/src/modules/payments/infra/stripe-client.ts`:

```ts
import Stripe from "stripe";
import { env } from "../../../env.js";

export const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-08-26.dahlia",
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kronostore/api test`
Expected: PASS — all 4 gateway tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/payments/infra/stripe-payment-gateway.ts apps/api/src/modules/payments/infra/stripe-client.ts apps/api/src/modules/payments/infra/stripe-payment-gateway.spec.ts
git commit -m "feat(payments): add stripe payment gateway adapter"
```

---

## Task 4: `GeneratePaymentIntentUseCase` + spec

**Files:**
- Create: `apps/api/src/modules/payments/use-cases/generate-payment-intent.use-case.ts`
- Test: `apps/api/src/modules/payments/use-cases/generate-payment-intent.use-case.spec.ts`

- [ ] **Step 1: Write the failing spec**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentGateway, PaymentIntentResult } from "../domain/payment-gateway.js";
import type { Payment } from "../domain/payment.js";
import { GeneratePaymentIntentUseCase } from "./generate-payment-intent.use-case.js";

const PAYMENT: Payment = {
  id: "pay-1",
  orderId: "order-1",
  method: "pix",
  status: "pending",
  amountCents: 3998,
  externalId: null,
  idempotencyKey: null,
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GeneratePaymentIntentUseCase", () => {
  let gateway: PaymentGateway;
  let useCase: GeneratePaymentIntentUseCase;
  let findByOrderId: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    findByOrderId = vi.fn().mockResolvedValue(PAYMENT);
    const repository = { findByOrderId };
    gateway = {
      createPaymentIntent: vi
        .fn()
        .mockResolvedValue({ type: "pix", paymentIntentId: "pi_1" } as PaymentIntentResult),
    };
    useCase = new GeneratePaymentIntentUseCase(repository as never, gateway);
  });

  it("creates a payment intent for the order's payment", async () => {
    const result = await useCase.execute({
      orderId: "order-1",
      userEmail: "maria@example.com",
      billingName: "Maria Silva",
      taxId: "000.000.000-00",
    });

    expect(findByOrderId).toHaveBeenCalledWith("order-1");
    expect(gateway.createPaymentIntent).toHaveBeenCalledWith({
      method: "pix",
      amountCents: 3998,
      orderId: "order-1",
      paymentId: "pay-1",
      billingDetails: {
        name: "Maria Silva",
        email: "maria@example.com",
        taxId: "000.000.000-00",
      },
    });
    expect(result).toEqual({ type: "pix", paymentIntentId: "pi_1" });
  });

  it("throws OrderNotFoundError when no payment exists for the order", async () => {
    findByOrderId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        orderId: "missing",
        userEmail: "maria@example.com",
        billingName: "Maria",
      }),
    ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND", statusCode: 404 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kronostore/api test`
Expected: FAIL — module `./generate-payment-intent.use-case.js` not found.

- [ ] **Step 3: Write the use case**

```ts
import { OrderNotFoundError } from "../../orders/domain/order.js";
import type { PaymentGateway } from "../domain/payment-gateway.js";
import type { PaymentRepository } from "../domain/payment-repository.js";

export interface GeneratePaymentIntentInput {
  orderId: string;
  userEmail: string;
  billingName: string;
  taxId?: string;
}

export class GeneratePaymentIntentUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async execute(input: GeneratePaymentIntentInput) {
    const payment = await this.paymentRepository.findByOrderId(input.orderId);
    if (!payment) {
      throw new OrderNotFoundError(input.orderId);
    }

    return this.paymentGateway.createPaymentIntent({
      method: payment.method,
      amountCents: payment.amountCents,
      orderId: payment.orderId,
      paymentId: payment.id,
      billingDetails: {
        name: input.billingName,
        email: input.userEmail,
        taxId: input.taxId,
      },
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kronostore/api test`
Expected: PASS — 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/payments/use-cases/generate-payment-intent.use-case.ts apps/api/src/modules/payments/use-cases/generate-payment-intent.use-case.spec.ts
git commit -m "feat(payments): add generate payment intent use case"
```

---

## Task 5: Rota `POST /checkout/payment-intent` + schema + wiring

**Files:**
- Modify: `apps/api/src/modules/orders/schemas/order.schema.ts`
- Modify: `apps/api/src/modules/orders/routes/index.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Add `taxId` to checkout + `paymentIntentSchema`**

In `apps/api/src/modules/orders/schemas/order.schema.ts`, change the `address` object to add `taxId`:

```ts
  address: z.object({
    name: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zip: z.string(),
    country: z.string().length(2).default("BR"),
    taxId: z.string().min(11).max(18).optional(),
  }),
```

And add a new schema below `checkoutSchema`:

```ts
export const paymentIntentSchema = z.object({
  orderId: z.string().uuid(),
  taxId: z.string().min(11).max(18).optional(),
});
```

- [ ] **Step 2: Add the route**

In `apps/api/src/modules/orders/routes/index.ts`:

1. Imports — add `PaymentGateway` and `GeneratePaymentIntentUseCase`:
```ts
import type { PaymentGateway } from "../../payments/domain/payment-gateway.js";
import { GeneratePaymentIntentUseCase } from "../../payments/use-cases/generate-payment-intent.use-case.js";
```
2. Import `paymentIntentSchema` alongside the existing schemas:
```ts
import {
  checkoutSchema,
  idempotencyKeyHeaderSchema,
  orderParamsSchema,
  paymentIntentSchema,
} from "../schemas/order.schema.js";
```
3. Add `paymentGateway: PaymentGateway` as the last parameter of `createCheckoutRoutes`, and instantiate:
```ts
const generatePaymentIntent = new GeneratePaymentIntentUseCase(paymentRepository, paymentGateway);
```
4. Add the route after the `POST /checkout` block:

```ts
    app.withTypeProvider<ZodTypeProvider>().post(
      "/checkout/payment-intent",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Checkout"],
          summary: "Criar PaymentIntent no Stripe",
          security: [{ cookieAuth: [] }],
          body: paymentIntentSchema,
        },
      },
      async (request, reply) => {
        const { orderId, taxId } = request.body;
        const order = await orderRepository.findById(orderId);
        if (!order || order.userId !== request.user.id) {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Order not found" });
        }

        const result = await generatePaymentIntent.execute({
          orderId,
          userEmail: request.user.email,
          billingName: order.shippingName ?? request.user.name,
          taxId,
        });

        return reply.send(result);
      },
    );
```

- [ ] **Step 3: Wire gateway in `apps/api/src/app.ts`**

1. Add imports:
```ts
import { createStripePaymentGateway } from "./modules/payments/infra/stripe-payment-gateway.js";
import { stripeClient } from "./modules/payments/infra/stripe-client.js";
```
2. Pass the gateway to `createCheckoutRoutes` (line ~97):
```ts
  await app.register(
    createCheckoutRoutes(
      orderRepository,
      cartRepository,
      stockRepository,
      couponRepository,
      productRepository,
      paymentRepository,
      new StripePaymentGateway(stripeClient),
    ),
  );
```
(Import `StripePaymentGateway` in the same block instead: `import { StripePaymentGateway } from "./modules/payments/infra/stripe-payment-gateway.js";` — unique import style is fine.)

- [ ] **Step 4: Verify typecheck**

Run: `pnpm --filter @kronostore/api typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/orders/schemas/order.schema.ts apps/api/src/modules/orders/routes/index.ts apps/api/src/app.ts
git commit -m "feat(checkout): add payment-intent endpoint"
```

---

## Task 6: `ProcessStripeWebhookUseCase` + spec

**Files:**
- Create: `apps/api/src/modules/webhooks/use-cases/process-stripe-webhook.use-case.ts`
- Test: `apps/api/src/modules/webhooks/use-cases/process-stripe-webhook.use-case.spec.ts`

- [ ] **Step 1: Write the failing spec**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Payment } from "../../payments/domain/payment.js";
import { ProcessStripeWebhookUseCase } from "./process-stripe-webhook.use-case.js";

const PAYMENT: Payment = {
  id: "pay-1",
  orderId: "order-1",
  method: "pix",
  status: "pending",
  amountCents: 3998,
  externalId: null,
  idempotencyKey: null,
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function eventPayload(type: string, status: string) {
  return {
    type,
    data: {
      object: {
        id: "pi_1",
        metadata: { orderId: "order-1", paymentId: "pay-1" },
        status,
      },
    },
  };
}

describe("ProcessStripeWebhookUseCase", () => {
  let findByPaymentId: ReturnType<typeof vi.fn>;
  let updatePaymentStatus: ReturnType<typeof vi.fn>;
  let updateOrderStatus: ReturnType<typeof vi.fn>;
  let useCase: ProcessStripeWebhookUseCase;

  beforeEach(() => {
    findByPaymentId = vi.fn().mockResolvedValue(PAYMENT);
    updatePaymentStatus = vi.fn();
    updateOrderStatus = vi.fn();
    useCase = new ProcessStripeWebhookUseCase(
      { findById: findByPaymentId } as never,
      { updateStatus: updatePaymentStatus } as never,
      { updateStatus: updateOrderStatus } as never,
    );
  });

  it("returns null when payment is not found", async () => {
    findByPaymentId.mockResolvedValue(null);
    const result = await useCase.execute({ type: "payment_intent.succeeded", data: { object: { metadata: { orderId: "order-1", paymentId: "missing" } } } } as never);
    expect(result).toBeNull();
    expect(updatePaymentStatus).not.toHaveBeenCalled();
  });

  it("approves payment and marks order paid on succeeded", async () => {
    const result = await useCase.execute(eventPayload("payment_intent.succeeded", "succeeded") as never);

    expect(updatePaymentStatus).toHaveBeenCalledWith("pay-1", "approved", "pi_1");
    expect(updateOrderStatus).toHaveBeenCalledWith("order-1", "paid");
    expect(result).toEqual({ paymentId: "pay-1", orderId: "order-1" });
  });

  it("rejects payment and cancels order on payment_failed", async () => {
    const result = await useCase.execute(eventPayload("payment_intent.payment_failed", "requires_payment_method") as never);

    expect(updatePaymentStatus).toHaveBeenCalledWith("pay-1", "rejected", "pi_1");
    expect(updateOrderStatus).toHaveBeenCalledWith("order-1", "cancelled");
    expect(result).toEqual({ paymentId: "pay-1", orderId: "order-1" });
  });

  it("is idempotent when payment status is already approved", async () => {
    findByPaymentId.mockResolvedValue({ ...PAYMENT, status: "approved" });
    await useCase.execute(eventPayload("payment_intent.succeeded", "succeeded") as never);

    expect(updatePaymentStatus).not.toHaveBeenCalled();
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it("is a no-op for unhandled event types", async () => {
    const result = await useCase.execute(eventPayload("charge.refunded", "succeeded") as never);

    expect(updatePaymentStatus).not.toHaveBeenCalled();
    expect(updateOrderStatus).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kronostore/api test`
Expected: FAIL — module `./process-stripe-webhook.use-case.js` not found.

- [ ] **Step 3: Write the use case**

```ts
import type Stripe from "stripe";
import type { OrderRepository } from "../../orders/domain/order-repository.js";
import type { PaymentRepository } from "../../payments/domain/payment-repository.js";

export class ProcessStripeWebhookUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(event: Stripe.Event) {
    if (
      event.type !== "payment_intent.succeeded" &&
      event.type !== "payment_intent.payment_failed"
    ) {
      return null;
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { orderId, paymentId } = paymentIntent.metadata ?? {};
    if (!orderId || !paymentId) return null;

    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) return null;

    if (event.type === "payment_intent.succeeded") {
      if (payment.status === "approved") return { paymentId, orderId };
      await this.paymentRepository.updateStatus(payment.id, "approved", paymentIntent.id);
      await this.orderRepository.updateStatus(payment.orderId, "paid");
      return { paymentId, orderId };
    }

    if (payment.status === "rejected") return { paymentId, orderId };
    await this.paymentRepository.updateStatus(payment.id, "rejected", paymentIntent.id);
    await this.orderRepository.updateStatus(payment.orderId, "cancelled");
    return { paymentId, orderId };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kronostore/api test`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/webhooks/use-cases/process-stripe-webhook.use-case.ts apps/api/src/modules/webhooks/use-cases/process-stripe-webhook.use-case.spec.ts
git commit -m "feat(webhooks): add stripe webhook processing use case"
```

---

## Task 7: Middleware de assinatura Stripe + extrair `captureRawBody`

**Files:**
- Create: `apps/api/src/modules/webhooks/middleware/capture-raw-body.ts` (extraído)
- Create: `apps/api/src/modules/webhooks/middleware/verify-stripe-signature.ts`
- Delete: `apps/api/src/modules/webhooks/middleware/verify-webhook-signature.ts`

- [ ] **Step 1: Move `captureRawBody` to its own file**

Create `apps/api/src/modules/webhooks/middleware/capture-raw-body.ts` with the **exact current content** of lines 1-45 of `verify-webhook-signature.ts` (the `declare module "fastify"` for `rawBody`, `MAX_WEBHOOK_BODY_BYTES`, `captureRawBody`, and its imports `node:crypto`/`timingSafeEqual` are NOT needed here — only `Readable` and the Fastify types). Final content:

```ts
import { Readable } from "node:stream";
import type { FastifyReply, FastifyRequest, RequestPayload, preParsingHookHandler } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

type PreParsingPayload = RequestPayload;

export const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;

export const captureRawBody: preParsingHookHandler = (
  request: FastifyRequest,
  _reply: FastifyReply,
  payload: PreParsingPayload,
  done: (err?: Error | null, body?: PreParsingPayload) => void,
) => {
  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  if (Buffer.isBuffer(payload)) {
    request.rawBody = payload;
    done(null, payload);
    return;
  }
  if (typeof payload === "string") {
    request.rawBody = Buffer.from(payload);
    done(null, payload);
    return;
  }
  payload.on("data", (chunk: Buffer) => {
    chunks.push(Buffer.from(chunk));
    receivedBytes += chunk.length;
    if (receivedBytes > MAX_WEBHOOK_BODY_BYTES) {
      payload.destroy(new Error("Webhook body exceeds maximum allowed size"));
    }
  });
  payload.on("end", () => {
    request.rawBody = Buffer.concat(chunks);
    done(null, Readable.from(Buffer.concat(chunks)));
  });
  payload.on("error", (err: Error) => done(err));
};
```

- [ ] **Step 2: Create the Stripe signature verifier**

Create `apps/api/src/modules/webhooks/middleware/verify-stripe-signature.ts`:

```ts
import Stripe from "stripe";
import type { preHandlerHookHandler } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    stripeEvent?: Stripe.Event;
  }
}

export const verifyStripeSignature: preHandlerHookHandler = async (request, reply) => {
  const signature = request.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (typeof signature !== "string" || signature.length === 0 || !secret || !request.rawBody) {
    return reply.code(400).send({ error: "INVALID_SIGNATURE", message: "Invalid Stripe signature" });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
      apiVersion: "2026-08-26.dahlia",
    });
    request.stripeEvent = stripe.webhooks.constructEvent(request.rawBody, signature, secret);
  } catch {
    return reply.code(400).send({ error: "INVALID_SIGNATURE", message: "Invalid Stripe signature" });
  }
};
```

- [ ] **Step 3: Delete the old HMAC middleware**

Run: `rm apps/api/src/modules/webhooks/middleware/verify-webhook-signature.ts`

- [ ] **Step 4: Verify typecheck**

Run: `pnpm --filter @kronostore/api typecheck`
Expected: FAIL only if `routes/index.ts` still imports `captureRawBody` from the deleted file (it will). Fix in Task 8. If typecheck passes, fine.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/webhooks/middleware/capture-raw-body.ts apps/api/src/modules/webhooks/middleware/verify-stripe-signature.ts apps/api/src/modules/webhooks/middleware/verify-webhook-signature.ts
git commit -m "refactor(webhooks): stripe signature verifier and raw body capture"
```

---

## Task 8: Rota `/webhooks/stripe` + spec (DB-based)

**Files:**
- Modify: `apps/api/src/modules/webhooks/routes/index.ts` (reescrever)
- Modify: `apps/api/src/modules/webhooks/routes/index.spec.ts` (reescrever)
- Modify: `apps/api/src/modules/orders/schemas/order.schema.ts` (remover `webhookPaymentSchema`)

- [ ] **Step 1: Rewrite the route**

Replace the entire content of `apps/api/src/modules/webhooks/routes/index.ts`:

```ts
import type { FastifyInstance } from "fastify";
import type { OrderRepository } from "../../orders/domain/order-repository.js";
import type { PaymentRepository } from "../../payments/domain/payment-repository.js";
import { captureRawBody } from "../middleware/capture-raw-body.js";
import { verifyStripeSignature } from "../middleware/verify-stripe-signature.js";
import { ProcessStripeWebhookUseCase } from "../use-cases/process-stripe-webhook.use-case.js";

export function createWebhookRoutes(
  paymentRepository: PaymentRepository,
  orderRepository: OrderRepository,
) {
  return async function webhookRoutes(app: FastifyInstance) {
    app.post(
      "/webhooks/stripe",
      {
        preParsing: captureRawBody,
        preHandler: verifyStripeSignature,
      },
      async (request) => {
        const event = request.stripeEvent!;
        await new ProcessStripeWebhookUseCase(paymentRepository, orderRepository).execute(event);
        return { received: true };
      },
    );
  };
}
```

- [ ] **Step 2: Remove `webhookPaymentSchema`**

In `apps/api/src/modules/orders/schemas/order.schema.ts`, delete the `webhookPaymentSchema` export block.

- [ ] **Step 3: Rewrite the spec (DB-based, padrão do módulo)**

Replace the entire content of `apps/api/src/modules/webhooks/routes/index.spec.ts`:

```ts
import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import Fastify from "fastify";
import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { orders, users } from "../../../lib/db/schema.js";
import { db } from "../../../lib/db/test-db.js";
import { resetDatabase, seedTestData } from "../../../lib/db/test-helpers.js";
import { DrizzleOrderRepository } from "../../orders/infra/drizzle-order-repository.js";
import { DrizzlePaymentRepository } from "../../payments/infra/drizzle-payment-repository.js";
import { createWebhookRoutes } from "./index.js";

const TEST_WEBHOOK_SECRET = "whsec_test-secret-for-stripe-signing";
const TEST_SECRET_KEY = "sk_test_example";
const TEST_USER_ID = "eeeeeeee-0000-4000-8000-000000000005";
const TEST_ORDER_ID = "eeeeeeee-0000-4000-8000-000000000006";

function createStripeEvent(
  type: string,
  status: string,
  paymentId: string,
): { payload: string; signature: string } {
  const event = {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    object: "event",
    type,
    data: {
      object: {
        id: "pi_123",
        object: "payment_intent",
        status,
        metadata: { orderId: TEST_ORDER_ID, paymentId },
      },
    },
  };
  const payload = JSON.stringify(event);
  const stripe = new Stripe(TEST_SECRET_KEY, { apiVersion: "2026-08-26.dahlia" });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: TEST_WEBHOOK_SECRET });
  return { payload, signature };
}

describe("Stripe webhook routes", () => {
  let app: ReturnType<typeof Fastify>;
  let originalWebhookSecret: string | undefined;
  let originalSecretKey: string | undefined;
  let paymentId: string;

  beforeEach(async () => {
    originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    originalSecretKey = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = TEST_SECRET_KEY;

    await resetDatabase();
    await seedTestData();
    await db.insert(users).values({
      id: TEST_USER_ID,
      name: "Test User",
      email: "webhook-stripe@example.com",
      emailVerified: true,
      role: "customer",
    });
    await db.insert(orders).values({
      id: TEST_ORDER_ID,
      userId: TEST_USER_ID,
      status: "pending",
      subtotalCents: 3998,
      discountCents: 0,
      totalCents: 3998,
    });

    const orderRepository = new DrizzleOrderRepository(db);
    const paymentRepository = new DrizzlePaymentRepository(db);
    const payment = await paymentRepository.create({
      orderId: TEST_ORDER_ID,
      method: "pix",
      amountCents: 3998,
    });
    paymentId = payment.id;

    app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(createWebhookRoutes(paymentRepository, orderRepository));
    await app.ready();
  });

  afterEach(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
    process.env.STRIPE_SECRET_KEY = originalSecretKey;
  });

  it("should reject request without stripe-signature header", async () => {
    const { payload } = createStripeEvent("payment_intent.succeeded", "succeeded", paymentId);
    const res = await app.inject({ method: "POST", url: "/webhooks/stripe", payload });

    expect(res.statusCode).toBe(400);
  });

  it("should reject request with invalid signature", async () => {
    const { payload } = createStripeEvent("payment_intent.succeeded", "succeeded", paymentId);
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      headers: { "stripe-signature": "t=1,v1=invalid" },
      payload,
    });

    expect(res.statusCode).toBe(400);
  });

  it("should approve payment and mark order paid on succeeded", async () => {
    const { payload, signature } = createStripeEvent("payment_intent.succeeded", "succeeded", paymentId);
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      headers: { "stripe-signature": signature },
      payload,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true });

    const orderRepository = new DrizzleOrderRepository(db);
    const paymentRepository = new DrizzlePaymentRepository(db);
    const payment = await paymentRepository.findById(paymentId);
    const order = await orderRepository.findById(TEST_ORDER_ID);
    expect(payment?.status).toBe("approved");
    expect(payment?.externalId).toBe("pi_123");
    expect(order?.status).toBe("paid");
  });

  it("should reject payment and cancel order on payment_failed", async () => {
    const { payload, signature } = createStripeEvent(
      "payment_intent.payment_failed",
      "requires_payment_method",
      paymentId,
    );
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      headers: { "stripe-signature": signature },
      payload,
    });

    expect(res.statusCode).toBe(200);

    const paymentRepository = new DrizzlePaymentRepository(db);
    const orderRepository = new DrizzleOrderRepository(db);
    const payment = await paymentRepository.findById(paymentId);
    const order = await orderRepository.findById(TEST_ORDER_ID);
    expect(payment?.status).toBe("rejected");
    expect(order?.status).toBe("cancelled");
  });
});
```

- [ ] **Step 4: Run tests to verify**

Run: `pnpm --filter @kronostore/api test`
Expected: PASS — module webhook spec green (yes: precisa de infra Postgres, igual aos demais specs de integração do módulo).

- [ ] **Step 5: Run typecheck**

Run: `pnpm --filter @kronostore/api typecheck`
Expected: PASS (0 errors — Route Task 7 fix completes here).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/webhooks/routes/index.ts apps/api/src/modules/webhooks/routes/index.spec.ts apps/api/src/modules/orders/schemas/order.schema.ts
git commit -m "feat(webhooks): stripe webhook endpoint replacing generic webhook"
```

---

## Task 9: Frontend deps, `lib/stripe.ts`, tipos, env example

**Files:**
- Modify: `apps/web/package.json` (via pnpm)
- Create: `apps/web/src/lib/stripe.ts`
- Modify: `apps/web/src/types/index.ts`
- Modify: `apps/web/.env.example`, `apps/web/.env.local`

- [ ] **Step 1: Add frontend deps**

Run:
```bash
pnpm --filter @kronostore/web add @stripe/stripe-js @stripe/react-stripe-js
```
Expected: package.json gains both deps; lockfile updated.

- [ ] **Step 2: Create the stripe loader**

Create `apps/web/src/lib/stripe.ts`:

```ts
import { loadStripe } from "@stripe/stripe-js";

let stripePromise: ReturnType<typeof loadStripe> | null = null;

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");
  }
  return stripePromise;
}
```

- [ ] **Step 3: Add shared payment intent types**

Append to `apps/web/src/types/index.ts` (logo após o bloco `Payment`):

```ts
export interface PaymentIntentResponse {
  type: "card" | "pix" | "boleto";
  paymentIntentId: string;
  clientSecret?: string;
  qrCodeUrl?: string;
  qrCodePngUrl?: string;
  qrCodeSvgUrl?: string;
  hostedInstructionsUrl?: string;
  hostedVoucherUrl?: string;
  pdfUrl?: string;
  expiresAt?: string | null;
}
```

- [ ] **Step 4: Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**

Al final de `apps/web/.env.example`:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```
Em `apps/web/.env.local`, acrescente a chave `pk_test_...` real (sem commitar).

- [ ] **Step 5: Verify typecheck**

Run: `pnpm --filter @kronostore/web typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/stripe.ts apps/web/src/types/index.ts apps/web/.env.example apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): stripe loader and payment intent types"
```

---

## Task 10: Hook `usePaymentStatus` + spec

**Files:**
- Create: `apps/web/src/hooks/use-payment-status.ts`
- Test: `apps/web/src/hooks/use-payment-status.spec.ts`

- [ ] **Step 1: Write the failing spec**

```ts
import { api } from "@/lib/api";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePaymentStatus } from "./use-payment-status";

describe("usePaymentStatus", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls the order status every 2.5s and calls onPaid when paid", async () => {
    const getSpy = vi
      .spyOn(api, "get")
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValue({ status: "paid" });

    const onPaid = vi.fn();
    renderHook(() => usePaymentStatus("order-1", onPaid));

    await vi.advanceTimersByTimeAsync(2500);
    expect(getSpy).toHaveBeenCalledWith("/orders/order-1");

    await vi.advanceTimersByTimeAsync(2500);
    await vi.advanceTimersByTimeAsync(2500);
    await waitFor(() => expect(onPaid).toHaveBeenCalled());
  });

  it("keeps polling order errors without crashing", async () => {
    const getSpy = vi.spyOn(api, "get").mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => usePaymentStatus("order-1"));

    await vi.advanceTimersByTimeAsync(2500);
    expect(getSpy).toHaveBeenCalled();
    expect(result.current).toBe("pending");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kronostore/web test`
Expected: FAIL — module `./use-payment-status` not found.

- [ ] **Step 3: Write the hook**

Create `apps/web/src/hooks/use-payment-status.ts`:

```ts
"use client";

import { api } from "@/lib/api";
import type { Order, OrderStatus } from "@/types";
import { useEffect, useRef, useState } from "react";

export function usePaymentStatus(orderId: string, onPaid?: () => void) {
  const [status, setStatus] = useState<OrderStatus>("pending");
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  useEffect(() => {
    let cancelled = false;
    const timer = setInterval(async () => {
      const order = await api.get<Order>(`/orders/${orderId}`).catch(() => null);
      if (cancelled) return;
      if (order && order.status !== status) {
        setStatus(order.status);
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orderId, status]);

  useEffect(() => {
    if (status === "paid") {
      onPaidRef.current?.();
    }
  }, [status]);

  return status;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kronostore/web test`
Expected: PASS — 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-payment-status.ts apps/web/src/hooks/use-payment-status.spec.ts
git commit -m "feat(web): add payment status polling hook"
```

---

## Task 11: `CreditCardForm` + spec

**Files:**
- Create: `apps/web/src/components/checkout/credit-card-form.tsx`
- Test: `apps/web/src/components/checkout/credit-card-form.spec.tsx`

- [ ] **Step 1: Write the failing spec**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreditCardForm } from "./credit-card-form";

const mockConfirm = vi.fn();
const mockGetElement = vi.fn(() => ({ _card: true }));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => ({ confirmCardPayment: mockConfirm }),
  useElements: () => ({ getElement: mockGetElement }),
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => Promise.resolve({}),
}));

describe("<CreditCardForm />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the card element and pay button", () => {
    render(<CreditCardForm clientSecret="cs_test_1" onPaymentSuccess={() => {}} onCancel={() => {}} />);

    expect(screen.getByTestId("card-element")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pagar/i })).toBeInTheDocument();
  });

  it("confirms the payment intent with the card element on submit", async () => {
    mockConfirm.mockResolvedValue({ paymentIntent: { status: "succeeded" } });
    const onSuccess = vi.fn();

    render(<CreditCardForm clientSecret="cs_test_1" onPaymentSuccess={onSuccess} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /pagar/i }));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith("cs_test_1", {
      payment_method: { card: { _card: true } },
    }));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("shows error and does not navigate when payment fails", async () => {
    mockConfirm.mockResolvedValue({ error: { message: "Your card was declined." } });
    const onSuccess = vi.fn();

    render(<CreditCardForm clientSecret="cs_test_1" onPaymentSuccess={onSuccess} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /pagar/i }));

    expect(await screen.findByText(/declined/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kronostore/web test`
Expected: FAIL — module `./credit-card-form` not found.

- [ ] **Step 3: Write the component**

Create `apps/web/src/components/checkout/credit-card-form.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { getStripe } from "@/lib/stripe";

interface CreditCardFormProps {
  clientSecret: string;
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

function CardFormInner({ clientSecret, onPaymentSuccess, onCancel }: CreditCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (!stripe || !elements) {
      setError("Serviço de pagamento não carregado.");
      return;
    }

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Elemento de cartão não encontrado.");
      setLoading(false);
      return;
    }

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Erro ao processar o pagamento.");
      return;
    }

    onPaymentSuccess();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border p-4">
        <CardElement options={{ style: { base: { fontSize: "16px" } } }} />
      </div>
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Voltar
        </Button>
        <Button type="button" onClick={handlePay} disabled={loading || !stripe}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Pagar"}
        </Button>
      </div>
    </div>
  );
}

export function CreditCardForm(props: CreditCardFormProps) {
  return (
    <Elements stripe={getStripe()} options={{ clientSecret: props.clientSecret }}>
      <CardFormInner {...props} />
    </Elements>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kronostore/web test`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/checkout/credit-card-form.tsx apps/web/src/components/checkout/credit-card-form.spec.tsx
git commit -m "feat(checkout): add credit card form with stripe elements"
```

---

## Task 12: `PixPanel` + spec

**Files:**
- Create: `apps/web/src/components/checkout/pix-panel.tsx`
- Test: `apps/web/src/components/checkout/pix-panel.spec.tsx`

- [ ] **Step 1: Write the failing spec**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PixPanel } from "./pix-panel";

const copyMock = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, { clipboard: { writeText: copyMock } });

describe("<PixPanel />", () => {
  it("renders the QR code and copy button", () => {
    render(
      <PixPanel
        qrCodePngUrl="https://stripe.test/qr.png"
        hostedInstructionsUrl="https://stripe.test/instructions"
        copyCode="000201pix"
        onPaymentSuccess={() => {}}
      />,
    );

    expect(screen.getByAltText(/qr code pix/i)).toHaveAttribute("src", "https://stripe.test/qr.png");
    expect(screen.getByRole("button", { name: /copiar/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /instruções/i })).toHaveAttribute(
      "href",
      "https://stripe.test/instructions",
    );
  });

  it("copies the pix code when clicking copy", async () => {
    const user = userEvent.setup();
    render(<PixPanel qrCodePngUrl="" hostedInstructionsUrl="" copyCode="000201pix" onPaymentSuccess={() => {}} />);

    await user.click(screen.getByRole("button", { name: /copiar/i }));
    expect(copyMock).toHaveBeenCalledWith("000201pix");
  });
});
```

> Nota: `PixPanel` recebe os dados do QR como props (vindos do `checkout-form`); o polling de status é compartilhado pelo `usePaymentStatus`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kronostore/web test`
Expected: FAIL — module `./pix-panel` not found.

- [ ] **Step 3: Write the component**

Create `apps/web/src/components/checkout/pix-panel.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { useState } from "react";

interface PixPanelProps {
  qrCodePngUrl: string;
  hostedInstructionsUrl: string;
  copyCode: string;
  onPaymentSuccess: () => void;
}

export function PixPanel({ qrCodePngUrl, hostedInstructionsUrl, copyCode, onPaymentSuccess }: PixPanelProps) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  async function handleCopy() {
    setCopying(true);
    await navigator.clipboard.writeText(copyCode);
    setCopied(true);
    setCopying(false);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground text-center">
        Escaneie o QR Code abaixo no app do seu banco para pagar com Pix.
      </p>
      {qrCodePngUrl && (
        <img
          src={qrCodePngUrl}
          alt="QR Code Pix"
          className="size-56 rounded-lg border"
        />
      )}
      <Button type="button" variant="outline" onClick={handleCopy} disabled={copying}>
        {copying ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
        {copied ? "Código copiado!" : "Copiar código Pix"}
      </Button>
      {hostedInstructionsUrl && (
        <a
          href={hostedInstructionsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary underline"
        >
          Ver instruções de pagamento
        </a>
      )}
    </div>
  );
}
```

> A integração com o polling acontece no `checkout-form` (Task 14): `usePaymentStatus(orderId, onPaymentSuccess)` é invocado lá e o `PixPanel` permanece puro.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kronostore/web test`
Expected: PASS — 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/checkout/pix-panel.tsx apps/web/src/components/checkout/pix-panel.spec.tsx
git commit -m "feat(checkout): add pix payment panel"
```

---

## Task 13: `BoletoPanel` + spec

**Files:**
- Create: `apps/web/src/components/checkout/boleto-panel.tsx`
- Test: `apps/web/src/components/checkout/boleto-panel.spec.tsx`

- [ ] **Step 1: Write the failing spec**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BoletoPanel } from "./boleto-panel";

describe("<BoletoPanel />", () => {
  it("renders the download link and instructions", () => {
    render(<BoletoPanel hostedVoucherUrl="https://stripe.test/boleto" pdfUrl="https://stripe.test/boleto.pdf" onPaymentSuccess={() => {}} />);

    expect(screen.getByRole("link", { name: /baixar boleto/i })).toHaveAttribute(
      "href",
      "https://stripe.test/boleto",
    );
    expect(screen.getByText(/pagar/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kronostore/web test`
Expected: FAIL — module `./boleto-panel` not found.

- [ ] **Step 3: Write the component**

Create `apps/web/src/components/checkout/boleto-panel.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface BoletoPanelProps {
  hostedVoucherUrl: string;
  onPaymentSuccess: () => void;
}

export function BoletoPanel({ hostedVoucherUrl, onPaymentSuccess }: BoletoPanelProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <FileText className="size-12 text-muted-foreground" />
      <p className="text-sm text-muted-foreground text-center">
        Seu boleto foi gerado. Pague dentro do prazo para confirmar o pedido. Você será
        redirecionado assim que o pagamento for confirmado.
      </p>
      <a href={hostedVoucherUrl} target="_blank" rel="noreferrer">
        <Button type="button">Baixar boleto</Button>
      </a>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kronostore/web test`
Expected: PASS — 1 test green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/checkout/boleto-panel.tsx apps/web/src/components/checkout/boleto-panel.spec.tsx
git commit -m "feat(checkout): add boleto payment panel"
```

---

## Task 14: Rework `checkout-form` (fluxo em 2 passos) + spec

**Files:**
- Modify: `apps/web/src/components/checkout/checkout-form.tsx`
- Modify: `apps/web/src/components/checkout/checkout-form.spec.tsx`

- [ ] **Step 1: Write the failing/updated spec**

Substitua `apps/web/src/components/checkout/checkout-form.spec.tsx` por:

```tsx
import { server } from "@/mocks/server";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { mockVariant } from "@/test/fixtures/cart";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutForm } from "./checkout-form";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} />
  ),
}));

function addItemToCart() {
  useCartStore.getState().addItem(mockVariant);
}

describe("<CheckoutForm />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.setState({ items: [] });
    useAuthStore.setState({ token: null, isAuthenticated: false, user: null });
    localStorage.clear();

    server.use(
      http.post(`${API_URL}/checkout`, () =>
        HttpResponse.json({ id: "order-1", status: "pending" }),
      ),
      http.post(`${API_URL}/checkout/payment-intent`, () =>
        HttpResponse.json({
          type: "pix",
          paymentIntentId: "pi_1",
          qrCodePngUrl: "https://stripe.test/qr.png",
          qrCodeSvgUrl: "https://stripe.test/qr.svg",
          qrCodeUrl: "000201pix",
          hostedInstructionsUrl: "https://stripe.test/instructions",
          expiresAt: null,
        }),
      ),
      http.get(`${API_URL}/orders/order-1`, () =>
        HttpResponse.json({ id: "order-1", status: "pending", payment: null }),
      ),
    );
  });

  it("should show empty cart message when cart is empty", () => {
    render(<CheckoutForm />);
    expect(screen.getByText(/carrinho está vazio/i)).toBeInTheDocument();
  });

  it("should submit checkout then render the pix panel for pix payments", async () => {
    const user = userEvent.setup();
    addItemToCart();
    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/nome do destinatário/i), "Maria Silva");
    await user.type(screen.getByLabelText(/rua/i), "Rua das Flores, 123");
    await user.type(screen.getByLabelText(/cidade/i), "São Paulo");
    await user.type(screen.getByLabelText(/estado/i), "SP");
    await user.type(screen.getByLabelText(/cep/i), "01234-567");
    await user.type(screen.getByLabelText(/tax id|cpf|cnpj/i), "000.000.000-00");

    await user.click(screen.getByRole("button", { name: /finalizar compra/i }));

    expect(await screen.findByAltText(/qr code pix/i)).toBeInTheDocument();
  });
});
```

> Nota: o teste de envio para `/checkout` com `{ address, paymentMethod }` cobre `taxId` implicitamente; para asserção explícita do corpo, adicione um `spy` no handler de `/checkout` semelhante ao teste HTTP antigo (verifique que `address.taxId` viaja).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kronostore/web test`
Expected: FAIL — novo fluxo ainda não implementado (o form navega direto para success sem painel).

- [ ] **Step 3: Rework the component**

Alterações em `apps/web/src/components/checkout/checkout-form.tsx`:

1. Import `api` já existe. Adicione `usePaymentStatus`, os três painéis, o tipo `PaymentIntentResponse` e estado novo:

```tsx
import { usePaymentStatus } from "@/hooks/use-payment-status";
import type { PaymentIntentResponse } from "@/types";
import { BoletoPanel } from "./boleto-panel";
import { CreditCardForm } from "./credit-card-form";
import { PixPanel } from "./pix-panel";
```

2. No corpo do componente, adicione estados:

```tsx
  const [step, setStep] = useState<"form" | "payment">("form");
  const [paymentStep, setPaymentStep] = useState<PaymentIntentResponse | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
```

3. Em `Address`, adicione `taxId: string` e o campo de input correspondente (no Card de endereço, após `zip`):

```tsx
              <div className="flex flex-col gap-2">
                <Label htmlFor="taxId">CPF/CNPJ</Label>
                <Input
                  id="taxId"
                  placeholder="000.000.000-00"
                  value={address.taxId}
                  onChange={(e) => handleAddressChange("taxId", e.target.value)}
                />
              </div>
```

4. Altere o final de `handleSubmit` (substitua o `clearCart(); router.push(...)` atual):

```tsx
      if (token) {
        await syncWithServer(token);
      }

      const order = await api.post<Order>("/checkout", {
        address: { ...address, country: "BR" },
        paymentMethod,
      });

      const paymentIntent = await api.post<PaymentIntentResponse>("/checkout/payment-intent", {
        orderId: order.id,
        taxId: address.taxId || undefined,
      });

      setOrderId(order.id);
      setPaymentStep(paymentIntent);
      setStep("payment");
      clearCart();
```

5. Adicione o bloco de renderização do passo de pagamento (no Card `Forma de Pagamento`, depois do `PaymentPicker` quando `step === "payment"`):

```tsx
            {step === "payment" && paymentStep && (
              <div className="mt-4">
                {paymentStep.type === "card" && paymentStep.clientSecret && (
                  <CreditCardForm
                    clientSecret={paymentStep.clientSecret}
                    onPaymentSuccess={() => orderId && router.push(`/checkout/success?orderId=${orderId}`)}
                    onCancel={() => setStep("form")}
                  />
                )}
                {paymentStep.type === "pix" &&
                  (() => {
                    const status = usePaymentStatus(orderId ?? "", () =>
                      orderId && router.push(`/checkout/success?orderId=${orderId}`),
                    );
                    return (
                      <PixPanel
                        qrCodePngUrl={paymentStep.qrCodePngUrl ?? ""}
                        hostedInstructionsUrl={paymentStep.hostedInstructionsUrl ?? ""}
                        copyCode={paymentStep.qrCodeUrl ?? ""}
                        onPaymentSuccess={() => orderId && router.push(`/checkout/success?orderId=${orderId}`)}
                      />
                    );
                  })()}
                {paymentStep.type === "boleto" && (
                  <BoletoPanel
                    hostedVoucherUrl={paymentStep.hostedVoucherUrl ?? ""}
                    onPaymentSuccess={() => orderId && router.push(`/checkout/success?orderId=${orderId}`)}
                  />
                )}
              </div>
            )}
```

> ⚠️ **Regra de hooks**: `usePaymentStatus` dentro de um IIFE viola regras de hooks (chamada condicional). Use o guard de estabilidade: **substitua o IIFE** chamando `usePaymentStatus` incondicionalmente no topo do componente com `orderId ?? ""`:

No topo do componente (após os `useState`):

```tsx
  const paymentStatus = usePaymentStatus(orderId ?? "", () => {
    if (orderId) router.push(`/checkout/success?orderId=${orderId}`);
  });
```

E, no render do PIX, use `paymentStatus === "paid" ? null : <PixPanel ... onPaymentSuccess={noop} />`. Para PIX/boleto o redirect já é tratado pelo hook `onPaid` (sem dupla navegação); remova `onPaymentSuccess` de `PixPanel`/`BoletoPanel` no JSX (mantenha o prop obrigatório só se o componente os requer — nesse caso passe `() => {}`).

> A regra `react-hooks` do ESLint vai quebrar com o IIFE; implemente a versão acima (hook no topo) — isso é obrigatório.

6. Desabilite a troca de método após o pedido criado (`PaymentPicker` recebe `onChange={() => {}}` quando `step === "payment"`) e ajuste o botão submit para não aparecer no passo payment (ou ficar desabilitado).

- [ ] **Step 4: Fix o hook placement e rode os testes**

Siga a nota de regra de hooks; depois:

Run: `pnpm --filter @kronostore/web test`
Expected: PASS — spec do checkout-form (pix panel render) verde.

- [ ] **Step 5: Lint + typecheck**

Run: `pnpm --filter @kronostore/web lint && pnpm --filter @kronostore/web typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/checkout/checkout-form.tsx apps/web/src/components/checkout/checkout-form.spec.tsx
git commit -m "feat(checkout): two-step checkout with stripe payment panels"
```

---

## Task 15: e2e `checkout-flow` para o fluxo Stripe

**Files:**
- Modify: `apps/web/tests/e2e/checkout-flow.spec.ts`

- [ ] **Step 1: Rewrite the webhook trigger step**

O teste antigo assinava `/webhooks/payment` com HMAC próprio. Troque para um evento Stripe assinado contra `/webhooks/stripe`:

```ts
import { expect, test } from "@playwright/test";
import Stripe from "stripe";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET not set");

test("complete checkout and confirm payment via stripe webhook", async ({ page, request }) => {
  // ... pré-requisitos: usuário logado, item no carrinho (manter o setup existente)

  // 1. Checkout via UI: preencher endereço (incluindo CPF), selecionar PIX, finalizar.
  // 2. Capturar orderId da URL (/checkout/success?orderId=...) OU do response da API.

  // 3. Buscar o payment do pedido (para usar metadata correto)
  const orderRes = await request.get(`${process.env.NEXT_PUBLIC_API_URL}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const order = await orderRes.json();
  const paymentId = order.payment.id;

  // 4. Construir e assinar um evento payment_intent.succeeded
  const event = {
    id: "evt_e2e_1",
    object: "event",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_e2e_1",
        object: "payment_intent",
        status: "succeeded",
        metadata: { orderId, paymentId },
      },
    },
  };
  const payload = JSON.stringify(event);
  const stripe = new Stripe("sk_test_e2e", { apiVersion: "2026-08-26.dahlia" });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });

  const res = await request.post(`${process.env.NEXT_PUBLIC_API_URL}/webhooks/stripe`, {
    headers: { "stripe-signature": signature },
    data: JSON.parse(payload),
  });
  expect(res.ok()).toBeTruthy();

  // 5. Conferir status paid (via API ou UI)
});
```

> Operação manual necessária em dev para o teste rodar: `stripe listen --forward-to http://localhost:3001/webhooks/stripe` com o `whsec` exportado como `STRIPE_WEBHOOK_SECRET` no ambiente do e2e.

- [ ] **Step 2: Run e2e**

Run: `pnpm --filter @kronostore/web test:e2e`
Expected: PASS com infra + CLI rodando (inclui as etapas que já dependiam de infra).

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/e2e/checkout-flow.spec.ts
git commit -m "test(e2e): stripe webhook flow in checkout"
```

---

## Task 16: Verificação final do monorepo

**Files:**
- Run (verificar tudo):
  - `pnpm --filter @kronostore/api typecheck`
  - `pnpm --filter @kronostore/api test`
  - `pnpm --filter @kronostore/web typecheck`
  - `pnpm --filter @kronostore/web lint`
  - `pnpm --filter @kronostore/web test`
  - `git status` para confirmar árvore limpa de mudanças não commitadas

- [ ] **Step 1: Run all verification**

Expected: tudo PASS (salvo specs de integração que exigem Postgres/Redis rodando — nesse caso rodar `pnpm infra:up` antes).

- [ ] **Step 2: Commit quaisquer ajustes de formatação**

```bash
pnpm biome check --write <arquivos-alterados>
git add -A
git commit -m "chore: formatting after stripe integration"
```

---

## Self-Review vs Spec

- Env vars Stripe → Task 1 ✓
- Porta `PaymentGateway` + adapter + singleton → Tasks 2-3 ✓
- `GeneratePaymentIntentUseCase` → Task 4 ✓
- `POST /checkout/payment-intent` + `taxId` + wiring → Task 5 ✓
- Webhook `payment_intent.succeeded/failed` como fonte da verdade → Tasks 6-8 ✓
- Remoção do webhook genérico (`webhookPaymentSchema`, middleware HMAC, spec antigo) → Tasks 7-8 ✓
- Frontend: loader, tipos, hook de polling, cartão/pix/boleto, checkout em 2 passos → Tasks 9-14 ✓
- e2e reescrito para Stripe → Task 15 ✓
- Verificação final → Task 16 ✓