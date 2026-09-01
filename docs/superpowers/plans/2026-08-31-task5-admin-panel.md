# Task 5: Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement admin API routes for managing all entities (categories, coupons, orders, stock, users).

**Architecture:** Admin routes follow existing pattern: `/admin/{resource}` with `requireAdmin` middleware, Zod schemas, and use-case instantiation inside route handlers.

**Tech Stack:** TypeScript, Fastify, Zod, Vitest

---

## File Structure

```
apps/api/src/modules/
├── categories/
│   ├── schemas/
│   │   └── category.schema.ts      # NEW: Zod schemas
│   └── routes/
│       └── index.ts                # NEW: Public + Admin routes
├── coupons/
│   ├── use-cases/
│   │   ├── list-coupons.use-case.ts    # NEW
│   │   ├── get-coupon.use-case.ts      # NEW
│   │   └── delete-coupon.use-case.ts   # NEW
│   ├── schemas/
│   │   └── coupon.schema.ts        # UPDATE: Add admin schemas
│   └── routes/
│       └── index.ts                # NEW: Admin routes
├── orders/
│   ├── use-cases/
│   │   ├── list-all-orders.use-case.ts     # NEW
│   │   ├── get-order-admin.use-case.ts     # NEW
│   │   └── update-order-status.use-case.ts # NEW
│   ├── schemas/
│   │   └── order.schema.ts         # UPDATE: Add admin schemas
│   └── routes/
│       └── admin.ts                # NEW: Admin routes
├── stock/
│   ├── schemas/
│   │   └── stock.schema.ts         # NEW: Zod schemas
│   └── routes/
│       └── admin.ts                # NEW: Admin routes
├── users/
│   ├── domain/
│   │   ├── user.ts                 # NEW: Types
│   │   └── user-repository.ts      # NEW: Repository contract
│   ├── infra/
│   │   └── in-memory-user-repository.ts  # NEW
│   ├── use-cases/
│   │   ├── list-users.use-case.ts       # NEW
│   │   ├── get-user.use-case.ts         # NEW
│   │   └── update-user-role.use-case.ts # NEW
│   ├── schemas/
│   │   └── user.schema.ts          # NEW: Zod schemas
│   └── routes/
│       └── admin.ts                # NEW: Admin routes
```

---

### Task 1: Category Admin Routes

**Files:**
- Create: `apps/api/src/modules/categories/schemas/category.schema.ts`
- Create: `apps/api/src/modules/categories/routes/index.ts`

- [ ] **Step 1: Create category schemas**

```typescript
// apps/api/src/modules/categories/schemas/category.schema.ts
import { z } from "zod";

export const createCategoryBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export const updateCategoryBodySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export const categoryParamsSchema = z.object({
  id: z.string(),
});
```

- [ ] **Step 2: Create category routes**

```typescript
// apps/api/src/modules/categories/routes/index.ts
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAuth, requireAdmin } from "../../../middleware/auth.js";
import type { CategoryRepository } from "../domain/category-repository.js";
import {
  createCategoryBodySchema,
  updateCategoryBodySchema,
  categoryParamsSchema,
} from "../schemas/category.schema.js";
import { CreateCategoryUseCase } from "../use-cases/create-category.use-case.js";
import { ListCategoriesUseCase } from "../use-cases/list-categories.use-case.js";

export function createCategoryRoutes(categoryRepository: CategoryRepository) {
  return async function categoryRoutes(app: FastifyInstance) {
    const listCategories = new ListCategoriesUseCase(categoryRepository);
    const createCategory = new CreateCategoryUseCase(categoryRepository);

    // Public routes
    app.withTypeProvider<ZodTypeProvider>().get(
      "/categories",
      {
        schema: {
          tags: ["Categories"],
          summary: "Listar categorias",
        },
      },
      async () => {
        return listCategories.execute();
      },
    );

    // Admin routes
    app.withTypeProvider<ZodTypeProvider>().post(
      "/admin/categories",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Categories"],
          summary: "Criar categoria",
          security: [{ cookieAuth: [] }],
          body: createCategoryBodySchema,
        },
      },
      async (request, reply) => {
        const category = await createCategory.execute(request.body);
        return reply.code(201).send(category);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().patch(
      "/admin/categories/:id",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Categories"],
          summary: "Atualizar categoria",
          security: [{ cookieAuth: [] }],
          params: categoryParamsSchema,
          body: updateCategoryBodySchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params;
        const category = await categoryRepository.update(id, request.body);
        if (!category) {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Category not found" });
        }
        return reply.send(category);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().delete(
      "/admin/categories/:id",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Categories"],
          summary: "Deletar categoria",
          security: [{ cookieAuth: [] }],
          params: categoryParamsSchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params;
        await categoryRepository.delete(id);
        return reply.code(204).send();
      },
    );
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/categories/schemas/ apps/api/src/modules/categories/routes/
git commit -m "feat(admin): add category admin routes with Zod schemas"
```

---

### Task 2: Coupon Admin Routes

**Files:**
- Create: `apps/api/src/modules/coupons/use-cases/list-coupons.use-case.ts`
- Create: `apps/api/src/modules/coupons/use-cases/get-coupon.use-case.ts`
- Create: `apps/api/src/modules/coupons/use-cases/delete-coupon.use-case.ts`
- Update: `apps/api/src/modules/coupons/schemas/coupon.schema.ts`
- Create: `apps/api/src/modules/coupons/routes/index.ts`

- [ ] **Step 1: Create list coupons use-case**

```typescript
// apps/api/src/modules/coupons/use-cases/list-coupons.use-case.ts
import type { CouponRepository } from "../domain/coupon-repository.js";

export class ListCouponsUseCase {
  constructor(private readonly couponRepository: CouponRepository) {}

  async execute() {
    return this.couponRepository.list();
  }
}
```

- [ ] **Step 2: Create get coupon use-case**

```typescript
// apps/api/src/modules/coupons/use-cases/get-coupon.use-case.ts
import type { CouponRepository } from "../domain/coupon-repository.js";
import { CouponNotFoundError } from "../domain/coupon.js";

export class GetCouponUseCase {
  constructor(private readonly couponRepository: CouponRepository) {}

  async execute(id: string) {
    const coupon = await this.couponRepository.findById(id);
    if (!coupon) throw new CouponNotFoundError(id);
    return coupon;
  }
}
```

- [ ] **Step 3: Create delete coupon use-case**

```typescript
// apps/api/src/modules/coupons/use-cases/delete-coupon.use-case.ts
import type { CouponRepository } from "../domain/coupon-repository.js";

export class DeleteCouponUseCase {
  constructor(private readonly couponRepository: CouponRepository) {}

  async execute(id: string) {
    await this.couponRepository.delete(id);
  }
}
```

- [ ] **Step 4: Update coupon schemas**

Read `apps/api/src/modules/coupons/schemas/coupon.schema.ts` and add:

```typescript
export const couponParamsSchema = z.object({
  id: z.string(),
});
```

- [ ] **Step 5: Create coupon routes**

```typescript
// apps/api/src/modules/coupons/routes/index.ts
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../../middleware/auth.js";
import type { CouponRepository } from "../domain/coupon-repository.js";
import { createCouponSchema, couponParamsSchema } from "../schemas/coupon.schema.js";
import { CreateCouponUseCase } from "../use-cases/create-coupon.use-case.js";
import { ListCouponsUseCase } from "../use-cases/list-coupons.use-case.js";
import { GetCouponUseCase } from "../use-cases/get-coupon.use-case.js";
import { DeleteCouponUseCase } from "../use-cases/delete-coupon.use-case.js";

export function createCouponRoutes(couponRepository: CouponRepository) {
  return async function couponRoutes(app: FastifyInstance) {
    const listCoupons = new ListCouponsUseCase(couponRepository);
    const createCoupon = new CreateCouponUseCase(couponRepository);
    const getCoupon = new GetCouponUseCase(couponRepository);
    const deleteCoupon = new DeleteCouponUseCase(couponRepository);

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/coupons",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Coupons"],
          summary: "Listar cupons",
          security: [{ cookieAuth: [] }],
        },
      },
      async () => {
        return listCoupons.execute();
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/coupons/:id",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Coupons"],
          summary: "Obter cupom por ID",
          security: [{ cookieAuth: [] }],
          params: couponParamsSchema,
        },
      },
      async (request, reply) => {
        try {
          const coupon = await getCoupon.execute(request.params.id);
          return reply.send(coupon);
        } catch {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Coupon not found" });
        }
      },
    );

    app.withTypeProvider<ZodTypeProvider>().post(
      "/admin/coupons",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Coupons"],
          summary: "Criar cupom",
          security: [{ cookieAuth: [] }],
          body: createCouponSchema,
        },
      },
      async (request, reply) => {
        const coupon = await createCoupon.execute(request.body);
        return reply.code(201).send(coupon);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().delete(
      "/admin/coupons/:id",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Coupons"],
          summary: "Deletar cupom",
          security: [{ cookieAuth: [] }],
          params: couponParamsSchema,
        },
      },
      async (request, reply) => {
        await deleteCoupon.execute(request.params.id);
        return reply.code(204).send();
      },
    );
  };
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/coupons/
git commit -m "feat(admin): add coupon admin routes with use-cases"
```

---

### Task 3: Order Admin Routes

**Files:**
- Create: `apps/api/src/modules/orders/use-cases/list-all-orders.use-case.ts`
- Create: `apps/api/src/modules/orders/use-cases/get-order-admin.use-case.ts`
- Create: `apps/api/src/modules/orders/use-cases/update-order-status.use-case.ts`
- Update: `apps/api/src/modules/orders/schemas/order.schema.ts`
- Create: `apps/api/src/modules/orders/routes/admin.ts`

- [ ] **Step 1: Create list all orders use-case**

```typescript
// apps/api/src/modules/orders/use-cases/list-all-orders.use-case.ts
import type { OrderRepository } from "../domain/order-repository.js";

export class ListAllOrdersUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute() {
    return this.orderRepository.list();
  }
}
```

- [ ] **Step 2: Create get order admin use-case**

```typescript
// apps/api/src/modules/orders/use-cases/get-order-admin.use-case.ts
import type { OrderRepository } from "../domain/order-repository.js";

export class GetOrderAdminUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(id: string) {
    const order = await this.orderRepository.findById(id);
    if (!order) throw new Error("Order not found");
    return order;
  }
}
```

- [ ] **Step 3: Create update order status use-case**

```typescript
// apps/api/src/modules/orders/use-cases/update-order-status.use-case.ts
import type { OrderRepository } from "../domain/order-repository.js";

export type OrderStatus = "pending" | "confirmed" | "paid" | "shipped" | "delivered" | "cancelled";

export class UpdateOrderStatusUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(id: string, status: OrderStatus) {
    const order = await this.orderRepository.findById(id);
    if (!order) throw new Error("Order not found");
    return this.orderRepository.updateStatus(id, status);
  }
}
```

- [ ] **Step 4: Update order schemas**

Read `apps/api/src/modules/orders/schemas/order.schema.ts` and add:

```typescript
export const orderParamsSchema = z.object({
  id: z.string(),
});

export const updateOrderStatusBodySchema = z.object({
  status: z.enum(["pending", "confirmed", "paid", "shipped", "delivered", "cancelled"]),
});
```

- [ ] **Step 5: Create admin order routes**

```typescript
// apps/api/src/modules/orders/routes/admin.ts
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../../middleware/auth.js";
import type { OrderRepository } from "../domain/order-repository.js";
import { orderParamsSchema, updateOrderStatusBodySchema } from "../schemas/order.schema.js";
import { ListAllOrdersUseCase } from "../use-cases/list-all-orders.use-case.js";
import { GetOrderAdminUseCase } from "../use-cases/get-order-admin.use-case.js";
import { UpdateOrderStatusUseCase } from "../use-cases/update-order-status.use-case.js";

export function createAdminOrderRoutes(orderRepository: OrderRepository) {
  return async function adminOrderRoutes(app: FastifyInstance) {
    const listAllOrders = new ListAllOrdersUseCase(orderRepository);
    const getOrder = new GetOrderAdminUseCase(orderRepository);
    const updateStatus = new UpdateOrderStatusUseCase(orderRepository);

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/orders",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Orders"],
          summary: "Listar todos os pedidos",
          security: [{ cookieAuth: [] }],
        },
      },
      async () => {
        return listAllOrders.execute();
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/orders/:id",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Orders"],
          summary: "Obter pedido por ID",
          security: [{ cookieAuth: [] }],
          params: orderParamsSchema,
        },
      },
      async (request, reply) => {
        try {
          const order = await getOrder.execute(request.params.id);
          return reply.send(order);
        } catch {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Order not found" });
        }
      },
    );

    app.withTypeProvider<ZodTypeProvider>().patch(
      "/admin/orders/:id/status",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Orders"],
          summary: "Atualizar status do pedido",
          security: [{ cookieAuth: [] }],
          params: orderParamsSchema,
          body: updateOrderStatusBodySchema,
        },
      },
      async (request, reply) => {
        try {
          const order = await updateStatus.execute(request.params.id, request.body.status);
          return reply.send(order);
        } catch {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Order not found" });
        }
      },
    );
  };
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/orders/use-cases/list-all-orders.use-case.ts apps/api/src/modules/orders/use-cases/get-order-admin.use-case.ts apps/api/src/modules/orders/use-cases/update-order-status.use-case.ts apps/api/src/modules/orders/schemas/order.schema.ts apps/api/src/modules/orders/routes/admin.ts
git commit -m "feat(admin): add order admin routes with status management"
```

---

### Task 4: Stock Admin Routes

**Files:**
- Create: `apps/api/src/modules/stock/schemas/stock.schema.ts`
- Create: `apps/api/src/modules/stock/routes/admin.ts`

- [ ] **Step 1: Create stock schemas**

```typescript
// apps/api/src/modules/stock/schemas/stock.schema.ts
import { z } from "zod";

export const stockParamsSchema = z.object({
  variantId: z.string(),
});

export const adjustStockBodySchema = z.object({
  quantity: z.number().int(),
  reason: z.string().min(1),
});
```

- [ ] **Step 2: Create admin stock routes**

```typescript
// apps/api/src/modules/stock/routes/admin.ts
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../../middleware/auth.js";
import type { StockRepository } from "../domain/stock-repository.js";
import { stockParamsSchema, adjustStockBodySchema } from "../schemas/stock.schema.js";

export function createAdminStockRoutes(stockRepository: StockRepository) {
  return async function adminStockRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/stock",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Stock"],
          summary: "Listar estoque",
          security: [{ cookieAuth: [] }],
        },
      },
      async () => {
        const stocks = await stockRepository.list();
        return stocks;
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/stock/:variantId",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Stock"],
          summary: "Obter estoque por variante",
          security: [{ cookieAuth: [] }],
          params: stockParamsSchema,
        },
      },
      async (request, reply) => {
        const stock = await stockRepository.findByVariantId(request.params.variantId);
        if (!stock) {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Stock not found" });
        }
        return reply.send(stock);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().post(
      "/admin/stock/:variantId/adjust",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Stock"],
          summary: "Ajustar estoque",
          security: [{ cookieAuth: [] }],
          params: stockParamsSchema,
          body: adjustStockBodySchema,
        },
      },
      async (request, reply) => {
        const { variantId } = request.params;
        const { quantity } = request.body;
        
        let stock = await stockRepository.findByVariantId(variantId);
        if (!stock) {
          stock = await stockRepository.create(variantId, quantity);
        } else {
          await stockRepository.addQuantity(variantId, quantity);
          stock = await stockRepository.findByVariantId(variantId);
        }
        
        return reply.send(stock);
      },
    );
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/stock/schemas/ apps/api/src/modules/stock/routes/
git commit -m "feat(admin): add stock admin routes with adjustment"
```

---

### Task 5: User Domain + Repository

**Files:**
- Create: `apps/api/src/modules/users/domain/user.ts`
- Create: `apps/api/src/modules/users/domain/user-repository.ts`
- Create: `apps/api/src/modules/users/domain/index.ts`
- Create: `apps/api/src/modules/users/infra/in-memory-user-repository.ts`

- [ ] **Step 1: Create user domain**

```typescript
// apps/api/src/modules/users/domain/user.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Create user repository contract**

```typescript
// apps/api/src/modules/users/domain/user-repository.ts
import type { User } from "./user.js";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  list(): Promise<User[]>;
  updateRole(id: string, role: string): Promise<User>;
}
```

- [ ] **Step 3: Create index file**

```typescript
// apps/api/src/modules/users/domain/index.ts
export * from "./user.js";
export type { UserRepository } from "./user-repository.js";
```

- [ ] **Step 4: Create in-memory user repository**

```typescript
// apps/api/src/modules/users/infra/in-memory-user-repository.ts
import type { User, UserRepository } from "../domain/user-repository.js";

export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async list(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateRole(id: string, role: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    const updated: User = { ...user, role, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async create(data: Omit<User, "createdAt" | "updatedAt">): Promise<User> {
    const now = new Date();
    const user: User = { ...data, createdAt: now, updatedAt: now };
    this.users.set(user.id, user);
    return user;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/users/
git commit -m "feat(users): add user domain, repository contract, and in-memory implementation"
```

---

### Task 6: User Admin Routes

**Files:**
- Create: `apps/api/src/modules/users/use-cases/list-users.use-case.ts`
- Create: `apps/api/src/modules/users/use-cases/get-user.use-case.ts`
- Create: `apps/api/src/modules/users/use-cases/update-user-role.use-case.ts`
- Create: `apps/api/src/modules/users/schemas/user.schema.ts`
- Create: `apps/api/src/modules/users/routes/admin.ts`

- [ ] **Step 1: Create list users use-case**

```typescript
// apps/api/src/modules/users/use-cases/list-users.use-case.ts
import type { UserRepository } from "../domain/user-repository.js";

export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute() {
    return this.userRepository.list();
  }
}
```

- [ ] **Step 2: Create get user use-case**

```typescript
// apps/api/src/modules/users/use-cases/get-user.use-case.ts
import type { UserRepository } from "../domain/user-repository.js";

export class GetUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new Error("User not found");
    return user;
  }
}
```

- [ ] **Step 3: Create update user role use-case**

```typescript
// apps/api/src/modules/users/use-cases/update-user-role.use-case.ts
import type { UserRepository } from "../domain/user-repository.js";

export class UpdateUserRoleUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string, role: string) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new Error("User not found");
    return this.userRepository.updateRole(id, role);
  }
}
```

- [ ] **Step 4: Create user schemas**

```typescript
// apps/api/src/modules/users/schemas/user.schema.ts
import { z } from "zod";

export const userParamsSchema = z.object({
  id: z.string(),
});

export const updateUserRoleBodySchema = z.object({
  role: z.enum(["user", "admin"]),
});
```

- [ ] **Step 5: Create admin user routes**

```typescript
// apps/api/src/modules/users/routes/admin.ts
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../../middleware/auth.js";
import type { UserRepository } from "../domain/user-repository.js";
import { userParamsSchema, updateUserRoleBodySchema } from "../schemas/user.schema.js";
import { ListUsersUseCase } from "../use-cases/list-users.use-case.js";
import { GetUserUseCase } from "../use-cases/get-user.use-case.js";
import { UpdateUserRoleUseCase } from "../use-cases/update-user-role.use-case.js";

export function createAdminUserRoutes(userRepository: UserRepository) {
  return async function adminUserRoutes(app: FastifyInstance) {
    const listUsers = new ListUsersUseCase(userRepository);
    const getUser = new GetUserUseCase(userRepository);
    const updateRole = new UpdateUserRoleUseCase(userRepository);

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/users",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Users"],
          summary: "Listar usuários",
          security: [{ cookieAuth: [] }],
        },
      },
      async () => {
        return listUsers.execute();
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/admin/users/:id",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Users"],
          summary: "Obter usuário por ID",
          security: [{ cookieAuth: [] }],
          params: userParamsSchema,
        },
      },
      async (request, reply) => {
        try {
          const user = await getUser.execute(request.params.id);
          return reply.send(user);
        } catch {
          return reply.code(404).send({ error: "NOT_FOUND", message: "User not found" });
        }
      },
    );

    app.withTypeProvider<ZodTypeProvider>().patch(
      "/admin/users/:id/role",
      {
        preHandler: [requireAdmin],
        schema: {
          tags: ["Admin - Users"],
          summary: "Atualizar role do usuário",
          security: [{ cookieAuth: [] }],
          params: userParamsSchema,
          body: updateUserRoleBodySchema,
        },
      },
      async (request, reply) => {
        try {
          const user = await updateRole.execute(request.params.id, request.body.role);
          return reply.send(user);
        } catch {
          return reply.code(404).send({ error: "NOT_FOUND", message: "User not found" });
        }
      },
    );
  };
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/users/
git commit -m "feat(admin): add user admin routes with role management"
```

---

### Task 7: Register All Admin Routes in app.ts

**Files:**
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Add imports and register routes**

Read `apps/api/src/app.ts` and add:

```typescript
import { InMemoryCategoryRepository } from "./modules/categories/infra/in-memory-category-repository.js";
import { createCategoryRoutes } from "./modules/categories/routes/index.js";
import { InMemoryCouponRepository } from "./modules/coupons/infra/in-memory-coupon-repository.js";
import { createCouponRoutes } from "./modules/coupons/routes/index.js";
import { InMemoryOrderRepository } from "./modules/orders/infra/in-memory-order-repository.js";
import { createAdminOrderRoutes } from "./modules/orders/routes/admin.js";
import { InMemoryStockRepository } from "./modules/stock/infra/in-memory-stock-repository.js";
import { createAdminStockRoutes } from "./modules/stock/routes/admin.js";
import { InMemoryUserRepository } from "./modules/users/infra/in-memory-user-repository.js";
import { createAdminUserRoutes } from "./modules/users/routes/admin.js";
```

After existing route registrations, add:

```typescript
const categoryRepository = new InMemoryCategoryRepository();
await app.register(createCategoryRoutes(categoryRepository));

const couponRepository = new InMemoryCouponRepository();
await app.register(createCouponRoutes(couponRepository));

await app.register(createAdminOrderRoutes(orderRepository));

await app.register(createAdminStockRoutes(stockRepository));

const userRepository = new InMemoryUserRepository();
await app.register(createAdminUserRoutes(userRepository));
```

- [ ] **Step 2: Run tests to verify everything works**

Run: `pnpm --filter @kronostore/api test`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app.ts
git commit -m "feat(admin): register all admin routes in app.ts"
```

---

### Task 8: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `pnpm --filter @kronostore/api test`
Expected: All tests PASS

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter @kronostore/api typecheck`
Expected: No type errors

- [ ] **Step 3: Final commit if needed**

```bash
git add -A
git commit -m "chore: final verification for admin panel"
```
