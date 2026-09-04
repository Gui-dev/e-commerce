# Design: Catalog Routes (/products, /categories)

**Date:** 2026-09-04
**Status:** Approved
**Scope:** Frontend catalog pages + API price filtering + navigation bar

## Overview

Add full catalog browsing to the web storefront: dedicated `/products` and `/categories` pages with filtering, search, pagination, and a navigation bar. Extend the API to support price filtering.

## Approach

Client-side routing with URL search params for filter state. Consistent with existing `ProductGrid` pattern (client components + `useQuery`). URLs are shareable via search params.

## New Files

### 1. `apps/web/src/components/layout/navbar.tsx`

Navigation bar component displayed on all pages:
- **Left:** "KronoStore" logo linking to `/`
- **Center:** Links — "Produtos" (`/products`), "Categorias" (`/categories`)
- **Right:** Search input (on larger screens) that redirects to `/products?search=...` + Auth button (login link or user info)
- Responsive: simple mobile menu (hamburger) as follow-up; MVP is desktop-only

### 2. `apps/web/src/app/products/page.tsx`

Full catalog page:
- **Layout:** Sidebar (280px fixed) + Main content (flex-1)
- **Sidebar:**
  - Search input (text, debounced 300ms, updates `?search=` param)
  - Category filter (checkboxes, fetched from `GET /categories`, updates `?category=` param)
  - Price range filter (two number inputs: min/max, updates `?priceMin=`/`?priceMax=` params)
  - "Limpar filtros" button (resets all params)
- **Main content:**
  - Product count ("X produtos encontrados")
  - Product grid (reuse existing `ProductGrid` component)
  - Pagination (previous/next + page numbers)
- **URL sync:** All filters reflected in search params (`?category=uuid&search=text&page=2&priceMin=100&priceMax=500`)
- **Empty state:** "Nenhum produto encontrado" message

### 3. `apps/web/src/app/categories/page.tsx`

Category listing page:
- Fetches from `GET /categories`
- Displays categories as a card grid (2-3 columns)
- Each card shows: category name (as link to `/categories/[slug]`)
- Simple, clean design

### 4. `apps/web/src/app/categories/[slug]/page.tsx`

Category detail page:
- Fetches category by slug from `GET /categories` (find by slug)
- Fetches products filtered by category from `GET /products?category=<categoryId>`
- Shows category name as page title
- Product grid + pagination (no sidebar — simpler than `/products`)
- Empty state when no products in category

## Modified Files

### 5. `apps/web/src/app/layout.tsx`

- Import and render `<Navbar />` above `{children}`
- Ensure layout has proper padding/margin for the nav bar

### 6. `apps/web/src/app/page.tsx`

- Change "Ver Catálogo" button `href` from `#produtos` to `/products`
- Keep the "Produtos em Destaque" section with `ProductGrid` (limit 8)

### 7. `apps/api/src/modules/products/schemas/product.schema.ts`

Extend `listProductsQuerySchema`:
```ts
priceMin: z.coerce.number().int().positive().optional(),
priceMax: z.coerce.number().int().positive().optional(),
```

### 8. `apps/api/src/modules/products/use-cases/list-products.use-case.ts`

- Add `priceMin`/`priceMax` to the input type
- Pass to repository's `list` method

### 9. `apps/api/src/modules/products/infra/drizzle-product-repository.ts`

- Add price filtering: `gte(products.priceCents, priceMin * 100)` and `lte(products.priceCents, priceMax * 100)`

### 10. `apps/api/src/modules/products/infra/in-memory-product-repository.ts`

- Add price filtering in the in-memory filter logic

## API Changes

`GET /products` — add optional query params:
- `priceMin` (number, positive) — minimum price in BRL (converted to cents internally)
- `priceMax` (number, positive) — maximum price in BRL (converted to cents internally)

Response shape unchanged.

## Testing

### API
- Unit test: `list-products.use-case.spec.ts` — add tests for price filtering (min only, max only, both, no results)
- Unit test: `in-memory-product-repository.spec.ts` — add tests for price filtering
- Integration test: existing `list-products.use-case.spec.ts` with DB — verify price filtering works with real data

### Frontend
- Unit test: `navbar.spec.tsx` — renders links, search input, auth state
- Unit test: `products/page.spec.tsx` — renders filters, products, pagination (MSW)
- Unit test: `categories/page.spec.tsx` — renders category cards (MSW)
- E2E test: `catalog-browse.spec.ts` — navigate /products, filter by category, search, verify results

## Out of Scope

- Mobile responsive nav bar (hamburger menu) — follow-up
- Sort dropdown (price asc/desc, name) — follow-up
- Category product count on categories page — requires API change
- SEO/server rendering — acceptable for learning project

## Commit Strategy

1. `feat(api): add price filtering to GET /products`
2. `feat(web): add navbar component`
3. `feat(web): add /products catalog page with filters`
4. `feat(web): add /categories listing page`
5. `feat(web): add /categories/[slug] detail page`
6. `test: add catalog route tests`
