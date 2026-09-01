# Task 6: Frontend Customer Storefront — Design Spec

## Overview

Build the customer-facing storefront for KronoStore using Next.js App Router, Tailwind CSS, shadcn/ui, Zustand, and TanStack Query. Includes dark/light theme with system preference detection and manual toggle.

## Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **State:** Zustand (cart, auth) + TanStack Query (API data fetching)
- **Theme:** next-themes (system preference + manual override)
- **Testing:** Vitest + React Testing Library + MSW v2 (unit), Playwright (e2e)
- **API Client:** Native fetch with `NEXT_PUBLIC_API_URL` env var

## Pages & Routes

| Route | Page | Auth Required | Description |
|-------|------|---------------|-------------|
| `/` | Home | No | Hero banner + product catalog grid |
| `/product/[slug]` | Product Detail | No | Product info, variants, add to cart |
| `/cart` | Cart | No | Cart items, quantities, coupon, total |
| `/checkout` | Checkout | Yes | Address, payment method, order summary |
| `/checkout/success` | Order Confirmation | Yes | Order ID, status, next steps |
| `/orders` | My Orders | Yes | List of user's orders |
| `/orders/[id]` | Order Detail | Yes | Order status, items, payment info |
| `/login` | Login | No | Email/password form |
| `/register` | Register | No | Name, email, password form |

## Theme System

### Colors

**Dark Mode (default):**
- Background: `#0A0A0A`
- Card: `#141414`
- Border: `#262626`
- Text: `#FAFAFA`
- Muted: `#A1A1AA`
- Primary/Accent: `#FACC15` (yellow-400)
- Primary Hover: `#EAB308` (yellow-500)

**Light Mode:**
- Background: `#FFFFFF`
- Card: `#F5F5F5`
- Border: `#E5E5E5`
- Text: `#18181B`
- Muted: `#71717A`
- Primary/Accent: `#CA8A04` (yellow-600)
- Primary Hover: `#A16207` (yellow-700)

### Behavior

1. On first visit: detect `prefers-color-scheme` from OS
2. Persist user preference in `localStorage` via next-themes
3. Toggle button in header (sun/moon icon)
4. Apply `class` strategy to `<html>` element

## Component Architecture

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (providers, theme, nav)
│   │   ├── page.tsx                # Home page
│   │   ├── product/[slug]/
│   │   │   └── page.tsx            # Product detail
│   │   ├── cart/
│   │   │   └── page.tsx            # Cart page
│   │   ├── checkout/
│   │   │   ├── page.tsx            # Checkout form
│   │   │   └── success/
│   │   │       └── page.tsx        # Order confirmation
│   │   ├── orders/
│   │   │   ├── page.tsx            # Order list
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Order detail
│   │   ├── login/
│   │   │   └── page.tsx            # Login form
│   │   └── register/
│   │       └── page.tsx            # Register form
│   ├── components/
│   │   ├── layout/
│   │   │   ├── header.tsx          # Nav bar with logo, links, theme toggle
│   │   │   ├── footer.tsx          # Site footer
│   │   │   └── theme-toggle.tsx    # Dark/light switch
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── product/
│   │   │   ├── product-card.tsx    # Card for grid
│   │   │   └── product-grid.tsx    # Responsive grid
│   │   ├── cart/
│   │   │   ├── cart-item.tsx       # Single cart row
│   │   │   └── cart-summary.tsx    # Totals, coupon, checkout button
│   │   └── checkout/
│   │       ├── checkout-form.tsx   # Address + payment form
│   │       └── payment-picker.tsx  # PIX/Card/Boleto selector
│   ├── hooks/
│   │   ├── use-cart.ts             # Cart operations
│   │   └── use-auth.ts             # Auth state
│   ├── lib/
│   │   ├── api.ts                  # Fetch wrapper with auth headers
│   │   ├── utils.ts                # Currency format (BRL), cn()
│   │   └── constants.ts            # API URLs, config
│   ├── stores/
│   │   ├── cart-store.ts           # Zustand cart (items, quantities)
│   │   └── auth-store.ts           # Zustand auth (user, token)
│   ├── mocks/
│   │   ├── handlers/
│   │   │   ├── products.ts         # MSW handlers for products
│   │   │   ├── cart.ts             # MSW handlers for cart
│   │   │   ├── orders.ts           # MSW handlers for orders
│   │   │   └── auth.ts             # MSW handlers for auth
│   │   └── server.ts               # MSW server setup
│   └── types/
│       └── index.ts                # Shared TypeScript types
├── components.json                 # shadcn/ui config
├── vitest.config.ts                # Unit test config
├── playwright.config.ts            # E2E test config
└── tests/
    └── e2e/                        # Playwright tests
```

## Data Flow

### Product Listing (Home Page)
1. `ProductGrid` component uses TanStack Query: `useQuery({ queryKey: ['products'], queryFn: fetchProducts })`
2. API call: `GET /api/products`
3. Render `ProductCard` for each product

### Cart (Zustand)
1. `cart-store.ts` manages: items[], addItem, removeItem, updateQuantity, clearCart
2. Persist to localStorage via Zustand middleware
3. On login: sync guest cart with server cart

### Checkout
1. Form validates with Zod
2. `POST /api/checkout` with idempotency key
3. Redirect to `/checkout/success?orderId=xxx`

### Auth (Zustand)
1. `auth-store.ts` manages: user, token, login, logout, isAuthenticated
2. Persist token to localStorage
3. Attach `Authorization` header to API requests

## API Integration

```typescript
// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) throw new ApiError(res.status, await res.json())
  return res.json()
}
```

## Key Behaviors

- **Login required** for checkout, orders, order history
- **Cart persists** in localStorage (guest) + syncs on login
- **Real-time stock** shown on product cards (fetched from API)
- **BRL currency** formatting: `R$ X.XXX,XX`
- **Responsive:** mobile-first grid (1→2→3 columns)
- **Loading states:** skeleton loaders for products, cart
- **Error states:** toast notifications for API errors

## Testing Strategy

### Unit/Component Tests (Vitest + RTL + MSW)

Co-located with source files:
- `product-card.spec.tsx` — renders name, price, stock, links correctly
- `product-grid.spec.tsx` — renders list, handles empty state
- `cart-item.spec.tsx` — quantity change, remove, price display
- `cart-summary.spec.tsx` — totals calculation, coupon apply
- `checkout-form.spec.tsx` — form validation, submission
- `payment-picker.spec.tsx` — method selection
- `theme-toggle.spec.tsx` — toggle works, persists
- `use-cart.spec.ts` — Zustand store operations
- `use-auth.spec.ts` — Zustand store operations

### E2E Tests (Playwright)

Centralized in `tests/e2e/`:
- `browse-products.spec.ts` — view catalog, click product
- `cart-flow.spec.ts` — add to cart, update quantity, checkout
- `auth-flow.spec.ts` — register, login, protected routes
- `theme-toggle.spec.ts` — dark/light switch persists

## Implementation Order

1. Scaffold Next.js app + Tailwind + shadcn/ui
2. Theme system (next-themes, dark/light colors, toggle)
3. Layout components (header, footer)
4. API client + TanStack Query setup
5. Product listing (home page)
6. Product detail page
7. Zustand cart store + cart page
8. Auth store + login/register pages
9. Checkout page + order confirmation
10. Orders list + detail pages
11. Unit/component tests
12. E2E tests
