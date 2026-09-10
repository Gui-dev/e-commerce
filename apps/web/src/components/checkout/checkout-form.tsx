"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { usePaymentStatus } from "@/hooks/use-payment-status";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import type { Order, PaymentIntentResponse, PaymentMethod } from "@/types";
import { CreditCard, Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BoletoPanel } from "./boleto-panel";
import { CreditCardForm } from "./credit-card-form";
import { PaymentPicker } from "./payment-picker";
import { PixPanel } from "./pix-panel";

interface Address {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  taxId: string;
}

export function CheckoutForm() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const items = useCartStore((s) => s.items);
  const totalCents = useCartStore((s) => s.totalCents());
  const clearCart = useCartStore((s) => s.clearCart);
  const coupon = useCartStore((s) => s.coupon);
  const syncWithServer = useCartStore((s) => s.syncWithServer);

  const userEmail = useAuthStore((s) => s.user?.email ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [address, setAddress] = useState<Address>({
    name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    taxId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "payment">("form");
  const [paymentStep, setPaymentStep] = useState<PaymentIntentResponse | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const hasNavigated = useRef(false);

  usePaymentStatus(orderId ?? "", () => {
    if (orderId && !hasNavigated.current) {
      hasNavigated.current = true;
      router.push(`/checkout/success?orderId=${orderId}`);
    }
  });

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

      const order = await api.post<Order>(
        "/checkout",
        { address: { ...address, country: "BR" }, paymentMethod },
        { headers: { "idempotency-key": `checkout:${crypto.randomUUID()}` } },
      );

      const paymentIntent = await api.post<PaymentIntentResponse>(
        "/checkout/payment-intent",
        {
          orderId: order.id,
          taxId: address.taxId || undefined,
        },
        { headers: { "idempotency-key": `payment-intent:${order.id}` } },
      );

      setOrderId(order.id);
      setPaymentStep(paymentIntent);
      setStep("payment");
      clearCart();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao finalizar compra";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0 && step === "form") {
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nome do Destinatário</Label>
              <Input
                id="name"
                placeholder="Maria Silva"
                value={address.name}
                onChange={(e) => handleAddressChange("name", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="street">Rua</Label>
              <Input
                id="street"
                placeholder="Rua das Flores, 123"
                value={address.street}
                onChange={(e) => handleAddressChange("street", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                  maxLength={2}
                  value={address.state}
                  onChange={(e) => handleAddressChange("state", e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="zip">CEP</Label>
              <Input
                id="zip"
                placeholder="01234-567"
                value={address.zip}
                onChange={(e) => handleAddressChange("zip", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="taxId">CPF/CNPJ</Label>
              <Input
                id="taxId"
                placeholder="000.000.000-00"
                value={address.taxId}
                onChange={(e) => handleAddressChange("taxId", e.target.value)}
                required
              />
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
            <PaymentPicker
              value={paymentMethod}
              onChange={step === "payment" ? () => {} : setPaymentMethod}
            />
            {step === "payment" && paymentStep && (
              <div className="mt-4">
                {paymentStep.type === "card" && paymentStep.clientSecret && (
                  <CreditCardForm
                    clientSecret={paymentStep.clientSecret}
                    billingDetails={{
                      name: address.name,
                      email: userEmail,
                      address: {
                        line1: address.street,
                        city: address.city,
                        state: address.state,
                        postal_code: address.zip,
                        country: "BR",
                      },
                    }}
                    onPaymentSuccess={() => {
                      if (orderId && !hasNavigated.current) {
                        hasNavigated.current = true;
                        router.push(`/checkout/success?orderId=${orderId}`);
                      }
                    }}
                    onCancel={() => setStep("form")}
                  />
                )}
                {paymentStep.type === "pix" && (
                  <PixPanel
                    qrCodePngUrl={paymentStep.qrCodePngUrl ?? ""}
                    hostedInstructionsUrl={paymentStep.hostedInstructionsUrl ?? ""}
                    copyCode={paymentStep.qrCodeUrl ?? ""}
                  />
                )}
                {paymentStep.type === "boleto" && (
                  <BoletoPanel hostedVoucherUrl={paymentStep.hostedVoucherUrl ?? ""} />
                )}
              </div>
            )}
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
            {coupon && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Desconto ({coupon.code})</span>
                <span className="text-green-600 dark:text-green-400">
                  -{formatBRL(coupon.discountCents)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span className="text-lg">
                {formatBRL(Math.max(0, totalCents - (coupon?.discountCents ?? 0)))}
              </span>
            </div>

            {step === "form" && (
              <>
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
