import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartItemVariant {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  };
}

interface CartItem {
  variantId: string;
  quantity: number;
  variant: CartItemVariant;
}

interface CartState {
  items: CartItem[];
  addItem: (variant: CartItemVariant) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  totalCents: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (variant) => {
        set((state) => {
          const existing = state.items.find((i) => i.variantId === variant.id);

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            };
          }

          return {
            items: [...state.items, { variantId: variant.id, quantity: 1, variant }],
          };
        });
      },

      removeItem: (variantId) => {
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        }));
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          set((state) => ({
            items: state.items.filter((i) => i.variantId !== variantId),
          }));
          return;
        }

        set((state) => ({
          items: state.items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      totalCents: () => {
        return get().items.reduce(
          (total, item) => total + item.variant.priceCents * item.quantity,
          0,
        );
      },

      itemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: "kronostore-cart",
    },
  ),
);
