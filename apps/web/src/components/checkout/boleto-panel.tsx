"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

interface BoletoPanelProps {
  hostedVoucherUrl: string;
}

export function BoletoPanel({ hostedVoucherUrl }: BoletoPanelProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <FileText className="size-12 text-muted-foreground" />
      <p className="text-sm text-muted-foreground text-center">
        Seu boleto foi gerado. Clique abaixo para pagar. Pague dentro do prazo para confirmar o
        pedido. Você será redirecionado assim que o pagamento for confirmado.
      </p>
      {hostedVoucherUrl && (
        <a
          href={hostedVoucherUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          Baixar boleto
        </a>
      )}
    </div>
  );
}
