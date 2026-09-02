import type { PaginatedResponse, Product } from "@/types";
import { http, HttpResponse } from "msw";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Wireless Headphones",
    slug: "wireless-headphones",
    description: "High-quality wireless headphones with noise cancellation.",
    categoryId: "cat-1",
    priceCents: 9990,
    imageUrl: "https://example.com/headphones.jpg",
    skuPrefix: "WH",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "prod-2",
    name: "Mechanical Keyboard",
    slug: "mechanical-keyboard",
    description: "RGB mechanical keyboard with Cherry MX switches.",
    categoryId: "cat-1",
    priceCents: 14990,
    imageUrl: null,
    skuPrefix: "MK",
    isActive: true,
    createdAt: "2026-01-02T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  },
  {
    id: "prod-3",
    name: "Inactive Product",
    slug: "inactive-product",
    description: "This product is inactive.",
    categoryId: "cat-2",
    priceCents: 4990,
    imageUrl: null,
    skuPrefix: "IP",
    isActive: false,
    createdAt: "2026-01-03T00:00:00Z",
    updatedAt: "2026-01-03T00:00:00Z",
  },
];

export const productsHandlers = [
  http.get(`${API_URL}/products`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const limit = Number(url.searchParams.get("limit") ?? "20");

    const response: PaginatedResponse<Product> = {
      data: mockProducts,
      total: mockProducts.length,
      page,
      limit,
      totalPages: 1,
    };

    return HttpResponse.json(response);
  }),

  http.get(`${API_URL}/products/:slug`, ({ params }) => {
    const product = mockProducts.find((p) => p.slug === params.slug);

    if (!product) {
      return HttpResponse.json(
        { error: "NOT_FOUND", message: "Product not found" },
        { status: 404 },
      );
    }

    return HttpResponse.json({ data: product });
  }),
];
