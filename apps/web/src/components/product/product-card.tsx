import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import type { Product } from "@/types";
import Image from "next/image";
import Link from "next/link";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <div className="relative aspect-square overflow-hidden rounded-t-xl bg-muted">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Sem imagem
            </div>
          )}
          <Badge variant="secondary" className="absolute top-2 left-2">
            {product.skuPrefix}
          </Badge>
          {!product.isActive && (
            <Badge variant="destructive" className="absolute top-2 right-2">
              Inativo
            </Badge>
          )}
        </div>
        <CardContent className="flex flex-col gap-1 pt-4">
          <h3 className="line-clamp-1 font-medium group-hover:underline">{product.name}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-0">
          <span className="text-lg font-semibold">{formatBRL(product.priceCents)}</span>
          <Button size="sm">+ Comprar</Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
