# Design: Alta Prioridade — Admin Categorias, Cupom, Checkout Atômico, Env

Data: 2026-09-06

## Contexto

Todas as tasks do projeto (1-6) estão concluídas. Revisão do código identificou 5 itens de alta prioridade de funcionalidade/robustez, mais 1 bug latente descoberto na investigação.

## Escopo

1. Admin: corrigir listagem de categorias + adicionar página de edição
2. Cupom: endpoint público de validação + campo de cupom na UI
3. Checkout atômico: criar pagamento dentro da mesma transação do pedido
4. Variáveis de ambiente faltantes nos `.env.example`
5. Remover variável `_user` não usada em `checkout-form.tsx`

## (1) Admin Categorias — listagem + edição

### Bug latente
A página de listagem de categorias do admin (`apps/web/src/app/admin/categories/page.tsx`) chama `api.get("/admin/categories")`, mas a API só registra `POST/PATCH/DELETE /admin/categories...`. A rota `GET /admin/categories` **não existe** → a listagem retorna 404. Não há rota admin de busca por id (`GET /admin/categories/:id`).

### Mudanças

**API** (`apps/api/src/modules/categories/routes/index.ts`):
- Adicionar `GET /admin/categories` → `ListCategoriesUseCase`, `preHandler: [requireAdmin]`.
- Adicionar `GET /admin/categories/:id` → buscar via `CategoryRepository.findById` (adicionar método se necessário); retornar 404 se não existir.

**Web**:
- Nova página `apps/web/src/app/admin/categories/[id]/page.tsx`:
  - "use client", segue o padrão de `admin/categories/new` + `admin/products/[id]`.
  - Carrega a categoria via `GET /admin/categories/:id`, pré-preenche name/slug/description/imageUrl (via `getImageSrc`).
  - Submete `PATCH /admin/categories/:id` e redireciona para `/admin/categories`.
  - Guard de admin (redirect `/login`).
- `apps/web/src/app/admin/categories/page.tsx`: adicionar link "Editar" por linha (botão ghost com ícone Pencil/Link para `/admin/categories/[id]`).

## (2) Cupom — validação pública + campo na UI

Contexto: `ValidateCouponUseCase` e `validateCouponSchema` existem mas não há rota. O checkout lê `cart.couponId` do carrinho do servidor para aplicar desconto. `CartRepository` não expõe método para gravar cupom. A entidade `Cart` já tem `couponId: string | null`.

### API

**`apps/api/src/modules/coupons/routes/index.ts`** (rota pública):
- `POST /coupons/validate` (sem `requireAdmin`), body `validateCouponSchema` → `ValidateCouponUseCase.execute(code, orderCents)` → resposta `{ valid: true, discountCents }` ou `{ valid: false, error }`.

**`apps/api/src/modules/cart`**:
- Novo `use-cases/apply-coupon-to-cart.use-case.ts` (`ApplyCouponToCartUseCase`):
  - Busca/cria carrinho do usuário, valida o cupom via `ValidateCouponUseCase`; se inválido lança `DomainError` (ex. `InvalidCouponError`).
  - Chama `cartRepository.setCoupon(cartId, coupon.id)`.
- Novo `use-cases/clear-cart-coupon.use-case.ts` (`ClearCartCouponUseCase`): `setCoupon(cartId, null)`.
- `CartRepository`: adicionar `setCoupon(cartId: string, couponId: string | null): Promise<void>`. Implementar em `in-memory-cart-repository.ts` e `drizzle-cart-repository.ts` (drizzle: `UPDATE carts SET coupon_id = $1 WHERE id = $2`).
- Rotas `apps/api/src/modules/cart/routes/index.ts`:
  - `POST /cart/coupon` body `{ code }` (`applyCouponSchema` já existe) → `ApplyCouponToCartUseCase`, retorna `204`. (O `discountCents` para exibição vem do `POST /coupons/validate`, chamado antes pelo frontend — persistência não precisa recalcular desconto.)
  - `DELETE /cart/coupon` → `ClearCartCouponUseCase`, `204`.

### Web

**`apps/web/src/stores/cart-store.ts`**:
- Novo estado `coupon: { code: string; discountCents: number } | null` (persistido via zustand persist).
- Actions: `applyCoupon(code)` (POST validate; se válido, POST `/cart/coupon` para persistir no servidor e seta estado) e `removeCoupon()` (DELETE `/cart/coupon` e limpa estado).

**Página do carrinho** (`apps/web/src/app/cart/page.tsx`):
- Input de código + botão "Aplicar".
- Feedback de erro (cupom inválido/expirado/sem valor mínimo) e de sucesso.
- Resumo: linha "Desconto" e total = subtotal − `discountCents`.

**`checkout-form.tsx`**: incluir a linha de desconto no resumo, usando `coupon` do store (valor autoritativo ainda é o servidor no checkout).

## (3) Checkout atômico — pagamento na mesma transação

Contexto: hoje o frontend chama `POST /checkout` (cria pedido, confirma estoque, limpa carrinho) e depois `POST /payments`. Se o pagamento falhar, fica pedido órfão sem pagamento. O `amountCents` enviado é o total do frontend, que ignora o desconto do cupom aplicado no servidor.

### API

**`apps/api/src/modules/orders/use-cases/checkout.use-case.ts`**:
- `CheckoutInput` ganha `paymentMethod: "pix" | "credit_card" | "boleto"`.
- Construtor ganha `PaymentRepository`.
- Dentro da transação, após criar pedido + itens + confirmar estoque + calcular `discountCents`:
  - `amountCents = subtotal - discountCents` (calculado a partir dos itens reais do pedido).
  - `paymentRepository.create({ orderId: created.id, method, amountCents })`.
  - O use-case retorna `{ order, payment }` (muda o tipo de retorno de `Promise<Order>` para `Promise<{ order: Order; payment: Payment }>`).
- Se qualquer passo falhar, a transação inteira reverte (stock, cart, order, payment) graças ao `withTransaction`/AsyncLocalStorage.

**`apps/api/src/modules/orders/routes/index.ts`**:
- `checkoutSchema` passa a aceitar `paymentMethod` (`z.enum(["pix","credit_card","boleto"])`) no body.
- Instanciar `CheckoutUseCase` com `paymentRepository` (o factory já recebe `paymentRepository` hoje).
- Responder `reply.code(201).send({ ...order, payment })`.

**`apps/api/src/modules/orders/schemas/order.schema.ts`**: incluir `paymentMethod` no `checkoutSchema`.

### Web

**`apps/web/src/components/checkout/checkout-form.tsx`**:
- Substituir as duas chamadas (`/checkout` + `/payments`) por **uma única** `POST /checkout` com `{ address, paymentMethod }`.
- `clearCart()` apenas após sucesso.
- Remover o `_user` não usado (item 5) nesta mesma edição.

### Comportamento
- Pedido e pagamento nascem juntos (status do pagamento `pending`). Webhooks continuam atualizando o status do pagamento independentemente.

## (4) Variáveis de ambiente

- Raiz `.env.example`: adicionar `WEBHOOK_SECRET=change-me-in-production` (usado na verificação HMAC dos webhooks).
- Criar `apps/web/.env.example` com `NEXT_PUBLIC_API_URL=http://localhost:3001` (hoje há só `.env.local`, sem exemplo; o `API_URL` já tem fallback `http://localhost:3001`).

## (5) Limpeza

- Remover `const _user = useAuthStore((s) => s.user)` de `checkout-form.tsx` (linha 28).

## Decisões e trade-offs

- **Checkout atômico**: escolhido criar pagamento dentro do checkout (transação única). O endpoint `/payments` mantém-se para re-tentativas/webhooks. Alternativas descartadas: (a) retry com pedido órfão — não resolve o problema; (b) cancelamento compensatório — mais frágil.
- **Cupom**: o desconto autoritativo é calculado no servidor (checkout usa `cart.couponId`). O frontend usa o `discountCents` da validação apenas para exibição. O valor do pagamento passa a vir do servidor (corrige o mismatch atual).
- **Categorias**: rota admin `GET` adicionada em vez de reutilizar a pública para manter a semântica admin e permitir campos extras futuros.

## Testes

- API:
  - `apply-coupon-to-cart.use-case.spec.ts` (novo): valida ok, cupom inválido/inativo/expirado, minOrder, carrinho novo vs existente.
  - `clear-cart-coupon.use-case.spec.ts` (novo).
  - `checkout.use-case.spec.ts`/`.integration.spec.ts`: atualizar para novo input (`paymentMethod`) e verificar criação de pagamento na transação, amount com desconto, rollback em falha.
  - `checkout-form.spec.tsx` (web): atualizar para 1 chamada `POST /checkout` com paymentMethod.
  - Testes do carrinho (web): campo/componente de cupom.
- Manter suíte verde: `pnpm --filter @kronostore/api test`, `pnpm --filter @kronostore/web test`, typechecks.

## Fora de escopo

- Toast/notificações, delete de produto, edição de cupom, i18n, testes de páginas admin inteiras — itens de prioridade média/baixa já catalogados separadamente.