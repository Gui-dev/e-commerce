"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { PaginatedResponse, Product } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";
import { ProductCard } from "./product-card";

interface ProductGridProps {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
}

function ProductCardSkeleton() {
  return (
    <Card className="h-full">
      <Skeleton className="aspect-square rounded-t-xl" />
      <CardContent className="flex flex-col gap-2 pt-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-0">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-8 w-20" />
      </CardFooter>
    </Card>
  );
}

export function ProductGrid({ page = 1, limit = 12, categoryId, search }: ProductGridProps) {
  const { data, isLoading, error } = useQuery<PaginatedResponse<Product>>({
    queryKey: ["products", { page, limit, categoryId, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (categoryId) params.set("categoryId", categoryId);
      if (search) params.set("search", search);
      const response = await api.get<{ data: PaginatedResponse<Product> }>(
        `/products?${params.toString()}`,
      );
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list, never reordered
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <PackageSearch className="size-12 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium">Erro ao carregar produtos</h3>
          <p className="text-sm text-muted-foreground">Tente novamente mais tarde.</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <PackageSearch className="size-12 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium">Nenhum produto encontrado</h3>
          <p className="text-sm text-muted-foreground">
            Não encontramos produtos disponíveis no momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {data.data.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
