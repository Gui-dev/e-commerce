"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatBRL } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { Trash2 } from "lucide-react";
import Image from "next/image";

interface CartItemProps {
  variantId: string;
  quantity: number;
  variant: {
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
  };
}

export function CartItem({ variantId, quantity, variant }: CartItemProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const lineTotal = variant.priceCents * quantity;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {variant.product.imageUrl ? (
            <Image
              src={variant.product.imageUrl}
              alt={variant.product.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Sem imagem
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between gap-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-medium">{variant.product.name}</h3>
              <p className="text-sm text-muted-foreground">{variant.name}</p>
              <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => removeItem(variantId)}
              aria-label={`Remover ${variant.product.name}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => updateQuantity(variantId, quantity - 1)}
                aria-label="Diminuir quantidade"
              >
                −
              </Button>
              <span className="w-8 text-center text-sm font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => updateQuantity(variantId, quantity + 1)}
                aria-label="Aumentar quantidade"
              >
                +
              </Button>
            </div>
            <span className="font-semibold">{formatBRL(lineTotal)}</span>
          </div>
        </div>
      </div>
      <Separator />
    </div>
  );
}
