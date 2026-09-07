# Design: Pagamentos Stripe — Cartão, PIX e Boleto

Data: 2026-09-06

## Contexto

O checkout atual seleciona "Cartão de Crédito" mas **não renderiza nenhum campo** — o `PaymentPicker` é apenas cosmético. Não existe integração com provedor de pagamento: o backend cria um pagamento `pending` com `externalId: null`, e o webhook genérico `/webhooks/payment` (HMAC próprio, `WEBHOOK_SECRET`) existe mas nunca é chamado por ninguém.

O projeto ganhou um **sandbox real do Stripe em test mode** e o **Stripe CLI instalado** (v1.42.11). Decisão: unificar **todos os métodos** (cartão, PIX, boleto) via Stripe PaymentIntent + webhook real, e **remover o webhook genérico** (Stripe vira o único provedor).

## Escopo

1. Remover webhook genérico `/webhooks/payment` (middleware HMAC próprio, schema `webhookPaymentSchema`, spec, e2e que o usava).
2. Integrar Stripe real (test mode) para cartão, PIX e boleto via PaymentIntent.
3. Webhook real `payment_intent.succeeded` / `payment_intent.payment_failed` como **fonte da verdade** do estado no backend.
4. Frontend: campos reais de cartão (Stripe Elements) + painéis PIX e boleto no checkout.

## Arquitetura

- Sandbox real Stripe test mode (`sk_test_...` / `pk_test_...`); **sem** stripe-mock.
- Stripe CLI encaminha eventos: `stripe listen --forward-to http://localhost:3001/webhooks/stripe` (API roda na porta 3001).
- Backend atualiza payment/order **somente via webhook** (padrão Stripe em produção).
- UX: frontend usa o resultado síncrono do `confirmCardPayment` (cartão) / polling de status (PIX/boleto); o webhook reconcilia e persiste.

## Fluxo (todas as formas)

```
1. Usuário preenche endereço (agora com taxId CPF/CNPJ) + seleciona método
2. POST /checkout → ordem criada (status pending) + payment (pending)
3. POST /checkout/payment-intent { orderId } → PaymentIntent criado na Stripe
   ├─ card   → retorna { clientSecret, paymentIntentId }
   ├─ pix    → confirm imediato server-side → retorna dados do QR
   └─ boleto → confirm imediato server-side → retorna URL do boleto
4. Frontend:
   ├─ card   → CardElement (iframe) → confirmCardPayment
   ├─ pix    → exibe QR + copiar código + instruções → polling /orders/:id
   └─ boleto → exibe download do PDF → polling /orders/:id
5. Stripe dispara webhook real → CLI encaminha → POST /webhooks/stripe
   ├─ payment_intent.succeeded      → payment "approved" + externalId + order "paid"
   └─ payment_intent.payment_failed → payment "rejected" + order "cancelled"
6. User navega para /checkout/success quando paid
```

O PaymentIntent carrega `metadata: { orderId, paymentId }` para o webhook mapear o evento ao pagamento local. Idempotência: pula se o payment já tiver `externalId` setado.

### Criação do PaymentIntent por método

- **Cartão**: `payment_method_types: ['card']`, sem confirm → retorna `clientSecret`.
- **PIX**: `payment_method_types: ['pix']`; confirm no servidor com `payment_method_data.billing_details` (name, email, tax_id) → do `next_action.display_pix` retorna `qrCodeSvgUrl`, `qrCodePngUrl`, `qrCodeUrl` (payload brutp), `hostedInstructionsUrl`, `expiresAt`.
- **Boleto**: `payment_method_types: ['boleto']`; `payment_method_options.boleto.expires_after_days: 3`; `billing_details` (name, email, tax_id — **obrigatório**) → do `next_action.boleto_display_details` retorna `hostedVoucherUrl`, `expiresAt`.

O `billing_details.email` usado = `request.user.email`. No test mode o Stripe simula o desfecho pelo sufixo do email:
- `succeed_immediately@...` → `payment_intent.succeeded` em segundos
- `{any}@...` → sucesso após ~3 min
- `expire_immediately@...` → `payment_intent.payment_failed` em segundos
- Tax id de teste: `000.000.000-00`

## Mudanças — Backend (`apps/api`)

| Arquivo | Ação |
|---|---|
| `src/env.ts` | Adicionar `STRIPE_SECRET_KEY` (`.startsWith("sk_test_")`), `STRIPE_PUBLISHABLE_KEY` (`.startsWith("pk_test_")`), `STRIPE_WEBHOOK_SECRET` (`.startsWith("whsec_")`), todos required |
| `package.json` | Adicionar `stripe` |
| `src/modules/payments/infra/stripe-client.ts` | `new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })` (singleton exportado) |
| `src/modules/payments/use-cases/generate-payment-intent.use-case.ts` (+ spec) | Recebe `{ orderId, userEmail, address }`; busca order+payment; cria PI conforme `payment.method`; retorna payload específico (clientSecret | pix | boleto) |
| `src/modules/orders/schemas/order.schema.ts` | `checkoutSchema.address` ganha `taxId`; **remover** `webhookPaymentSchema` |
| `src/modules/orders/routes/index.ts` | Nova rota `POST /checkout/payment-intent` (autenticada, body `{ orderId }`) que chama o use-case |
| `src/modules/webhooks/middleware/verify-stripe-signature.ts` | `stripe.webhooks.constructEvent(rawBody, stripe-signature, webhookSecret)`; falha → 400 |
| `src/modules/webhooks/routes/index.ts` | Rota `POST /webhooks/stripe` (preParsing `captureRawBody` + verifier) → handler `payment_intent.succeeded`/`payment_failed` idempotente |
| `src/app.ts` | Atualizar import/registro de webhooks |
| `src/modules/webhooks/middleware/verify-webhook-signature.ts` | Mover `captureRawBody` (mantido) em arquivo `capture-raw-body.ts`; remover `verifyWebhookSignature` |
| Remover | `verify-webhook-signature.ts`, `routes/index.spec.ts` (custom HMAC) |

## Mudanças — Frontend (`apps/web`)

| Arquivo | Ação |
|---|---|
| `package.json` | Adicionar `@stripe/stripe-js`, `@stripe/react-stripe-js` |
| `.env.example` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `src/lib/stripe.ts` | `loadStripe(pk)` singleton tipado |
| `src/components/checkout/credit-card-form.tsx` (+ spec) | `Elements` + `CardElement` + `confirmCardPayment(clientSecret, { payment_method: { card } })`; estados loading/erro/3DS; onPaymentSuccess callback |
| `src/components/checkout/pix-panel.tsx` (+ spec) | QR SVG/PNG + "copiar código" + link instruções + expiração; polling `/orders/:id` até `paid` |
| `src/components/checkout/boleto-panel.tsx` (+ spec) | Link "baixar boleto" (hostedVoucherUrl) + expiração; polling `/orders/:id` até `paid` |
| `src/components/checkout/checkout-form.tsx` (+ spec) | `Address` ganha `taxId`; após `POST /checkout`, chama `/checkout/payment-intent` e renderiza o painel do método selecionado; navega a `/checkout/success` quando pago |

### Polling

Como o webhook é a fonte da verdade e PIX/boleto são assíncronos, o frontend faz polling de `GET /orders/:id` (já existe) a cada ~2-3s até `order.status === "paid"` (ou erro). Cartão não depende de polling (síncrono + webhook reconcilia).

## Config / Operação

- `.env.example` (raiz/API) atualizados; `pnpm install`.
- `stripe listen --forward-to http://localhost:3001/webhooks/stripe` roda durante dev.
- ⚠️ O `whsec_...` impresso pelo `stripe listen` muda por sessão → atualizar `STRIPE_WEBHOOK_SECRET` ao reiniciar o listener.
- Test mode: cards `4242 4242 4242 4242` (sucesso) / `4000 0000 0000 0002` (recusada).

## Fora de escopo

- 3D Secure custom UI (Stripe Elements lida automaticamente via `requires_action`).
- Chargeback/refund/assinatura.
- Webhook de outros provedores (removido).
- MinIO/email: inalterados.

## Testes e verificação

- **API**: specs do `GeneratePaymentIntentUseCase` e do handler de webhook com `vi.mock("stripe")`; typecheck `stripe-*`; lint.
- **Web**: specs dos painéis/form com MSW em `/checkout/payment-intent` e `vi.mock` de `@stripe/stripe-js`; lint; typecheck.
- **e2e**: reescrito para o fluxo Stripe (depende do CLI + sandbox).
- TDD por feature; Conventional Commits por etapa (`feat(payments)`, `feat(checkout)`, `feat(web)`, `refactor(webhooks)` etc.).