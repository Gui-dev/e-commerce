"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { Category } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface CatalogFilters {
  search?: string;
  categoryId?: string;
  priceMin?: number;
  priceMax?: number;
}

interface CatalogSidebarProps {
  onFilterChange: (filters: CatalogFilters) => void;
  initialFilters?: CatalogFilters;
}

export function CatalogSidebar({ onFilterChange, initialFilters = {} }: CatalogSidebarProps) {
  const [search, setSearch] = useState(initialFilters.search ?? "");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    initialFilters.categoryId,
  );
  const [priceMin, setPriceMin] = useState(initialFilters.priceMin?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(initialFilters.priceMax?.toString() ?? "");

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get<Category[]>("/categories");
      return response;
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({
        search: search || undefined,
        categoryId: selectedCategory,
        priceMin: priceMin ? Number(priceMin) : undefined,
        priceMax: priceMax ? Number(priceMax) : undefined,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [search, selectedCategory, priceMin, priceMax, onFilterChange]);

  const handleCategoryChange = useCallback(
    (categoryId: string | undefined) => {
      setSelectedCategory(categoryId);
      onFilterChange({
        search: search || undefined,
        categoryId,
        priceMin: priceMin ? Number(priceMin) : undefined,
        priceMax: priceMax ? Number(priceMax) : undefined,
      });
    },
    [onFilterChange, search, priceMin, priceMax],
  );

  const handleClear = useCallback(() => {
    setSearch("");
    setSelectedCategory(undefined);
    setPriceMin("");
    setPriceMax("");
    onFilterChange({});
  }, [onFilterChange]);

  const hasFilters = search || selectedCategory || priceMin || priceMax;

  return (
    <aside className="w-full shrink-0 space-y-6 lg:w-64">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Categorias</h3>
        <div className="space-y-2">
          {categories?.map((category) => (
            // biome-ignore lint/a11y/noLabelWithoutControl: custom Checkbox component
            <label key={category.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={selectedCategory === category.id}
                onCheckedChange={(checked) => {
                  handleCategoryChange(checked ? category.id : undefined);
                }}
              />
              {category.name}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Preço</h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="priceMin" className="sr-only">
              Preço mínimo
            </Label>
            <Input
              id="priceMin"
              type="number"
              placeholder="Mín"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              min="0"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="priceMax" className="sr-only">
              Preço máximo
            </Label>
            <Input
              id="priceMax"
              type="number"
              placeholder="Máx"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              min="0"
            />
          </div>
        </div>
      </div>

      {hasFilters && (
        <Button variant="outline" size="sm" className="w-full" onClick={handleClear}>
          <X className="mr-2 size-4" />
          Limpar filtros
        </Button>
      )}
    </aside>
  );
}
