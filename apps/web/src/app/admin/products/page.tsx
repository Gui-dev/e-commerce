"use client";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { Product } from "@/types";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminProductsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/login");
      return;
    }

    api
      .get<{ data: Product[]; total: number }>("/admin/products")
      .then((res) => setProducts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Produtos</h1>
        <Link href="/admin/products/new" className={buttonVariants({ variant: "default" })}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Produtos ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-4 text-left font-medium">Nome</th>
                  <th className="py-3 px-4 text-left font-medium">SKU</th>
                  <th className="py-3 px-4 text-left font-medium">Preco</th>
                  <th className="py-3 px-4 text-left font-medium">Status</th>
                  <th className="py-3 px-4 text-left font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{product.name}</td>
                    <td className="py-3 px-4 font-mono text-xs">{product.skuPrefix}</td>
                    <td className="py-3 px-4">{formatBRL(product.priceCents)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
