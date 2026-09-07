"use client";

import { Button } from "@/components/ui/button";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { getStripe } from "@/lib/stripe";

interface CreditCardFormProps {
  clientSecret: string;
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

function CardFormInner({ clientSecret, onPaymentSuccess, onCancel }: CreditCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (!stripe || !elements) {
      setError("Serviço de pagamento não carregado.");
      return;
    }

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Elemento de cartão não encontrado.");
      setLoading(false);
      return;
    }

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Erro ao processar o pagamento.");
      return;
    }

    onPaymentSuccess();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border p-4">
        <CardElement options={{ style: { base: { fontSize: "16px" } } }} />
      </div>
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Voltar
        </Button>
        <Button type="button" onClick={handlePay} disabled={loading || !stripe}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Pagar"}
        </Button>
      </div>
    </div>
  );
}

export function CreditCardForm(props: CreditCardFormProps) {
  return (
    <Elements stripe={getStripe()} options={{ clientSecret: props.clientSecret }}>
      <CardFormInner {...props} />
    </Elements>
  );
}
