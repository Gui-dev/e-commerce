import { api } from "./api";

interface CartItemPayload {
  variantId: string;
  quantity: number;
}

interface CartItemResponse {
  id: string;
  variantId: string;
}

export async function syncCartWithServer(
  items: CartItemPayload[],
  token: string,
): Promise<Map<string, string>> {
  const mapping = new Map<string, string>();

  try {
    for (const item of items) {
      const response = await api.post<CartItemResponse>(
        "/cart/items",
        { variantId: item.variantId, quantity: item.quantity },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      mapping.set(item.variantId, response.id);
    }
  } catch (err) {
    console.error("Failed to sync cart with server:", err);
    return new Map();
  }

  return mapping;
}
