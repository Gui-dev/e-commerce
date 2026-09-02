"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@/types";
import { Package, Loader2 } from "lucide-react";

export default function OrdersPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    async function fetchOrders() {
      try {
        const data = await api.get<Order[]>("/orders");
        setOrders(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao carregar pedidos";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
          <Button variant="link" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <Package className="size-16 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold">Nenhum pedido encontrado</h2>
          <p className="text-sm text-muted-foreground">
            Você ainda não fez nenhum pedido.
          </p>
        </div>
        <Link href="/" className={buttonVariants()}>
          Ver Produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Meus Pedidos</h1>
      <div className="flex flex-col gap-4">
        {orders.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`}>
            <Card className="cursor-pointer transition-colors hover:bg-accent/50">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4">
                  <Package className="size-10 text-muted-foreground" />
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">
                      #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={order.status === "paid" ? "default" : "secondary"}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                  <p className="mt-1 font-semibold">{formatBRL(order.totalCents)}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
