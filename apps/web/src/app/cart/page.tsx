"use client";

import Link from "next/link";
import { useCartStore } from "@/stores/cart-store";
import { CartItem } from "@/components/cart/cart-item";
import { CartSummary } from "@/components/cart/cart-summary";
import { Button, buttonVariants } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <ShoppingCart className="size-16 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold">Seu carrinho está vazio</h2>
          <p className="text-sm text-muted-foreground">
            Adicione produtos para continuar comprando.
          </p>
        </div>
        <Link href="/" className={buttonVariants()}>
          Ver Produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Carrinho</h1>
        <Button variant="ghost" size="sm" onClick={clearCart}>
          Limpar carrinho
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <CartItem
              key={item.variantId}
              variantId={item.variantId}
              quantity={item.quantity}
              variant={item.variant}
            />
          ))}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <CartSummary />
        </div>
      </div>
    </div>
  );
}
