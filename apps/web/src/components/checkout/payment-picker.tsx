"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types";
import { CreditCard, FileText, QrCode } from "lucide-react";

interface PaymentPickerProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const paymentMethods: {
  method: PaymentMethod;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    method: "pix",
    label: "PIX",
    icon: <QrCode className="size-6" />,
    description: "Pagamento instantâneo",
  },
  {
    method: "credit_card",
    label: "Cartão de Crédito",
    icon: <CreditCard className="size-6" />,
    description: "Até 12x sem juros",
  },
  {
    method: "boleto",
    label: "Boleto",
    icon: <FileText className="size-6" />,
    description: "Vencimento em 3 dias úteis",
  },
];

export function PaymentPicker({ value, onChange }: PaymentPickerProps) {
  return (
    <div className="grid gap-3">
      {paymentMethods.map(({ method, label, icon, description }) => (
        <Card
          key={method}
          className={cn(
            "cursor-pointer transition-colors hover:bg-accent/50",
            value === method && "border-primary bg-primary/5",
          )}
          onClick={() => onChange(method)}
        >
          <CardContent className="flex items-center gap-4">
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-lg",
                value === method ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {icon}
            </div>
            <div className="flex-1">
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div
              className={cn(
                "size-4 rounded-full border-2",
                value === method ? "border-primary" : "border-muted-foreground/30",
              )}
            >
              {value === method && <div className="size-full rounded-full bg-primary" />}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
