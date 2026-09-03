"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import type { Order, PaymentMethod } from "@/types";
import { CreditCard, Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaymentPicker } from "./payment-picker";

interface Address {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export function CheckoutForm() {
  const router = useRouter();
  const _user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const items = useCartStore((s) => s.items);
  const totalCents = useCartStore((s) => s.totalCents());
  const clearCart = useCartStore((s) => s.clearCart);
  const syncWithServer = useCartStore((s) => s.syncWithServer);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [address, setAddress] = useState<Address>({
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  function handleAddressChange(field: keyof Address, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (token) {
        await syncWithServer(token);
      }

      const order = await api.post<Order>("/checkout");

      await api.post("/payments", {
        orderId: order.id,
        method: paymentMethod,
        amountCents: totalCents,
      });

      clearCart();
      router.push(`/checkout/success?orderId=${order.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao finalizar compra";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Seu carrinho está vazio.</p>
        <Button variant="link" onClick={() => router.push("/")}>
          Continuar comprando
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_400px]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5" />
              Endereço de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <div className="flex flex-col gap-2">
                <Label htmlFor="street">Rua</Label>
                <Input
                  id="street"
                  placeholder="Rua das Flores"
                  value={address.street}
                  onChange={(e) => handleAddressChange("street", e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  placeholder="123"
                  value={address.number}
                  onChange={(e) => handleAddressChange("number", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                placeholder="Apto 42, Bloco B"
                value={address.complement}
                onChange={(e) => handleAddressChange("complement", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input
                id="neighborhood"
                placeholder="Centro"
                value={address.neighborhood}
                onChange={(e) => handleAddressChange("neighborhood", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_100px_60px]">
              <div className="flex flex-col gap-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  placeholder="São Paulo"
                  value={address.city}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  placeholder="SP"
                  value={address.state}
                  onChange={(e) => handleAddressChange("state", e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  placeholder="01234-567"
                  value={address.zipCode}
                  onChange={(e) => handleAddressChange("zipCode", e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5" />
              Forma de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentPicker value={paymentMethod} onChange={setPaymentMethod} />
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.variantId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.variant.product.name} ({item.variant.name}) x{item.quantity}
                  </span>
                  <span>{formatBRL(item.variant.priceCents * item.quantity)}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal ({itemCount} itens)</span>
              <span>{formatBRL(totalCents)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Frete</span>
              <span className="text-green-600 dark:text-green-400">Grátis</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span className="text-lg">{formatBRL(totalCents)}</span>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Finalizar Compra"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
