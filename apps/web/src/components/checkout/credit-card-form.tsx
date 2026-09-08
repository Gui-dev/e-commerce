"use client";

import { Button } from "@/components/ui/button";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { getStripe } from "@/lib/stripe";

interface BillingDetails {
  name: string;
  email: string;
  address: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

interface CreditCardFormProps {
  clientSecret: string;
  billingDetails: BillingDetails;
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

function CardFormInner({ clientSecret, billingDetails, onPaymentSuccess, onCancel }: CreditCardFormProps) {
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

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Erro ao processar o pagamento.");
      setLoading(false);
      return;
    }

    const result = await stripe.confirmPayment({
      elements,
      clientSecret,
      redirect: "if_required",
      confirmParams: {
        return_url: window.location.href,
        payment_method_data: {
          billing_details: billingDetails,
        },
      },
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Erro ao processar o pagamento.");
      return;
    }

    if (result.paymentIntent?.status === "succeeded") {
      onPaymentSuccess();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border p-4">
        <PaymentElement />
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
    <Elements
      stripe={getStripe()}
      options={{ clientSecret: props.clientSecret, locale: "pt-BR", appearance: { theme: "stripe" } }}
    >
      <CardFormInner {...props} />
    </Elements>
  );
}
