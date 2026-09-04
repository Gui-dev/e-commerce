import { http, HttpResponse } from "msw";

const mockOrders = [
  {
    id: "order-1",
    userId: "user-1",
    status: "pending",
    subtotalCents: 10000,
    discountCents: 0,
    totalCents: 10000,
    couponId: null,
    idempotencyKey: null,
    shippingName: "Joao Silva",
    shippingStreet: "Rua A, 123",
    shippingCity: "Sao Paulo",
    shippingState: "SP",
    shippingZip: "01000-000",
    shippingCountry: "BR",
    items: [
      {
        id: "item-1",
        orderId: "order-1",
        variantId: "var-1",
        quantity: 2,
        unitPriceCents: 5000,
        variant: {
          id: "var-1",
          name: "P",
          sku: "PROD-001-P",
          priceCents: 5000,
          attributes: { size: "P" },
          isActive: true,
          productId: "prod-1",
          createdAt: "2026-09-01T00:00:00Z",
        },
      },
    ],
    payment: null,
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
  },
];

const mockUsers = [
  {
    id: "user-1",
    name: "Joao Silva",
    email: "joao@example.com",
    emailVerified: true,
    image: null,
    role: "customer",
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
];

const mockStock = [
  {
    id: "stock-1",
    variantId: "var-1",
    quantity: 100,
    reserved: 2,
    updatedAt: "2026-09-01T00:00:00Z",
  },
];

const mockCoupons = [
  {
    id: "coupon-1",
    code: "DESCONTO10",
    type: "percentage",
    value: 10,
    minOrderCents: 5000,
    maxUses: 100,
    usedCount: 5,
    expiresAt: "2026-12-31T23:59:59Z",
    isActive: true,
    createdAt: "2026-09-01T00:00:00Z",
  },
];

export const adminHandlers = [
  http.get("*/admin/orders", () => {
    return HttpResponse.json(mockOrders);
  }),

  http.get("*/admin/orders/:id", ({ params }) => {
    const order = mockOrders.find((o) => o.id === params.id);
    if (!order) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(order);
  }),

  http.patch("*/admin/orders/:id/status", async ({ request }) => {
    const body = (await request.json()) as { status: string };
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const orderId = pathParts[pathParts.length - 2];
    const order = mockOrders.find((o) => o.id === orderId);
    if (!order) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ ...order, status: body.status });
  }),

  http.get("*/admin/users", () => {
    return HttpResponse.json(mockUsers);
  }),

  http.patch("*/admin/users/:id/role", async ({ request }) => {
    const body = (await request.json()) as { role: string };
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const userId = pathParts[pathParts.length - 2];
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ ...user, role: body.role });
  }),

  http.get("*/admin/stock", () => {
    return HttpResponse.json(mockStock);
  }),

  http.post("*/admin/stock/:variantId/adjust", async ({ request }) => {
    const body = (await request.json()) as { quantity: number; reason: string };
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const variantId = pathParts[pathParts.length - 2];
    const stock = mockStock.find((s) => s.variantId === variantId);
    if (!stock) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ ...stock, quantity: stock.quantity + body.quantity });
  }),

  http.get("*/admin/coupons", () => {
    return HttpResponse.json(mockCoupons);
  }),

  http.post("*/admin/coupons", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: "coupon-new",
      ...body,
      usedCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  }),

  http.delete("*/admin/coupons/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
