import type { CartItem } from "@/types";
import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore } from "./cart-store";

const mockVariant: CartItem["variant"] = {
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

const mockVariant2: CartItem["variant"] = {
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

describe("useCartStore", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it("should start with an empty cart", () => {
    const { items, itemCount, totalCents } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(itemCount()).toBe(0);
    expect(totalCents()).toBe(0);
  });

  it("should add an item to the cart", () => {
    useCartStore.getState().addItem(mockVariant);

    const { items, itemCount } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].variantId).toBe("var-1");
    expect(items[0].quantity).toBe(1);
    expect(itemCount()).toBe(1);
  });

  it("should increment quantity when adding the same variant twice", () => {
    useCartStore.getState().addItem(mockVariant);
    useCartStore.getState().addItem(mockVariant);

    const { items, itemCount } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(itemCount()).toBe(2);
  });

  it("should add multiple different variants", () => {
    useCartStore.getState().addItem(mockVariant);
    useCartStore.getState().addItem(mockVariant2);

    const { items, itemCount } = useCartStore.getState();
    expect(items).toHaveLength(2);
    expect(itemCount()).toBe(2);
  });

  it("should remove an item from the cart", () => {
    useCartStore.getState().addItem(mockVariant);
    useCartStore.getState().removeItem("var-1");

    const { items, itemCount } = useCartStore.getState();
    expect(items).toHaveLength(0);
    expect(itemCount()).toBe(0);
  });

  it("should update item quantity", () => {
    useCartStore.getState().addItem(mockVariant);
    useCartStore.getState().updateQuantity("var-1", 5);

    const { items, itemCount } = useCartStore.getState();
    expect(items[0].quantity).toBe(5);
    expect(itemCount()).toBe(5);
  });

  it("should remove item when quantity is updated to 0", () => {
    useCartStore.getState().addItem(mockVariant);
    useCartStore.getState().updateQuantity("var-1", 0);

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(0);
  });

  it("should remove item when quantity is negative", () => {
    useCartStore.getState().addItem(mockVariant);
    useCartStore.getState().updateQuantity("var-1", -1);

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(0);
  });

  it("should clear the entire cart", () => {
    useCartStore.getState().addItem(mockVariant);
    useCartStore.getState().addItem(mockVariant2);
    useCartStore.getState().clearCart();

    const { items, itemCount, totalCents } = useCartStore.getState();
    expect(items).toHaveLength(0);
    expect(itemCount()).toBe(0);
    expect(totalCents()).toBe(0);
  });

  it("should calculate totalCents correctly", () => {
    useCartStore.getState().addItem(mockVariant);
    useCartStore.getState().addItem(mockVariant);

    expect(useCartStore.getState().totalCents()).toBe(9990 * 2);
  });

  it("should calculate totalCents with multiple variants", () => {
    useCartStore.getState().addItem(mockVariant);
    useCartStore.getState().addItem(mockVariant2);

    expect(useCartStore.getState().totalCents()).toBe(9990 + 14990);
  });

  it("should handle removing a non-existent item gracefully", () => {
    useCartStore.getState().removeItem("non-existent");

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(0);
  });
});
