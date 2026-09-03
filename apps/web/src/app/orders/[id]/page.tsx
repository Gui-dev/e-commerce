"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatBRL } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { Order } from "@/types";
import { ArrowLeft, CreditCard, Loader2, MapPin, Package } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    async function fetchOrder() {
      try {
        const data = await api.get<Order>(`/orders/${orderId}`);
        setOrder(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao carregar pedido";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [isAuthenticated, orderId, router]);

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

  if (error || !order) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive">{error || "Pedido não encontrado"}</p>
          <Button variant="link" onClick={() => router.push("/orders")}>
            Voltar para pedidos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push("/orders")}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Pedido #{orderId.slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground">
            Realizado em {new Date(order.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Itens do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                    <Package className="size-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {item.product?.name || item.variant?.name || "Produto"}
                    </p>
                    {item.variant?.name && item.product?.name && (
                      <p className="text-sm text-muted-foreground">{item.variant.name}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {item.quantity}x {formatBRL(item.unitPriceCents)}
                    </p>
                  </div>
                  <p className="font-medium">{formatBRL(item.unitPriceCents * item.quantity)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {order.shippingName && order.shippingStreet && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="size-5" />
                  Endereço de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <p className="font-medium">{order.shippingName}</p>
                <p className="text-muted-foreground">{order.shippingStreet}</p>
                <p className="text-muted-foreground">
                  {order.shippingCity} - {order.shippingState}, CEP {order.shippingZip}
                </p>
                <p className="text-muted-foreground uppercase">{order.shippingCountry}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant={order.status === "paid" ? "default" : "secondary"}
                className="text-sm"
              >
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
            </CardContent>
          </Card>

          {order.payment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="size-5" />
                  Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Método</span>
                  <span>{PAYMENT_METHOD_LABELS[order.payment.method]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span>{formatBRL(order.payment.amountCents)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={order.payment.status === "approved" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {PAYMENT_STATUS_LABELS[order.payment.status]}
                  </Badge>
                </div>
                {order.payment.paidAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pago em</span>
                    <span>{new Date(order.payment.paidAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatBRL(order.subtotalCents)}</span>
              </div>
              {order.discountCents > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="text-green-600 dark:text-green-400">
                    -{formatBRL(order.discountCents)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                <span className="text-green-600 dark:text-green-400">Grátis</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span className="text-lg">{formatBRL(order.totalCents)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
