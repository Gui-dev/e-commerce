"use client";

import { Pagination } from "@/components/product/pagination";
import { ProductCard } from "@/components/product/product-card";
import { api } from "@/lib/api";
import type { Category, Product } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, PackageSearch } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [page, setPage] = useState(1);
  const limit = 12;

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get<Category[]>("/categories");
      return response;
    },
  });

  const category = categories?.find((c) => c.slug === slug);

  const { data, isLoading } = useQuery<{
    products: Product[];
    total: number;
  }>({
    queryKey: ["products", { categoryId: category?.id, page, limit }],
    queryFn: async () => {
      if (!category) return { products: [], total: 0 };
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("categoryId", category.id);
      const response = await api.get<{ products: Product[]; total: number }>(
        `/products?${params.toString()}`,
      );
      return response;
    },
    enabled: !!category,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  if (!category && categories) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PackageSearch className="mb-4 size-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Categoria não encontrada</h2>
        <Link href="/categories" className="mt-4 text-sm text-primary hover:underline">
          ← Voltar para categorias
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/categories" className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-2xl font-bold">{category?.name ?? "Carregando..."}</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PackageSearch className="mb-4 size-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Nenhum produto nesta categoria</h2>
          <Link href="/products" className="mt-4 text-sm text-primary hover:underline">
            Ver todos os produtos →
          </Link>
        </div>
      )}
    </div>
  );
}
