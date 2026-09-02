"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import type { ProductVariant } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ShoppingCart, Check } from "lucide-react";

interface ProductWithVariants {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  priceCents: number;
  imageUrl: string | null;
  skuPrefix: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  variants: ProductVariant[];
}

interface ProductDetailClientProps {
  slug: string;
}

function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-10 w-1/3 mt-4" />
          <Skeleton className="h-12 w-full mt-4" />
        </div>
      </div>
    </div>
  );
}

function ProductDetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <AlertCircle className="size-12 text-destructive" />
      <div>
        <h3 className="text-lg font-medium">Erro ao carregar produto</h3>
        <p className="text-sm text-muted-foreground">
          Verifique o URL ou tente novamente mais tarde.
        </p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

export function ProductDetailClient({ slug }: ProductDetailClientProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const { data: product, isLoading, error, refetch } = useQuery<ProductWithVariants>({
    queryKey: ["product", slug],
    queryFn: async () => {
      const response = await api.get<{ data: ProductWithVariants }>(`/products/${slug}`);
      return response.data;
    },
  });

  const handleAddToCart = () => {
    if (!product) return;

    const variant = selectedVariant || product.variants[0];
    if (!variant) return;

    addItem({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      priceCents: variant.priceCents ?? product.priceCents,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: product.imageUrl,
      },
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (error) {
    return <ProductDetailError onRetry={() => refetch()} />;
  }

  if (!product) {
    return <ProductDetailError onRetry={() => refetch()} />;
  }

  const hasVariants = product.variants.length > 0;
  const currentVariant = selectedVariant || product.variants[0];
  const currentPrice = currentVariant?.priceCents ?? product.priceCents;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Sem imagem
            </div>
          )}
          {!product.isActive && (
            <Badge variant="destructive" className="absolute top-4 right-4">
              Inativo
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <Badge variant="secondary" className="mt-2">
              {product.skuPrefix}
            </Badge>
          </div>

          <p className="text-muted-foreground">{product.description}</p>

          {hasVariants && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Variante</label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <Button
                    key={variant.id}
                    variant={selectedVariant?.id === variant.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedVariant(variant)}
                  >
                    {variant.name}
                    {variant.sku && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({variant.sku})
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {currentVariant && (
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span>SKU: {currentVariant.sku}</span>
              {currentVariant.attributes && (
                <span>
                  {Object.entries(currentVariant.attributes)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" | ")}
                </span>
              )}
            </div>
          )}

          <div className="text-3xl font-bold">{formatBRL(currentPrice)}</div>

          <Button
            size="lg"
            className="w-full"
            onClick={handleAddToCart}
            disabled={!product.isActive || addedToCart}
          >
            {addedToCart ? (
              <>
                <Check className="size-4" />
                Adicionado!
              </>
            ) : (
              <>
                <ShoppingCart className="size-4" />
                + Comprar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
