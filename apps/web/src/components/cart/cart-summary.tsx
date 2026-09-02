"use client";

import Link from "next/link";
import { useCartStore } from "@/stores/cart-store";
import { formatBRL } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart } from "lucide-react";

export function CartSummary() {
  const items = useCartStore((s) => s.items);
  const totalCents = useCartStore((s) => s.totalCents());

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal ({itemCount} itens)</span>
          <span>{formatBRL(totalCents)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Frete</span>
          <span className="text-green-600 dark:text-green-400">Grátis</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between font-semibold">
          <span>Total</span>
          <span className="text-lg">{formatBRL(totalCents)}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Link href="/checkout" className={buttonVariants({ className: "w-full", size: "lg" })}>
          <ShoppingCart className="size-4" />
          Finalizar Compra
        </Link>
      </CardFooter>
    </Card>
  );
}
