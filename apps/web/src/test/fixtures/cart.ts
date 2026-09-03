import type { CartItem } from "@/types";

export const mockVariant: CartItem["variant"] = {
  id: "var-1",
  name: "Default",
  sku: "WH-001",
  priceCents: 9990,
  product: {
    id: "prod-1",
    name: "Wireless Headphones",
    slug: "wireless-headphones",
    imageUrl: "https://example.com/headphones.jpg",
  },
};

export const mockVariant2: CartItem["variant"] = {
  id: "var-2",
  name: "Pro",
  sku: "WH-002",
  priceCents: 14990,
  product: {
    id: "prod-1",
    name: "Wireless Headphones",
    slug: "wireless-headphones",
    imageUrl: "https://example.com/headphones.jpg",
  },
};
