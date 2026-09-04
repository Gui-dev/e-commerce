"use client";

import { CatalogSidebar } from "@/components/product/catalog-sidebar";
import { Pagination } from "@/components/product/pagination";
import { ProductCard } from "@/components/product/product-card";
import { api } from "@/lib/api";
import type { Product } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

interface CatalogFilters {
  search?: string;
  categoryId?: string;
  priceMin?: number;
  priceMax?: number;
}

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<CatalogFilters>({
    search: searchParams.get("search") ?? undefined,
    categoryId: searchParams.get("category") ?? undefined,
    priceMin: searchParams.get("priceMin")
      ? Number(searchParams.get("priceMin"))
      : undefined,
    priceMax: searchParams.get("priceMax")
      ? Number(searchParams.get("priceMax"))
      : undefined,
  });

  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const limit = 12;

  const { data, isLoading } = useQuery<{
    products: Product[];
    total: number;
  }>({
    queryKey: ["products", { ...filters, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.search) params.set("search", filters.search);
      if (filters.priceMin) params.set("priceMin", String(filters.priceMin));
      if (filters.priceMax) params.set("priceMax", String(filters.priceMax));
      const response = await api.get<{
        products: Product[];
        total: number;
      }>(`/products?${params.toString()}`);
      return response;
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleFilterChange = useCallback((newFilters: CatalogFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Produtos</h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        <CatalogSidebar
          onFilterChange={handleFilterChange}
          initialFilters={filters}
        />

        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : data && data.products.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {data.total} produto{data.total !== 1 ? "s" : ""} encontrado
                {data.total !== 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-8">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <PackageSearch className="mb-4 size-12 text-muted-foreground" />
              <h2 className="text-lg font-semibold">
                Nenhum produto encontrado
              </h2>
              <p className="text-sm text-muted-foreground">
                Tente ajustar os filtros ou buscar por outro termo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
