"use client";

import { api } from "@/lib/api";
import type { Category } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export function CategoryNav() {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get<Category[]>("/categories");
      return response;
    },
  });

  if (isLoading) {
    return (
      <div className="border-b bg-muted/30">
        <div className="container mx-auto flex h-10 items-center justify-center px-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="border-b bg-muted/30">
      <div className="container mx-auto flex h-10 items-center gap-1 overflow-x-auto px-4 scrollbar-hide">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="whitespace-nowrap rounded-md px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
