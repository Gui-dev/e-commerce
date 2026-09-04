"use client";

import { AdminStatsCard } from "@/components/admin/admin-stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { Order, Product, User } from "@/types";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<{ orders: number; products: number; users: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/login");
      return;
    }

    async function fetchStats() {
      try {
        const [orders, products, users] = await Promise.all([
          api.get<Order[]>("/admin/orders"),
          api.get<{ data: Product[]; total: number }>("/admin/products"),
          api.get<User[]>("/admin/users"),
        ]);
        setStats({
          orders: orders.length,
          products: products.total ?? products.data?.length ?? 0,
          users: users.length,
        });
      } catch {
        console.error("Failed to fetch admin stats");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
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
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatsCard title="Pedidos" value={stats?.orders ?? 0} />
        <AdminStatsCard title="Produtos" value={stats?.products ?? 0} />
        <AdminStatsCard title="Usuarios" value={stats?.users ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo ao Painel Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Use o menu lateral para gerenciar pedidos, produtos, categorias, usuarios, estoque e
            cupons.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
