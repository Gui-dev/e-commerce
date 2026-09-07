"use client";

import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface BoletoPanelProps {
  hostedVoucherUrl: string;
  onPaymentSuccess: () => void;
}

export function BoletoPanel({
  hostedVoucherUrl,
  onPaymentSuccess,
}: BoletoPanelProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <FileText className="size-12 text-muted-foreground" />
      <p className="text-sm text-muted-foreground text-center">
        Seu boleto foi gerado. Clique abaixo para pagar. Pague dentro do prazo
        para confirmar o pedido. Você será redirecionado assim que o pagamento
        for confirmado.
      </p>
      <a href={hostedVoucherUrl} target="_blank" rel="noreferrer">
        <Button type="button">Baixar boleto</Button>
      </a>
    </div>
  );
}
