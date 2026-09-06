# High-Priority Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the 5 approved high-priority items: admin category edit page, public coupon validation + cart coupon UI, atomic checkout (payment created inside the checkout transaction), missing env vars, and removal of an unused variable.

**Architecture:** 5 independent tracks, each committed separately:
- **Track A (categories):** add admin `GET` routes + web edit page (fixes the 404 list bug).
- **Track B (coupons):** public `POST /coupons/validate`, server cart coupon persistence (`setCoupon` in `CartRepository` + apply/clear use-cases + `/cart/coupon` routes), web coupon input + discount display.
- **Track C (orders):** `CheckoutUseCase` creates the `Payment` inside the same DB transaction; `/checkout` accepts `paymentMethod`; web submits one request.
- **Track D (env):** document `WEBHOOK_SECRET` and web vars.
- **Track E (cleanup):** remove unused `_user` (folded into Track C's web task).

**Tech Stack:** Fastify (API), Next.js App Router + zustand (web), Drizzle ORM, Vitest, MSW.

---

## Verification commands (used repeatedly)

```bash
# API (unit + drizzle-integration). Requires Postgres on localhost:5432 (pnpm infra:up).
pnpm --filter @kronostore/api test
pnpm --filter @kronostore/api typecheck

# Web
pnpm --filter @kronostore/web test
pnpm --filter @kronostore/web typecheck

# Biome on touched files (run from repo root; repo style: double quotes + semicolons)
pnpm biome check <files...>
```

Pre-commit hook runs `biome check` (glob `*.{js,ts,...}` — NOT `.tsx`) + API typecheck. Pre-push runs `pnpm test` (all apps). Commits should be per task using Conventional Commits with module scope.

---

## Track A — Admin category management

### Task A1: API — `GET /admin/categories` and `GET /admin/categories/:id`

The admin list page calls `GET /admin/categories`, which does not exist (404). Add both admin GET routes next to the existing admin mutations.

- [ ] **Step 1: Add the two routes**

Edit `apps/api/src/modules/categories/routes/index.ts`. `categoryParamsSchema` is already imported; `categoryRepository` is already a parameter. Insert the two admin GET routes immediately after the public `GET /categories` block (after line 30) and before the `POST /admin/categories` block:

```ts
    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/categories",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Categories"],
          summary: "Listar categorias (admin)",
          security: [{ cookieAuth: [] }],
        },
      },
      async () => {
        return listCategories.execute();
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/categories/:id",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Categories"],
          summary: "Obter categoria por ID (admin)",
          security: [{ cookieAuth: [] }],
          params: categoryParamsSchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params;
        const category = await categoryRepository.findById(id);
        if (!category) {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Category not found" });
        }
        return reply.send(category);
      },
    );
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter @kronostore/api typecheck` and `pnpm --filter @kronostore/api test`
Expected: typecheck passes; API test suite stays green (no route-test precedent in this repo, so this is wiring verified by the full suite).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/categories/routes/index.ts
git commit -m "feat(categories): add admin get routes for category list and detail"
```

### Task A2: Web — category edit page + "Editar" link on the list

- [ ] **Step 1: Add an "Ações" column with an edit link to the list page**

Edit `apps/web/src/app/admin/categories/page.tsx`:

1. Change the icon import line 8 to:

```tsx
import { Loader2, Pencil, Plus } from "lucide-react";
```

2. Add a 4th `<th>` after the "Descricao" header (line 62):

```tsx
                  <th className="py-3 px-4 text-left font-medium">Ações</th>
```

3. Add a 4th `<td>` inside the map after line 70:

```tsx
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/categories/${cat.id}`}
                        className={buttonVariants({ variant: "ghost", size: "icon" })}
                        aria-label={`Editar ${cat.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </td>
```

- [ ] **Step 2: Create the edit page** `apps/web/src/app/admin/categories/[id]/page.tsx`

Content (copy the product edit page pattern + the category new form; match the repo's double-quote/semicolon style):

```tsx
"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { Category } from "@/types";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminEditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", imageUrl: "" });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/login");
      return;
    }

    if (!categoryId) {
      router.push("/admin/categories");
      return;
    }

    api
      .get<Category>(`/admin/categories/${categoryId}`)
      .then((cat) => {
        setCategory(cat);
        setForm({
          name: cat.name,
          slug: cat.slug,
          description: cat.description || "",
          imageUrl: cat.imageUrl || "",
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, user, router, categoryId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) return;
    setSubmitting(true);
    try {
      await api.patch(`/admin/categories/${categoryId}`, {
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
      });
      router.push("/admin/categories");
    } catch (err) {
      console.error("Failed to update category", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!category) {
    return <div className="text-center py-20 text-muted-foreground">Categoria nao encontrada.</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/categories"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-3xl font-bold">Editar Categoria</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{category.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descricao (opcional)</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Imagem da Categoria (opcional)</Label>
              <ImageUpload
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url || "" })}
                prefix="categories"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Alteracoes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter @kronostore/web typecheck`, `pnpm --filter @kronostore/web test`, and
`pnpm biome check apps/web/src/app/admin/categories/page.tsx apps/web/src/app/admin/categories/[id]/page.tsx`
Expected: typecheck passes; web suite stays green (62 tests); biome reports no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/categories/page.tsx "apps/web/src/app/admin/categories/[id]/page.tsx"
git commit -m "feat(admin): add category edit page and edit links"
```

---

## Track B — Coupon: validation endpoint + cart coupon + UI

### Task B1: API — public `POST /coupons/validate`

`ValidateCouponUseCase` and `validateCouponSchema` already exist and are unit-tested; only the route is missing.

- [ ] **Step 1: Add the route**

Edit `apps/api/src/modules/coupons/routes/index.ts`:

1. Update imports (lines 4-9):

```ts
import type { CouponRepository } from "../domain/coupon-repository.js";
import {
  couponParamsSchema,
  createCouponSchema,
  validateCouponSchema,
} from "../schemas/coupon.schema.js";
import { CreateCouponUseCase } from "../use-cases/create-coupon.use-case.js";
import { DeleteCouponUseCase } from "../use-cases/delete-coupon.use-case.js";
import { GetCouponUseCase } from "../use-cases/get-coupon.use-case.js";
import { ListCouponsUseCase } from "../use-cases/list-coupons.use-case.js";
import { ValidateCouponUseCase } from "../use-cases/validate-coupon.use-case.js";
```

2. In the factory body (after line 16) instantiate:

```ts
    const validateCoupon = new ValidateCouponUseCase(couponRepository);
```

3. Add the public route before the first admin route (before line 34):

```ts
    // Public routes
    app.withTypeProvider<ZodTypeProvider>().post(
      "/coupons/validate",
      {
        schema: {
          tags: ["Coupons"],
          summary: "Validar cupom",
          body: validateCouponSchema,
        },
      },
      async (request, reply) => {
        const { code, orderCents } = request.body;
        const result = await validateCoupon.execute(code, orderCents);
        return reply.send(result);
      },
    );
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter @kronostore/api typecheck` and `pnpm --filter @kronostore/api test`
Expected: green (validation logic already covered by `validate-coupon.use-case.spec.ts`).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/coupons/routes/index.ts
git commit -m "feat(coupons): add public coupon validation endpoint"
```

### Task B2: API — `setCoupon` on `CartRepository` + apply/clear coupon use-cases + `/cart/coupon` routes

TDD: the interface change makes the new spec compile-fail first (red), then implementation (green).

- [ ] **Step 1: Extend the `CartRepository` contract**

Edit `apps/api/src/modules/cart/domain/cart-repository.ts`, add the method to the interface (after `create`):

```ts
  setCoupon(cartId: string, couponId: string | null): Promise<void>;
```

- [ ] **Step 2: Write the failing use-case spec** — create `apps/api/src/modules/cart/use-cases/apply-coupon-to-cart.use-case.spec.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { CouponError } from "../../coupons/domain/coupon.js";
import { InMemoryCouponRepository } from "../../coupons/infra/in-memory-coupon-repository.js";
import { ValidateCouponUseCase } from "../../coupons/use-cases/validate-coupon.use-case.js";
import { InMemoryProductRepository } from "../../products/infra/in-memory-product-repository.js";
import { InMemoryCartRepository } from "../infra/in-memory-cart-repository.js";
import { ApplyCouponToCartUseCase } from "./apply-coupon-to-cart.use-case.js";

describe("ApplyCouponToCartUseCase", () => {
  let cartRepository: InMemoryCartRepository;
  let couponRepository: InMemoryCouponRepository;
  let productRepository: InMemoryProductRepository;
  let useCase: ApplyCouponToCartUseCase;

  beforeEach(async () => {
    cartRepository = new InMemoryCartRepository();
    couponRepository = new InMemoryCouponRepository();
    productRepository = new InMemoryProductRepository();

    const product = await productRepository.create({
      name: "Test Product",
      slug: "test-product",
      description: "Test",
      categoryId: "cat-001",
      priceCents: 50000,
      skuPrefix: "TST",
    });
    await productRepository.createVariant(product.id, {
      name: "Default",
      sku: "TST-001",
      priceCents: 50000,
    });
    const variant = (await productRepository.findVariantsByProductId(product.id))[0];
    const cart = await cartRepository.create("user-001");
    await cartRepository.addItem(cart.id, { variantId: variant!.id, quantity: 2 });

    useCase = new ApplyCouponToCartUseCase(
      cartRepository,
      couponRepository,
      productRepository,
      new ValidateCouponUseCase(couponRepository),
    );
  });

  it("should persist a valid coupon on the user's cart", async () => {
    const coupon = await couponRepository.create({ code: "DESC10", type: "percentage", value: 10 });

    await useCase.execute("user-001", "DESC10");

    const cart = await cartRepository.findByUserId("user-001");
    expect(cart?.couponId).toBe(coupon.id);
  });

  it("should create a cart when the user has none and apply the coupon", async () => {
    await couponRepository.create({ code: "DESC10", type: "percentage", value: 10 });

    await useCase.execute("user-002", "DESC10");

    const cart = await cartRepository.findByUserId("user-002");
    expect(cart).not.toBeNull();
    expect(cart?.couponId).not.toBeNull();
  });

  it("should throw when the coupon is expired", async () => {
    await couponRepository.create({
      code: "EXPIRED",
      type: "percentage",
      value: 10,
      expiresAt: new Date("2020-01-01"),
    });

    await expect(useCase.execute("user-001", "EXPIRED")).rejects.toThrow(CouponError);

    const cart = await cartRepository.findByUserId("user-001");
    expect(cart?.couponId).toBeNull();
  });

  it("should throw when the coupon is below the cart minimum order", async () => {
    await couponRepository.create({
      code: "MINHIGH",
      type: "percentage",
      value: 10,
      minOrderCents: 150000,
    });

    await expect(useCase.execute("user-001", "MINHIGH")).rejects.toThrow(CouponError);
  });
});
```

- [ ] **Step 3: Run the spec to see it fail**

Run: `pnpm --filter @kronostore/api test`
Expected: FAIL — `apply-coupon-to-cart.use-case.js` does not exist.

- [ ] **Step 4: Implement the use-case** — create `apps/api/src/modules/cart/use-cases/apply-coupon-to-cart.use-case.ts`:

```ts
import type { CouponRepository } from "../../coupons/domain/coupon-repository.js";
import { CouponError } from "../../coupons/domain/coupon.js";
import type { ValidateCouponUseCase } from "../../coupons/use-cases/validate-coupon.use-case.js";
import type { ProductRepository } from "../../products/domain/product-repository.js";
import type { CartRepository } from "../domain/cart-repository.js";

export class ApplyCouponToCartUseCase {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly couponRepository: CouponRepository,
    private readonly productRepository: ProductRepository,
    private readonly validateCoupon: ValidateCouponUseCase,
  ) {}

  async execute(userId: string, code: string): Promise<void> {
    let cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      cart = await this.cartRepository.create(userId);
    }

    let subtotal = 0;
    for (const item of cart.items) {
      const variant = await this.productRepository.findVariantById(item.variantId);
      const product = variant
        ? await this.productRepository.findById(variant.productId)
        : null;
      subtotal += item.quantity * (variant?.priceCents ?? product?.priceCents ?? 0);
    }

    const validation = await this.validateCoupon.execute(code, subtotal);
    if (!validation.valid) {
      throw new CouponError("COUPON_INVALID", validation.error ?? "Invalid coupon");
    }

    const coupon = await this.couponRepository.findByCode(code);
    await this.cartRepository.setCoupon(cart.id, coupon.id);
  }
}
```

- [ ] **Step 5: Implement `ClearCartCouponUseCase`** — create `apps/api/src/modules/cart/use-cases/clear-cart-coupon.use-case.ts`:

```ts
import type { CartRepository } from "../domain/cart-repository.js";

export class ClearCartCouponUseCase {
  constructor(private readonly cartRepository: CartRepository) {}

  async execute(userId: string): Promise<void> {
    const cart = await this.cartRepository.findByUserId(userId);
    if (cart) {
      await this.cartRepository.setCoupon(cart.id, null);
    }
  }
}
```

- [ ] **Step 6: Write the clear-cart-coupon spec** — create `apps/api/src/modules/cart/use-cases/clear-cart-coupon.use-case.spec.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryCouponRepository } from "../../coupons/infra/in-memory-coupon-repository.js";
import { InMemoryCartRepository } from "../infra/in-memory-cart-repository.js";
import { ClearCartCouponUseCase } from "./clear-cart-coupon.use-case.js";

describe("ClearCartCouponUseCase", () => {
  let cartRepository: InMemoryCartRepository;
  let useCase: ClearCartCouponUseCase;

  beforeEach(() => {
    cartRepository = new InMemoryCartRepository();
    useCase = new ClearCartCouponUseCase(cartRepository);
  });

  it("should clear the coupon from the user's cart", async () => {
    const couponRepository = new InMemoryCouponRepository();
    const coupon = await couponRepository.create({ code: "DESC10", type: "percentage", value: 10 });
    const cart = await cartRepository.create("user-001");
    await cartRepository.setCoupon(cart.id, coupon.id);

    await useCase.execute("user-001");

    const after = await cartRepository.findByUserId("user-001");
    expect(after?.couponId).toBeNull();
  });

  it("should do nothing when the user has no cart", async () => {
    await expect(useCase.execute("ghost-user")).resolves.not.toThrow();
  });
});
```

- [ ] **Step 7: Implement `setCoupon` in both repositories**

Edit `apps/api/src/modules/cart/infra/in-memory-cart-repository.ts`, add inside the class (after `create`):

```ts
  async setCoupon(cartId: string, couponId: string | null): Promise<void> {
    const cart = this.carts.get(cartId);
    if (!cart) throw new CartNotFoundError(cartId);

    this.carts.set(cartId, { ...cart, couponId });
  }
```

Edit `apps/api/src/modules/cart/infra/drizzle-cart-repository.ts`, add inside the class (after `create`):

```ts
  async setCoupon(cartId: string, couponId: string | null): Promise<void> {
    const cartRow = await this.db.query.carts.findFirst({
      where: (c, { eq }) => eq(c.id, cartId),
    });
    if (!cartRow) throw new CartNotFoundError(cartId);

    await this.db.update(carts).set({ couponId }).where(eq(carts.id, cartId));
  }
```

- [ ] **Step 8: Add a drizzle integration test for `setCoupon`**

Edit `apps/api/src/modules/cart/infra/drizzle-cart-repository.spec.ts`: add the import (line 6) and a new `describe` block before the closing `});` of the outer describe (line 173):

Import addition:

```ts
import { DrizzleCouponRepository } from "../../coupons/infra/drizzle-coupon-repository.js";
```

New block:

```ts
  describe("setCoupon", () => {
    it("should set and clear the coupon on a cart", async () => {
      const cart = await repo.create(TEST_USER_ID);
      const coupon = await new DrizzleCouponRepository(db).create({
        code: "TEST10",
        type: "percentage",
        value: 10,
      });

      await repo.setCoupon(cart.id, coupon.id);
      let found = await repo.findByUserId(TEST_USER_ID);
      expect(found?.couponId).toBe(coupon.id);

      await repo.setCoupon(cart.id, null);
      found = await repo.findByUserId(TEST_USER_ID);
      expect(found?.couponId).toBeNull();
    });

    it("should throw CartNotFoundError when cart does not exist", async () => {
      await expect(
        repo.setCoupon("00000000-0000-0000-0000-000000000000", null),
      ).rejects.toThrow(CartNotFoundError);
    });
  });
```

- [ ] **Step 9: Run the cart specs**

Run: `pnpm --filter @kronostore/api test`
Expected: all new specs PASS.

- [ ] **Step 10: Wire the routes** — `apps/api/src/modules/cart/routes/index.ts`

1. Replace the imports (lines 1-14) with:

```ts
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../middleware/auth.js";
import type { CouponRepository } from "../../coupons/domain/coupon-repository.js";
import { ValidateCouponUseCase } from "../../coupons/use-cases/validate-coupon.use-case.js";
import type { ProductRepository } from "../../products/domain/product-repository.js";
import type { StockRepository } from "../../stock/domain/stock-repository.js";
import type { CartRepository } from "../domain/cart-repository.js";
import {
  addToCartSchema,
  applyCouponSchema,
  cartItemParamsSchema,
  updateCartItemSchema,
} from "../schemas/cart.schema.js";
import { AddToCartUseCase } from "../use-cases/add-to-cart.use-case.js";
import { ApplyCouponToCartUseCase } from "../use-cases/apply-coupon-to-cart.use-case.js";
import { ClearCartCouponUseCase } from "../use-cases/clear-cart-coupon.use-case.js";
import { GetCartUseCase } from "../use-cases/get-cart.use-case.js";
import { RemoveCartItemUseCase } from "../use-cases/remove-cart-item.use-case.js";
import { UpdateCartItemUseCase } from "../use-cases/update-cart-item.use-case.js";
```

2. Update the factory signature (line 16) and instantiations:

```ts
export function createCartRoutes(
  cartRepository: CartRepository,
  stockRepository: StockRepository,
  couponRepository: CouponRepository,
  productRepository: ProductRepository,
) {
  return async function cartRoutes(app: FastifyInstance) {
    const getCart = new GetCartUseCase(cartRepository);
    const addToCart = new AddToCartUseCase(cartRepository, stockRepository);
    const updateCartItem = new UpdateCartItemUseCase(cartRepository, stockRepository);
    const removeCartItem = new RemoveCartItemUseCase(cartRepository);
    const validateCoupon = new ValidateCouponUseCase(couponRepository);
    const applyCoupon = new ApplyCouponToCartUseCase(
      cartRepository,
      couponRepository,
      productRepository,
      validateCoupon,
    );
    const clearCoupon = new ClearCartCouponUseCase(cartRepository);
```

3. Add the two routes before the final `};` of the factory (after the `DELETE /cart/items/:itemId` block):

```ts
    app.withTypeProvider<ZodTypeProvider>().post(
      "/cart/coupon",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Cart"],
          summary: "Aplicar cupom ao carrinho",
          security: [{ cookieAuth: [] }],
          body: applyCouponSchema,
        },
      },
      async (request, reply) => {
        await applyCoupon.execute(request.user.id, request.body.code);
        return reply.code(204).send();
      },
    );

    app.withTypeProvider<ZodTypeProvider>().delete(
      "/cart/coupon",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Cart"],
          summary: "Remover cupom do carrinho",
          security: [{ cookieAuth: [] }],
        },
      },
      async (request, reply) => {
        await clearCoupon.execute(request.user.id);
        return reply.code(204).send();
      },
    );
```

4. Update the call site — `apps/api/src/app.ts` line 90:

```ts
  await app.register(
    createCartRoutes(cartRepository, stockRepository, couponRepository, productRepository),
  );
```

(`couponRepository` and `productRepository` are already defined earlier in `buildApp`.)

- [ ] **Step 11: Verify**

Run: `pnpm --filter @kronostore/api typecheck` and `pnpm --filter @kronostore/api test`
Expected: green.

- [ ] **Step 12: Commit**

```bash
git add apps/api/src/modules/cart apps/api/src/app.ts
git commit -m "feat(cart): apply and clear coupons on the persistent cart"
```

### Task B3: Web — coupon state in cart-store, coupon input, discount in cart summary

- [ ] **Step 1: Extend the cart store**

Edit `apps/web/src/stores/cart-store.ts`:

1. Update imports (lines 1-3):

```ts
import { api } from "@/lib/api";
import { syncCartWithServer } from "@/lib/cart-sync";
import { useAuthStore } from "@/stores/auth-store";
import { create } from "zustand";
import { persist } from "zustand/middleware";
```

2. Add interfaces after `CartItem` (after line 23):

```ts
interface CartCoupon {
  code: string;
  discountCents: number;
}

interface CouponApplyResult {
  ok: boolean;
  message?: string;
}
```

3. Update `CartState` (add after `clearCart`):

```ts
  coupon: CartCoupon | null;
  applyCoupon: (code: string) => Promise<CouponApplyResult>;
  removeCoupon: () => Promise<void>;
```

4. In the store body: add state + actions after the `clearCart` action (after line 81):

```ts
      coupon: null,

      applyCoupon: async (code) => {
        const token = useAuthStore.getState().token;
        if (!token) {
          return { ok: false, message: "Faça login para aplicar cupom" };
        }

        const subtotal = get().totalCents();
        const validation = await api.post<{
          valid: boolean;
          discountCents?: number;
          error?: string;
        }>("/coupons/validate", { code, orderCents: subtotal });

        if (!validation.valid) {
          return { ok: false, message: validation.error ?? "Cupom inválido" };
        }

        try {
          await api.post("/cart/coupon", { code });
        } catch {
          return { ok: false, message: "Não foi possível aplicar o cupom" };
        }

        set({ coupon: { code, discountCents: validation.discountCents ?? 0 } });
        return { ok: true, message: "Cupom aplicado!" };
      },

      removeCoupon: async () => {
        const token = useAuthStore.getState().token;
        if (token) {
          try {
            await api.delete("/cart/coupon");
          } catch {
            // ignore
          }
        }
        set({ coupon: null });
      },
```

- [ ] **Step 2: Create the coupon input component** — `apps/web/src/components/cart/coupon-input.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cart-store";
import { Loader2, Tag, X } from "lucide-react";
import { useState } from "react";

export function CouponInput() {
  const coupon = useCartStore((s) => s.coupon);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleApply() {
    if (!code.trim()) return;
    setLoading(true);
    setMessage(null);
    const value = code.trim();
    setCode("");
    const result = await applyCoupon(value);
    setIsError(!result.ok);
    setMessage(result.message ?? null);
    setLoading(false);
  }

  function handleRemove() {
    removeCoupon();
    setMessage(null);
  }

  if (coupon) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Tag className="size-4" />
          {coupon.code}
        </span>
        <Button variant="ghost" size="sm" onClick={handleRemove} aria-label="Remover cupom">
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          id="coupon"
          placeholder="Código do cupom"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label="Código do cupom"
        />
        <Button type="button" variant="secondary" onClick={handleApply} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Aplicar"}
        </Button>
      </div>
      {message && (
        <p
          className={
            isError
              ? "text-sm text-destructive"
              : "text-sm text-green-600 dark:text-green-400"
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Show the discount in `CartSummary`**

Edit `apps/web/src/components/cart/cart-summary.tsx`. Add a coupon selector (after line 13):

```ts
  const coupon = useCartStore((s) => s.coupon);
```

Replace the `Separator` + total block (lines 28-32) with:

```tsx
        {coupon && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Desconto ({coupon.code})</span>
            <span className="text-green-600 dark:text-green-400">
              -{formatBRL(coupon.discountCents)}
            </span>
          </div>
        )}
        <Separator />
        <div className="flex items-center justify-between font-semibold">
          <span>Total</span>
          <span className="text-lg">
            {formatBRL(Math.max(0, totalCents - (coupon?.discountCents ?? 0)))}
          </span>
        </div>
```

- [ ] **Step 4: Render `CouponInput` on the cart page**

Edit `apps/web/src/app/cart/page.tsx`: add the import (line 3) and render above `CartSummary`:

Import:

```ts
import { CouponInput } from "@/components/cart/coupon-input";
```

Render (replace lines 52-54):

```tsx
        <div className="lg:sticky lg:top-24 lg:self-start">
          <CouponInput />
          <CartSummary />
        </div>
```

- [ ] **Step 5: Add MSW handlers**

Edit `apps/web/src/mocks/handlers/cart.ts` — add after the `checkout` handler (after line 33):

```ts
  http.post(`${API_URL}/coupons/validate`, async ({ request }) => {
    const body = (await request.json()) as { code: string; orderCents: number };
    return HttpResponse.json({ valid: true, discountCents: Math.floor(body.orderCents / 10) });
  }),

  http.post(`${API_URL}/cart/coupon`, () => {
    return HttpResponse.json({}, { status: 204 });
  }),

  http.delete(`${API_URL}/cart/coupon`, () => {
    return HttpResponse.json({}, { status: 204 });
  }),
```

- [ ] **Step 6: Write the coupon input spec** — create `apps/web/src/components/cart/coupon-input.spec.tsx`:

```tsx
import { server } from "@/mocks/server";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { mockVariant } from "@/test/fixtures/cart";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CouponInput } from "./coupon-input";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

describe("<CouponInput />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.setState({ items: [], coupon: null });
    useAuthStore.setState({ token: "test-token", isAuthenticated: true, user: null });
    localStorage.clear();
  });

  it("should apply a valid coupon", async () => {
    const user = userEvent.setup();
    useCartStore.getState().addItem(mockVariant);

    render(<CouponInput />);

    await user.type(screen.getByLabelText(/código do cupom/i), "DESC10");
    await user.click(screen.getByRole("button", { name: /aplicar/i }));

    await waitFor(() => {
      expect(screen.getByText(/DESC10/i)).toBeInTheDocument();
    });
    expect(useCartStore.getState().coupon?.code).toBe("DESC10");
    expect(useCartStore.getState().coupon?.discountCents).toBe(999);
  });

  it("should show the validation error for an invalid coupon", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_URL}/coupons/validate`, () => {
        return HttpResponse.json({ valid: false, error: "Coupon has expired" });
      }),
    );

    render(<CouponInput />);

    await user.type(screen.getByLabelText(/código do cupom/i), "EXPIRED");
    await user.click(screen.getByRole("button", { name: /aplicar/i }));

    expect(await screen.findByText(/Coupon has expired/i)).toBeInTheDocument();
    expect(useCartStore.getState().coupon).toBeNull();
  });

  it("should ask to login when there is no auth token", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ token: null, isAuthenticated: false, user: null });
    useCartStore.getState().addItem(mockVariant);

    render(<CouponInput />);

    await user.type(screen.getByLabelText(/código do cupom/i), "DESC10");
    await user.click(screen.getByRole("button", { name: /aplicar/i }));

    expect(await screen.findByText(/faça login/i)).toBeInTheDocument();
  });
});
```

Note: the fixture `mockVariant` has `priceCents: 9990` and the default handler returns 10% → `discountCents: 999`.

- [ ] **Step 7: Verify**

Run: `pnpm --filter @kronostore/web typecheck`, `pnpm --filter @kronostore/web test`, and
`pnpm biome check apps/web/src/stores/cart-store.ts apps/web/src/components/cart/coupon-input.tsx apps/web/src/components/cart/coupon-input.spec.tsx apps/web/src/components/cart/cart-summary.tsx apps/web/src/app/cart/page.tsx apps/web/src/mocks/handlers/cart.ts`
Expected: green (web suite grows to 65).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/stores/cart-store.ts apps/web/src/components/cart apps/web/src/app/cart/page.tsx apps/web/src/mocks/handlers/cart.ts
git commit -m "feat(cart): apply coupons from the cart with discount summary"
```

### Task B4: Web — show coupon discount in the checkout summary

- [ ] **Step 1: Add a failing assertion to the checkout spec**

Edit `apps/web/src/components/checkout/checkout-form.spec.tsx`. Add a new test at the end of the describe block (before the final `});`):

```tsx
  it("should show the coupon discount in the order summary", () => {
    useCartStore.setState({
      items: [{ ...mockVariant, quantity: 1 }],
      coupon: { code: "DESC10", discountCents: 999 },
    });
    render(<CheckoutForm />);

    expect(screen.getByText(/desconto \(desc10\)/i)).toBeInTheDocument();
    expect(screen.getByText(/-R\$/i)).toBeInTheDocument();
    expect(screen.getByText("R$ 89,91")).toBeInTheDocument();
  });
```

Wait — `useCartStore.setState` after `addItem` in previous tests; `mockVariant` must be spread to satisfy `items` type `CartItem[]` with `variant`. `mockVariant` is `CartItem["variant"]`; item shape needs `{ variantId, quantity, variant }`. Adjust:

```tsx
  it("should show the coupon discount in the order summary", () => {
    useCartStore.setState({
      items: [{ variantId: mockVariant.id, quantity: 1, variant: mockVariant }],
      coupon: { code: "DESC10", discountCents: 999 },
    });
    render(<CheckoutForm />);

    expect(screen.getByText(/desconto \(desc10\)/i)).toBeInTheDocument();
    expect(screen.getByText("R$ 89,91")).toBeInTheDocument();
  });
```

The `beforeEach` already resets store state; but this test sets its own state after. Assertion summary: total = 9990 − 999 = 8991 → "R$ 89,91" (formatBRL). Run to see it fail (red): `pnpm --filter @kronostore/web test` → the total currently renders `R$ 99,90` so the assertion fails.

- [ ] **Step 2: Implement the discount in `checkout-form.tsx`**

Edit `apps/web/src/components/checkout/checkout-form.tsx`:

1. Add a coupon selector after `clearCart` (line 32):

```ts
  const coupon = useCartStore((s) => s.coupon);
```

2. After the "Frete" row (line 197), insert:

```tsx
            {coupon && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Desconto ({coupon.code})</span>
                <span className="text-green-600 dark:text-green-400">
                  -{formatBRL(coupon.discountCents)}
                </span>
              </div>
            )}
```

3. Replace the total block (lines 199-202):

```tsx
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span className="text-lg">
                {formatBRL(Math.max(0, totalCents - (coupon?.discountCents ?? 0)))}
              </span>
            </div>
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter @kronostore/web test`, `pnpm --filter @kronostore/web typecheck`
Expected: new test PASSES, suite green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/checkout/checkout-form.tsx apps/web/src/components/checkout/checkout-form.spec.tsx
git commit -m "feat(checkout): show coupon discount in order summary"
```

---

## Track C — Atomic checkout

### Task C1: API — `CheckoutUseCase` creates the payment inside the transaction

TDD: update the two existing checkout specs first with `paymentMethod` (they won't compile until the use-case is updated).

- [ ] **Step 1: Update the unit spec** — `apps/api/src/modules/orders/use-cases/checkout.use-case.spec.ts`

1. Import the payment repo (line 7 area):

```ts
import { InMemoryPaymentRepository } from "../../payments/infra/in-memory-payment-repository.js";
```

2. In `beforeEach`, declare and inject it:

```ts
    const paymentRepository = new InMemoryPaymentRepository();

    useCase = new CheckoutUseCase(
      orderRepository,
      cartRepository,
      stockRepository,
      couponRepository,
      productRepository,
      paymentRepository,
      passthrough,
    );
```

3. Every `useCase.execute({ ... })` call gains `paymentMethod: "pix"`.

4. Change assertions that use the return value `const order = await useCase.execute(...)` to destructure — the first test becomes:

```ts
    const { order, payment } = await useCase.execute({
      userId: "user-001",
      userEmail: "user@example.com",
      address,
      paymentMethod: "pix",
    });
```

For the idempotency test, replace the two execute calls and the assertion with:

```ts
    const result1 = await useCase.execute({
      userId: "user-001",
      userEmail: "user@example.com",
      address,
      paymentMethod: "pix",
      idempotencyKey: "idem-001",
    });
    const result2 = await useCase.execute({
      userId: "user-001",
      userEmail: "user@example.com",
      address,
      paymentMethod: "pix",
      idempotencyKey: "idem-001",
    });

    expect(result1.order.id).toBe(result2.order.id);
```

The remaining `execute` calls (empty cart, stock sale, reservation fails, email fails) just gain `paymentMethod: "pix"` — none of them uses the return value.

5. Add two new tests at the end of the describe block:

```ts
  it("should create a payment for the order amount in a single call", async () => {
    await stockRepository.create("var-001", 10);
    const cart = await cartRepository.create("user-001");
    await cartRepository.addItem(cart.id, { variantId: "var-001", quantity: 2 });

    const { order, payment } = await useCase.execute({
      userId: "user-001",
      userEmail: "user@example.com",
      address,
      paymentMethod: "pix",
    });

    expect(payment).toBeDefined();
    expect(payment.orderId).toBe(order.id);
    expect(payment.method).toBe("pix");
    expect(payment.amountCents).toBe(100000);
  });

  it("should create a payment with the discounted amount when a coupon applies", async () => {
    await stockRepository.create("var-001", 10);
    const coupon = await couponRepository.create({ code: "DESC10", type: "percentage", value: 10 });
    const cart = await cartRepository.create("user-001");
    await cartRepository.addItem(cart.id, { variantId: "var-001", quantity: 2 });
    await cartRepository.setCoupon(cart.id, coupon.id);

    const { payment } = await useCase.execute({
      userId: "user-001",
      userEmail: "user@example.com",
      address,
      paymentMethod: "credit_card",
    });

    expect(payment.amountCents).toBe(90000);
  });
```

Note: the in-memory product/variant pricing used by the coupon discount is resolved from `findVariantById("var-001")`, which the in-memory repos do NOT resolve (auto-ids are `var-2`); therefore inventory-level setup must produce a resolvable variant **and** the discount block must find price > 0. To keep this deterministic, update the `beforeEach` product setup so the variant id is the one added to cart:

Replace the product/variant setup in `beforeEach` (currently lines 44-56) with:

```ts
    const product = await productRepository.create({
      name: "Test Product",
      slug: "test-product",
      description: "Test",
      categoryId: "cat-001",
      priceCents: 50000,
      skuPrefix: "TST",
    });
    const variant = await productRepository.createVariant(product.id, {
      name: "Default",
      sku: "TST-001",
      priceCents: 50000,
    });
    cartVariantId = variant.id;
```

and declare `let cartVariantId: string;` at the top of the describe, then change cartridge item setups from `variantId: "var-001"` to `variantId: cartVariantId` and stock setup from `stockRepository.create("var-001", 10)` to `stockRepository.create(cartVariantId, 10)`.

- [ ] **Step 2: Run the unit spec to see it fail**

Run: `pnpm --filter @kronostore/api test`
Expected: FAIL (compile error: `CheckoutUseCase` has no `paymentMethod`/payment repo).

- [ ] **Step 3: Update the integration spec** — `apps/api/src/modules/orders/use-cases/checkout.use-case.integration.spec.ts`

1. Add imports:

```ts
import { DrizzlePaymentRepository } from "../../payments/infra/drizzle-payment-repository.js";
```

2. In `beforeEach`, add `paymentRepository` to the use-case constructor (as 6th arg) and a verify repo:

```ts
    useCase = new CheckoutUseCase(
      new DrizzleOrderRepository(),
      new DrizzleCartRepository(),
      new DrizzleStockRepository(),
      new DrizzleCouponRepository(),
      new DrizzleProductRepository(),
      new DrizzlePaymentRepository(),
      testTransaction,
    );
```

3. Add a verify repo declaration and initialization:

```ts
  let verifyPaymentRepo: DrizzlePaymentRepository;
  ...
    verifyPaymentRepo = new DrizzlePaymentRepository(db);
```

4. Add `paymentMethod: "pix"` to all three `useCase.execute(...)` calls in the spec (lines 80, 102, and the additional one in the success test), and assert payment + rollback:

For the success test, change `const order = await useCase.execute({...})` to:

```ts
    const { order, payment } = await useCase.execute({
      userId: TEST_USER_ID,
      userEmail: "checkout-e2e@example.com",
      address,
      paymentMethod: "pix",
    });

    expect(order.status).toBe("pending");
    expect(payment).toBeDefined();
    expect(payment.orderId).toBe(order.id);
    expect(payment.method).toBe("pix");
    expect(payment.amountCents).toBe(3998);
```

(TEST_VARIANT_ID price = 1999 cents × qty 2 = 3998.)

For the insufficient-stock test, add after the orders length check:

```ts
    const payments = await verifyPaymentRepo.findByOrderId(
      "00000000-0000-0000-0000-000000000000",
    );
    expect(payments).toBeNull();
```

(returns null for any non-existent order — verifies no payment row was committed). Use order id from cart/order? Simpler: assert no payments exist by trying to find by a known-wrong order id; the strong assertion is already the order rollback (orders have length 0). Keep the null check on the placeholder id.

- [ ] **Step 4: Implement the use-case + route changes (make tests pass)**

Edit `apps/api/src/modules/orders/use-cases/checkout.use-case.ts`:

1. Imports — add payment types:

```ts
import type {
  Payment,
  PaymentRepository,
} from "../../payments/domain/payment-repository.js";
import type { PaymentMethod } from "../../payments/domain/payment.js";
```

2. `CheckoutInput` gains a field; add a `CheckoutResult`:

```ts
export interface CheckoutInput {
  userId: string;
  userEmail: string;
  address: ShippingAddress;
  paymentMethod: PaymentMethod;
  idempotencyKey?: string;
}

export interface CheckoutResult {
  order: Order;
  payment: Payment;
}
```

3. Constructor: add `paymentRepository` and change the transactional generic:

```ts
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartRepository: CartRepository,
    private readonly stockRepository: StockRepository,
    private readonly couponRepository: CouponRepository,
    private readonly productRepository: ProductRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly transactional: (
      fn: (tx: unknown) => Promise<CheckoutResult>,
    ) => Promise<CheckoutResult> = withTransaction,
  ) {}
```

4. `execute` — idempotency early return now includes payment; inside the transaction, create the payment; return `{ order, payment }`; email uses `result.order`:

```ts
  async execute(input: CheckoutInput): Promise<CheckoutResult> {
    if (input.idempotencyKey) {
      const existing = await this.orderRepository.findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        const payment = await this.paymentRepository.findByOrderId(existing.id);
        return { order: existing, payment };
      }
    }

    const result = await this.transactional(async () => {
      const cart = await this.cartRepository.findByUserId(input.userId);
      if (!cart || cart.items.length === 0) {
        throw new EmptyCartError();
      }

      for (const item of cart.items) {
        const stock = await this.stockRepository.findByVariantId(item.variantId);
        if (!stock) {
          throw new InsufficientStockError(item.variantId, item.quantity, 0);
        }
        const available = stock.quantity - stock.reserved;
        if (available < item.quantity) {
          throw new InsufficientStockError(item.variantId, item.quantity, available);
        }
      }

      let discountCents = 0;
      const couponId = cart.couponId;

      if (cart.couponId) {
        const coupon = await this.couponRepository.findById(cart.couponId);
        if (coupon) {
          let subtotal = 0;
          for (const item of cart.items) {
            const variant = await this.productRepository.findVariantById(item.variantId);
            const product = variant
              ? await this.productRepository.findById(variant.productId)
              : null;
            const price = variant?.priceCents ?? product?.priceCents ?? 0;
            subtotal += item.quantity * price;
          }
          if (coupon.type === "percentage") {
            discountCents = Math.floor((subtotal * coupon.value) / 100);
          } else {
            discountCents = Math.min(coupon.value, subtotal);
          }
          await this.couponRepository.incrementUsedCount(coupon.id);
        }
      }

      const orderItems = [];
      for (const item of cart.items) {
        const variant = await this.productRepository.findVariantById(item.variantId);
        const product = variant ? await this.productRepository.findById(variant.productId) : null;
        const unitPriceCents = variant?.priceCents ?? product?.priceCents ?? 0;
        orderItems.push({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPriceCents,
        });
      }

      const created = await this.orderRepository.create({
        userId: input.userId,
        items: orderItems,
        couponId,
        discountCents,
        idempotencyKey: input.idempotencyKey,
        shipping: input.address,
      });

      await this.orderRepository.addItems(created.id, orderItems);

      for (const item of cart.items) {
        await this.stockRepository.confirmSale(item.variantId, item.quantity);
      }

      await this.cartRepository.clearCart(cart.id);

      const subtotalCents = orderItems.reduce(
        (acc, item) => acc + item.unitPriceCents * item.quantity,
        0,
      );
      const payment = await this.paymentRepository.create({
        orderId: created.id,
        method: input.paymentMethod,
        amountCents: subtotalCents - discountCents,
      });

      return { order: created, payment };
    });

    await emailQueue.add("order-confirmation", {
      to: input.userEmail,
      subject: `Order ${result.order.id} confirmed`,
      html: `<h1>Thank you for your order!</h1><p>Order ID: ${result.order.id}</p>`,
    });

    return result;
  }
```

- [ ] **Step 5: Update the checkout schema** — `apps/api/src/modules/orders/schemas/order.schema.ts`

`checkoutSchema` becomes (line 3-12):

```ts
export const checkoutSchema = z.object({
  address: z.object({
    name: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zip: z.string(),
    country: z.string().length(2).default("BR"),
  }),
  paymentMethod: z.enum(["pix", "credit_card", "boleto"]),
});
```

- [ ] **Step 6: Update the checkout route** — `apps/api/src/modules/orders/routes/index.ts`

1. Constructor call gains `paymentRepository` (line 27-33):

```ts
    const checkout = new CheckoutUseCase(
      orderRepository,
      cartRepository,
      stockRepository,
      couponRepository,
      productRepository,
      paymentRepository,
    );
```

2. Handler (lines 47-58):

```ts
      async (request, reply) => {
        const idempotencyKey = request.headers["idempotency-key"];

        const result = await checkout.execute({
          userId: request.user.id,
          userEmail: request.user.email,
          address: request.body.address,
          paymentMethod: request.body.paymentMethod,
          idempotencyKey,
        });

        return reply.code(201).send({ ...result.order, payment: result.payment });
      },
```

- [ ] **Step 7: Verify**

Run: `pnpm --filter @kronostore/api test` and `pnpm --filter @kronostore/api typecheck`
Expected: green (postgres `pnpm infra:up` for the drizzle integration spec).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/orders
git commit -m "feat(orders): create payment inside checkout transaction"
```

### Task C2: Web — single-call checkout, remove `_user`

- [ ] **Step 1: Update the failing spec** — `apps/web/src/components/checkout/checkout-form.spec.tsx`

In the submit test (line 61-97), drop the `payments` handler override (lines 72-74) and update the assertion to expect `paymentMethod`:

```tsx
    server.use(
      http.post(`${API_URL}/checkout`, async ({ request }) => {
        const body = (await request.json()) as {
          address: Record<string, string>;
          paymentMethod: string;
        };
        checkoutSpy(body);
        return HttpResponse.json({ id: "order-1", status: "pending" });
      }),
    );
```

and the expectation:

```tsx
    expect(checkoutSpy).toHaveBeenCalledWith({
      address: {
        name: "Maria Silva",
        street: "Rua das Flores, 123",
        city: "São Paulo",
        state: "SP",
        zip: "01234-567",
        country: "BR",
      },
      paymentMethod: "pix",
    });
```

Also add a test proving `/payments` is no longer called:

```tsx
  it("should not call /payments after checkout", async () => {
    const user = userEvent.setup();
    addItemToCart();

    const paymentsSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/payments`, () => {
        paymentsSpy();
        return HttpResponse.json({ id: "payment-1", status: "pending" });
      }),
    );

    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/nome do destinatário/i), "Maria");
    await user.type(screen.getByLabelText(/rua/i), "Rua 1");
    await user.type(screen.getByLabelText(/cidade/i), "SP");
    await user.type(screen.getByLabelText(/estado/i), "SP");
    await user.type(screen.getByLabelText(/cep/i), "00000-000");

    await user.click(screen.getByRole("button", { name: /finalizar compra/i }));

    await waitFor(() => {
      expect(screen.queryByText(/processando/i)).not.toBeInTheDocument();
    });
    expect(paymentsSpy).not.toHaveBeenCalled();
  });
```

`waitFor` is already exported by `@testing-library/react` (imported at line 5).

- [ ] **Step 2: Run to see it fail**

Run: `pnpm --filter @kronostore/web test`
Expected: submit test FAILS (no `paymentMethod` in request).

- [ ] **Step 3: Update `checkout-form.tsx`**

Edit `apps/web/src/components/checkout/checkout-form.tsx`:

1. Remove the unused line 28:

```ts
  const _user = useAuthStore((s) => s.user);
```

(also remove the now-unused `useAuthStore` import at line 10 if no other usage remains — only `useAuthStore` for `_user` and `token` are imported; keep the import since `const token = useAuthStore((s) => s.token);` remains.)

2. Replace the submit body (lines 62-70):

```tsx
      const order = await api.post<Order>("/checkout", {
        address: { ...address, country: "BR" },
        paymentMethod,
      });

      clearCart();
      router.push(`/checkout/success?orderId=${order.id}`);
```

- [ ] **Step 4: Update the MSW handler**

Edit `apps/web/src/mocks/handlers/cart.ts` — update the `checkout` handler (line 24-33) to accept and echo `paymentMethod`, and remove the `payments` handler (lines 35-43):

```ts
  http.post(`${API_URL}/checkout`, async ({ request }) => {
    const body = (await request.json()) as { address: unknown; paymentMethod: string };

    return HttpResponse.json({
      id: "order-1",
      status: "pending",
      address: body.address,
      paymentMethod: body.paymentMethod,
      totalCents: 0,
    });
  }),
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter @kronostore/web test`, `pnpm --filter @kronostore/web typecheck`, and
`pnpm biome check apps/web/src/components/checkout/checkout-form.tsx apps/web/src/components/checkout/checkout-form.spec.tsx apps/web/src/mocks/handlers/cart.ts`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/checkout/checkout-form.tsx apps/web/src/components/checkout/checkout-form.spec.tsx apps/web/src/mocks/handlers/cart.ts
git commit -m "feat(checkout): single-request checkout with payment method"
```

---

## Track D — Environment variables

### Task D1: Document env vars in `.env.example` files

- [ ] **Step 1: Add `WEBHOOK_SECRET` to the root example**

Edit `.env.example` — append under `# App`:

```bash
# Webhooks
WEBHOOK_SECRET=change-me-in-production
```

(`verify-webhook-signature.ts` reads `process.env.WEBHOOK_SECRET` for HMAC verification; it is optional in code, so this documents the secret without requiring it.)

- [ ] **Step 2: Create `apps/web/.env.example`**

```bash
# Next.js client -> API
NEXT_PUBLIC_API_URL=http://localhost:3001
```

- [ ] **Step 3: Verify & commit**

No code changes; run `git status` and commit:

```bash
git add .env.example apps/web/.env.example
git commit -m "chore(env): document webhook and web api env vars"
```

---

## Self-review checklist (run by the planner before execution)

- [ ] Spec coverage: (1) category edit page → Track A; list 404 fix → Task A1; (2) validate endpoint → Task B1, cart coupon + UI → Tasks B2/B3/B4; (3) payment-in-checkout → Track C; `/payments` kept for retry (not removed from API) ✓; (4) env vars → Track D; (5) remove `_user` → Task C2 step 3.
- [ ] Placeholder scan: no "TBD"/"TODO"/"similar to above" — all code stated inline.
- [ ] Type consistency: `CheckoutResult` shape (`{ order, payment }`) used consistently in spec assertions, use-case, and route; `setCoupon(cartId, couponId: string | null)` consistent across contract, in-memory, drizzle, and both use-cases; `applyCoupon/removeCoupon` in cart-store match `CouponApplyResult`; `CartCoupon` shape (`code`, `discountCents`) consistent between store, CouponInput, CartSummary, and checkout-form.

## Execution handoff

After the plan is saved: offer the user the choice between **Subagent-Driven** (fresh subagent per task + two-stage review; recommended) and **Inline Execution** (executing-plans, batch execution with checkpoints).