"use client";

import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface PixPanelProps {
  qrCodePngUrl: string;
  hostedInstructionsUrl: string;
  copyCode: string;
  onPaymentSuccess: () => void;
}

export function PixPanel({
  qrCodePngUrl,
  hostedInstructionsUrl,
  copyCode,
  onPaymentSuccess,
}: PixPanelProps) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  async function handleCopy() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(copyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground text-center">
        Escaneie o QR Code abaixo no app do seu banco para pagar com Pix.
      </p>
      {qrCodePngUrl && (
        <Image
          src={qrCodePngUrl}
          alt="QR Code Pix"
          width={224}
          height={224}
          className="size-56 rounded-lg border object-cover"
        />
      )}
      <Button type="button" variant="outline" onClick={handleCopy} disabled={copying}>
        {copying ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
        {copied ? "Código copiado!" : "Copiar código Pix"}
      </Button>
      {hostedInstructionsUrl && (
        <a
          href={hostedInstructionsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary underline"
        >
          Ver instruções de pagamento
        </a>
      )}
    </div>
  );
}
