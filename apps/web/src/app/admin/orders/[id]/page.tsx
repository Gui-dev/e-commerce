"use client";

import { AdminOrderStatusBadge } from "@/components/admin/admin-order-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatBRL } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { Order, OrderStatus } from "@/types";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function OrderDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/login");
      return;
    }

    if (!orderId) {
      router.push("/admin/orders");
      return;
    }

    api
      .get<Order>(`/admin/orders/${orderId}`)
      .then(setOrder)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, user, router, orderId]);

  async function handleStatusUpdate(newStatus: OrderStatus) {
    if (!order) return;
    setUpdating(true);
    try {
      const updated = await api.patch<Order>(`/admin/orders/${order.id}/status`, {
        status: newStatus,
      });
      setOrder(updated);
    } catch (err) {
      console.error("Failed to update order status", err);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return <div className="text-center py-20 text-muted-foreground">Pedido nao encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/orders" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-3xl font-bold">Pedido {order.id.slice(0, 8)}...</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Atual:</span>
              <AdminOrderStatusBadge status={order.status} />
            </div>
            <div className="space-y-2">
              <Label>Atualizar status</Label>
              <Select
                value={order.status}
                onValueChange={(v) => handleStatusUpdate(v as OrderStatus)}
                disabled={updating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => (
                    <SelectItem key={status} value={status}>
                      {ORDER_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Envio</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>{order.shippingName}</p>
            <p>{order.shippingStreet}</p>
            <p>
              {order.shippingCity} - {order.shippingState}
            </p>
            <p>{order.shippingZip}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{item.variant?.name || item.variantId}</span>
                  <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                </div>
                <span>{formatBRL(item.unitPriceCents * item.quantity)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between font-medium">
              <span>Total</span>
              <span>{formatBRL(order.totalCents)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <OrderDetailContent />
    </Suspense>
  );
}
