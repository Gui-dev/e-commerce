# Catalog Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full catalog browsing with `/products`, `/categories`, and `/categories/[slug]` pages, a navigation bar with search, and API price filtering.

**Architecture:** Client-side routing with URL search params for filter state. Reuse existing `ProductGrid` component. Extend API to support price filtering.

**Tech Stack:** Next.js App Router, React Query, Zustand, Drizzle ORM, Vitest + RTL + MSW, Playwright E2E

---

## File Structure

### New Files
- `apps/web/src/app/products/page.tsx` — Catalog page with sidebar filters + product grid + pagination
- `apps/web/src/app/products/loading.tsx` — Loading state for /products
- `apps/web/src/app/categories/page.tsx` — Category listing page
- `apps/web/src/app/categories/loading.tsx` — Loading state for /categories
- `apps/web/src/app/categories/[slug]/page.tsx` — Category detail page
- `apps/web/src/app/categories/[slug]/loading.tsx` — Loading state for /categories/[slug]
- `apps/web/src/components/product/pagination.tsx` — Reusable pagination component
- `apps/web/src/components/product/catalog-sidebar.tsx` — Sidebar with search + category + price filters
- `apps/web/src/components/product/catalog-sidebar.spec.tsx` — Unit tests
- `apps/web/src/components/product/pagination.spec.tsx` — Unit tests
- `apps/web/src/components/layout/header.spec.tsx` — Unit tests for updated header
- `apps/web/src/app/products/page.spec.tsx` — Unit tests for catalog page
- `apps/web/src/app/categories/page.spec.tsx` — Unit tests for categories page
- `apps/web/tests/e2e/catalog-browse.spec.ts` — E2E test for catalog browsing

### Modified Files
- `apps/web/src/components/layout/header.tsx` — Add "Produtos", "Categorias" links + search input + auth
- `apps/web/src/app/page.tsx` — Change "Ver Catálogo" button href to `/products`
- `apps/api/src/modules/products/domain/product-repository.ts` — Add `priceMin`/`priceMax` to `list` params
- `apps/api/src/modules/products/schemas/product.schema.ts` — Add `priceMin`/`priceMax` to query schema
- `apps/api/src/modules/products/use-cases/list-products.use-case.ts` — Add `priceMin`/`priceMax` to input
- `apps/api/src/modules/products/use-cases/list-products.use-case.spec.ts` — Add price filtering tests
- `apps/api/src/modules/products/infra/drizzle-product-repository.ts` — Add price filtering to query
- `apps/api/src/modules/products/infra/in-memory-product-repository.ts` — Add price filtering to in-memory filter
- `apps/api/src/modules/products/infra/in-memory-product-repository.spec.ts` — Add price filtering tests
- `apps/web/src/mocks/handlers/products.ts` — Add price filter support to MSW handler

---

### Task 1: API — Add price filtering to ProductRepository interface

**Files:**
- Modify: `apps/api/src/modules/products/domain/product-repository.ts:14-19`

- [ ] **Step 1: Update the `list` params in ProductRepository interface**

```ts
// apps/api/src/modules/products/domain/product-repository.ts
// Change the list method params to include priceMin/priceMax

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  list(params: {
    categoryId?: string;
    search?: string;
    priceMin?: number;
    priceMax?: number;
    page: number;
    limit: number;
  }): Promise<{ products: Product[]; total: number }>;
  // ... rest unchanged
}
```

- [ ] **Step 2: Run typecheck to verify interface change propagates**

Run: `pnpm --filter @kronostore/api typecheck`
Expected: FAIL — DrizzleProductRepository and InMemoryProductRepository don't have priceMin/priceMax yet

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/products/domain/product-repository.ts
git commit -m "feat(products): add priceMin/priceMax to ProductRepository list params"
```

---

### Task 2: API — Add price filtering to Zod schema

**Files:**
- Modify: `apps/api/src/modules/products/schemas/product.schema.ts:23-28`

- [ ] **Step 1: Add priceMin/priceMax to listProductsQuerySchema**

```ts
// apps/api/src/modules/products/schemas/product.schema.ts
// Add to listProductsQuerySchema

export const listProductsQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  priceMin: z.coerce.number().int().positive().optional(),
  priceMax: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter @kronostore/api typecheck`
Expected: PASS (schema change doesn't break types)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/products/schemas/product.schema.ts
git commit -m "feat(products): add priceMin/priceMax to list products query schema"
```

---

### Task 3: API — Add price filtering to ListProductsUseCase

**Files:**
- Modify: `apps/api/src/modules/products/use-cases/list-products.use-case.ts:4-8,17-26`
- Test: `apps/api/src/modules/products/use-cases/list-products.use-case.spec.ts`

- [ ] **Step 1: Write failing tests for price filtering**

```ts
// apps/api/src/modules/products/use-cases/list-products.use-case.spec.ts
// Add these tests at the end of the describe block

it("should filter products by priceMin", async () => {
  await createUseCase.execute({
    name: "Cheap Product",
    description: "A cheap product for testing price filter",
    categoryId: "cat-001",
    priceCents: 5000,
    skuPrefix: "CP",
  });
  await createUseCase.execute({
    name: "Expensive Product",
    description: "An expensive product for testing price filter",
    categoryId: "cat-001",
    priceCents: 50000,
    skuPrefix: "EP",
  });

  const result = await listUseCase.execute({ priceMin: 100 });
  expect(result.products).toHaveLength(1);
  expect(result.products[0].name).toBe("Expensive Product");
});

it("should filter products by priceMax", async () => {
  await createUseCase.execute({
    name: "Cheap Product",
    description: "A cheap product for testing price filter",
    categoryId: "cat-001",
    priceCents: 5000,
    skuPrefix: "CP",
  });
  await createUseCase.execute({
    name: "Expensive Product",
    description: "An expensive product for testing price filter",
    categoryId: "cat-001",
    priceCents: 50000,
    skuPrefix: "EP",
  });

  const result = await listUseCase.execute({ priceMax: 100 });
  expect(result.products).toHaveLength(1);
  expect(result.products[0].name).toBe("Cheap Product");
});

it("should filter products by both priceMin and priceMax", async () => {
  await createUseCase.execute({
    name: "Cheap Product",
    description: "A cheap product for testing price filter",
    categoryId: "cat-001",
    priceCents: 5000,
    skuPrefix: "CP",
  });
  await createUseCase.execute({
    name: "Mid Product",
    description: "A mid-range product for testing price filter",
    categoryId: "cat-001",
    priceCents: 25000,
    skuPrefix: "MP",
  });
  await createUseCase.execute({
    name: "Expensive Product",
    description: "An expensive product for testing price filter",
    categoryId: "cat-001",
    priceCents: 50000,
    skuPrefix: "EP",
  });

  const result = await listUseCase.execute({ priceMin: 100, priceMax: 300 });
  expect(result.products).toHaveLength(1);
  expect(result.products[0].name).toBe("Mid Product");
});

it("should return empty when no products match price range", async () => {
  await createUseCase.execute({
    name: "Cheap Product",
    description: "A cheap product for testing price filter",
    categoryId: "cat-001",
    priceCents: 5000,
    skuPrefix: "CP",
  });

  const result = await listUseCase.execute({ priceMin: 1000 });
  expect(result.products).toHaveLength(0);
  expect(result.total).toBe(0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kronostore/api test src/modules/products/use-cases/list-products.use-case.spec.ts`
Expected: FAIL — priceMin/priceMax not in input type

- [ ] **Step 3: Update ListProductsUseCase input type and pass to repository**

```ts
// apps/api/src/modules/products/use-cases/list-products.use-case.ts

import type { Product, ProductRepository } from "../domain/product-repository.js";

export interface ListProductsInput {
  categoryId?: string;
  search?: string;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  limit?: number;
}

export interface ListProductsOutput {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export class ListProductsUseCase {
  constructor(private readonly repository: ProductRepository) {}

  async execute(input: ListProductsInput = {}): Promise<ListProductsOutput> {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 12, 50);

    const { products, total } = await this.repository.list({
      categoryId: input.categoryId,
      search: input.search,
      priceMin: input.priceMin,
      priceMax: input.priceMax,
      page,
      limit,
    });

    return { products, total, page, limit };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kronostore/api test src/modules/products/use-cases/list-products.use-case.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/products/use-cases/list-products.use-case.ts apps/api/src/modules/products/use-cases/list-products.use-case.spec.ts
git commit -m "feat(products): add price filtering to ListProductsUseCase"
```

---

### Task 4: API — Add price filtering to InMemoryProductRepository

**Files:**
- Modify: `apps/api/src/modules/products/infra/in-memory-product-repository.ts:23-42`
- Test: `apps/api/src/modules/products/infra/in-memory-product-repository.spec.ts`

- [ ] **Step 1: Write failing tests for price filtering in in-memory repo**

```ts
// apps/api/src/modules/products/infra/in-memory-product-repository.spec.ts
// Add these tests at the end of the describe block

it("should filter products by priceMin", async () => {
  await repository.create({
    name: "Cheap Product",
    description: "A cheap product",
    categoryId: "cat-001",
    priceCents: 5000,
    slug: "cheap-product",
    skuPrefix: "CP",
  });
  await repository.create({
    name: "Expensive Product",
    description: "An expensive product",
    categoryId: "cat-001",
    priceCents: 50000,
    slug: "expensive-product",
    skuPrefix: "EP",
  });

  const result = await repository.list({ priceMin: 100, page: 1, limit: 10 });
  expect(result.products).toHaveLength(1);
  expect(result.products[0].name).toBe("Expensive Product");
});

it("should filter products by priceMax", async () => {
  await repository.create({
    name: "Cheap Product",
    description: "A cheap product",
    categoryId: "cat-001",
    priceCents: 5000,
    slug: "cheap-product",
    skuPrefix: "CP",
  });
  await repository.create({
    name: "Expensive Product",
    description: "An expensive product",
    categoryId: "cat-001",
    priceCents: 50000,
    slug: "expensive-product",
    skuPrefix: "EP",
  });

  const result = await repository.list({ priceMax: 100, page: 1, limit: 10 });
  expect(result.products).toHaveLength(1);
  expect(result.products[0].name).toBe("Cheap Product");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kronostore/api test src/modules/products/infra/in-memory-product-repository.spec.ts`
Expected: FAIL — priceMin/priceMax not handled in list method

- [ ] **Step 3: Add price filtering to InMemoryProductRepository list method**

```ts
// apps/api/src/modules/products/infra/in-memory-product-repository.ts
// Update the list method to include price filtering

async list(params: {
  categoryId?: string;
  search?: string;
  priceMin?: number;
  priceMax?: number;
  page: number;
  limit: number;
}): Promise<{ products: Product[]; total: number }> {
  let filtered = Array.from(this.products.values());

  if (params.categoryId) {
    filtered = filtered.filter((p) => p.categoryId === params.categoryId);
  }

  if (params.search) {
    const search = params.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search),
    );
  }

  if (params.priceMin !== undefined) {
    const minCents = params.priceMin * 100;
    filtered = filtered.filter((p) => p.priceCents >= minCents);
  }

  if (params.priceMax !== undefined) {
    const maxCents = params.priceMax * 100;
    filtered = filtered.filter((p) => p.priceCents <= maxCents);
  }

  const total = filtered.length;
  const start = (params.page - 1) * params.limit;
  const products = filtered.slice(start, start + params.limit);

  return { products, total };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kronostore/api test src/modules/products/infra/in-memory-product-repository.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/products/infra/in-memory-product-repository.ts apps/api/src/modules/products/infra/in-memory-product-repository.spec.ts
git commit -m "feat(products): add price filtering to InMemoryProductRepository"
```

---

### Task 5: API — Add price filtering to DrizzleProductRepository

**Files:**
- Modify: `apps/api/src/modules/products/infra/drizzle-product-repository.ts:56-92`
- Test: `apps/api/src/modules/products/infra/drizzle-product-repository.spec.ts` (existing)

- [ ] **Step 1: Add gte/lte imports from drizzle-orm**

```ts
// apps/api/src/modules/products/infra/drizzle-product-repository.ts
// Update imports at top of file

import { eq, gte, ilike, lte, or, sql } from "drizzle-orm";
```

- [ ] **Step 2: Add price filtering to DrizzleProductRepository list method**

```ts
// apps/api/src/modules/products/infra/drizzle-product-repository.ts
// Update the list method to include price filtering

async list(params: {
  categoryId?: string;
  search?: string;
  priceMin?: number;
  priceMax?: number;
  page: number;
  limit: number;
}): Promise<{ products: Product[]; total: number }> {
  const conditions = [];

  if (params.categoryId) {
    conditions.push(eq(products.categoryId, params.categoryId));
  }

  if (params.search) {
    const pattern = `%${params.search}%`;
    conditions.push(or(ilike(products.name, pattern), ilike(products.description, pattern)));
  }

  if (params.priceMin !== undefined) {
    const minCents = params.priceMin * 100;
    conditions.push(gte(products.priceCents, minCents));
  }

  if (params.priceMax !== undefined) {
    const maxCents = params.priceMax * 100;
    conditions.push(lte(products.priceCents, maxCents));
  }

  const where = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

  const offset = (params.page - 1) * params.limit;

  const [countResult, rows] = await Promise.all([
    this.db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
    this.db
      .select()
      .from(products)
      .where(where)
      .orderBy(products.createdAt)
      .limit(params.limit)
      .offset(offset),
  ]);

  return {
    products: rows.map(mapProduct),
    total: countResult[0]?.count ?? 0,
  };
}
```

- [ ] **Step 3: Run full API test suite**

Run: `pnpm --filter @kronostore/api test`
Expected: PASS (existing tests still pass, price filtering tested via use case specs)

- [ ] **Step 4: Run typecheck**

Run: `pnpm --filter @kronostore/api typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/products/infra/drizzle-product-repository.ts
git commit -m "feat(products): add price filtering to DrizzleProductRepository"
```

---

### Task 6: API — Update route to pass priceMin/priceMax from query

**Files:**
- Modify: `apps/api/src/modules/products/routes/index.ts:33-42`

- [ ] **Step 1: Update the route handler to pass priceMin/priceMax**

```ts
// apps/api/src/modules/products/routes/index.ts
// Update the GET /products route handler

app.withTypeProvider<ZodTypeProvider>().get(
  "/products",
  {
    schema: {
      tags: ["Products"],
      summary: "Listar produtos do catálogo",
      querystring: listProductsQuerySchema,
    },
  },
  async (request, reply) => {
    const { categoryId, search, priceMin, priceMax, page, limit } = request.query;

    const result = await listProducts.execute({ categoryId, search, priceMin, priceMax, page, limit });
    return reply.send(result);
  },
);
```

- [ ] **Step 2: Run full API test suite**

Run: `pnpm --filter @kronostore/api test`
Expected: PASS

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @kronostore/api typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/products/routes/index.ts
git commit -m "feat(products): pass priceMin/priceMax from query to use case"
```

---

### Task 7: Frontend — Create Pagination component

**Files:**
- Create: `apps/web/src/components/product/pagination.tsx`
- Create: `apps/web/src/components/product/pagination.spec.tsx`

- [ ] **Step 1: Write failing tests for Pagination component**

```tsx
// apps/web/src/components/product/pagination.spec.tsx

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./pagination";

describe("Pagination", () => {
  it("should render page numbers", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should disable previous button on first page", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();
  });

  it("should disable next button on last page", () => {
    render(<Pagination page={5} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /próximo/i })).toBeDisabled();
  });

  it("should call onPageChange when next is clicked", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />);
    await user.click(screen.getByRole("button", { name: /próximo/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("should call onPageChange when previous is clicked", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);
    await user.click(screen.getByRole("button", { name: /anterior/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("should call onPageChange when a page number is clicked", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />);
    await user.click(screen.getByText("3"));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("should not render pagination when totalPages is 1", () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kronostore/web test src/components/product/pagination.spec.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement Pagination component**

```tsx
// apps/web/src/components/product/pagination.tsx

"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
        Anterior
      </Button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
          .map((p, idx, arr) => (
            <span key={p} className="flex items-center">
              {idx > 0 && arr[idx - 1] !== p - 1 && (
                <span className="px-1 text-muted-foreground">...</span>
              )}
              <Button
                variant={p === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            </span>
          ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Próximo
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kronostore/web test src/components/product/pagination.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/product/pagination.tsx apps/web/src/components/product/pagination.spec.tsx
git commit -m "feat(web): add Pagination component"
```

---

### Task 8: Frontend — Create CatalogSidebar component

**Files:**
- Create: `apps/web/src/components/product/catalog-sidebar.tsx`
- Create: `apps/web/src/components/product/catalog-sidebar.spec.tsx`
- Modify: `apps/web/src/mocks/handlers/products.ts` — Add category MSW handler

- [ ] **Step 1: Add category handler to MSW**

```ts
// apps/web/src/mocks/handlers/products.ts
// Add category handler

import { http, HttpResponse } from "msw";

const mockCategories = [
  { id: "cat-001", name: "Eletrônicos", slug: "eletronicos", description: "Eletrônicos e dispositivos" },
  { id: "cat-002", name: "Roupas", slug: "roupas", description: "Roupas e acessórios" },
  { id: "cat-003", name: "Casa", slug: "casa", description: "Decoração e utilidades" },
  { id: "cat-004", name: "Esportes", slug: "esportes", description: "Artigos esportivos" },
];

export const handlers = [
  http.get("*/api/products", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || "1");
    const limit = Number(url.searchParams.get("limit") || "12");
    const category = url.searchParams.get("categoryId");
    const search = url.searchParams.get("search");
    const priceMin = url.searchParams.get("priceMin");
    const priceMax = url.searchParams.get("priceMax");

    let products = [
      {
        id: "prod-001",
        name: "Wireless Headphones",
        slug: "wireless-headphones",
        description: "High-quality wireless headphones with noise cancellation",
        categoryId: "cat-001",
        priceCents: 9990,
        imageUrl: null,
        skuPrefix: "WH",
        isActive: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "prod-002",
        name: "Mechanical Keyboard",
        slug: "mechanical-keyboard",
        description: "RGB mechanical keyboard with Cherry MX switches",
        categoryId: "cat-001",
        priceCents: 14990,
        imageUrl: null,
        skuPrefix: "MK",
        isActive: true,
        createdAt: "2024-01-02T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      },
    ];

    if (category) {
      products = products.filter((p) => p.categoryId === category);
    }
    if (search) {
      const s = search.toLowerCase();
      products = products.filter((p) => p.name.toLowerCase().includes(s));
    }
    if (priceMin) {
      products = products.filter((p) => p.priceCents >= Number(priceMin) * 100);
    }
    if (priceMax) {
      products = products.filter((p) => p.priceCents <= Number(priceMax) * 100);
    }

    const total = products.length;
    const start = (page - 1) * limit;
    const paginatedProducts = products.slice(start, start + limit);

    return HttpResponse.json({ products: paginatedProducts, total, page, limit });
  }),

  http.get("*/api/categories", () => {
    return HttpResponse.json(mockCategories);
  }),
];
```

- [ ] **Step 2: Write failing tests for CatalogSidebar**

```tsx
// apps/web/src/components/product/catalog-sidebar.spec.tsx

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CatalogSidebar } from "./catalog-sidebar";

describe("CatalogSidebar", () => {
  it("should render search input", () => {
    render(<CatalogSidebar onFilterChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/buscar produtos/i)).toBeInTheDocument();
  });

  it("should render category checkboxes", async () => {
    render(<CatalogSidebar onFilterChange={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Eletrônicos")).toBeInTheDocument();
    });
  });

  it("should render price inputs", () => {
    render(<CatalogSidebar onFilterChange={vi.fn()} />);
    expect(screen.getByLabelText(/preço mínimo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preço máximo/i)).toBeInTheDocument();
  });

  it("should call onFilterChange when search is debounced", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<CatalogSidebar onFilterChange={onFilterChange} />);
    
    const searchInput = screen.getByPlaceholderText(/buscar produtos/i);
    await user.type(searchInput, "headphones");
    
    // Wait for debounce (300ms + buffer)
    await new Promise((r) => setTimeout(r, 400));
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: "headphones" })
    );
  });

  it("should call onFilterChange when category is toggled", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<CatalogSidebar onFilterChange={onFilterChange} />);
    
    await waitFor(() => {
      expect(screen.getByText("Eletrônicos")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Eletrônicos"));
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: "cat-001" })
    );
  });

  it("should call onFilterChange when price is entered", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<CatalogSidebar onFilterChange={onFilterChange} />);
    
    const priceMinInput = screen.getByLabelText(/preço mínimo/i);
    await user.type(priceMinInput, "100");
    
    // Wait for debounce
    await new Promise((r) => setTimeout(r, 400));
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ priceMin: 100 })
    );
  });

  it("should reset all filters when clear is clicked", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<CatalogSidebar onFilterChange={onFilterChange} />);
    
    await waitFor(() => {
      expect(screen.getByText("Eletrônicos")).toBeInTheDocument();
    });

    // Set some filters
    await user.type(screen.getByPlaceholderText(/buscar produtos/i), "test");
    await new Promise((r) => setTimeout(r, 400));
    
    // Click clear
    await user.click(screen.getByRole("button", { name: /limpar filtros/i }));
    expect(onFilterChange).toHaveBeenCalledWith({});
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @kronostore/web test src/components/product/catalog-sidebar.spec.tsx`
Expected: FAIL — module not found

- [ ] **Step 4: Implement CatalogSidebar component**

```tsx
// apps/web/src/components/product/catalog-sidebar.tsx

"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { Category } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface CatalogFilters {
  search?: string;
  categoryId?: string;
  priceMin?: number;
  priceMax?: number;
}

interface CatalogSidebarProps {
  onFilterChange: (filters: CatalogFilters) => void;
  initialFilters?: CatalogFilters;
}

export function CatalogSidebar({ onFilterChange, initialFilters = {} }: CatalogSidebarProps) {
  const [search, setSearch] = useState(initialFilters.search ?? "");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    initialFilters.categoryId,
  );
  const [priceMin, setPriceMin] = useState(initialFilters.priceMin?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(initialFilters.priceMax?.toString() ?? "");

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get<Category[]>("/categories");
      return response;
    },
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({
        search: search || undefined,
        categoryId: selectedCategory,
        priceMin: priceMin ? Number(priceMin) : undefined,
        priceMax: priceMax ? Number(priceMax) : undefined,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [search, selectedCategory, priceMin, priceMax, onFilterChange]);

  const handleClear = useCallback(() => {
    setSearch("");
    setSelectedCategory(undefined);
    setPriceMin("");
    setPriceMax("");
    onFilterChange({});
  }, [onFilterChange]);

  const hasFilters = search || selectedCategory || priceMin || priceMax;

  return (
    <aside className="w-full shrink-0 space-y-6 lg:w-64">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Categorias</h3>
        <div className="space-y-2">
          {categories?.map((category) => (
            <label
              key={category.id}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Checkbox
                checked={selectedCategory === category.id}
                onCheckedChange={(checked) => {
                  setSelectedCategory(checked ? category.id : undefined);
                }}
              />
              {category.name}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Preço</h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="priceMin" className="sr-only">
              Preço mínimo
            </Label>
            <Input
              id="priceMin"
              type="number"
              placeholder="Mín"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              min="0"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="priceMax" className="sr-only">
              Preço máximo
            </Label>
            <Input
              id="priceMax"
              type="number"
              placeholder="Máx"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              min="0"
            />
          </div>
        </div>
      </div>

      {hasFilters && (
        <Button variant="outline" size="sm" className="w-full" onClick={handleClear}>
          <X className="mr-2 size-4" />
          Limpar filtros
        </Button>
      )}
    </aside>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @kronostore/web test src/components/product/catalog-sidebar.spec.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/product/catalog-sidebar.tsx apps/web/src/components/product/catalog-sidebar.spec.tsx apps/web/src/mocks/handlers/products.ts
git commit -m "feat(web): add CatalogSidebar component with search, category, and price filters"
```

---

### Task 9: Frontend — Update Header with navigation links

**Files:**
- Modify: `apps/web/src/components/layout/header.tsx`
- Create: `apps/web/src/components/layout/header.spec.tsx`

- [ ] **Step 1: Write failing tests for updated Header**

```tsx
// apps/web/src/components/layout/header.spec.tsx

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "./header";

// Mock the stores
vi.mock("@/stores/cart-store", () => ({
  useCartStore: vi.fn(() => ({
    itemCount: () => 2,
  })),
}));

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: false,
    user: null,
  })),
}));

describe("Header", () => {
  it("should render logo", () => {
    render(<Header />);
    expect(screen.getByText("KronoStore")).toBeInTheDocument();
  });

  it("should render Produtos link", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /produtos/i })).toHaveAttribute("href", "/products");
  });

  it("should render Categorias link", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /categorias/i })).toHaveAttribute("href", "/categories");
  });

  it("should render Meus Pedidos link", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /meus pedidos/i })).toHaveAttribute("href", "/orders");
  });

  it("should render cart link", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /carrinho/i })).toHaveAttribute("href", "/cart");
  });

  it("should show login link when not authenticated", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /entrar/i })).toHaveAttribute("href", "/login");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kronostore/web test src/components/layout/header.spec.tsx`
Expected: FAIL — Produtos/Categorias links not in Header yet

- [ ] **Step 3: Update Header component**

```tsx
// apps/web/src/components/layout/header.tsx

"use client";

import { buttonVariants } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  const itemCount = useCartStore((s) => s.itemCount());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="KronoStore Home">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            K
          </div>
          <span className="text-xl font-bold">KronoStore</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/products" className={buttonVariants({ variant: "ghost" })}>
            Produtos
          </Link>
          <Link href="/categories" className={buttonVariants({ variant: "ghost" })}>
            Categorias
          </Link>
          <Link href="/orders" className={buttonVariants({ variant: "ghost" })}>
            Meus Pedidos
          </Link>
          <Link
            href="/cart"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            aria-label="Carrinho"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {itemCount}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <ThemeToggle />
          ) : (
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kronostore/web test src/components/layout/header.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/header.tsx apps/web/src/components/layout/header.spec.tsx
git commit -m "feat(web): add Produtos and Categorias links to Header"
```

---

### Task 10: Frontend — Create /products catalog page

**Files:**
- Create: `apps/web/src/app/products/page.tsx`
- Create: `apps/web/src/app/products/loading.tsx`
- Create: `apps/web/src/app/products/page.spec.tsx`

- [ ] **Step 1: Write failing tests for /products page**

```tsx
// apps/web/src/app/products/page.spec.tsx

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ProductsPage from "./page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));

describe("ProductsPage", () => {
  it("should render page title", async () => {
    render(<ProductsPage />);
    await waitFor(() => {
      expect(screen.getByText(/produtos/i)).toBeInTheDocument();
    });
  });

  it("should render product grid", async () => {
    render(<ProductsPage />);
    await waitFor(() => {
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });
  });

  it("should render sidebar filters", async () => {
    render(<ProductsPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/buscar produtos/i)).toBeInTheDocument();
    });
  });

  it("should show product count", async () => {
    render(<ProductsPage />);
    await waitFor(() => {
      expect(screen.getByText(/produtos encontrados/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kronostore/web test src/app/products/page.spec.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create loading state**

```tsx
// apps/web/src/app/products/loading.tsx

import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Skeleton className="h-8 w-48 mb-8" />
      <div className="flex gap-8">
        <aside className="w-64 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </aside>
        <div className="flex-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create /products page**

```tsx
// apps/web/src/app/products/page.tsx

"use client";

import { CatalogSidebar } from "@/components/product/catalog-sidebar";
import { Pagination } from "@/components/product/pagination";
import { ProductGrid } from "@/components/product/product-grid";
import { api } from "@/lib/api";
import type { Product } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

interface CatalogFilters {
  search?: string;
  categoryId?: string;
  priceMin?: number;
  priceMax?: number;
}

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<CatalogFilters>({
    search: searchParams.get("search") ?? undefined,
    categoryId: searchParams.get("category") ?? undefined,
    priceMin: searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : undefined,
    priceMax: searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : undefined,
  });

  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const limit = 12;

  const { data, isLoading } = useQuery<{
    products: Product[];
    total: number;
  }>({
    queryKey: ["products", { ...filters, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.search) params.set("search", filters.search);
      if (filters.priceMin) params.set("priceMin", String(filters.priceMin));
      if (filters.priceMax) params.set("priceMax", String(filters.priceMax));
      const response = await api.get<{ products: Product[]; total: number }>(
        `/products?${params.toString()}`,
      );
      return response;
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleFilterChange = useCallback((newFilters: CatalogFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Produtos</h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        <CatalogSidebar onFilterChange={handleFilterChange} initialFilters={filters} />

        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : data && data.products.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {data.total} produto{data.total !== 1 ? "s" : ""} encontrado{data.total !== 1 ? "s" : ""}
              </p>
              <ProductGrid products={data.products} />
              <div className="mt-8">
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <PackageSearch className="mb-4 size-12 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Nenhum produto encontrado</h2>
              <p className="text-sm text-muted-foreground">
                Tente ajustar os filtros ou buscar por outro termo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @kronostore/web test src/app/products/page.spec.tsx`
Expected: PASS

- [ ] **Step 6: Run typecheck**

Run: `pnpm --filter @kronostore/web typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/products/
git commit -m "feat(web): add /products catalog page with filters and pagination"
```

---

### Task 11: Frontend — Create /categories page

**Files:**
- Create: `apps/web/src/app/categories/page.tsx`
- Create: `apps/web/src/app/categories/loading.tsx`
- Create: `apps/web/src/app/categories/page.spec.tsx`

- [ ] **Step 1: Write failing tests for /categories page**

```tsx
// apps/web/src/app/categories/page.spec.tsx

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CategoriesPage from "./page";

describe("CategoriesPage", () => {
  it("should render page title", async () => {
    render(<CategoriesPage />);
    await waitFor(() => {
      expect(screen.getByText(/categorias/i)).toBeInTheDocument();
    });
  });

  it("should render category cards", async () => {
    render(<CategoriesPage />);
    await waitFor(() => {
      expect(screen.getByText("Eletrônicos")).toBeInTheDocument();
      expect(screen.getByText("Roupas")).toBeInTheDocument();
    });
  });

  it("should render category links", async () => {
    render(<CategoriesPage />);
    await waitFor(() => {
      const link = screen.getByText("Eletrônicos").closest("a");
      expect(link).toHaveAttribute("href", "/categories/eletronicos");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kronostore/web test src/app/categories/page.spec.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create loading state**

```tsx
// apps/web/src/app/categories/loading.tsx

import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Skeleton className="h-8 w-48 mb-8" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create /categories page**

```tsx
// apps/web/src/app/categories/page.tsx

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Category } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function CategoriesPage() {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get<Category[]>("/categories");
      return response;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Categorias</h1>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link key={category.id} href={`/categories/${category.slug}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between p-6">
                  <h2 className="text-lg font-semibold">{category.name}</h2>
                  <span className="text-sm text-muted-foreground">→</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">Nenhuma categoria encontrada.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @kronostore/web test src/app/categories/page.spec.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/categories/page.tsx apps/web/src/app/categories/loading.tsx apps/web/src/app/categories/page.spec.tsx
git commit -m "feat(web): add /categories listing page"
```

---

### Task 12: Frontend — Create /categories/[slug] page

**Files:**
- Create: `apps/web/src/app/categories/[slug]/page.tsx`
- Create: `apps/web/src/app/categories/[slug]/loading.tsx`

- [ ] **Step 1: Create loading state**

```tsx
// apps/web/src/app/categories/[slug]/loading.tsx

import { Skeleton } from "@/components/ui/skeleton";

export default function CategoryLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Skeleton className="h-8 w-64 mb-8" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create /categories/[slug] page**

```tsx
// apps/web/src/app/categories/[slug]/page.tsx

"use client";

import { Pagination } from "@/components/product/pagination";
import { ProductGrid } from "@/components/product/product-grid";
import { api } from "@/lib/api";
import type { Category, Product } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, PackageSearch } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [page, setPage] = useState(1);
  const limit = 12;

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get<Category[]>("/categories");
      return response;
    },
  });

  const category = categories?.find((c) => c.slug === slug);

  const { data, isLoading } = useQuery<{
    products: Product[];
    total: number;
  }>({
    queryKey: ["products", { categoryId: category?.id, page, limit }],
    queryFn: async () => {
      if (!category) return { products: [], total: 0 };
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("categoryId", category.id);
      const response = await api.get<{ products: Product[]; total: number }>(
        `/products?${params.toString()}`,
      );
      return response;
    },
    enabled: !!category,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  if (!category && categories) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PackageSearch className="mb-4 size-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Categoria não encontrada</h2>
        <Link href="/categories" className="mt-4 text-sm text-primary hover:underline">
          ← Voltar para categorias
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/categories" className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-2xl font-bold">{category?.name ?? "Carregando..."}</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.products.length > 0 ? (
        <>
          <ProductGrid products={data.products} />
          <div className="mt-8">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PackageSearch className="mb-4 size-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Nenhum produto nesta categoria</h2>
          <Link href="/products" className="mt-4 text-sm text-primary hover:underline">
            Ver todos os produtos →
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @kronostore/web typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/categories/[slug]/"
git commit -m "feat(web): add /categories/[slug] detail page"
```

---

### Task 13: Frontend — Update homepage button

**Files:**
- Modify: `apps/web/src/app/page.tsx:16`

- [ ] **Step 1: Change "Ver Catálogo" button href**

```tsx
// apps/web/src/app/page.tsx
// Change line 16 from:

<Link href="#produtos">
  <Button size="lg">Ver Catálogo</Button>
</Link>

// To:

<Link href="/products">
  <Button size="lg">Ver Catálogo</Button>
</Link>
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter @kronostore/web typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat(web): update homepage Ver Catálogo button to link to /products"
```

---

### Task 14: Frontend — Update ProductGrid to accept products prop

**Files:**
- Modify: `apps/web/src/components/product/product-grid.tsx`

- [ ] **Step 1: Check current ProductGrid implementation**

The current `ProductGrid` fetches data internally via `useQuery`. For the `/products` and `/categories/[slug]` pages, we need it to accept products as a prop instead. Let me update it to support both modes.

- [ ] **Step 2: Update ProductGrid to accept optional products prop**

```tsx
// apps/web/src/components/product/product-grid.tsx

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Product } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";
import { ProductCard } from "./product-card";

interface ProductGridProps {
  products?: Product[];
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
}

function ProductCardSkeleton() {
  return (
    <Card className="h-full">
      <Skeleton className="aspect-square rounded-t-xl" />
      <CardContent className="flex flex-col gap-2 pt-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-0">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-8 w-20" />
      </CardFooter>
    </Card>
  );
}

export function ProductGrid({ products: productsProp, page = 1, limit = 12, categoryId, search }: ProductGridProps) {
  const { data, isLoading, error } = useQuery<{ products: Product[] }>({
    queryKey: ["products", { page, limit, categoryId, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (categoryId) params.set("categoryId", categoryId);
      if (search) params.set("search", search);
      const response = await api.get<{ products: Product[] }>(`/products?${params.toString()}`);
      return response;
    },
    enabled: !productsProp, // Only fetch if products not provided
  });

  const products = productsProp ?? data?.products ?? [];

  if (isLoading && !productsProp) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PackageSearch className="mb-4 size-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Erro ao carregar produtos</h2>
        <p className="text-sm text-muted-foreground">Tente novamente mais tarde.</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PackageSearch className="mb-4 size-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Nenhum produto encontrado</h2>
        <p className="text-sm text-muted-foreground">Adicione produtos para continuar comprando.</p>
        <Button asChild className="mt-4">
          <a href="/products">Ver Catálogo</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @kronostore/web test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/product/product-grid.tsx
git commit -m "feat(web): update ProductGrid to accept optional products prop"
```

---

### Task 15: E2E — Add catalog browse test

**Files:**
- Create: `apps/web/tests/e2e/catalog-browse.spec.ts`

- [ ] **Step 1: Write E2E test for catalog browsing**

```ts
// apps/web/tests/e2e/catalog-browse.spec.ts

import { expect, test } from "@playwright/test";

test.describe("Catalog Browse", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should navigate to /products from header", async ({ page }) => {
    await page.getByRole("link", { name: "Produtos" }).click();
    await expect(page).toHaveURL("/products");
    await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();
  });

  test("should navigate to /categories from header", async ({ page }) => {
    await page.getByRole("link", { name: "Categorias" }).click();
    await expect(page).toHaveURL("/categories");
    await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible();
  });

  test("should display products on /products page", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByText("Wireless Headphones")).toBeVisible();
  });

  test("should display categories on /categories page", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.getByText("Eletrônicos")).toBeVisible();
  });

  test("should navigate to category detail from categories page", async ({ page }) => {
    await page.goto("/categories");
    await page.getByText("Eletrônicos").click();
    await expect(page).toHaveURL("/categories/eletronicos");
  });

  test("should filter products by category on /products page", async ({ page }) => {
    await page.goto("/products");
    
    // Wait for categories to load
    await expect(page.getByText("Eletrônicos")).toBeVisible();
    
    // Click category checkbox
    await page.getByText("Eletrônicos").click();
    
    // URL should update with category param
    await expect(page).toHaveURL(/categoryId=/);
  });

  test("should search products on /products page", async ({ page }) => {
    await page.goto("/products");
    
    const searchInput = page.getByPlaceholderText("Buscar produtos...");
    await searchInput.fill("headphones");
    
    // Wait for debounce
    await page.waitForTimeout(400);
    
    // URL should update with search param
    await expect(page).toHaveURL(/search=headphones/);
  });
});
```

- [ ] **Step 2: Run E2E tests**

Run: `pnpm --filter @kronostore/web test:e2e`
Expected: PASS (requires API and web running)

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/e2e/catalog-browse.spec.ts
git commit -m "test(e2e): add catalog browsing tests"
```

---

### Task 16: Final verification

- [ ] **Step 1: Run full API test suite**

Run: `pnpm --filter @kronostore/api test`
Expected: PASS

- [ ] **Step 2: Run full web test suite**

Run: `pnpm --filter @kronostore/web test`
Expected: PASS

- [ ] **Step 3: Run typecheck for both packages**

Run: `pnpm --filter @kronostore/api typecheck && pnpm --filter @kronostore/web typecheck`
Expected: PASS

- [ ] **Step 4: Run lint**

Run: `pnpm format`
Expected: PASS

- [ ] **Step 5: Verify all commits are clean**

Run: `git log --oneline -10`
Expected: All commits present and clean
