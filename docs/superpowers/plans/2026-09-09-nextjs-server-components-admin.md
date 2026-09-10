# Next.js Server Components + Server Actions (Admin) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar as 13 páginas admin de Client Components com `useEffect` para Server Components com Server Actions, usando token em cookie para auth server-side e `proxy.ts` para route protection.

**Architecture:** Páginas admin viram Server Components que fetcham dados server-side via `getSession()` (lê cookie) + `serverApi`. Formulários mantêm-se como Client Components com `useActionState` e chamam Server Actions para mutations. `proxy.ts` protege rotas `/admin/*` verificando role admin.

**Tech Stack:** Next.js 16.3.4 (App Router), React 19.2.8, `proxy.ts` (não `middleware.ts`), `cookies()` API, Server Actions (`"use server"`), Vitest (unit), `notFound()` para 404.

**External facts (verificados em 2026-09-09):**
- API roda na porta **3001**, CORS com `credentials: true`.
- Better Auth usa Bearer tokens (não cookies). Token armazenado em `localStorage["kronostore-auth-token"]`.
- Next.js 16 usa `proxy.ts` (renamed de `middleware.ts`). Exporta `proxy()` function + `config` object.
- `cookies()` API acessível em Server Components e Server Actions.
- `redirect()` e `notFound()` são Server-side functions do `next/navigation`.
- `revalidatePath()` do `next/cache` para invalidação de cache.

---

## File Structure

### Novos arquivos (`apps/web/src/`)
- `lib/server-auth.ts` — helper server-side: lê token do cookie, chama API, retorna `User | null`.
- `lib/server-auth.spec.ts` — testes do helper.
- `lib/server-api.ts` — fetch wrapper server-side que lê token de `cookies()`.
- `proxy.ts` — route protection para `/admin/*`, `/checkout`, `/orders/*`.
- `proxy.spec.ts` — testes do proxy.
- `app/admin/actions.ts` — Server Actions para CRUD admin.
- `app/admin/actions.spec.ts` — testes das Server Actions.
- `components/admin/admin-product-table.tsx` — tabela de produtos (Client Component).
- `components/admin/admin-order-table.tsx` — tabela de pedidos (Client Component).
- `components/admin/admin-order-detail.tsx` — detalhe do pedido (Client Component).
- `components/admin/admin-category-table.tsx` — tabela de categorias (Client Component).
- `components/admin/admin-user-table.tsx` — tabela de usuários (Client Component).
- `components/admin/admin-stock-table.tsx` — tabela de estoque (Client Component).
- `components/admin/admin-coupon-table.tsx` — tabela de cupons (Client Component).
- `components/admin/product-form.tsx` — form de criar/editar produto (Client Component).
- `components/admin/category-form.tsx` — form de criar/editar categoria (Client Component).
- `components/admin/coupon-form.tsx` — form de criar/editar cupom (Client Component).

### Arquivos modificados
- `stores/auth-store.ts` — adicionar persistência em cookie.
- `lib/constants.ts` — adicionar `COOKIE_KEYS.AUTH_TOKEN`.
- `app/admin/page.tsx` — Server Component.
- `app/admin/products/page.tsx` — Server Component.
- `app/admin/products/new/page.tsx` — Server Component + Client Form.
- `app/admin/products/[id]/page.tsx` — Server Component + Client Form.
- `app/admin/orders/page.tsx` — Server Component.
- `app/admin/orders/[id]/page.tsx` — Server Component + Client Actions.
- `app/admin/categories/page.tsx` — Server Component.
- `app/admin/categories/new/page.tsx` — Server Component + Client Form.
- `app/admin/categories/[id]/page.tsx` — Server Component + Client Form.
- `app/admin/users/page.tsx` — Server Component.
- `app/admin/stock/page.tsx` — Server Component + Client Actions.
- `app/admin/coupons/page.tsx` — Server Component.
- `app/admin/coupons/new/page.tsx` — Server Component + Client Form.

---

## Fase 1: Token em Cookies + Server Auth Helper

**Objetivo:** Tornar o token acessível a Server Components via `cookies()`. Criar helper server-side para verificar sessão.

### Arquivos
- Modify: `apps/web/src/lib/constants.ts`
- Modify: `apps/web/src/stores/auth-store.ts`
- Create: `apps/web/src/lib/server-auth.ts`
- Create: `apps/web/src/lib/server-auth.spec.ts`
- Create: `apps/web/src/lib/server-api.ts`

### Task 1: Adicionar cookie key ao constants

- [ ] Edit `apps/web/src/lib/constants.ts` — adicionar `AUTH_TOKEN` ao `COOKIE_KEYS`:

```ts
export const COOKIE_KEYS = {
  AUTH_TOKEN: "auth-token",
} as const;
```

### Task 2: Modificar auth-store para persistir em cookie

- [ ] Edit `apps/web/src/stores/auth-store.ts` — modificar `persistToken()` para setar/limpar cookie:

```ts
function persistToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    document.cookie = `${COOKIE_KEYS.AUTH_TOKEN}=${token}; path=/; SameSite=Lax; Max-Age=31536000`;
  } else {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    document.cookie = `${COOKIE_KEYS.AUTH_TOKEN}=; path=/; Max-Age=0`;
  }
}
```

- [ ] Adicionar import de `COOKIE_KEYS` de `@/lib/constants`.

- [ ] Modificar `onRehydrateStorage` para sincronizar cookie:

```ts
onRehydrateStorage: () => (state) => {
  if (state?.token) {
    persistToken(state.token);
  }
},
```

- [ ] **Verificar:** `pnpm --filter @kronostore/web test` — todos os testes existentes devem continuar passando (interface não muda).

### Task 3: Criar server-api.ts (fetch wrapper server-side)

- [ ] Create `apps/web/src/lib/server-api.ts`:

```ts
import { API_URL } from "./constants";

export class ServerApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: unknown,
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = "ServerApiError";
  }
}

async function serverRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
  } = {},
): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = null;
    }
    throw new ServerApiError(response.status, response.statusText, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const serverApi = {
  get: <T>(endpoint: string, token?: string) =>
    serverRequest<T>(endpoint, { token }),

  post: <T>(endpoint: string, body?: unknown, token?: string) =>
    serverRequest<T>(endpoint, { method: "POST", body, token }),

  patch: <T>(endpoint: string, body?: unknown, token?: string) =>
    serverRequest<T>(endpoint, { method: "PATCH", body, token }),

  delete: <T>(endpoint: string, token?: string) =>
    serverRequest<T>(endpoint, { method: "DELETE", token }),
};
```

### Task 4: Criar server-auth.ts (helper de sessão)

- [ ] Create `apps/web/src/lib/server-auth.ts`:

```ts
import { cookies } from "next/headers";
import { COOKIE_KEYS } from "./constants";
import { serverApi } from "./server-api";
import type { User } from "@/types";
import { redirect } from "next/navigation";

export interface ServerSession {
  user: User;
  token: string;
}

export async function getSession(): Promise<ServerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_KEYS.AUTH_TOKEN)?.value;
  if (!token) return null;

  try {
    const user = await serverApi.get<User>("/auth/me", token);
    return { user, token };
  } catch {
    return null;
  }
}

export async function requireAdminSession(): Promise<ServerSession> {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    redirect("/login");
  }
  return session;
}
```

### Task 5: Criar server-auth.spec.ts

- [ ] Create `apps/web/src/lib/server-auth.spec.ts` — testes unitários:

```ts
import { describe, expect, it, vi } from "vitest";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock server-api
vi.mock("./server-api", () => ({
  serverApi: {
    get: vi.fn(),
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("getSession", () => {
  it("returns null when no token cookie", async () => {
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as any);

    const { getSession } = await import("./server-auth");
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns session when token is valid", async () => {
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => name === "auth-token" ? { value: "test-token" } : undefined,
    } as any);

    const { serverApi } = await import("./server-api");
    vi.mocked(serverApi.get).mockResolvedValue({
      id: "1",
      name: "Admin",
      email: "admin@test.com",
      role: "admin",
    });

    const { getSession } = await import("./server-auth");
    const session = await getSession();
    expect(session).toEqual({
      user: { id: "1", name: "Admin", email: "admin@test.com", role: "admin" },
      token: "test-token",
    });
  });

  it("returns null when API call fails", async () => {
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => name === "auth-token" ? { value: "invalid-token" } : undefined,
    } as any);

    const { serverApi } = await import("./server-api");
    vi.mocked(serverApi.get).mockRejectedValue(new Error("Unauthorized"));

    const { getSession } = await import("./server-auth");
    const session = await getSession();
    expect(session).toBeNull();
  });
});

describe("requireAdminSession", () => {
  it("redirects to /login when not authenticated", async () => {
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as any);

    const { redirect } = await import("next/navigation");
    const { requireAdminSession } = await import("./server-auth");
    await requireAdminSession();
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when not admin", async () => {
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => name === "auth-token" ? { value: "test-token" } : undefined,
    } as any);

    const { serverApi } = await import("./server-api");
    vi.mocked(serverApi.get).mockResolvedValue({
      id: "1",
      name: "Customer",
      email: "user@test.com",
      role: "customer",
    });

    const { redirect } = await import("next/navigation");
    const { requireAdminSession } = await import("./server-auth");
    await requireAdminSession();
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
```

- [ ] **Verificar:** `pnpm --filter @kronostore/web test` — todos os testes passam.

---

## Fase 2: proxy.ts (Route Protection)

**Objetivo:** Proteger rotas admin e autenticadas server-side, substituindo checks em `useEffect`.

### Arquivos
- Create: `apps/web/src/proxy.ts`
- Create: `apps/web/src/proxy.spec.ts`

### Task 1: Criar proxy.ts

- [ ] Create `apps/web/src/proxy.ts`:

```ts
import { type NextRequest, NextResponse } from "next/server";
import { COOKIE_KEYS } from "./lib/constants";
import { API_URL } from "./lib/constants";

async function verifySession(token: string): Promise<{ role?: string } | null> {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_KEYS.AUTH_TOKEN)?.value;

  // Admin routes: require admin role
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const user = await verifySession(token);
    if (!user || user.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Checkout and orders routes: require auth
  if (pathname === "/checkout" || pathname.startsWith("/orders")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const user = await verifySession(token);
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/checkout",
    "/orders/:path*",
  ],
};
```

### Task 2: Criar proxy.spec.ts

- [ ] Create `apps/web/src/proxy.spec.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

describe("proxy", () => {
  it("redirects to /login when no token on admin route", async () => {
    globalThis.fetch = vi.fn();

    const { proxy } = await import("./proxy");
    const request = {
      nextUrl: { pathname: "/admin/products" },
      cookies: { get: () => undefined },
      url: "http://localhost:3000",
    } as any;

    const response = await proxy(request);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(307);
  });

  it("allows admin routes with valid admin token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ role: "admin" }),
    });

    const { proxy } = await import("./proxy");
    const request = {
      nextUrl: { pathname: "/admin/products" },
      cookies: { get: (name: string) => name === "auth-token" ? { value: "valid-token" } : undefined },
      url: "http://localhost:3000",
    } as any;

    const response = await proxy(request);
    expect(response.status).toBe(200);
  });

  it("redirects non-admin users from admin routes", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ role: "customer" }),
    });

    const { proxy } = await import("./proxy");
    const request = {
      nextUrl: { pathname: "/admin/products" },
      cookies: { get: (name: string) => name === "auth-token" ? { value: "valid-token" } : undefined },
      url: "http://localhost:3000",
    } as any;

    const response = await proxy(request);
    expect(response.status).toBe(307);
  });
});
```

### Task 3: Remover auth checks de admin pages

- [ ] Nesta fase, NÃO remover os `useEffect` auth checks ainda (fase 5). O proxy.ts é uma camada adicional de segurança.

- [ ] **Verificar:** `pnpm --filter @kronostore/web test` — proxy.spec.ts passa.

---

## Fase 3: Server Components para Admin Pages

**Objetivo:** Converter 13 admin pages de Client Components para Server Components, removendo `useEffect` para data fetching.

### Padrão de Conversão

**ANTES (Client Component):**
```tsx
"use client"
export default function AdminProductsPage() {
  const [products, setProducts] = useState([])
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') { router.push('/login'); return }
    api.get('/admin/products').then(res => setProducts(res.data))
  }, [isAuthenticated, user, router])
  return <Table products={products} />
}
```

**DEPOIS (Server Component + Client Component):**
```tsx
// page.tsx (Server Component)
import { requireAdminSession } from "@/lib/server-auth";
import { serverApi } from "@/lib/server-api";
import { AdminProductTable } from "@/components/admin/admin-product-table";

export default async function AdminProductsPage() {
  const session = await requireAdminSession();
  const { data } = await serverApi.get<{ data: Product[]; total: number }>(
    "/admin/products",
    session.token,
  );
  return <AdminProductTable products={data} />;
}

// admin-product-table.tsx (Client Component)
"use client"
export function AdminProductTable({ products }) {
  // sorting, filtering, links
}
```

### Task 1: Converter admin/page.tsx (Dashboard)

- [ ] Edit `apps/web/src/app/admin/page.tsx` — remover `"use client"`, converter para Server Component:

```tsx
import { requireAdminSession } from "@/lib/server-auth";
import { serverApi } from "@/lib/server-api";
import { AdminStatsCard } from "@/components/admin/admin-stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Order, Product, User } from "@/types";

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();

  const [orders, products, users] = await Promise.all([
    serverApi.get<Order[]>("/admin/orders", session.token),
    serverApi.get<{ data: Product[]; total: number }>("/admin/products", session.token),
    serverApi.get<User[]>("/admin/users", session.token),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatsCard title="Pedidos" value={orders.length} />
        <AdminStatsCard title="Produtos" value={products.total ?? products.data?.length ?? 0} />
        <AdminStatsCard title="Usuarios" value={users.length} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo ao Painel Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Use o menu lateral para gerenciar pedidos, produtos, categorias, usuarios, estoque e cupons.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Task 2: Criar admin-product-table.tsx + converter products/page.tsx

- [ ] Create `apps/web/src/components/admin/admin-product-table.tsx`:

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import type { Product } from "@/types";
import { Plus } from "lucide-react";
import Link from "next/link";

interface AdminProductTableProps {
  products: Product[];
}

export function AdminProductTable({ products }: AdminProductTableProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Produtos</h1>
        <Link href="/admin/products/new" className={buttonVariants({ variant: "default" })}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Todos os Produtos ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-4 text-left font-medium">Nome</th>
                  <th className="py-3 px-4 text-left font-medium">SKU</th>
                  <th className="py-3 px-4 text-left font-medium">Preco</th>
                  <th className="py-3 px-4 text-left font-medium">Status</th>
                  <th className="py-3 px-4 text-left font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{product.name}</td>
                    <td className="py-3 px-4 font-mono text-xs">{product.skuPrefix}</td>
                    <td className="py-3 px-4">{formatBRL(product.priceCents)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] Edit `apps/web/src/app/admin/products/page.tsx` — Server Component:

```tsx
import { requireAdminSession } from "@/lib/server-auth";
import { serverApi } from "@/lib/server-api";
import { AdminProductTable } from "@/components/admin/admin-product-table";
import type { Product } from "@/types";

export default async function AdminProductsPage() {
  const session = await requireAdminSession();
  const { data } = await serverApi.get<{ data: Product[]; total: number }>(
    "/admin/products",
    session.token,
  );

  return <AdminProductTable products={data} />;
}
```

### Task 3: Criar admin-order-table.tsx + converter orders/page.tsx

- [ ] Create `apps/web/src/components/admin/admin-order-table.tsx` — Client Component com tabela de pedidos.
- [ ] Edit `apps/web/src/app/admin/orders/page.tsx` — Server Component.

### Task 4: Criar admin-order-detail.tsx + converter orders/[id]/page.tsx

- [ ] Create `apps/web/src/components/admin/admin-order-detail.tsx` — Client Component com detalhe do pedido + status update form.
- [ ] Edit `apps/web/src/app/admin/orders/[id]/page.tsx` — Server Component que busca pedido e passa para Client Component.

### Task 5: Criar admin-category-table.tsx + converter categories/page.tsx

- [ ] Create `apps/web/src/components/admin/admin-category-table.tsx` — Client Component.
- [ ] Edit `apps/web/src/app/admin/categories/page.tsx` — Server Component.

### Task 6: Criar category-form.tsx + converter categories/new e [id]

- [ ] Create `apps/web/src/components/admin/category-form.tsx` — Client Component reutilizável para create/edit.
- [ ] Edit `apps/web/src/app/admin/categories/new/page.tsx` — Server Component + `<CategoryForm>`.
- [ ] Edit `apps/web/src/app/admin/categories/[id]/page.tsx` — Server Component + `<CategoryForm>`.

### Task 7: Criar admin-user-table.tsx + converter users/page.tsx

- [ ] Create `apps/web/src/components/admin/admin-user-table.tsx` — Client Component.
- [ ] Edit `apps/web/src/app/admin/users/page.tsx` — Server Component.

### Task 8: Criar admin-stock-table.tsx + converter stock/page.tsx

- [ ] Create `apps/web/src/components/admin/admin-stock-table.tsx` — Client Component com inline forms de ajuste.
- [ ] Edit `apps/web/src/app/admin/stock/page.tsx` — Server Component.

### Task 9: Criar admin-coupon-table.tsx + converter coupons/page.tsx

- [ ] Create `apps/web/src/components/admin/admin-coupon-table.tsx` — Client Component.
- [ ] Edit `apps/web/src/app/admin/coupons/page.tsx` — Server Component.

### Task 10: Criar product-form.tsx + converter products/new e [id]

- [ ] Create `apps/web/src/components/admin/product-form.tsx` — Client Component reutilizável.
- [ ] Edit `apps/web/src/app/admin/products/new/page.tsx` — Server Component (fetch categories) + `<ProductForm>`.
- [ ] Edit `apps/web/src/app/admin/products/[id]/page.tsx` — Server Component (fetch product + categories) + `<ProductForm>`.

### Task 11: Criar coupon-form.tsx + converter coupons/new

- [ ] Create `apps/web/src/components/admin/coupon-form.tsx` — Client Component.
- [ ] Edit `apps/web/src/app/admin/coupons/new/page.tsx` — Server Component + `<CouponForm>`.

- [ ] **Verificar:** `pnpm --filter @kronostore/web typecheck && pnpm --filter @kronostore/web test`

---

## Fase 4: Server Actions para Admin Mutations

**Objetivo:** Criar Server Actions para CRUD admin, substituindo `api.post/put/delete` em Client Components.

### Arquivos
- Create: `apps/web/src/app/admin/actions.ts`
- Create: `apps/web/src/app/admin/actions.spec.ts`
- Modify: `apps/web/src/components/admin/product-form.tsx`
- Modify: `apps/web/src/components/admin/category-form.tsx`
- Modify: `apps/web/src/components/admin/coupon-form.tsx`
- Modify: `apps/web/src/components/admin/admin-stock-table.tsx`
- Modify: `apps/web/src/components/admin/admin-order-detail.tsx`
- Modify: `apps/web/src/components/admin/admin-user-table.tsx`
- Modify: `apps/web/src/components/admin/admin-coupon-table.tsx`

### Task 1: Criar actions.ts com Server Actions

- [ ] Create `apps/web/src/app/admin/actions.ts`:

```ts
"use server";

import { requireAdminSession } from "@/lib/server-auth";
import { serverApi } from "@/lib/server-api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ========== Products ==========

export async function createProduct(
  prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const session = await requireAdminSession();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const categoryId = formData.get("categoryId") as string;
  const priceCents = Number(formData.get("priceCents"));
  const skuPrefix = formData.get("skuPrefix") as string;
  const imageUrl = formData.get("imageUrl") as string | null;

  try {
    await serverApi.post(
      "/admin/products",
      { name, description, categoryId, priceCents, skuPrefix, imageUrl: imageUrl || null },
      session.token,
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao criar produto" };
  }

  redirect("/admin/products");
}

export async function updateProduct(
  id: string,
  prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const session = await requireAdminSession();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const categoryId = formData.get("categoryId") as string;
  const priceCents = Number(formData.get("priceCents"));
  const imageUrl = formData.get("imageUrl") as string | null;
  const isActive = formData.get("isActive") === "on";

  try {
    await serverApi.patch(
      `/admin/products/${id}`,
      { name, description, categoryId, priceCents, imageUrl: imageUrl || null, isActive },
      session.token,
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar produto" };
  }

  redirect("/admin/products");
}

export async function deleteProduct(id: string) {
  const session = await requireAdminSession();
  await serverApi.delete(`/admin/products/${id}`, session.token);
  revalidatePath("/admin/products");
}

// ========== Categories ==========

export async function createCategory(
  prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const session = await requireAdminSession();

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const imageUrl = formData.get("imageUrl") as string | null;

  try {
    await serverApi.post(
      "/admin/categories",
      { name, slug, description: description || undefined, imageUrl: imageUrl || undefined },
      session.token,
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao criar categoria" };
  }

  redirect("/admin/categories");
}

export async function updateCategory(
  id: string,
  prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const session = await requireAdminSession();

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const imageUrl = formData.get("imageUrl") as string | null;

  try {
    await serverApi.patch(
      `/admin/categories/${id}`,
      { name, slug, description: description || undefined, imageUrl: imageUrl || undefined },
      session.token,
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar categoria" };
  }

  redirect("/admin/categories");
}

export async function deleteCategory(id: string) {
  const session = await requireAdminSession();
  await serverApi.delete(`/admin/categories/${id}`, session.token);
  revalidatePath("/admin/categories");
}

// ========== Coupons ==========

export async function createCoupon(
  prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const session = await requireAdminSession();

  const code = formData.get("code") as string;
  const type = formData.get("type") as string;
  const value = Number(formData.get("value"));
  const maxUses = formData.get("maxUses") as string;
  const minOrderCents = formData.get("minOrderCents") as string;
  const expiresAt = formData.get("expiresAt") as string;

  try {
    await serverApi.post(
      "/admin/coupons",
      {
        code,
        type,
        value,
        maxUses: maxUses ? Number(maxUses) : null,
        minOrderCents: minOrderCents ? Number(minOrderCents) : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      },
      session.token,
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao criar cupom" };
  }

  redirect("/admin/coupons");
}

export async function deleteCoupon(id: string) {
  const session = await requireAdminSession();
  await serverApi.delete(`/admin/coupons/${id}`, session.token);
  revalidatePath("/admin/coupons");
}

// ========== Stock ==========

export async function updateStock(
  variantId: string,
  prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const session = await requireAdminSession();

  const quantity = Number(formData.get("quantity"));
  const reason = formData.get("reason") as string;

  if (!quantity || !reason) {
    return { error: "Quantidade e motivo sao obrigatorios" };
  }

  try {
    await serverApi.post(
      `/admin/stock/${variantId}/adjust`,
      { quantity, reason },
      session.token,
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao ajustar estoque" };
  }

  revalidatePath("/admin/stock");
  return null;
}

// ========== Orders ==========

export async function updateOrderStatus(
  orderId: string,
  status: string,
) {
  const session = await requireAdminSession();
  await serverApi.patch(
    `/admin/orders/${orderId}/status`,
    { status },
    session.token,
  );
  revalidatePath(`/admin/orders/${orderId}`);
}

// ========== Users ==========

export async function updateUserRole(
  userId: string,
  role: string,
) {
  const session = await requireAdminSession();
  await serverApi.patch(
    `/admin/users/${userId}/role`,
    { role },
    session.token,
  );
  revalidatePath("/admin/users");
}
```

### Task 2: Atualizar product-form.tsx para usar Server Actions

- [ ] Edit `apps/web/src/components/admin/product-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { createProduct, updateProduct } from "@/app/admin/actions";
// ... resto dos imports

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  categories: Category[];
  initialData?: Product;
}

export function ProductForm({ mode, productId, categories, initialData }: ProductFormProps) {
  const [state, formAction, isPending] = useActionState(
    mode === "create"
      ? createProduct
      : (prev: any, formData: FormData) => updateProduct(productId!, prev, formData),
    null,
  );

  // ... form UI usando <form action={formAction}>
}
```

### Task 3: Atualizar category-form.tsx

- [ ] Edit `apps/web/src/components/admin/category-form.tsx` — usar `useActionState` com `createCategory`/`updateCategory`.

### Task 4: Atualizar coupon-form.tsx

- [ ] Edit `apps/web/src/components/admin/coupon-form.tsx` — usar `useActionState` com `createCoupon`.

### Task 5: Atualizar admin-stock-table.tsx

- [ ] Edit `apps/web/src/components/admin/admin-stock-table.tsx` — usar `<form action={updateStock}>` com `useActionState`.

### Task 6: Atualizar admin-order-detail.tsx

- [ ] Edit `apps/web/src/components/admin/admin-order-detail.tsx` — usar `updateOrderStatus` Server Action.

### Task 7: Atualizar admin-user-table.tsx

- [ ] Edit `apps/web/src/components/admin/admin-user-table.tsx` — usar `updateUserRole` Server Action.

### Task 8: Atualizar admin-coupon-table.tsx

- [ ] Edit `apps/web/src/components/admin/admin-coupon-table.tsx` — usar `deleteCoupon` Server Action.

### Task 9: Criar actions.spec.ts

- [ ] Create `apps/web/src/app/admin/actions.spec.ts` — testes unitários:

```ts
import { describe, expect, it, vi } from "vitest";

// Mock server-auth
vi.mock("@/lib/server-auth", () => ({
  requireAdminSession: vi.fn().mockResolvedValue({
    user: { id: "1", role: "admin" },
    token: "test-token",
  }),
}));

// Mock server-api
vi.mock("@/lib/server-api", () => ({
  serverApi: {
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("Server Actions", () => {
  it("createProduct calls API and redirects", async () => {
    const { serverApi } = await import("@/lib/server-api");
    const { redirect } = await import("next/navigation");

    const formData = new FormData();
    formData.set("name", "Test Product");
    formData.set("description", "Test Description");
    formData.set("categoryId", "cat-1");
    formData.set("priceCents", "1000");
    formData.set("skuPrefix", "TP");

    const { createProduct } = await import("./actions");
    await createProduct(null, formData);

    expect(serverApi.post).toHaveBeenCalledWith(
      "/admin/products",
      expect.objectContaining({ name: "Test Product" }),
      "test-token",
    );
    expect(redirect).toHaveBeenCalledWith("/admin/products");
  });

  it("deleteProduct calls API and revalidates path", async () => {
    const { serverApi } = await import("@/lib/server-api");
    const { revalidatePath } = await import("next/cache");

    const { deleteProduct } = await import("./actions");
    await deleteProduct("product-1");

    expect(serverApi.delete).toHaveBeenCalledWith("/admin/products/product-1", "test-token");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
  });
});
```

- [ ] **Verificar:** `pnpm --filter @kronostore/web typecheck && pnpm --filter @kronostore/web test`

---

## Fase 5: Cleanup + Test Updates

**Objetivo:** Remover código morto e atualizar testes existentes.

### Arquivos modificados
- Todos os admin pages (remover imports desnecessários)
- Todos os testes existentes (atualizar mocks)

### Task 1: Remover imports desnecessários de admin pages

- [ ] Remover `useAuthStore` import de todas as admin pages (protegidas por proxy.ts + server-side).
- [ ] Remover `useState`, `useEffect` de admin pages que são Server Components.
- [ ] Remover `Loader2` de admin pages (Server Components têm `<Suspense>` nativo).
- [ ] Remover `api` import de admin pages (usando `serverApi`).

### Task 2: Adicionar Suspense boundaries

- [ ] Wrap Server Component pages em `<Suspense>` para loading states:

```tsx
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function AdminProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <AdminProductsContent />
    </Suspense>
  );
}

async function AdminProductsContent() {
  const session = await requireAdminSession();
  // ... fetch data e render
}
```

### Task 3: Atualizar testes existentes

- [ ] `admin-sidebar.spec.tsx` — Continua válido (Client Component). Verificar se passa sem mudanças.
- [ ] `admin-stats-card.spec.tsx` — Continua válido. Verificar se passa sem mudanças.
- [ ] Adicionar testes de integração para Server Component pages (mock de `getSession` + `serverApi`).

### Task 4: Atualizar testes de form components

- [ ] Atualizar testes de `product-form`, `category-form`, `coupon-form` para mockar Server Actions em vez de `api.post`.

### Task 5: Remover testes de auth check

- [ ] Remover testes que verificam `useEffect` auth redirect (agora tratado por proxy.ts).

### Task 6: Verificação final

- [ ] **Verificar:** `pnpm --filter @kronostore/web typecheck`
- [ ] **Verificar:** `pnpm --filter @kronostore/web test`
- [ ] **Verificar:** `pnpm --filter @kronostore/api test`
- [ ] **Verificar:** `pnpm biome check apps/web/src/`
- [ ] **Verificar:** E2E testes continuam passando.

---

## Tradeoffs

| Ganha | Perde |
|-------|-------|
| Auth server-side (não bypassável) | Updates imediatos pós-mutation (precisa revalidation) |
| Melhor FCP (fetch server-side) | Zustand nas Server Actions (precisa repensar) |
| Type-safe mutations (Server Actions) | Alguma interatividade (split Server + Client) |
| Cache revalidation (revalidatePath) | |
| Menos JS enviado ao browser | |

---

## Ordem de Implementação

| Fase | Esforço | Dependências |
|------|---------|--------------|
| Fase 1: Token cookies + server-auth.ts | ~1h | Nenhuma |
| Fase 2: proxy.ts | ~30min | Fase 1 |
| Fase 3: Server Components admin pages | ~4-6h | Fase 1, 2 |
| Fase 4: Server Actions admin mutations | ~4-6h | Fase 3 |
| Fase 5: Cleanup + test updates | ~1-2h | Fase 4 |
| **Total** | **~10-16h** | |
