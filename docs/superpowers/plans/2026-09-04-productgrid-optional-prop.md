# ProductGrid Optional Products Prop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update ProductGrid component to accept an optional `products` prop, enabling pre-fetched product rendering while preserving backward compatibility for fetching mode.

**Architecture:** Conditional UI based on presence of `products` prop. When prop provided, skip useQuery and render products directly. When not provided, fetch via useQuery as before. Error and empty states differ between modes to maintain existing homepage behavior.

**Tech Stack:** React, TypeScript, TanStack Query, Zod, Vitest

---

### Task 1: Update ProductGrid component interface and logic

**Files:**
- Modify: `apps/web/src/components/product/product-grid.tsx`

- [ ] **Step 1: Read current implementation**

```bash
cat apps/web/src/components/product/product-grid.tsx
```

- [ ] **Step 2: Update ProductGridProps interface**

Add optional `products` prop to interface:

```tsx
interface ProductGridProps {
  products?: Product[];
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
}
```

- [ ] **Step 3: Update function signature and useQuery logic**

Destructure `products` as `productsProp`, add `enabled: !productsProp` to useQuery:

```tsx
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
    enabled: !productsProp,
  });

  const products = productsProp ?? data?.products ?? [];
```

- [ ] **Step 4: Update loading state condition**

Only show loading skeletons when fetching (no products prop):

```tsx
  if (isLoading && !productsProp) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }
```

- [ ] **Step 5: Update error state (conditional UI)**

For fetching mode (no products prop), keep existing error state with retry button. For products prop mode, show new error state (though error cannot occur when products are provided):

```tsx
  if (error) {
    if (productsProp) {
      // Products prop provided but error occurred (shouldn't happen)
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PackageSearch className="mb-4 size-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Erro ao carregar produtos</h2>
          <p className="text-sm text-muted-foreground">Tente novamente mais tarde.</p>
        </div>
      );
    }
    // Fetching mode error state
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <PackageSearch className="size-12 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium">Erro ao carregar produtos</h3>
          <p className="text-sm text-muted-foreground">Tente novamente mais tarde.</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }
```

- [ ] **Step 6: Update empty state (conditional UI)**

For fetching mode (no products prop), keep existing empty state. For products prop mode, show new empty state with "Ver Catálogo" button:

```tsx
  if (products.length === 0) {
    if (productsProp) {
      // Products prop provided but empty
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
    // Fetching mode empty state
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <PackageSearch className="size-12 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium">Nenhum produto encontrado</h3>
          <p className="text-sm text-muted-foreground">
            Não encontramos produtos disponíveis no momento.
          </p>
        </div>
      </div>
    );
  }
```

- [ ] **Step 7: Run existing tests to ensure no regression**

Run: `pnpm --filter @kronostore/web test`
Expected: PASS (existing tests should still pass)

- [ ] **Step 8: Commit changes**

```bash
git add apps/web/src/components/product/product-grid.tsx
git commit -m "feat(web): update ProductGrid to accept optional products prop"
```

### Task 2: Add tests for products prop functionality

**Files:**
- Modify: `apps/web/src/components/product/product-grid.spec.tsx`

- [ ] **Step 1: Read existing test file**

```bash
cat apps/web/src/components/product/product-grid.spec.tsx
```

- [ ] **Step 2: Add test for rendering products from prop**

Add test case that passes products prop and verifies they render without API call:

```tsx
it("should render products from prop without fetching", async () => {
  const mockProducts = [
    { id: "1", name: "Test Product", slug: "test-product", description: "Test", priceCents: 1000, images: [] },
  ];
  
  renderWithQuery(<ProductGrid products={mockProducts} />);
  
  expect(screen.getByText("Test Product")).toBeInTheDocument();
  expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Add test for empty products prop**

Add test case for empty products array with products prop:

```tsx
it("should show empty state with Ver Catálogo button when products prop is empty array", async () => {
  renderWithQuery(<ProductGrid products={[]} />);
  
  expect(await screen.findByText(/nenhum produto encontrado/i)).toBeInTheDocument();
  expect(screen.getByText("Ver Catálogo")).toBeInTheDocument();
});
```

- [ ] **Step 4: Add test for loading state not shown with products prop**

Add test case to verify loading skeletons not shown when products prop provided:

```tsx
it("should not show loading skeletons when products prop is provided", async () => {
  server.use(
    http.get(`${API_URL}/products`, () => {
      return new HttpResponse(null, { status: 500 });
    }),
  );

  const mockProducts = [
    { id: "1", name: "Test Product", slug: "test-product", description: "Test", priceCents: 1000, images: [] },
  ];
  
  const { container } = renderWithQuery(<ProductGrid products={mockProducts} />);
  
  const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
  expect(skeletons.length).toBe(0);
  expect(screen.getByText("Test Product")).toBeInTheDocument();
});
```

- [ ] **Step 5: Run tests to verify new tests pass**

Run: `pnpm --filter @kronostore/web test`
Expected: PASS

- [ ] **Step 6: Commit test additions**

```bash
git add apps/web/src/components/product/product-grid.spec.tsx
git commit -m "test(web): add tests for ProductGrid products prop"
```

### Task 3: Verify backward compatibility

**Files:**
- None (verification only)

- [ ] **Step 1: Test homepage still works**

Visit homepage in browser or run existing homepage tests if any. Verify ProductGrid renders with fetching mode (loading skeletons, then products).

- [ ] **Step 2: Test /products page integration**

If /products page exists, verify it can pass products prop to ProductGrid and render correctly.

- [ ] **Step 3: Run full test suite**

Run: `pnpm --filter @kronostore/web test`
Expected: ALL TESTS PASS

- [ ] **Step 4: Run type checking**

Run: `pnpm --filter @kronostore/web typecheck`
Expected: NO TYPE ERRORS

---

## Self-Review

1. **Spec coverage:** Task covers adding optional products prop with conditional UI, preserving backward compatibility for error/empty states in fetching mode.

2. **Placeholder scan:** No placeholders found. All steps include concrete code and commands.

3. **Type consistency:** Product type used consistently, props interface matches usage.

4. **Backward compatibility:** Existing tests should pass unchanged, confirming no regression.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-04-productgrid-optional-prop.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?