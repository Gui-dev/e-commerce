# Task 6: Frontend Customer Storefront — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the customer-facing storefront with Next.js App Router, Tailwind, shadcn/ui, dark/light themes, cart, auth, and checkout.

**Architecture:** Next.js App Router with co-located components, Zustand for client state (cart/auth), TanStack Query for server state (products/orders), next-themes for dark/light mode, and MSW for testing.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS v4, shadcn/ui, Zustand, TanStack Query, next-thems, Vitest, React Testing Library, MSW v2, Playwright

---

## File Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── product/[slug]/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── checkout/success/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── orders/[id]/page.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── components/
│   │   ├── layout/header.tsx
│   │   ├── layout/footer.tsx
│   │   ├── layout/theme-toggle.tsx
│   │   ├── ui/ (shadcn)
│   │   ├── product/product-card.tsx
│   │   ├── product/product-grid.tsx
│   │   ├── cart/cart-item.tsx
│   │   ├── cart/cart-summary.tsx
│   │   ├── checkout/checkout-form.tsx
│   │   └── checkout/payment-picker.tsx
│   ├── hooks/use-cart.ts
│   ├── hooks/use-auth.ts
│   ├── lib/api.ts
│   ├── lib/utils.ts
│   ├── lib/constants.ts
│   ├── stores/cart-store.ts
│   ├── stores/auth-store.ts
│   ├── mocks/handlers/*.ts
│   ├── mocks/server.ts
│   └── types/index.ts
├── public/
├── components.json
├── vitest.config.ts
├── playwright.config.ts
├── tests/e2e/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

### Task 1: Scaffold Next.js App

**Files:**
- Create: `apps/web/` (entire Next.js app)

- [ ] **Step 1: Create Next.js app**

```bash
pnpm create next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-pnpm
```

- [ ] **Step 2: Update workspace config**

Add `apps/web` to root `package.json` workspaces if not auto-added. Add to `turbo.json` dev pipeline.

- [ ] **Step 3: Verify dev server starts**

```bash
pnpm dev:web
```

Expected: App starts on http://localhost:3000

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "chore(web): scaffold Next.js app with Tailwind"
```

---

### Task 2: Install Dependencies

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install core dependencies**

```bash
cd apps/web && pnpm add zustand @tanstack/react-query next-themes clsx tailwind-merge class-variance-authority lucide-react
```

- [ ] **Step 2: Install shadcn/ui**

```bash
cd apps/web && pnpm add -D @types/node
npx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables: yes

- [ ] **Step 3: Add shadcn components**

```bash
npx shadcn@latest add button card input label tabs toast select separator badge dropdown-menu
```

- [ ] **Step 4: Install testing dependencies**

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event msw @mswjs/node jsdom
```

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "chore(web): install dependencies (zustand, tanstack-query, shadcn, msw)"
```

---

### Task 3: Theme System Setup

**Files:**
- Create: `apps/web/src/components/layout/theme-toggle.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/tailwind.config.ts`

- [ ] **Step 1: Configure Tailwind for dark mode**

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border: "hsl(var(--border))",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: Create theme toggle component**

```tsx
// src/components/layout/theme-toggle.tsx
"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

- [ ] **Step 3: Update root layout with ThemeProvider**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "KronoStore",
  description: "Hardware & peripherals of high performance",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Create ThemeProvider wrapper**

```tsx
// src/components/theme-provider.tsx
"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ComponentProps } from "react"

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

- [ ] **Step 5: Update globals.css with theme variables**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --primary: 48 96% 53%;
    --primary-foreground: 0 0% 2%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --border: 240 5.9% 90%;
  }

  .dark {
    --background: 0 0% 4%;
    --foreground: 0 0% 98%;
    --card: 0 0% 8%;
    --card-foreground: 0 0% 98%;
    --primary: 48 96% 53%;
    --primary-foreground: 0 0% 2%;
    --muted: 0 0% 15%;
    --muted-foreground: 0 0% 63%;
    --border: 0 0% 15%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 6: Verify theme toggle works**

Run `pnpm dev:web`, click toggle, verify dark/light switch, refresh page to verify persistence.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add dark/light theme system with next-themes"
```

---

### Task 4: Layout Components

**Files:**
- Create: `apps/web/src/components/layout/header.tsx`
- Create: `apps/web/src/components/layout/footer.tsx`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Create header component**

```tsx
// src/components/layout/header.tsx
"use client"

import Link from "next/link"
import { ShoppingCart, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./theme-toggle"
import { useCartStore } from "@/stores/cart-store"

export function Header() {
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            K
          </div>
          <span className="text-xl font-bold">KronoStore</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/orders">
            <Button variant="ghost">Meus Pedidos</Button>
          </Link>
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Create footer component**

```tsx
// src/components/layout/footer.tsx
export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        <p>KronoStore &copy; {new Date().getFullYear()} — Aprendizado Full-Stack</p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 3: Update layout with header/footer**

```tsx
// src/app/layout.tsx (update body)
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

// ... in body:
<body className={inter.className}>
  <ThemeProvider ...>
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  </ThemeProvider>
</body>
```

- [ ] **Step 4: Verify layout renders**

Run dev server, verify header with logo, nav links, cart icon, theme toggle, and footer.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add header and footer layout components"
```

---

### Task 5: Types & API Client

**Files:**
- Create: `apps/web/src/types/index.ts`
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/utils.ts`
- Create: `apps/web/src/lib/constants.ts`

- [ ] **Step 1: Create shared types**

```typescript
// src/types/index.ts
export interface Product {
  id: string
  name: string
  slug: string
  description: string
  priceCents: number
  categoryId: string
  categoryName?: string
  skuPrefix: string
  imageUrl?: string
  variants: ProductVariant[]
  createdAt: string
}

export interface ProductVariant {
  id: string
  name: string
  sku: string
  priceCents: number
  stockQuantity: number
}

export interface CartItem {
  variantId: string
  productId: string
  name: string
  variantName: string
  sku: string
  priceCents: number
  quantity: number
  imageUrl?: string
}

export interface Order {
  id: string
  userId: string
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  totalCents: number
  items: OrderItem[]
  createdAt: string
}

export interface OrderItem {
  id: string
  variantId: string
  productName: string
  variantName: string
  quantity: number
  unitPriceCents: number
}

export interface User {
  id: string
  name: string
  email: string
}
```

- [ ] **Step 2: Create API client**

```typescript
// src/lib/api.ts
import { useAuthStore } from "@/stores/auth-store"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API Error: ${status}`)
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = useAuthStore.getState().token

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (!res.ok) {
    throw new ApiError(res.status, await res.json().catch(() => null))
  }

  return res.json()
}
```

- [ ] **Step 3: Create utils**

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100)
}
```

- [ ] **Step 4: Create constants**

```typescript
// src/lib/constants.ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/types apps/web/src/lib
git commit -m "feat(web): add types, API client, and utilities"
```

---

### Task 6: Zustand Stores

**Files:**
- Create: `apps/web/src/stores/cart-store.ts`
- Create: `apps/web/src/stores/auth-store.ts`

- [ ] **Step 1: Create cart store**

```typescript
// src/stores/cart-store.ts
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CartItem } from "@/types"

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  clearCart: () => void
  totalCents: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
                  : i,
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity: item.quantity ?? 1 }] }
        }),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) =>
                  i.variantId === variantId ? { ...i, quantity } : i,
                ),
        })),

      clearCart: () => set({ items: [] }),

      totalCents: () => get().items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
    }),
    { name: "kronostore-cart" },
  ),
)
```

- [ ] **Step 2: Create auth store**

```typescript
// src/stores/auth-store.ts
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User } from "@/types"
import { apiFetch } from "@/lib/api"

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const data = await apiFetch<{ user: User; token: string }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        })
        set({ user: data.user, token: data.token, isAuthenticated: true })
      },

      register: async (name, email, password) => {
        const data = await apiFetch<{ user: User; token: string }>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
        })
        set({ user: data.user, token: data.token, isAuthenticated: true })
      },

      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: "kronostore-auth" },
  ),
)
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/stores
git commit -m "feat(web): add Zustand stores for cart and auth"
```

---

### Task 7: Product Listing (Home Page)

**Files:**
- Create: `apps/web/src/components/product/product-card.tsx`
- Create: `apps/web/src/components/product/product-grid.tsx`
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Create product card**

```tsx
// src/components/product/product-card.tsx
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatBRL } from "@/lib/utils"
import type { Product } from "@/types"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const price = product.variants[0]?.priceCents ?? product.priceCents
  const stock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0)

  return (
    <Card className="overflow-hidden transition-colors hover:bg-muted/50">
      <Link href={`/product/${product.slug}`}>
        <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-4xl">📦</span>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="text-xs">
            SKU: {product.skuPrefix}
          </Badge>
          {stock <= 5 && (
            <Badge variant="destructive" className="text-xs">
              {stock <= 3 ? `POUCAS UN: ${stock}` : `ESTOQUE: ${stock}`}
            </Badge>
          )}
        </div>
        <h3 className="font-semibold line-clamp-1">{product.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {product.description}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">PREÇO À VISTA</p>
          <p className="text-lg font-bold">{formatBRL(price)}</p>
        </div>
        <Link href={`/product/${product.slug}`}>
          <Button>+ Comprar</Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
```

- [ ] **Step 2: Create product grid**

```tsx
// src/components/product/product-grid.tsx
"use client"

import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import type { Product } from "@/types"
import { ProductCard } from "./product-card"

export function ProductGrid() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<Product[]>("/api/products"),
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-96 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Erro ao carregar produtos.
      </div>
    )
  }

  if (!products?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum produto encontrado.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Update home page**

```tsx
// src/app/page.tsx
import { ProductGrid } from "@/components/product/product-grid"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-12 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 p-8">
        <h1 className="text-4xl font-bold mb-4">
          Monte seu Setup dos Sonhos com Entrega Expressa.
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Pagamentos instantâneos via PIX ou Cartão com confirmação via Webhooks em tempo real e
          processamento assíncrono idempotente.
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Catálogo de Produtos</h2>
            <p className="text-sm text-muted-foreground">
              Estoque atualizado em tempo real via PostgreSQL + Redis Cache.
            </p>
          </div>
        </div>
        <ProductGrid />
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Add QueryClientProvider to layout**

```tsx
// src/app/layout.tsx
"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

// Add inside ThemeProvider in body:
const [queryClient] = useState(() => new QueryClient())
<QueryClientProvider client={queryClient}>
  {children}
</QueryClientProvider>
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add product listing with home page"
```

---

### Task 8: Product Detail Page

**Files:**
- Create: `apps/web/src/app/product/[slug]/page.tsx`

- [ ] **Step 1: Create product detail page**

```tsx
// src/app/product/[slug]/page.tsx
"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { formatBRL } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCartStore } from "@/stores/cart-store"
import type { Product } from "@/types"
import { useState } from "react"

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const addItem = useCartStore((s) => s.addItem)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => apiFetch<Product>(`/api/products/${slug}`),
  })

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8"><div className="h-96 animate-pulse rounded-lg bg-muted" /></div>
  }

  if (!product) {
    return <div className="container mx-auto px-4 py-8 text-center">Produto não encontrado.</div>
  }

  const variant = product.variants.find((v) => v.id === selectedVariant) ?? product.variants[0]
  const price = variant?.priceCents ?? product.priceCents

  const handleAddToCart = () => {
    if (!variant) return
    addItem({
      variantId: variant.id,
      productId: product.id,
      name: product.name,
      variantName: variant.name,
      sku: variant.sku,
      priceCents: variant.priceCents,
      imageUrl: product.imageUrl,
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover rounded-lg" />
          ) : (
            <span className="text-6xl">📦</span>
          )}
        </div>

        <div>
          <Badge variant="secondary" className="mb-2">SKU: {product.skuPrefix}</Badge>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <p className="text-muted-foreground mb-4">{product.description}</p>

          {product.variants.length > 1 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Variant:</p>
              <div className="flex gap-2">
                {product.variants.map((v) => (
                  <Button
                    key={v.id}
                    variant={v.id === variant?.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedVariant(v.id)}
                    disabled={v.stockQuantity === 0}
                  >
                    {v.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <p className="text-xs text-muted-foreground">PREÇO À VISTA</p>
            <p className="text-3xl font-bold">{formatBRL(price)}</p>
          </div>

          {variant && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                Estoque: {variant.stockQuantity} unidades
              </p>
            </div>
          )}

          <Button size="lg" onClick={handleAddToCart} disabled={!variant || variant.stockQuantity === 0}>
            + Comprar
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/product
git commit -m "feat(web): add product detail page"
```

---

### Task 9: Cart Page

**Files:**
- Create: `apps/web/src/components/cart/cart-item.tsx`
- Create: `apps/web/src/components/cart/cart-summary.tsx`
- Create: `apps/web/src/app/cart/page.tsx`

- [ ] **Step 1: Create cart item component**

```tsx
// src/components/cart/cart-item.tsx
"use client"

import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatBRL } from "@/lib/utils"
import { useCartStore } from "@/stores/cart-store"
import type { CartItem as CartItemType } from "@/types"

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)

  return (
    <div className="flex items-center gap-4 py-4 border-b">
      <div className="h-20 w-20 flex-shrink-0 rounded bg-muted flex items-center justify-center">
        📦
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{item.name}</h3>
        <p className="text-sm text-muted-foreground">{item.variantName}</p>
        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-right">
        <p className="font-bold">{formatBRL(item.priceCents * item.quantity)}</p>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => removeItem(item.variantId)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create cart summary**

```tsx
// src/components/cart/cart-summary.tsx
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatBRL } from "@/lib/utils"
import { useCartStore } from "@/stores/cart-store"

export function CartSummary() {
  const items = useCartStore((s) => s.items)
  const totalCents = useCartStore((s) => s.totalCents())

  if (items.length === 0) return null

  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-bold mb-4">Resumo do Pedido</h2>
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span>Subtotal ({items.length} itens)</span>
          <span>{formatBRL(totalCents)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Frete</span>
          <span className="text-green-500">Grátis</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span>{formatBRL(totalCents)}</span>
        </div>
      </div>
      <Link href="/checkout">
        <Button className="w-full" size="lg">
          Finalizar Compra
        </Button>
      </Link>
    </div>
  )
}
```

- [ ] **Step 3: Create cart page**

```tsx
// src/app/cart/page.tsx
"use client"

import { useCartStore } from "@/stores/cart-store"
import { CartItem } from "@/components/cart/cart-item"
import { CartSummary } from "@/components/cart/cart-summary"

export default function CartPage() {
  const items = useCartStore((s) => s.items)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Carrinho</h1>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Seu carrinho está vazio.
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {items.map((item) => (
              <CartItem key={item.variantId} item={item} />
            ))}
          </div>
          <div>
            <CartSummary />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/cart apps/web/src/app/cart
git commit -m "feat(web): add cart page with item management"
```

---

### Task 10: Auth Pages

**Files:**
- Create: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/app/register/page.tsx`

- [ ] **Step 1: Create login page**

```tsx
// src/app/login/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
      router.push("/")
    } catch {
      setError("Email ou senha inválidos.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse sua conta KronoStore</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Cadastre-se
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create register page**

```tsx
// src/app/register/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegisterPage() {
  const router = useRouter()
  const register = useAuthStore((s) => s.register)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await register(name, email, password)
      router.push("/")
    } catch {
      setError("Erro ao criar conta.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar Conta</CardTitle>
          <CardDescription>Cadastre-se na KronoStore</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando..." : "Criar Conta"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/login apps/web/src/app/register
git commit -m "feat(web): add login and register pages"
```

---

### Task 11: Checkout & Order Pages

**Files:**
- Create: `apps/web/src/components/checkout/checkout-form.tsx`
- Create: `apps/web/src/components/checkout/payment-picker.tsx`
- Create: `apps/web/src/app/checkout/page.tsx`
- Create: `apps/web/src/app/checkout/success/page.tsx`
- Create: `apps/web/src/app/orders/page.tsx`
- Create: `apps/web/src/app/orders/[id]/page.tsx`

- [ ] **Step 1: Create payment picker**

```tsx
// src/components/checkout/payment-picker.tsx
"use client"

import { CreditCard, QrCode, FileText } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type PaymentMethod = "pix" | "credit_card" | "boleto"

interface PaymentPickerProps {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

const methods = [
  { id: "pix" as const, label: "PIX", icon: QrCode, description: "Pagamento instantâneo" },
  { id: "credit_card" as const, label: "Cartão de Crédito", icon: CreditCard, description: "Até 12x sem juros" },
  { id: "boleto" as const, label: "Boleto", icon: FileText, description: "Vencimento em 3 dias úteis" },
]

export function PaymentPicker({ value, onChange }: PaymentPickerProps) {
  return (
    <div className="grid gap-3">
      {methods.map((method) => (
        <Card
          key={method.id}
          className={cn(
            "cursor-pointer p-4 transition-colors hover:bg-muted/50",
            value === method.id && "border-primary bg-primary/5",
          )}
          onClick={() => onChange(method.id)}
        >
          <div className="flex items-center gap-3">
            <method.icon className="h-5 w-5" />
            <div>
              <p className="font-medium">{method.label}</p>
              <p className="text-sm text-muted-foreground">{method.description}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create checkout form**

```tsx
// src/components/checkout/checkout-form.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCartStore } from "@/stores/cart-store"
import { apiFetch } from "@/lib/api"
import { formatBRL } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PaymentPicker, type PaymentMethod } from "./payment-picker"

export function CheckoutForm() {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const totalCents = useCartStore((s) => s.totalCents())
  const clearCart = useCartStore((s) => s.clearCart)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const data = await apiFetch<{ orderId: string }>("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          paymentMethod,
          idempotencyKey: crypto.randomUUID(),
        }),
      })
      clearCart()
      router.push(`/checkout/success?orderId=${data.orderId}`)
    } catch {
      setError("Erro ao processar pagamento.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Endereço de Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">CEP</Label>
              <Input id="zip" required />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forma de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentPicker value={paymentMethod} onChange={setPaymentMethod} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => (
            <div key={item.variantId} className="flex justify-between text-sm">
              <span>{item.name} x{item.quantity}</span>
              <span>{formatBRL(item.priceCents * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span>{formatBRL(totalCents)}</span>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Processando..." : "Confirmar Pedido"}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Create checkout page**

```tsx
// src/app/checkout/page.tsx
"use client"

import { useAuthStore } from "@/stores/auth-store"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { CheckoutForm } from "@/components/checkout/checkout-form"

export default function CheckoutPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <CheckoutForm />
    </div>
  )
}
```

- [ ] **Step 4: Create order success page**

```tsx
// src/app/checkout/success/page.tsx
"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"

export default function OrderSuccessPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <CardTitle>Pedido Confirmado!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Seu pedido <strong>#{orderId}</strong> foi recebido com sucesso.
          </p>
          <p className="text-sm text-muted-foreground">
            Você receberá um email de confirmação em breve.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href={`/orders/${orderId}`}>
              <Button variant="outline">Ver Pedido</Button>
            </Link>
            <Link href="/">
              <Button>Voltar à Loja</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Create orders list page**

```tsx
// src/app/orders/page.tsx
"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { formatBRL } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/stores/auth-store"
import type { Order } from "@/types"

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  confirmed: "bg-blue-500/10 text-blue-500",
  shipped: "bg-purple-500/10 text-purple-500",
  delivered: "bg-green-500/10 text-green-500",
  cancelled: "bg-red-500/10 text-red-500",
}

export default function OrdersPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiFetch<Order[]>("/api/orders"),
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Faça login para ver seus pedidos.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Meus Pedidos</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : orders?.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum pedido encontrado.</p>
      ) : (
        <div className="space-y-4">
          {orders?.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Pedido #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={statusColors[order.status]}>{order.status}</Badge>
                    <p className="font-bold mt-1">{formatBRL(order.totalCents)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create order detail page**

```tsx
// src/app/orders/[id]/page.tsx
"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { formatBRL } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Order } from "@/types"

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.id as string

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiFetch<Order>(`/api/orders/${orderId}`),
  })

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8"><div className="h-64 animate-pulse rounded-lg bg-muted" /></div>
  }

  if (!order) {
    return <div className="container mx-auto px-4 py-8 text-center">Pedido não encontrado.</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Pedido #{orderId.slice(0, 8)}</h1>
      <p className="text-muted-foreground mb-8">
        Criado em {new Date(order.createdAt).toLocaleString("pt-BR")}
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className="text-sm">{order.status}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.productName} ({item.variantName}) x{item.quantity}
              </span>
              <span>{formatBRL(item.unitPriceCents * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span>{formatBRL(order.totalCents)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add checkout, order success, and order pages"
```

---

### Task 12: MSW Setup & Unit Tests

**Files:**
- Create: `apps/web/src/mocks/handlers/products.ts`
- Create: `apps/web/src/mocks/handlers/auth.ts`
- Create: `apps/web/src/mocks/server.ts`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/components/product/product-card.spec.tsx`
- Create: `apps/web/src/stores/cart-store.spec.ts`

- [ ] **Step 1: Create MSW handlers**

```typescript
// src/mocks/handlers/products.ts
import { http, HttpResponse } from "msw"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

export const productsHandlers = [
  http.get(`${API_URL}/api/products`, () => {
    return HttpResponse.json([
      {
        id: "1",
        name: "Teclado Mecânico",
        slug: "teclado-mecanico",
        description: "Switches óptico-magnéticos",
        priceCents: 89990,
        categoryId: "cat-1",
        skuPrefix: "KRK",
        variants: [
          { id: "v1", name: "Default", sku: "KRK-001", priceCents: 89990, stockQuantity: 10 },
        ],
        createdAt: "2026-01-01T00:00:00Z",
      },
    ])
  }),

  http.get(`${API_URL}/api/products/:slug`, ({ params }) => {
    return HttpResponse.json({
      id: "1",
      name: "Teclado Mecânico",
      slug: params.slug,
      description: "Switches óptico-magnéticos",
      priceCents: 89990,
      categoryId: "cat-1",
      skuPrefix: "KRK",
      variants: [
        { id: "v1", name: "Default", sku: "KRK-001", priceCents: 89990, stockQuantity: 10 },
      ],
      createdAt: "2026-01-01T00:00:00Z",
    })
  }),
]
```

```typescript
// src/mocks/handlers/auth.ts
import { http, HttpResponse } from "msw"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

export const authHandlers = [
  http.post(`${API_URL}/api/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string }
    return HttpResponse.json({
      user: { id: "1", name: "Test User", email: body.email },
      token: "mock-token",
    })
  }),

  http.post(`${API_URL}/api/auth/register`, async ({ request }) => {
    const body = await request.json() as { name: string; email: string }
    return HttpResponse.json({
      user: { id: "1", name: body.name, email: body.email },
      token: "mock-token",
    })
  }),
]
```

```typescript
// src/mocks/server.ts
import { setupServer } from "msw/node"
import { productsHandlers } from "./handlers/products"
import { authHandlers } from "./handlers/auth"

export const server = setupServer(...productsHandlers, ...authHandlers)
```

- [ ] **Step 2: Create vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

- [ ] **Step 3: Create test setup**

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom/vitest"
import { server } from "../mocks/server"
import { beforeAll, afterEach, afterAll } from "vitest"

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

- [ ] **Step 4: Write product card test**

```tsx
// src/components/product/product-card.spec.tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ProductCard } from "./product-card"
import type { Product } from "@/types"

const mockProduct: Product = {
  id: "1",
  name: "Teclado Mecânico",
  slug: "teclado-mecanico",
  description: "Switches óptico-magnéticos",
  priceCents: 89990,
  categoryId: "cat-1",
  skuPrefix: "KRK",
  variants: [
    { id: "v1", name: "Default", sku: "KRK-001", priceCents: 89990, stockQuantity: 10 },
  ],
  createdAt: "2026-01-01T00:00:00Z",
}

describe("<ProductCard />", () => {
  it("should render product name", () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText("Teclado Mecânico")).toBeInTheDocument()
  })

  it("should render formatted price", () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText("R$ 899,90")).toBeInTheDocument()
  })

  it("should render SKU badge", () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText("SKU: KRK")).toBeInTheDocument()
  })

  it("should link to product detail", () => {
    render(<ProductCard product={mockProduct} />)
    const link = screen.getByRole("link", { name: /Comprar/i })
    expect(link).toHaveAttribute("href", "/product/teclado-mecanico")
  })
})
```

- [ ] **Step 5: Write cart store test**

```typescript
// src/stores/cart-store.spec.ts
import { describe, expect, it, beforeEach } from "vitest"
import { useCartStore } from "./cart-store"

describe("<useCartStore>", () => {
  beforeEach(() => {
    useCartStore.getState().clearCart()
  })

  it("should start with empty cart", () => {
    expect(useCartStore.getState().items).toEqual([])
  })

  it("should add item to cart", () => {
    useCartStore.getState().addItem({
      variantId: "v1",
      productId: "1",
      name: "Teclado",
      variantName: "Default",
      sku: "KRK-001",
      priceCents: 89990,
    })
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].quantity).toBe(1)
  })

  it("should increment quantity for existing item", () => {
    useCartStore.getState().addItem({
      variantId: "v1",
      productId: "1",
      name: "Teclado",
      variantName: "Default",
      sku: "KRK-001",
      priceCents: 89990,
    })
    useCartStore.getState().addItem({
      variantId: "v1",
      productId: "1",
      name: "Teclado",
      variantName: "Default",
      sku: "KRK-001",
      priceCents: 89990,
    })
    expect(useCartStore.getState().items[0].quantity).toBe(2)
  })

  it("should remove item from cart", () => {
    useCartStore.getState().addItem({
      variantId: "v1",
      productId: "1",
      name: "Teclado",
      variantName: "Default",
      sku: "KRK-001",
      priceCents: 89990,
    })
    useCartStore.getState().removeItem("v1")
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it("should calculate total", () => {
    useCartStore.getState().addItem({
      variantId: "v1",
      productId: "1",
      name: "Teclado",
      variantName: "Default",
      sku: "KRK-001",
      priceCents: 89990,
      quantity: 2,
    })
    expect(useCartStore.getState().totalCents()).toBe(179980)
  })
})
```

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @kronostore/web test
```

Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "test(web): add MSW setup and unit tests for product card and cart store"
```

---

### Task 13: E2E Tests (Playwright)

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/tests/e2e/browse-products.spec.ts`
- Create: `apps/web/tests/e2e/cart-flow.spec.ts`

- [ ] **Step 1: Create Playwright config**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
})
```

- [ ] **Step 2: Install Playwright**

```bash
cd apps/web && pnpm add -D @playwright/test && npx playwright install chromium
```

- [ ] **Step 3: Write browse products test**

```typescript
// tests/e2e/browse-products.spec.ts
import { expect, test } from "@playwright/test"

test("user can browse products on home page", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("KronoStore")).toBeVisible()
  await expect(page.getByText("Catálogo de Produtos")).toBeVisible()
})

test("user can navigate to product detail", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: /Comprar/i }).first().click()
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
})
```

- [ ] **Step 4: Write cart flow test**

```typescript
// tests/e2e/cart-flow.spec.ts
import { expect, test } from "@playwright/test"

test("user can add product to cart", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: /Comprar/i }).first().click()
  await page.getByRole("button", { name: /Comprar/i }).click()
  await expect(page.getByText("1")).toBeVisible()
})

test("user can view cart page", async ({ page }) => {
  await page.goto("/cart")
  await expect(page.getByText("Carrinho")).toBeVisible()
})
```

- [ ] **Step 5: Run E2E tests**

```bash
pnpm --filter @kronostore/web test:e2e
```

Expected: Tests pass

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "test(web): add Playwright E2E tests for browsing and cart"
```

---

### Task 14: Final Integration & Scripts

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add test scripts to package.json**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "format": "biome check --write .",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 2: Run full test suite**

```bash
pnpm --filter @kronostore/web test
pnpm --filter @kronostore/web test:e2e
```

- [ ] **Step 3: Verify typecheck**

```bash
pnpm --filter @kronostore/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json
git commit -m "chore(web): add test scripts and verify setup"
```
